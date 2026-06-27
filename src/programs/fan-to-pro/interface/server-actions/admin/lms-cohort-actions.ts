"use server";

/**
 * LMS Cohort server actions — interface 레이어.
 *
 * 책임: use case 를 server action 으로 wrap. revalidatePath 으로 dashboard 갱신.
 * 비즈니스 룰 X — use case 가 다 처리.
 */
import { revalidatePath } from "next/cache";
import {
  promoteApplicantToStudent,
  type PromoteResult,
} from "@/src/programs/fan-to-pro/application/use-cases/student/promote-applicant-to-student";
import {
  markAttendance,
  type MarkAttendanceResult,
} from "@/src/programs/fan-to-pro/application/use-cases/attendance/mark-attendance";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  assertProgramAdmin,
  assertCanWriteStudentProfile,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

const OPERATOR_ID = process.env.ADMIN_OPERATOR_ID ?? "noah";

/**
 * 본 server actions 의 호출처는 모두 LMS surface (`/[locale]/fan-to-pro/admin/*`).
 * Basic Auth `/admin/cohorts` 호출처 0건 (2026-06-27 grep 확인).
 * 가드 = assertProgramAdmin("fan-to-pro") — Supabase Auth.
 * revalidate = LMS cohorts path (ko + en).
 */
const LMS_COHORTS_PATHS = [
  "/ko/fan-to-pro/admin/cohorts",
  "/en/fan-to-pro/admin/cohorts",
];

function revalidateLmsCohorts() {
  for (const p of LMS_COHORTS_PATHS) revalidatePath(p);
}

/**
 * 신청서 원본 이름 정정 — admin OR student-self.
 * applicants.name + students.display_name 둘 다 update (data integrity).
 *
 * 권한: super_admin OR program admin OR student-self. 강사 X.
 * 노아 통찰 (2026-06-27): "본인 (학생)도 원본 이름 변경 가능해야"
 * 사용처: 학생 detail 페이지 + 학생 본인 profile 페이지 [원본 이름 정정] dialog.
 */
export async function updateStudentRealNameAction(input: {
  student_id: string;
  new_name: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  try {
    await assertCanWriteStudentProfile(input.student_id);
  } catch {
    return { status: "error", error: "forbidden" };
  }
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const newName = input.new_name.trim();
  if (newName.length < 2) return { status: "error", error: "invalidInput" };

  // 1. student → applicant_id 조회
  const { data: student, error: sErr } = await supabase
    .from("students")
    .select("id, applicant_id")
    .eq("id", input.student_id)
    .single();
  if (sErr || !student) return { status: "error", error: "studentNotFound" };

  // 2. applicants.name update (원본)
  const { error: aErr } = await supabase
    .from("applicants")
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq("id", student.applicant_id);
  if (aErr) {
    console.error("[updateStudentRealName] applicants update fail", aErr);
    return { status: "error", error: "internal" };
  }

  // 3. students.display_name update (동기화)
  const { error: dErr } = await supabase
    .from("students")
    .update({ display_name: newName, updated_at: new Date().toISOString() })
    .eq("id", input.student_id);
  if (dErr) {
    console.error("[updateStudentRealName] students update fail", dErr);
    return { status: "error", error: "internal" };
  }

  revalidateLmsCohorts();
  revalidatePath(`/ko/fan-to-pro/admin/students/${input.student_id}`);
  revalidatePath(`/en/fan-to-pro/admin/students/${input.student_id}`);
  return { status: "ok" };
}

export async function promoteApplicantAction(input: {
  applicant_id: string;
  cohort_id: string;
}): Promise<PromoteResult> {
  await assertProgramAdmin("fan-to-pro");
  const result = await promoteApplicantToStudent(input);
  if (result.status === "ok") revalidateLmsCohorts();
  return result;
}

export async function markAttendanceAction(input: {
  session_id: string;
  entries: { student_id: string; status: "present" | "late" | "absent" | "excused"; late_minutes?: number | null; notes?: string | null }[];
}): Promise<MarkAttendanceResult> {
  await assertProgramAdmin("fan-to-pro");
  const result = await markAttendance({
    session_id: input.session_id,
    marked_by: OPERATOR_ID,
    entries: input.entries,
  });
  if (result.status === "ok") revalidateLmsCohorts();
  return result;
}

/**
 * paid 신청자 전원 promote — 운영자 1-click backfill.
 * 신청자 페이지에서 paid → cohort 의 student 로 자동 이전. 멱등.
 */
export async function backfillPaidApplicantsAction(input: {
  cohort_id: string;
}): Promise<
  | { status: "ok"; inserted: number; skipped: number }
  | { status: "error"; error: string }
> {
  await assertProgramAdmin("fan-to-pro");
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // paid/enrolled applicant (PII 미파기) 만 대상.
  const { data, error } = await supabase
    .from("applicants")
    .select("id, name")
    .in("status", ["paid", "enrolled"])
    .is("redacted_at", null);
  if (error) return { status: "error", error: error.message };

  const applicants = (data ?? []).map((r) => ({
    id: String((r as Record<string, unknown>).id ?? ""),
    name: String((r as Record<string, unknown>).name ?? "(이름없음)"),
  }));

  // 직접 backfillStudentsFromApplicants 호출.
  const { backfillStudentsFromApplicants } = await import(
    "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository"
  );
  try {
    const result = await backfillStudentsFromApplicants(
      input.cohort_id,
      applicants,
    );
    revalidateLmsCohorts();
    return { status: "ok", ...result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
