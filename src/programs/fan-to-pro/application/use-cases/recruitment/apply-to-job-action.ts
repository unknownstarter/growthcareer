/**
 * Use case — 학생 원클릭 지원 (S-9 + S-9b defense).
 *
 * 절차:
 *   1) getLmsUser() → auth 확인.
 *   2) user_profiles.student_id fetch. NULL → not_student.
 *   3) students WHERE id + status='active'. row 없음 → not_active.
 *   4) job_postings WHERE id + status='open' + closes_at 유효. row 없음 → job_not_open.
 *   5) student_career_documents fetch → attachments jsonb 매핑 (resume + cover_letter).
 *   6) apply_to_job_atomic RPC 호출. RPC 는 auth.uid() 로 본인 student_id 를 서버측에서 조회.
 *      p_student_id 인자 없음 = impersonation 불가.
 *   7) RPC error → mapping.
 *
 * RPC 안에서 student_applications + recruitment_email_log INSERT 가 하나의
 * 서버 사이드 트랜잭션. half-commit 불가.
 */
"use server";

import { z } from "zod";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchCareerDocuments } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { applyToJobAtomic } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-application-repository";
import {
  STUDENT_MESSAGE_MAX_LENGTH,
} from "@/src/programs/fan-to-pro/domain/entities/student-application";
import {
  EmailAttachmentSchema,
  type EmailAttachment,
} from "@/src/programs/fan-to-pro/domain/entities/recruitment-email-log";

const InputSchema = z.object({
  jobPostingId: z.string().uuid(),
  studentMessage: z
    .string()
    .max(STUDENT_MESSAGE_MAX_LENGTH)
    .nullable()
    .optional(),
});

export type ApplyToJobInput = z.infer<typeof InputSchema>;

export type ApplyToJobError =
  | "not_authenticated"
  | "not_student"
  | "not_active"
  | "already_applied"
  | "job_not_open"
  | "invalid_input"
  | "internal";

export type ApplyToJobResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: ApplyToJobError };

function mapRpcError(message: string): ApplyToJobError {
  if (message.includes("notStudent")) return "not_student";
  if (message.includes("notEligible")) return "not_active";
  if (message.includes("postingClosed")) return "job_not_open";
  if (message.includes("alreadyApplied")) return "already_applied";
  return "internal";
}

export async function applyToJobAction(
  input: unknown,
): Promise<ApplyToJobResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  // 1) auth 확인.
  const user = await getLmsUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  if (!user.studentId) return { ok: false, error: "not_student" };

  const supabase = getSupabaseServer();
  if (!supabase) return { ok: false, error: "internal" };

  try {
    // 3) students status='active' 검증 (defense in depth — RPC 안에서도 재검증).
    const { data: student } = await supabase
      .from("students")
      .select("id, status, display_name, email, nationality, cohort_id")
      .eq("id", user.studentId)
      .maybeSingle();
    if (!student) return { ok: false, error: "not_student" };
    if (student.status !== "active") return { ok: false, error: "not_active" };

    // 4) job_posting fetch — contact_email 도 필요.
    const { data: posting } = await supabase
      .from("job_postings")
      .select("id, title, status, closes_at, contact_email")
      .eq("id", parsed.data.jobPostingId)
      .maybeSingle();
    if (!posting) return { ok: false, error: "job_not_open" };
    if (posting.status !== "open") return { ok: false, error: "job_not_open" };
    if (
      posting.closes_at !== null &&
      new Date(posting.closes_at as string).getTime() <= Date.now()
    ) {
      return { ok: false, error: "job_not_open" };
    }

    // 5) career docs → attachments 매핑 (resume + cover_letter only, portfolio 제외).
    const docs = await fetchCareerDocuments(user.studentId);
    const attachments: EmailAttachment[] = [];
    for (const doc of docs) {
      if (doc.doc_type !== "resume" && doc.doc_type !== "cover_letter") continue;
      const attachment = EmailAttachmentSchema.safeParse({
        doc_type: doc.doc_type,
        storage_method: doc.storage_method,
        external_url: doc.external_url,
        file_path: doc.file_path,
      });
      if (attachment.success) attachments.push(attachment.data);
    }

    // 6) RPC — p_student_id 인자 없음 (S-9b: auth.uid() 로 서버 조회).
    const subject = `[Growth Career] ${posting.title} 지원 접수 - ${
      (student.display_name as string) ?? "학생"
    }`;
    const applicationId = await applyToJobAtomic({
      jobPostingId: parsed.data.jobPostingId,
      studentMessage: parsed.data.studentMessage ?? null,
      emailRecipient: posting.contact_email as string,
      emailSubject: subject,
      emailBodyTemplateKey: "recruitment.application.v1",
      emailAttachments: attachments,
    });

    return { ok: true, applicationId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { ok: false, error: mapRpcError(msg) };
  }
}
