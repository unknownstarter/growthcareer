/**
 * Course entity (단과반) — B0068 ADR 0013.
 *
 * domain layer 룰: 외부 의존성 0 (zod 만 허용). Next/React/Supabase import 금지.
 *
 * Invariant:
 * - slug 는 program 안에서만 UNIQUE
 * - price_krw >= 0 (nullable)
 * - session_count > 0 (nullable)
 *
 * State machine:
 *   draft → open → archived
 *   draft → archived (기획 후 폐기)
 *   archived = terminal
 */
import { z } from "zod";

export const COURSE_STATUSES = ["draft", "open", "archived"] as const;

/** courses.min_headcount DB default. row 에 값 없을 때 fallback. */
export const MIN_HEADCOUNT_DEFAULT = 10;

export const CourseStatusSchema = z.enum(COURSE_STATUSES);
export type CourseStatus = z.infer<typeof CourseStatusSchema>;

export const CourseSchema = z.object({
  id: z.string().uuid(),
  program_id: z.string().uuid(),
  slug: z.string().min(1),
  title_ko: z.string().min(1),
  title_en: z.string().nullish(),
  description: z.string().nullish(),
  order_idx: z.number().int(),
  status: CourseStatusSchema,
  price_krw: z.number().int().nonnegative().nullish(),
  session_count: z.number().int().positive().nullish(),
  /** Phase 1a: 개설 최소 정원. DB default 10. 제네릭 정원 판정이 로드. */
  min_headcount: z.number().int().positive().default(MIN_HEADCOUNT_DEFAULT),
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export type Course = z.infer<typeof CourseSchema>;

const ALLOWED_TRANSITIONS: Record<CourseStatus, readonly CourseStatus[]> = {
  draft: ["open", "archived"],
  open: ["archived"],
  archived: [],
};

export function canTransitionCourse(
  from: CourseStatus,
  to: CourseStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalCourseStatus(status: CourseStatus): boolean {
  return status === "archived";
}

/** 판매 노출 대상 — open 만. archived 는 히스토리, draft 는 어드민 내부. */
export function isCoursePubliclyPurchasable(status: CourseStatus): boolean {
  return status === "open";
}
