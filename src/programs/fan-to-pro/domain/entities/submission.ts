/**
 * Submission entity (과제 제출) — ADR 0005 §6.
 *
 * Invariant:
 * - (assignment_id, student_id, version) UNIQUE
 * - file_path 또는 body 중 하나 필수
 *
 * State machine:
 *   draft → submitted → reviewed
 */
import { z } from "zod";

export const SUBMISSION_STATUSES = ["draft", "submitted", "reviewed"] as const;
export const SubmissionStatusSchema = z.enum(SUBMISSION_STATUSES);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const SubmissionSchema = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  student_id: z.string().uuid(),
  version: z.number().int().min(1),

  file_path: z.string().nullable(),
  file_size_bytes: z.number().int().nullable(),
  mime_type: z.string().nullable(),
  body: z.string().nullable(),

  status: SubmissionStatusSchema,
  submitted_at: z.string(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Submission = z.infer<typeof SubmissionSchema>;
