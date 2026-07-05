/**
 * Student Application entity (B0072 Recruitment MVP).
 *
 * 학생 원클릭 지원 트래킹. MVP 는 2-value 상태만 (applied / withdrawn).
 * v5 의 6-value 상태머신 (under_review / interview / offer / hired / rejected)
 * 은 회사 로그인 표면 소멸로 인해 폐기 — 회사가 플랫폼에 상태를 입력할 수 없다.
 *
 * Invariant:
 *   - UNIQUE(student_id, job_posting_id) — 중복 지원 방지.
 *   - INSERT 시 status = 'applied' 강제 (RLS with_check).
 *   - withdrawn 전이는 email_sent_at IS NULL 인 경우만 (service_role server action).
 */
import { z } from "zod";

export const STUDENT_APPLICATION_STATUSES = ["applied", "withdrawn"] as const;
export type StudentApplicationStatus =
  (typeof STUDENT_APPLICATION_STATUSES)[number];
export const StudentApplicationStatusSchema = z.enum(
  STUDENT_APPLICATION_STATUSES,
);

/** 학생 메시지 max 1000자 (application-layer 검증). */
export const STUDENT_MESSAGE_MAX_LENGTH = 1000;

export const StudentApplicationSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  job_posting_id: z.string().uuid(),
  applied_at: z.string(),
  student_message: z.string().max(STUDENT_MESSAGE_MAX_LENGTH).nullable(),
  email_sent_at: z.string().nullable(),
  status: StudentApplicationStatusSchema,
});

export type StudentApplication = z.infer<typeof StudentApplicationSchema>;

/**
 * withdraw 가능 여부 — 아직 outbox 발송 전만 취소 가능.
 * 이미 발송된 후에는 회사 이메일로 직접 취소 요청 안내.
 */
export function canWithdraw(
  application: Pick<StudentApplication, "status" | "email_sent_at">,
): boolean {
  if (application.status !== "applied") return false;
  return application.email_sent_at === null;
}
