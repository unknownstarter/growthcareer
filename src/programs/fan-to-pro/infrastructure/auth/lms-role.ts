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
import { cache } from "react";
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
/**
 * React `cache()` 로 request 당 1회만 실행. layout + page 가 둘 다
 * `getLmsUser()` 호출해도 user_profiles + cohort_memberships query
 * 1세트만 발생 — 페이지 진입 속도 개선.
 */
export const getLmsUser = cache(async (): Promise<LmsUser | null> => {
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
      "id, display_name, email, company_id, student_id, instructor_id, is_super_admin, must_change_password",
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  // Mira B0065 M-2 (2026-07-03): user_profiles.role 컬럼 삭제 후 순수 추론.
  // 권한 결정 = is_super_admin OR program_memberships OR cohort_memberships.
  let inferredRole: LmsRole = "student";
  if (profile.is_super_admin) {
    inferredRole = "super_admin";
  } else {
    // cohort membership 첫 행으로 추론 (instructor 우선).
    const { data: cm } = await supabase
      .from("cohort_memberships")
      .select("role")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (cm && cm.length > 0) {
      const inst = cm.find((r) => r.role === "instructor");
      inferredRole = inst ? "instructor" : (cm[0].role as LmsRole);
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
});

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
/**
 * (user × program) 의 admin 여부 — React `cache()` 로 동일 request 안에서 중복 호출 시
 * 한 번만 DB query. layout + page + server action 이 같은 user 의 권한 검증 시 효율.
 */
export const isProgramAdmin = cache(
  async (userId: string, programSlug: string): Promise<boolean> => {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", programSlug)
      .single();
    if (!program) return false;

    const { data: membership } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .eq("role", "admin")
      .maybeSingle();

    return !!membership;
  },
);

export async function assertProgramAdmin(
  programSlug: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  const ok = await isProgramAdmin(user.id, programSlug);
  if (!ok) {
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
  if (pm) return user;

  // cohort 의 instructor 도 career 문서 read 가능 (노아 요구 2026-06-28).
  const cohortId = (student as { cohort_id: string }).cohort_id;
  const cohortRole = await getCohortMembershipRole(user.id, cohortId);
  if (cohortRole === "instructor") return user;

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot access student ${studentId} career.`,
  );
}

// -------------------------------------------------------------------------
// B0044 LMS Launch Phase 1 — lecture_materials + student_notes + student_profile 가드.
// 각 함수 React `cache()` 적용 — 같은 request 안에서 중복 호출 시 1회만 DB query.
// -------------------------------------------------------------------------

/**
 * (user × cohort) 의 cohort_membership 조회 — instructor / student / null.
 * cache 로 동일 request 안에서 중복 조회 회피.
 */
export const getCohortMembershipRole = cache(
  async (
    userId: string,
    cohortId: string,
  ): Promise<"instructor" | "student" | null> => {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase
      .from("cohort_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("cohort_id", cohortId)
      .maybeSingle();
    if (!data) return null;
    const role = data.role as string;
    if (role === "instructor" || role === "student") return role;
    return null;
  },
);

/**
 * cohort 의 program_id 조회 — cache.
 */
const getCohortProgramId = cache(
  async (cohortId: string): Promise<string | null> => {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase
      .from("cohorts")
      .select("program_id")
      .eq("id", cohortId)
      .maybeSingle();
    return (data?.program_id as string | undefined) ?? null;
  },
);

/**
 * 자료 업로드 가드. (cohortId 또는 session 기반.)
 *
 * 통과: super_admin OR program admin (cohort.program) OR cohort instructor.
 *
 * sessionId 가 주어지면 session.cohort_id == cohortId 검증 추가.
 */
export async function assertCanUploadMaterial(
  cohortId: string,
  sessionId?: string | null,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  // program admin?
  const programId = await getCohortProgramId(cohortId);
  if (!programId) throw new Error(`[lms-role] unknownCohort: ${cohortId}`);

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: pm } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .eq("role", "admin")
    .maybeSingle();
  if (pm) {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  // cohort instructor?
  const cohortRole = await getCohortMembershipRole(user.id, cohortId);
  if (cohortRole === "instructor") {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot upload material to cohort ${cohortId}.`,
  );
}

async function assertSessionMatchesCohort(
  sessionId: string | null | undefined,
  cohortId: string,
): Promise<void> {
  if (!sessionId) return;
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");
  const { data } = await supabase
    .from("sessions")
    .select("cohort_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) throw new Error(`[lms-role] unknownSession: ${sessionId}`);
  if (data.cohort_id !== cohortId) {
    throw new Error(
      `[lms-role] sessionCohortMismatch: session=${sessionId} cohort=${cohortId}`,
    );
  }
}

/**
 * 자료 다운로드 가드.
 *
 * 통과: super_admin OR program admin OR cohort member (instructor / student).
 * student 인 경우 material visibility 검증 추가 (RLS 와 동기).
 *
 * @returns { user, material } — 호출자가 file_path / external_url 사용.
 */
export async function assertCanDownloadMaterial(
  materialId: string,
): Promise<{
  user: LmsUser;
  material: {
    id: string;
    cohort_id: string;
    storage_method: "file_upload" | "external_url";
    file_path: string | null;
    file_name: string | null;
    external_url: string | null;
    visibility: "draft" | "scheduled" | "published" | "archived";
    visible_from: string | null;
  };
}> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: material, error: matErr } = await supabase
    .from("lecture_materials")
    .select(
      "id, cohort_id, storage_method, file_path, file_name, external_url, visibility, visible_from",
    )
    .eq("id", materialId)
    .maybeSingle();
  if (matErr) throw new Error(matErr.message);
  if (!material) throw new Error(`[lms-role] unknownMaterial: ${materialId}`);

  if (user.isSuperAdmin) return { user, material: material as never };

  // program admin?
  const programId = await getCohortProgramId(material.cohort_id);
  if (programId) {
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("role", "admin")
      .maybeSingle();
    if (pm) return { user, material: material as never };
  }

  // cohort member?
  const cohortRole = await getCohortMembershipRole(user.id, material.cohort_id);
  if (!cohortRole) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} not member of cohort ${material.cohort_id}.`,
    );
  }

  // student 는 visibility 검증 추가.
  if (cohortRole === "student") {
    const vis = material.visibility as string;
    const visibleFrom = material.visible_from as string | null;
    const ok =
      vis === "published" ||
      (vis === "scheduled" &&
        visibleFrom !== null &&
        new Date(visibleFrom).getTime() <= Date.now());
    if (!ok) {
      throw new Error(
        `[lms-role] forbidden: material ${materialId} not visible to student.`,
      );
    }
  }

  return { user, material: material as never };
}

/**
 * student_notes 쓰기 가드.
 *
 * 통과: super_admin OR program admin OR cohort instructor of student.
 * 학생 본인은 차단 (학생은 student_notes 안 봄).
 */
export async function assertCanWriteStudentNote(
  studentId: string,
): Promise<{ user: LmsUser; authorRole: "super_admin" | "admin" | "instructor" }> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");

  if (user.isSuperAdmin) return { user, authorRole: "super_admin" };

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: student } = await supabase
    .from("students")
    .select("id, cohort_id, cohorts!inner(program_id)")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error(`[lms-role] unknownStudent: ${studentId}`);

  const cohortsField = (student as { cohorts: unknown }).cohorts;
  const cohortObj = Array.isArray(cohortsField)
    ? (cohortsField[0] as { program_id: string } | undefined)
    : (cohortsField as { program_id: string } | null);
  const programId = cohortObj?.program_id;

  if (programId) {
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("role", "admin")
      .maybeSingle();
    if (pm) return { user, authorRole: "admin" };
  }

  // cohort instructor?
  const cohortId = (student as { cohort_id: string }).cohort_id;
  const cohortRole = await getCohortMembershipRole(user.id, cohortId);
  if (cohortRole === "instructor") {
    return { user, authorRole: "instructor" };
  }

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot write notes for student ${studentId}.`,
  );
}

