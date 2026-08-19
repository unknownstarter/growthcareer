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
 * 노아 확정값 (2026-07-06, 올인원은 2026-08-05 ADR 0019 로 갱신):
 *   - 얼리버드 550,000 / 정가 660,000 / 올인원 990,000 (정가 1,320,000)
 *   - 기간 1주일 = 7일 * 24h
 */
export const PRICING_PHASES = {
  earlyBirdKrw: 550_000,
  regularKrw: 660_000,
  // ADR 0019 (2026-08-05): 올인원 990,000원 (정가 1,320,000 = 660,000 × 2 에서 할인).
  bundleKrw: 990_000,
  bundleOriginalKrw: 1_320_000,
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

/**
 * 2기 단과 slug → 읽기 쉬운 이름.
 * 어드민 뱃지 (applicants-dashboard / cohort-detail) 의 COURSE_SLUG_LABEL 과 동일.
 */
export const COURSE_SLUG_LABEL_KO: Record<string, string> = {
  "a-r": "A&R",
  sound: "음향 감독",
};

/**
 * 2기 확정 단과 판매가 (courses.price_krw, ADR 0019). 안내 메시지 fallback.
 * DB price_krw 가 주입되면 그 값이 우선.
 */
export const SINGLE_COURSE_KRW = 550_000;

/**
 * 신청자 선택 → 메시지 안내용 수강료 + 과정 라벨 계산 (ADR 0019).
 *
 * 우선순위: 넘어온 DB price_krw (coursePriceKrw / bundlePriceKrw) 있으면 그 값,
 * 없으면 phase / bundle 상수 fallback (resolve*PriceKrw 재사용).
 *
 * 케이스:
 *   - all_in_one                → 990,000원, 라벨 "올인원 (전 과정)"
 *   - single + [a-r]            → 550,000원, 라벨 "A&R 단과반"
 *   - single + [sound]          → 550,000원, 라벨 "음향 감독 단과반"
 *   - single + 2슬러그 (방어)   → 올인원 취급 (990,000, "올인원 (전 과정)")
 *     (폼에서 단과 2개 선택은 올인원으로 승격되지만, 잔여/legacy 데이터 방어)
 *   - null / 미선택 (1기)       → 880,000원, courseLabel null (기존 메시지 불변)
 *
 * @param selectionMode applicants.selection_mode ('all_in_one'|'single'|null)
 * @param selectedCourseSlugs applicants.selected_course_slugs (예 ["a-r"]) | null
 * @param locale "ko" | "en" — 금액 포맷 + 라벨 언어
 * @param priceHints DB 오버라이드 (선택). courseId/bundleId 해결된 경우 price 주입.
 */
export function resolveTuitionForApplicant(
  selectionMode: string | null,
  selectedCourseSlugs: string[] | null,
  locale: "ko" | "en" = "ko",
  priceHints?: {
    coursePriceKrw?: number | null;
    bundlePriceKrw?: number | null;
  },
): { krw: number; tuition: string; courseLabel: string | null } {
  const slugs = selectedCourseSlugs ?? [];

  // 메시지 템플릿 스타일 (TUITION_KO/EN) 과 일치: ko "990,000원", en "KRW 990,000".
  // formatKRW 는 en 을 접미사 ("990,000 KRW") 로 내므로 여기선 별도 포맷.
  const fmt = (krw: number): string =>
    locale === "ko"
      ? `${krw.toLocaleString("ko-KR")}원`
      : `KRW ${krw.toLocaleString("en-US")}`;

  // 1기 legacy — selection 개념 없음. 880,000 고정, 라벨 없음 (기존 메시지 불변).
  if (!selectionMode) {
    const krw = PRICING.discounted; // 880,000
    return { krw, tuition: fmt(krw), courseLabel: null };
  }

  // 올인원 — 또는 방어적으로 단과 2개 이상 선택 = 올인원 취급.
  if (selectionMode === "all_in_one" || slugs.length >= 2) {
    const krw = resolveBundlePriceKrw(priceHints?.bundlePriceKrw);
    return {
      krw,
      tuition: fmt(krw),
      courseLabel: locale === "ko" ? "올인원 (전 과정)" : "All-in-one (all courses)",
    };
  }

  // 단과 — slug 1개. DB price_krw 있으면 우선, 없으면 확정 단과가 550,000
  // (courses.price_krw = 550,000, ADR 0019). phase 상수(660k)는 안내 메시지엔
  // 부적합 (실제 판매가와 다름) 이라 사용 안 함.
  const krw =
    typeof priceHints?.coursePriceKrw === "number" && priceHints.coursePriceKrw > 0
      ? priceHints.coursePriceKrw
      : SINGLE_COURSE_KRW;
  const slug = slugs[0];
  const courseName =
    slug === "sound"
      ? locale === "ko"
        ? "음향 감독"
        : "Sound Director"
      : locale === "ko"
        ? "A&R"
        : "A&R";
  const courseLabel =
    locale === "ko" ? `${courseName} 단과반` : `${courseName} (single course)`;
  return { krw, tuition: fmt(krw), courseLabel };
}
