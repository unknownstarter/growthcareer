/**
 * Enrollment entity (결제 단위) — B0068 ADR 0013.
 *
 * domain layer 룰: 외부 의존성 0.
 *
 * Invariant:
 * - student_id OR applicant_id 최소 하나 (DB CHECK)
 * - purchase_amount_krw >= 0 (nullable)
 * - bundle_id nullable — 단과 결제는 NULL, 번들 결제는 채워짐
 *
 * State machine:
 *   pending → paid → (refunded | cancelled)
 *   pending → cancelled
 *   refunded / cancelled = terminal
 */
import { z } from "zod";

export const ENROLLMENT_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "cancelled",
] as const;

export const EnrollmentStatusSchema = z.enum(ENROLLMENT_STATUSES);
export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

export const EnrollmentSchema = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid().nullable(),
    applicant_id: z.string().uuid().nullable(),
    cohort_id: z.string().uuid().nullable(),
    bundle_id: z.string().uuid().nullable(),
    purchase_amount_krw: z.number().int().nonnegative().nullish(),
    purchased_at: z.string().nullish(),
    status: EnrollmentStatusSchema,
    notes: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string().nullish(),
  })
  .refine((e) => e.student_id !== null || e.applicant_id !== null, {
    message: "student_id or applicant_id required",
    path: ["student_id"],
  });

export type Enrollment = z.infer<typeof EnrollmentSchema>;

const ALLOWED_TRANSITIONS: Record<
  EnrollmentStatus,
  readonly EnrollmentStatus[]
> = {
  pending: ["paid", "cancelled"],
  paid: ["refunded", "cancelled"],
  refunded: [],
  cancelled: [],
};

export function canTransitionEnrollment(
  from: EnrollmentStatus,
  to: EnrollmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalEnrollmentStatus(status: EnrollmentStatus): boolean {
  return status === "refunded" || status === "cancelled";
}

/** 실제 결제 완료 (수강 자격 유효) 상태. */
export function isEnrollmentActive(status: EnrollmentStatus): boolean {
  return status === "paid";
}
