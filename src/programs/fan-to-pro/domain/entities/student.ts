/**
 * Student entity — ADR 0005 §6.
 *
 * Invariant:
 * - applicant.status ∈ {paid, enrolled} 만 promote 가능 (use case 에서 가드)
 * - applicant_id UNIQUE (1 applicant → 1 student. cohort 재수강은 새 applicant)
 *
 * State machine:
 *   active → withdrawn (자퇴)
 *   active → completed (수료)
 *   withdrawn / completed = terminal
 */
import { z } from "zod";

export const STUDENT_STATUSES = ["active", "withdrawn", "completed"] as const;

export const StudentStatusSchema = z.enum(STUDENT_STATUSES);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

export const StudentSchema = z.object({
  id: z.string().uuid(),
  applicant_id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  display_name: z.string().min(1),
  status: StudentStatusSchema,
  promoted_at: z.string(),
  withdrawn_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Student = z.infer<typeof StudentSchema>;

const ALLOWED_TRANSITIONS: Record<StudentStatus, readonly StudentStatus[]> = {
  active: ["withdrawn", "completed"],
  withdrawn: [],
  completed: [],
};

export function canTransitionStudent(
  from: StudentStatus,
  to: StudentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalStudentStatus(status: StudentStatus): boolean {
  return status === "withdrawn" || status === "completed";
}

/** promote 가능한 applicant status (use case 에서 호출). */
export const PROMOTABLE_APPLICANT_STATUSES = ["paid", "enrolled"] as const;
export type PromotableApplicantStatus =
  (typeof PROMOTABLE_APPLICANT_STATUSES)[number];

export function canPromoteApplicant(applicantStatus: string): boolean {
  return (PROMOTABLE_APPLICANT_STATUSES as readonly string[]).includes(
    applicantStatus,
  );
}
