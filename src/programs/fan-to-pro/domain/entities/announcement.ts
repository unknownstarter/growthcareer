/**
 * Announcement entity (공지) — ADR 0005 §6.
 *
 * Invariant:
 * - cohort_id required
 * - published_at ≤ now 일 때만 학생에게 visible
 *
 * State machine:
 *   draft → published → archived
 */
import { z } from "zod";

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export const AnnouncementStatusSchema = z.enum(ANNOUNCEMENT_STATUSES);
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusSchema>;

export const AnnouncementSchema = z.object({
  id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  created_by: z.string().uuid().nullable(),

  title: z.string().min(1),
  body: z.string().min(1),
  pinned: z.boolean(),
  status: AnnouncementStatusSchema,
  published_at: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;
