/**
 * Pricing — 단일 진실 소스. 컴포넌트는 이 모듈만 참조.
 */
export const PRICING = {
  original: 1_100_000,
  discounted: 880_000,
  currency: "KRW" as const,
  vatIncluded: true,
  paymentMethod: "bank_transfer" as const,
  bank: {
    accountHolder: "Dropdown",
    bankName: "토스뱅크" as string | null,
    accountNumber: "1002-4759-1521" as string | null,
  },
  scarcity: "first_come_first_served" as const,
} as const;

/**
 * Locale-aware KRW 포맷터.
 * - ko: `880,000원`
 * - en (그 외 모든 로케일): `880,000 KRW`
 *
 * 시그니처 변경 — locale 인자 필수. 호출부는 `useLocale()` 또는
 * `getLocale()` 결과를 주입. 누락 시 안전한 기본값으로 ko 사용.
 */
export const formatKRW = (value: number, locale: string = "ko"): string => {
  const formatted = value.toLocaleString(
    locale === "ko" ? "ko-KR" : "en-US",
  );
  return locale === "ko" ? `${formatted}원` : `${formatted} KRW`;
};

export const discountRate = (original: number, discounted: number): number =>
  Math.round(((original - discounted) / original) * 100);

/**
 * B0068 Slice 2c — 2기+ pricing phase.
 *
 * 얼리버드 (recruitmentStartsAt 부터 7일간) = 550,000원
 * 정가                                    = 660,000원
 * 올인원 (bundle)                          = 880,000원 (bundles.price_krw 우선)
 *
 * 시점 결정 우선순위:
 *   1) DB courses.price_krw / bundles.price_krw 가 있으면 그 값 사용 (운영자 오버라이드)
 *   2) 없으면 아래 phase 상수로 fallback
 *
 * 얼리버드 기간은 recruitmentStartsAt 이 확정된 후에만 계산됨.
 * 미지정 (null) 이면 얼리버드 항상 false → 정가로 표시.
 *
 * 노아 확정값 (2026-07-06):
 *   - 얼리버드 550,000 / 정가 660,000 / 올인원 880,000
 *   - 기간 1주일 = 7일 * 24h
 */
export const PRICING_PHASES = {
  earlyBirdKrw: 550_000,
  regularKrw: 660_000,
  bundleKrw: 880_000,
  earlyBirdDurationMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export type PricingPhase = "earlybird" | "regular";

/**
 * 현재 phase 판정.
 * @param recruitmentStartsAt ISO string. null 이면 항상 "regular".
 * @param now 테스트용 주입.
 */
export function getCurrentPricingPhase(
  recruitmentStartsAt: string | null,
  now: Date = new Date(),
): PricingPhase {
  if (!recruitmentStartsAt) return "regular";
  const start = new Date(recruitmentStartsAt).getTime();
  const earlyBirdEnd = start + PRICING_PHASES.earlyBirdDurationMs;
  const nowMs = now.getTime();
  if (nowMs >= start && nowMs < earlyBirdEnd) return "earlybird";
  return "regular";
}

/**
 * 단과 course 의 표시 가격.
 * DB price_krw 우선 → phase 기반 fallback.
 */
export function resolveCoursePriceKrw(
  coursePriceKrw: number | null | undefined,
  phase: PricingPhase,
): number {
  if (typeof coursePriceKrw === "number" && coursePriceKrw > 0) {
    return coursePriceKrw;
  }
  return phase === "earlybird"
    ? PRICING_PHASES.earlyBirdKrw
    : PRICING_PHASES.regularKrw;
}

/**
 * 올인원 bundle 의 표시 가격.
 * DB price_krw 우선 → 880,000 fallback.
 */
export function resolveBundlePriceKrw(
  bundlePriceKrw: number | null | undefined,
): number {
  if (typeof bundlePriceKrw === "number" && bundlePriceKrw > 0) {
    return bundlePriceKrw;
  }
  return PRICING_PHASES.bundleKrw;
}
