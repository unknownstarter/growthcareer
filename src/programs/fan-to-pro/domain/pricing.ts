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

export const formatKRW = (value: number): string =>
  `${value.toLocaleString("ko-KR")}원`;

export const discountRate = (original: number, discounted: number): number =>
  Math.round(((original - discounted) / original) * 100);
