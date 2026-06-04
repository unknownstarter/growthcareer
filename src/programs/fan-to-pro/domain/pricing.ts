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
