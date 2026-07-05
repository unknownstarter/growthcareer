/**
 * Recruitment Email Log repository (B0072 Recruitment MVP).
 *
 * service_role client. authenticated / anon 접근 불가 (RLS + GRANT 모두 차단).
 *
 * outbox worker (Vercel Cron `/api/cron/recruitment-email-outbox`) 가 사용.
 * 지원 INSERT 자체는 apply_to_job_atomic RPC 안에서 이뤄지므로 이 repository
 * 는 read + status 전이 (worker 관점) 만 노출.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  RecruitmentEmailLogSchema,
  type RecruitmentEmailLog,
  type EmailDeliveryStatus,
} from "@/src/programs/fan-to-pro/domain/entities/recruitment-email-log";

const TABLE = "recruitment_email_log";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

// ---------------------------------------------------------------------------
// worker reads
// ---------------------------------------------------------------------------

/**
 * pending / retrying 상태의 outbox row batch fetch. worker 가 사용.
 */
export async function fetchPendingEmails(
  limit = 50,
): Promise<RecruitmentEmailLog[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("delivery_status", ["pending", "retrying"])
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => RecruitmentEmailLogSchema.parse(row));
}

export async function fetchEmailLogByApplication(
  applicationId: string,
): Promise<RecruitmentEmailLog[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => RecruitmentEmailLogSchema.parse(row));
}

// ---------------------------------------------------------------------------
// worker writes
// ---------------------------------------------------------------------------

export type MarkSentInput = {
  id: string;
  bodySnapshot: string;
  sentAt: string;
};

export async function markEmailSent(input: MarkSentInput): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({
      delivery_status: "sent" satisfies EmailDeliveryStatus,
      body_snapshot: input.bodySnapshot,
      sent_at: input.sentAt,
      error_message: null,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

export type MarkFailureInput = {
  id: string;
  nextStatus: Extract<EmailDeliveryStatus, "failed" | "retrying">;
  retryCount: number;
  errorMessage: string;
};

export async function markEmailFailure(input: MarkFailureInput): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({
      delivery_status: input.nextStatus,
      retry_count: input.retryCount,
      error_message: input.errorMessage,
    })
    .eq("id", input.id);
  if (error) throw new Error(error.message);
}

/**
 * withdraw 시 pending outbox 를 failed 로 전이. worker skip 하도록.
 */
export async function cancelPendingEmailsForApplication(
  applicationId: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({
      delivery_status: "failed" satisfies EmailDeliveryStatus,
      error_message: "cancelled_by_student_withdraw",
    })
    .eq("application_id", applicationId)
    .in("delivery_status", ["pending", "retrying"]);
  if (error) throw new Error(error.message);
}
