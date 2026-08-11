/**
 * Cohort entity (기수) — ADR 0005 §6 invariant + state machine.
 *
 * domain layer 룰: 외부 의존성 0 (zod 만 허용). Next/React/Supabase import 금지.
 *
 * Invariant (DB CHECK 와 동기화):
 * - min_to_open ≤ capacity
 * - starts_on < ends_on
 *
 * State machine:
 *   draft → open → enrollment_closed → in_progress → completed
 *                                                  → cancelled
 *   (draft / open / enrollment_closed / in_progress 모두 → cancelled 가능)
 *   completed / cancelled = terminal (out-edge 없음)
 */
import { z } from "zod";

export const COHORT_STATUSES = [
  "draft",
  "open",
  "enrollment_closed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const CohortStatusSchema = z.enum(COHORT_STATUSES);
export type CohortStatus = z.infer<typeof CohortStatusSchema>;

export const CohortSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    starts_on: z.string(), // ISO date (YYYY-MM-DD)
    ends_on: z.string(),
    ceremony_on: z.string().nullable(),
    capacity: z.number().int().positive(),
    min_to_open: z.number().int().positive(),
    status: CohortStatusSchema,
    notes: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string().nullish(),
    // 신규 컬럼 (마이그레이션 20260622000001) — 클라이언트가 select * 시 받음
    program_id: z.string().uuid().nullish(),
    slug: z.string().nullish(),
    accepts_signup_now: z.boolean().nullish(),
    // 기수별 모집 마감 시각 (마이그레이션 20260811000000). NULL = 마감 시각 미설정.
    enrollment_closes_at: z.string().nullish(),
  })
  .refine((c) => c.min_to_open <= c.capacity, {
    message: "min_to_open must be ≤ capacity",
    path: ["min_to_open"],
  })
  .refine((c) => c.starts_on < c.ends_on, {
    message: "starts_on must be < ends_on",
    path: ["starts_on"],
  });

export type Cohort = z.infer<typeof CohortSchema>;

/** 상태 전이 표 — out-edge. terminal (completed/cancelled) 은 빈 배열. */
const ALLOWED_TRANSITIONS: Record<CohortStatus, readonly CohortStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["enrollment_closed", "cancelled"],
  enrollment_closed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionCohort(
  from: CohortStatus,
  to: CohortStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalCohortStatus(status: CohortStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/**
 * 정원 미달 판정 — paid 인원 < min_to_open 이면 폐강 대상.
 * Wave 0 에서는 cohort.status='open' 시점에 dashboard 표시용.
 */
export function shouldCancelForCapacity(
  paidCount: number,
  cohort: Pick<Cohort, "min_to_open">,
): boolean {
  return paidCount < cohort.min_to_open;
}
