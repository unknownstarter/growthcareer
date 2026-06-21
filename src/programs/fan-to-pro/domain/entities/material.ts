/**
 * Material entity (강의 자료) — ADR 0005 §6.
 *
 * Invariant:
 * - cohort_id required
 * - published_at ≤ now 일 때만 student visible (status='published')
 *
 * State machine:
 *   draft → published → archived
 */
import { z } from "zod";

export const MATERIAL_STATUSES = ["draft", "published", "archived"] as const;
export const MaterialStatusSchema = z.enum(MATERIAL_STATUSES);
export type MaterialStatus = z.infer<typeof MaterialStatusSchema>;

export const MaterialSchema = z.object({
  id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  session_id: z.string().uuid().nullable(),
  uploaded_by: z.string().uuid().nullable(),

  title: z.string().min(1),
  description: z.string().nullable(),
  file_path: z.string().min(1),
  file_size_bytes: z.number().int().nullable(),
  mime_type: z.string().nullable(),

  status: MaterialStatusSchema,
  published_at: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Material = z.infer<typeof MaterialSchema>;

const ALLOWED: Record<MaterialStatus, readonly MaterialStatus[]> = {
  draft: ["published", "archived"],
  published: ["archived"],
  archived: ["published"],
};

export function canTransitionMaterial(
  from: MaterialStatus,
  to: MaterialStatus,
): boolean {
  return ALLOWED[from].includes(to);
}
