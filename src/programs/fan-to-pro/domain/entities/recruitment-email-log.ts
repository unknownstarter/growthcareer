/**
 * Recruitment Email Log entity (B0072 Recruitment MVP).
 *
 * 원클릭 지원 시 회사로 발송되는 이메일 outbox. Vercel Cron worker 가
 * pending / retrying 을 sent 로 전이.
 *
 * Retention TODO (S-3 fix):
 *   MVP 는 무기한 보관. Wave 2 에서 파기 cron (channel_email_log_retention) 도입 필수.
 *   - sent + 3y 이후 자동 삭제 (K-PIPA 제21조 파기 원칙).
 *   - failed + 90일 이후 자동 삭제.
 *   - pending / retrying 은 시각 무관 보관 (재시도 대상).
 *
 * Access:
 *   service_role only. authenticated / anon SELECT 도 금지.
 */
import { z } from "zod";

export const EMAIL_DELIVERY_STATUSES = [
  "pending",
  "sent",
  "failed",
  "retrying",
] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];
export const EmailDeliveryStatusSchema = z.enum(EMAIL_DELIVERY_STATUSES);

/**
 * Attachment 참조 — student_career_documents 에서 fetch 한 결과.
 * XOR: external_url 또는 file_path 중 정확히 하나.
 */
export const EmailAttachmentSchema = z
  .object({
    doc_type: z.enum(["resume", "cover_letter"]),
    storage_method: z.enum(["external_url", "file_upload"]),
    external_url: z.string().url().nullable().optional(),
    file_path: z.string().nullable().optional(),
  })
  .refine(
    (a) =>
      (a.storage_method === "external_url" &&
        !!a.external_url &&
        !a.file_path) ||
      (a.storage_method === "file_upload" && !!a.file_path && !a.external_url),
    { message: "storage_method must match exactly one of external_url or file_path" },
  );

export type EmailAttachment = z.infer<typeof EmailAttachmentSchema>;

/**
 * MVP body template key (S-9 defense: RPC 는 key 만 전달, PII 최소화).
 * outbox worker 가 key 로 template 조회 후 최종 body 렌더.
 */
export const EMAIL_BODY_TEMPLATE_KEYS = [
  "recruitment.application.v1",
] as const;
export type EmailBodyTemplateKey = (typeof EMAIL_BODY_TEMPLATE_KEYS)[number];
export const EmailBodyTemplateKeySchema = z.enum(EMAIL_BODY_TEMPLATE_KEYS);

export const RecruitmentEmailLogSchema = z.object({
  id: z.string().uuid(),
  application_id: z.string().uuid().nullable(),
  recipient_email: z.string().email(),
  subject: z.string().min(1),
  body_template_key: EmailBodyTemplateKeySchema,
  body_snapshot: z.string().nullable(),
  attachments: z.array(EmailAttachmentSchema),
  delivery_status: EmailDeliveryStatusSchema,
  sent_at: z.string().nullable(),
  error_message: z.string().nullable(),
  retry_count: z.number().int().nonnegative(),
  created_at: z.string(),
});

export type RecruitmentEmailLog = z.infer<typeof RecruitmentEmailLogSchema>;

/** worker retry 상한. */
export const MAX_EMAIL_RETRY_COUNT = 3;

export function shouldRetry(log: RecruitmentEmailLog): boolean {
  if (log.delivery_status === "sent" || log.delivery_status === "failed") {
    return false;
  }
  return log.retry_count < MAX_EMAIL_RETRY_COUNT;
}
