/**
 * Use case — 학생 지원 취소 (발송 전만).
 *
 * 절차:
 *   1) getLmsUser() → auth 확인.
 *   2) application row 소유자 검증 (student_id 매칭).
 *   3) email_sent_at IS NULL 인 경우만 withdrawn 전이 (repository 안 조건 필터).
 *   4) 성공 시 recruitment_email_log pending → failed (worker skip 유도).
 */
"use server";

import { z } from "zod";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchApplicationById,
  withdrawApplication,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-application-repository";
import { cancelPendingEmailsForApplication } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/recruitment-email-log-repository";

const InputSchema = z.object({
  applicationId: z.string().uuid(),
});

export type WithdrawApplicationInput = z.infer<typeof InputSchema>;

export type WithdrawApplicationError =
  | "not_authenticated"
  | "not_student"
  | "not_owner"
  | "already_sent"
  | "invalid_input"
  | "internal";

export type WithdrawApplicationResult =
  | { ok: true }
  | { ok: false; error: WithdrawApplicationError };

export async function withdrawApplicationAction(
  input: unknown,
): Promise<WithdrawApplicationResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getLmsUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  if (!user.studentId) return { ok: false, error: "not_student" };

  try {
    const application = await fetchApplicationById(parsed.data.applicationId);
    if (!application) return { ok: false, error: "not_owner" };
    if (application.student_id !== user.studentId) {
      return { ok: false, error: "not_owner" };
    }
    if (application.email_sent_at !== null) {
      return { ok: false, error: "already_sent" };
    }

    const updated = await withdrawApplication(parsed.data.applicationId);
    if (!updated) return { ok: false, error: "already_sent" };

    // outbox pending row → failed 전이 (worker 가 skip).
    await cancelPendingEmailsForApplication(parsed.data.applicationId);

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: msg === "supabaseUnavailable" ? "internal" : "internal" };
  }
}
