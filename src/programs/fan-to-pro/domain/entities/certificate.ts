/**
 * Certificate entity (수료증 + 공연 참여 확인서) — ADR 0005 §6.
 *
 * Invariant:
 * - completion: attendance ≥ 75% && payment=paid && cohort.completed (use case 가드)
 * - performance: 실제 공연 참여 여부 운영자 in-app 확인
 * - (student_id, kind) UNIQUE — 1 학생 = 1 종류 = 1 수료증
 * - issued = 불가역 (state machine X)
 */
import { z } from "zod";

export const CERTIFICATE_KINDS = ["completion", "performance"] as const;
export const CertificateKindSchema = z.enum(CERTIFICATE_KINDS);
export type CertificateKind = z.infer<typeof CertificateKindSchema>;

export const CertificateSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  kind: CertificateKindSchema,

  serial_no: z.string().min(1),
  // verify URL 용 opaque 토큰 (10자 nanoid). serial_no 는 UI 표기 전용.
  // 기존 row 는 SQL 백필로 hex(16자) 값 보유. 신규는 애플리케이션 nanoid(10자).
  verify_token: z.string().min(6),
  issued_at: z.string(),
  issued_by: z.string().uuid().nullable(),
  file_path: z.string().nullable(),

  attendance_rate: z.number().min(0).max(100).nullable(),
  notes: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Certificate = z.infer<typeof CertificateSchema>;

/** 수료증 발급 가능 여부 — completion. attendance ≥ 75% + cohort completed. */
export function canIssueCompletion(input: {
  attendanceRate: number;
  cohortStatus: string;
  studentStatus: string;
}): boolean {
  return (
    input.attendanceRate >= 75 &&
    input.cohortStatus === "completed" &&
    (input.studentStatus === "active" || input.studentStatus === "completed")
  );
}
