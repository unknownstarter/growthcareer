/**
 * LMS role 결정 + 가드 (ADR 0008 §5~7).
 *
 * 권한 모델 (3 계층):
 *   1) super_admin  — user_profiles.is_super_admin = true (글로벌, program 무관)
 *   2) program admin — program_memberships row (현재 fan-to-pro 만)
 *   3) cohort member — cohort_memberships row (role=instructor|student)
 *
 * 기존 user_profiles.role 컬럼은 deprecated — backward compat 만 유지.
 *
 * 사용처:
 *   - server component: getLmsUser() → LmsUser (id + email + flags + memberships)
 *   - server action: assertSuperAdmin / assertProgramAdmin / assertCohortRole
 *
 * CLAUDE.md §7.4: 모든 LMS server action 첫 줄에 assertSuperAdmin 또는 그에 준하는
 * 가드 의무. middleware path 차단만 신뢰 금지 (viewer role 사고 2026-06-09 lesson).
 */
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

// 기존 role 문자열 호환용 (deprecated — 새 코드는 isSuperAdmin/membership 사용).
export type LmsRole = "super_admin" | "instructor" | "student";

export interface LmsUser {
  id: string; // auth.users.id
  email: string;
  displayName: string;

  // 새 모델 (ADR 0008).
  isSuperAdmin: boolean;
  mustChangePassword: boolean;

  // 기존 호환 — Step 2 의 admin server action 안 깨지게.
  // 새 코드는 isSuperAdmin / cohort_memberships 우선.
  role: LmsRole;
  companyId: string | null;
  studentId: string | null;
  instructorId: string | null;
}

/**
 * 현재 session 의 LMS user + profile. session 없거나 profile 없으면 null.
 *
 * profile 조회는 service_role client 로 — anon client 보다 단순. user_profiles 는
 * PII 강도 낮아 service_role read 안전.
 *
 * 기존 role 컬럼이 null 인 새 invite 사용자도 처리 — is_super_admin / 또는
 * cohort_memberships 에서 역으로 추론.
 */
export async function getLmsUser(): Promise<LmsUser | null> {
  const auth = await getSupabaseAuthServer();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) return null;

  const supabase = getSupabaseServer();
  if (!supabase) {
    // Supabase 미설정 = 로컬 dev fallback. super_admin 가정 X.
    return null;
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(
      "id, role, display_name, email, company_id, student_id, instructor_id, is_super_admin, must_change_password",
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  // 기존 role 컬럼이 null 인 경우 — cohort_memberships 또는 is_super_admin 으로 추론.
  let inferredRole: LmsRole = profile.role ?? "student";
  if (profile.is_super_admin) {
    inferredRole = "super_admin";
  } else if (!profile.role) {
    // cohort membership 첫 행으로 추론 (instructor 우선).
    const { data: cm } = await supabase
      .from("cohort_memberships")
      .select("role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (cm && cm.length > 0) {
      inferredRole = cm.find((r) => r.role === "instructor")
        ? "instructor"
        : (cm[0].role as LmsRole);
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    isSuperAdmin: Boolean(profile.is_super_admin),
    mustChangePassword: Boolean(profile.must_change_password),
    role: inferredRole,
    companyId: profile.company_id,
    studentId: profile.student_id,
    instructorId: profile.instructor_id,
  };
}

// -------------------------------------------------------------------------
// 가드 함수 — server action 1차 가드 (RLS 가 2차).
// -------------------------------------------------------------------------

/**
 * super_admin 만. 위반 시 throw.
 *
 * 사용 예:
 *   await assertSuperAdmin();
 */
export async function assertSuperAdmin(): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (!user.isSuperAdmin) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not super_admin.`,
    );
  }
  return user;
}

/**
 * program admin 또는 super_admin. 위반 시 throw.
 *
 * 사용 예:
 *   await assertProgramAdmin('fan-to-pro');
 */
export async function assertProgramAdmin(
  programSlug: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", programSlug)
    .single();
  if (!program) {
    throw new Error(`[lms-role] unknownProgram: ${programSlug}`);
  }

  const { data: membership } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", program.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!membership) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not admin of program ${programSlug}.`,
    );
  }
  return user;
}

/**
 * cohort 단위 role 가드 (instructor 또는 student). super_admin / program admin
 * 도 통과.
 *
 * 사용 예:
 *   await assertCohortRole(cohortId, 'instructor');
 */
export async function assertCohortRole(
  cohortId: string,
  role: "instructor" | "student",
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  // program admin 도 통과 — cohort 의 program 검사.
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("program_id")
    .eq("id", cohortId)
    .single();
  if (!cohort) throw new Error(`[lms-role] unknownCohort: ${cohortId}`);

  const { data: programMembership } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", cohort.program_id)
    .eq("role", "admin")
    .maybeSingle();
  if (programMembership) return user;

  // cohort 자체의 membership.
  const { data: cm } = await supabase
    .from("cohort_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("cohort_id", cohortId)
    .eq("role", role)
    .maybeSingle();
  if (!cm) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not ${role} of cohort ${cohortId}.`,
    );
  }
  return user;
}

/**
 * 특정 student 의 career 데이터 (이력서/자기소개서/포트폴리오 등) 접근 가드.
 *
 * 통과 조건 (셋 중 하나):
 *   1) super_admin (user_profiles.is_super_admin=true)
 *   2) program admin — student.cohort 의 program 에 admin membership
 *   3) student-self — user_profiles.student_id === target studentId
 *
 * 위반 시 throw. server action 첫 줄에서 호출.
 *
 * 사용 예:
 *   await assertCanAccessStudentCareer(studentId);
 */
export async function assertCanAccessStudentCareer(
  studentId: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  // student-self 빠른 경로 — DB round-trip 1회 절약.
  if (user.studentId === studentId) return user;

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  // student 조회 → cohort.program_id 추출 → program_memberships 검사.
  const { data: student } = await supabase
    .from("students")
    .select("id, cohort_id, cohorts!inner(program_id)")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    throw new Error(`[lms-role] unknownStudent: ${studentId}`);
  }

  const cohortsField = (student as { cohorts: unknown }).cohorts;
  const cohortObj = Array.isArray(cohortsField)
    ? (cohortsField[0] as { program_id: string } | undefined)
    : (cohortsField as { program_id: string } | null);
  const programId = cohortObj?.program_id;
  if (!programId) {
    throw new Error(`[lms-role] studentMissingProgram: ${studentId}`);
  }

  const { data: pm } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .eq("role", "admin")
    .maybeSingle();

  if (!pm) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} cannot access student ${studentId} career.`,
    );
  }
  return user;
}

// -------------------------------------------------------------------------
// 기존 호환 — 옛 코드가 assertLmsRole('super_admin') 호출하는 곳 안 깨지게.
// 새 코드는 위 함수들 사용.
// -------------------------------------------------------------------------

/** @deprecated use assertSuperAdmin / assertProgramAdmin / assertCohortRole */
export async function assertLmsRole(required: LmsRole): Promise<LmsUser> {
  if (required === "super_admin") return assertSuperAdmin();
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.role !== required) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} cannot perform ${required} action.`,
    );
  }
  return user;
}

/** @deprecated */
export async function assertLmsRoleIn(allowed: LmsRole[]): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin && allowed.includes("super_admin")) return user;
  if (!allowed.includes(user.role)) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} not in [${allowed.join(", ")}].`,
    );
  }
  return user;
}
