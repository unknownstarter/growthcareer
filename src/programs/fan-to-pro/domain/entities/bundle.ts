/**
 * Bundle entity (올인원 = 여러 course + 할인) — B0068 ADR 0013.
 *
 * domain layer 룰: 외부 의존성 0.
 *
 * Invariant:
 * - discount_percent 0~100 (nullable)
 * - price_krw = 할인 후 최종 가격 (개별 course sum 이 아님. 정합성은 어드민 UI 책임)
 *
 * State machine:
 *   draft → open → archived
 *   draft → archived
 *   archived = terminal
 */
import { z } from "zod";

export const BUNDLE_STATUSES = ["draft", "open", "archived"] as const;

export const BundleStatusSchema = z.enum(BUNDLE_STATUSES);
export type BundleStatus = z.infer<typeof BundleStatusSchema>;

export const BundleSchema = z.object({
  id: z.string().uuid(),
  program_id: z.string().uuid(),
  slug: z.string().min(1),
  title_ko: z.string().min(1),
  title_en: z.string().nullish(),
  description: z.string().nullish(),
  price_krw: z.number().int().nonnegative().nullish(),
  discount_percent: z.number().min(0).max(100).nullish(),
  status: BundleStatusSchema,
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export type Bundle = z.infer<typeof BundleSchema>;

const ALLOWED_TRANSITIONS: Record<BundleStatus, readonly BundleStatus[]> = {
  draft: ["open", "archived"],
  open: ["archived"],
  archived: [],
};

export function canTransitionBundle(
  from: BundleStatus,
  to: BundleStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminalBundleStatus(status: BundleStatus): boolean {
  return status === "archived";
}

/** 판매 노출 대상 — open 만. */
export function isBundlePubliclyPurchasable(status: BundleStatus): boolean {
  return status === "open";
}
