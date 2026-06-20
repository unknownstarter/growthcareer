/**
 * Use case — applicant 를 student 로 promote.
 *
 * 규칙:
 * - applicant.status ∈ {paid, enrolled} 만 가능 (도메인 룰)
 * - applicant.redacted_at != null → 차단 (PII 파기된 applicant 는 promote X)
 * - applicant_id UNIQUE → 이미 promote 된 경우 ok-as-noop (멱등)
 * - display_name = applicant.name 스냅샷
 */
import { z } from "zod";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  insertStudent,
  fetchStudentByApplicantId,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { canPromoteApplicant } from "@/src/programs/fan-to-pro/domain/entities/student";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";

const InputSchema = z.object({
  applicant_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
});

export type PromoteInput = z.infer<typeof InputSchema>;
export type PromoteResult =
  | { status: "ok"; data: Student; alreadyExists: boolean }
  | { status: "error"; error: string };

export async function promoteApplicantToStudent(
  input: unknown,
): Promise<PromoteResult> {
  await assertAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    // cohort 존재 검증.
    const cohort = await fetchCohortById(parsed.data.cohort_id);
    if (!cohort) return { status: "error", error: "cohortNotFound" };

    // 멱등 — 이미 promote 된 경우 기존 student 반환.
    const existing = await fetchStudentByApplicantId(parsed.data.applicant_id);
    if (existing) {
      if (existing.cohort_id !== parsed.data.cohort_id) {
        return { status: "error", error: "applicantInDifferentCohort" };
      }
      return { status: "ok", data: existing, alreadyExists: true };
    }

    // applicant 정보 조회 (status / name / redacted_at).
    const supabase = getSupabaseServer();
    if (!supabase) return { status: "error", error: "supabaseUnavailable" };
    const { data: applicant, error: readErr } = await supabase
      .from("applicants")
      .select("status, name, redacted_at")
      .eq("id", parsed.data.applicant_id)
      .maybeSingle();
    if (readErr) return { status: "error", error: readErr.message };
    if (!applicant) return { status: "error", error: "applicantNotFound" };

    if (applicant.redacted_at) {
      return { status: "error", error: "applicantRedacted" };
    }
    if (!canPromoteApplicant(String(applicant.status))) {
      return { status: "error", error: "applicantNotPromotable" };
    }

    const student = await insertStudent({
      applicant_id: parsed.data.applicant_id,
      cohort_id: parsed.data.cohort_id,
      display_name: String(applicant.name ?? "(이름없음)"),
      status: "active",
    });
    return { status: "ok", data: student, alreadyExists: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
