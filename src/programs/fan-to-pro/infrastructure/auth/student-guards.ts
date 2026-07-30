/**
 * Student career / notes / profile 접근 가드 (ADR 0008 §5~7, B0044 LMS Launch Phase 1).
 *
 * students × cohorts.program_id × program_memberships / cohort instructor 판정.
 *
 * CLAUDE.md §7.4: 모든 LMS server action 첫 줄에 가드 호출 의무.
 * middleware path 차단만 신뢰 금지 (viewer role 사고 2026-06-09 lesson).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  getLmsUser,
  type LmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";
import { getCohortMembershipRole } from "@/src/programs/fan-to-pro/infrastructure/auth/cohort-guards";

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
