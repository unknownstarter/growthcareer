/**
 * Consultation entity (이력서/자소서/포폴 컨설팅) — ADR 0005 §6.
 *
 * Invariant:
 * - (student_id, kind, version) UNIQUE
 * - version 단조 증가
 * - file_path 또는 body 중 하나 필수
 *
 * State machine:
 *   drafted → submitted → reviewed → closed
 */
import { z } from "zod";

export const CONSULTATION_KINDS = ["resume", "cover_letter", "portfolio"] as const;
export const ConsultationKindSchema = z.enum(CONSULTATION_KINDS);
export type ConsultationKind = z.infer<typeof ConsultationKindSchema>;

export const CONSULTATION_STATUSES = [
  "drafted",
  "submitted",
  "reviewed",
  "closed",
] as const;
export const ConsultationStatusSchema = z.enum(CONSULTATION_STATUSES);
export type ConsultationStatus = z.infer<typeof ConsultationStatusSchema>;

export const ConsultationSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  kind: ConsultationKindSchema,
  version: z.number().int().min(1),

  file_path: z.string().nullable(),
  body: z.string().nullable(),

  status: ConsultationStatusSchema,
  submitted_at: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Consultation = z.infer<typeof ConsultationSchema>;

export const ConsultationReviewSchema = z.object({
  id: z.string().uuid(),
  consultation_id: z.string().uuid(),
  instructor_id: z.string().uuid().nullable(),
  body: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type ConsultationReview = z.infer<typeof ConsultationReviewSchema>;
