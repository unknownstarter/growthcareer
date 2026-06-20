/**
 * Session entity — ADR 0005 §6.
 *
 * Invariant:
 * - starts_at < ends_at
 * - (cohort_id, idx) UNIQUE
 * - instructor 가 cohort instructor pool ∈ (Wave 1+ 강제, Wave 0 는 단순 FK)
 *
 * State machine:
 *   scheduled → in_progress → ended
 *   scheduled / in_progress → cancelled
 *   ended / cancelled = terminal
 */
import { z } from "zod";

export const SESSION_STATUSES = [
  "scheduled",
  "in_progress",
  "ended",
  "cancelled",
] as const;

export const SessionStatusSchema = z.enum(SESSION_STATUSES);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SESSION_DAYS_OF_WEEK = ["saturday", "sunday"] as const;
export const SessionDayOfWeekSchema = z.enum(SESSION_DAYS_OF_WEEK);
export type SessionDayOfWeek = z.infer<typeof SessionDayOfWeekSchema>;

export const SessionSchema = z
  .object({
    id: z.string().uuid(),
    cohort_id: z.string().uuid(),
    instructor_id: z.string().uuid().nullable(),
    title: z.string().min(1),
    location: z.string().nullable(),
    starts_at: z.string(), // ISO datetime
    ends_at: z.string(),
    idx: z.number().int().positive().nullable(),
    day_of_week: SessionDayOfWeekSchema.nullable(),
    topic: z.string().nullable(),
    notes: z.string().nullable(),
    status: SessionStatusSchema,
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .refine((s) => s.starts_at < s.ends_at, {
    message: "starts_at must be < ends_at",
    path: ["starts_at"],
  });

export type Session = z.infer<typeof SessionSchema>;

const ALLOWED_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  scheduled: ["in_progress", "cancelled"],
  in_progress: ["ended", "cancelled"],
  ended: [],
  cancelled: [],
};

export function canTransitionSession(
  from: SessionStatus,
  to: SessionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalSessionStatus(status: SessionStatus): boolean {
  return status === "ended" || status === "cancelled";
}

/**
 * session 의 KST 표시 — UI 가 사용. UTC ISO → KST datetime 문자열.
 * domain 안에 둠 (시간 표시 룰은 비즈니스 룰).
 */
export function formatSessionTimeKst(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(d);
}
