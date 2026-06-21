/**
 * Assignment entity (과제) — ADR 0005 §6.
 *
 * Invariant:
 * - due_at > created_at (DB CHECK)
 *
 * State machine:
 *   open → closed → archived
 */
import { z } from "zod";

export const ASSIGNMENT_STATUSES = ["open", "closed", "archived"] as const;
export const AssignmentStatusSchema = z.enum(ASSIGNMENT_STATUSES);
export type AssignmentStatus = z.infer<typeof AssignmentStatusSchema>;

export const AssignmentSchema = z.object({
  id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  session_id: z.string().uuid().nullable(),
  created_by: z.string().uuid().nullable(),

  title: z.string().min(1),
  description: z.string(),
  due_at: z.string(),

  status: AssignmentStatusSchema,

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Assignment = z.infer<typeof AssignmentSchema>;
