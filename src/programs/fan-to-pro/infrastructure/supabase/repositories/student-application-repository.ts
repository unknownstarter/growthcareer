/**
 * Student Application repository (B0072 Recruitment MVP).
 *
 * service_role client. RLS 우회 — 호출자 (server action) 가 권한 가드 책임.
 *
 * 원자적 지원 처리 (apply_to_job_atomic RPC) 는 별도 함수로 격리 —
 * INSERT 2건 (student_applications + recruitment_email_log) 을 서버 사이드
 * 트랜잭션으로 묶기 위함 (S-9 defense). RPC 는 SECURITY DEFINER + auth.uid()
 * 조회 (S-9b: p_student_id 인자 없음).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentApplicationSchema,
  type StudentApplication,
  type StudentApplicationStatus,
} from "@/src/programs/fan-to-pro/domain/entities/student-application";
import type { EmailAttachment } from "@/src/programs/fan-to-pro/domain/entities/recruitment-email-log";

const TABLE = "student_applications";
const RPC_APPLY = "apply_to_job_atomic";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchApplicationsByStudent(
  studentId: string,
): Promise<StudentApplication[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("applied_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => StudentApplicationSchema.parse(row));
}

export async function fetchApplicationsByPosting(
  jobPostingId: string,
): Promise<StudentApplication[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("job_posting_id", jobPostingId)
    .order("applied_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => StudentApplicationSchema.parse(row));
}

export async function fetchApplicationById(
  id: string,
): Promise<StudentApplication | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentApplicationSchema.parse(data);
}

export async function existsApplication(
  studentId: string,
  jobPostingId: string,
): Promise<boolean> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id")
    .eq("student_id", studentId)
    .eq("job_posting_id", jobPostingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

// ---------------------------------------------------------------------------
// Atomic apply (RPC — S-9 + S-9b defense)
// ---------------------------------------------------------------------------

export type ApplyToJobAtomicInput = {
  jobPostingId: string;
  studentMessage: string | null;
  emailRecipient: string;
  emailSubject: string;
  emailBodyTemplateKey: string;
  emailAttachments: EmailAttachment[];
};

/**
 * apply_to_job_atomic RPC 호출. 원자적으로 student_applications +
 * recruitment_email_log INSERT.
 *
 * IMPORTANT: p_student_id 인자 없음 (S-9b defense). RPC 함수가 auth.uid() 로
 * 본인 student_id 를 내부 조회한다 — 클라이언트가 위조 불가.
 *
 * RPC error 시 message 를 그대로 throw. server action 에서 매핑:
 *   'notStudent' -> not_student
 *   'notEligible' -> not_active
 *   'postingClosed' -> job_not_open
 *   'alreadyApplied' -> already_applied
 */
export async function applyToJobAtomic(
  input: ApplyToJobAtomicInput,
): Promise<string> {
  const supabase = requireClient();
  const { data, error } = await supabase.rpc(RPC_APPLY, {
    p_job_posting_id: input.jobPostingId,
    p_student_message: input.studentMessage,
    p_email_recipient: input.emailRecipient,
    p_email_subject: input.emailSubject,
    p_email_body_template_key: input.emailBodyTemplateKey,
    p_email_attachments: input.emailAttachments,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== "string") {
    throw new Error("rpcReturnedUnexpectedType");
  }
  return data;
}

// ---------------------------------------------------------------------------
// Withdraw (service_role only — RLS 로 authenticated UPDATE grant 없음)
// ---------------------------------------------------------------------------

/**
 * withdrawn 전이. email_sent_at IS NULL 인 경우만 성공.
 * @returns 업데이트된 row 없으면 null (이미 발송됨 등).
 */
export async function withdrawApplication(
  applicationId: string,
): Promise<StudentApplication | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "withdrawn" satisfies StudentApplicationStatus })
    .eq("id", applicationId)
    .is("email_sent_at", null)
    .eq("status", "applied")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentApplicationSchema.parse(data);
}

/**
 * email_sent_at 갱신. outbox worker 가 전송 성공 후 호출.
 */
export async function markApplicationEmailSent(
  applicationId: string,
  sentAt: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ email_sent_at: sentAt })
    .eq("id", applicationId);
  if (error) throw new Error(error.message);
}
