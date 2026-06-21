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
