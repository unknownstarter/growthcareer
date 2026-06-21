/**
 * Event entity (캘린더 이벤트) — ADR 0005 §6.
 *
 * Invariant:
 * - starts_at < ends_at (DB CHECK)
 *
 * State machine:
 *   scheduled → completed / cancelled
 */
import { z } from "zod";

export const EVENT_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export const EventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof EventStatusSchema>;

export const EventSchema = z.object({
  id: z.string().uuid(),
  cohort_id: z.string().uuid().nullable(),

  title: z.string().min(1),
  description: z.string().nullable(),
  location: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),

  status: EventStatusSchema,

  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Event = z.infer<typeof EventSchema>;
