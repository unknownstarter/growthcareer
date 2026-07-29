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
 * 출석률 분모 판정 — 이 회차가 "이미 진행된" 회차인가.
 *
 * 근거 (2026-07-23 출석률 0% 사고): 운영자가 세션 lifecycle 전환
 * (scheduled → in_progress → ended) 을 실제로 안 쓰고 출석만 직접 mark 함.
 * 1기 8회차 전부 종강(7/19) 후에도 status="scheduled" 로 남아 있었음.
 * 따라서 `status === "ended"` 만으로 분모를 세면 출석 100% 여도 0% 로 계산됨.
 *
 * 판정: cancelled 는 제외, ended 는 무조건 포함, 그 외에는 물리적으로 끝난
 * (ends_at < now) 회차면 포함. 명시적 status 전환에 의존하지 않아 재발 방지.
 */
export function hasSessionElapsed(
  session: Pick<Session, "status" | "ends_at">,
  now: Date = new Date(),
): boolean {
  if (session.status === "cancelled") return false;
  if (session.status === "ended") return true;
  const endsAt = new Date(session.ends_at).getTime();
  return Number.isFinite(endsAt) && endsAt < now.getTime();
}

/**
 * 출석률 분모용 — 진행된 회차 id 집합 (hasSessionElapsed 기준).
 *
 * 수료증 / admin cohort 개요 / roster / 학생 뷰가 전부 이 헬퍼로 통일해
 * 같은 학생이 어느 화면에서도 동일 출석률을 낸다.
 * (2026-07-23 사고: 계산처마다 분모가 달라 admin 대시보드만 0% 오표시.)
 */
export function getElapsedSessionIds(
  sessions: readonly Pick<Session, "id" | "status" | "ends_at">[],
  now: Date = new Date(),
): Set<string> {
  return new Set(
    sessions.filter((s) => hasSessionElapsed(s, now)).map((s) => s.id),
  );
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
