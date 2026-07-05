/**
 * B0083 showcase 컴포넌트 shell 용 formatter.
 *
 * 절대 룰:
 * - 매출은 원 단위 (K / M / 억 축약 금지). §6.6 룰.
 * - 부호 §6.5 (em dash / interpunct 등) X.
 */

/**
 * 원 단위 통화 표기. 1,500,000원 형태.
 *
 * 축약 (K / M / 억) 절대 X. 매출은 항상 원 단위 정수.
 * null 은 "가격 미정" 반환.
 */
export function formatKrw(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "가격 미정";
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

/**
 * 기간 표기. "2026.06.27 - 2026.07.19" 형태 (하이픈만, en dash X).
 * ISO 날짜 문자열 (`YYYY-MM-DD`) 입력.
 */
export function formatPeriod(startDate: string, endDate: string): string {
  return `${formatIsoDate(startDate)} - ${formatIsoDate(endDate)}`;
}

function formatIsoDate(iso: string): string {
  // `YYYY-MM-DD` → `YYYY.MM.DD`
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) {
    return iso;
  }
  return `${y}.${m}.${d}`;
}