/**
 * student_notes 읽기 가드. 쓰기와 권한 동일 (학생 본인은 차단).
 */
export async function assertCanReadStudentNote(
  studentId: string,
): Promise<LmsUser> {
  // 학생은 read X — 본인 차단 명시.
  const { user } = await assertCanWriteStudentNote(studentId);
  return user;
}

/**
 * student_profile / student_career_target / student_resume_item 쓰기 가드.
 *
 * 통과: super_admin OR program admin OR student-self.
 * instructor 는 쓰기 X.
 */
export async function assertCanWriteStudentProfile(
  studentId: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;
  if (user.studentId === studentId) return user;

  // program admin?
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: student } = await supabase
    .from("students")
    .select("id, cohorts!inner(program_id)")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error(`[lms-role] unknownStudent: ${studentId}`);

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
  if (pm) return user;

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot write profile for student ${studentId}.`,
  );
}

/**
 * student_profile / student_career_target / student_resume_item 읽기 가드.
 *
 * 통과: super_admin OR program admin OR student-self OR cohort instructor.
 */
export async function assertCanReadStudentProfile(
  studentId: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;
  if (user.studentId === studentId) return user;

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: student } = await supabase
    .from("students")
    .select("id, cohort_id, cohorts!inner(program_id)")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error(`[lms-role] unknownStudent: ${studentId}`);

  const cohortsField = (student as { cohorts: unknown }).cohorts;
  const cohortObj = Array.isArray(cohortsField)
    ? (cohortsField[0] as { program_id: string } | undefined)
    : (cohortsField as { program_id: string } | null);
  const programId = cohortObj?.program_id;

  if (programId) {
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("role", "admin")
      .maybeSingle();
    if (pm) return user;
  }

  const cohortId = (student as { cohort_id: string }).cohort_id;
  const cohortRole = await getCohortMembershipRole(user.id, cohortId);
  if (cohortRole === "instructor") return user;

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot read profile for student ${studentId}.`,
  );
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
