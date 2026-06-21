/**
 * Feedback entity (강사 피드백) — ADR 0005 §6.
 *
 * Invariant:
 * - instructor 가 cohort pool ∈ (use case 가드)
 * - submission.student ≠ instructor 본인 (DB 도메인 분리상 자명)
 */
import { z } from "zod";

export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  instructor_id: z.string().uuid().nullable(),

  body: z.string().min(1),
  score: z.number().int().min(0).max(100).nullable(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;
