/**
 * Cohort revenue query - cohort 단위 매출 합산.
 *
 * 매출 정의: applicants 의 status='paid' 또는 'enrolled' + paid_amount_krw 합.
 * (취소 / 환불은 제외 - 사고 패턴: refunded 도 합산하면 매출 부풀려짐.)
 *
 * 일반 과세 사업자 회계:
 *   매출 (VAT 포함) = paid_amount_krw 합 (현재 880,000 / 830,000)
 *   매출 (VAT 별도) = round(매출_VAT포함 / 1.1)
 *   매출세액         = 매출_VAT포함 - 매출_VAT별도
 *
 * Cache 정책: 신청 / 입금 confirmed 시점이 자주 변하므로 cache 없음 (force-dynamic).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type CohortRevenue = {
  cohort_id: string;
  paid_count: number; // paid + enrolled
  refunded_count: number;
  revenue_inclusive_krw: number; // VAT 포함 매출 (paid_amount_krw 합)
  revenue_exclusive_krw: number; // VAT 별도 매출 (10/11)
  vat_output_krw: number;        // 매출세액 (1/11)
};

export async function fetchCohortRevenue(
  cohortId: string,
): Promise<CohortRevenue> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      cohort_id: cohortId,
      paid_count: 0,
      refunded_count: 0,
      revenue_inclusive_krw: 0,
      revenue_exclusive_krw: 0,
      vat_output_krw: 0,
    };
  }

  const { data, error } = await supabase
    .from("applicants")
    .select("status, paid_amount_krw")
    .eq("cohort_id", cohortId);

  if (error) throw new Error(error.message);

  let paidCount = 0;
  let refundedCount = 0;
  let revenueInclusive = 0;
  for (const row of data ?? []) {
    const r = row as { status: string; paid_amount_krw: number | null };
    if (r.status === "paid" || r.status === "enrolled") {
      paidCount += 1;
      revenueInclusive += r.paid_amount_krw ?? 0;
    } else if (r.status === "refunded") {
      refundedCount += 1;
    }
  }

  // VAT 분리 - 10/110 = VAT, 100/110 = 공급가액 (한국 부가세 룰).
  const revenueExclusive = Math.round(revenueInclusive / 1.1);
  const vatOutput = revenueInclusive - revenueExclusive;

  return {
    cohort_id: cohortId,
    paid_count: paidCount,
    refunded_count: refundedCount,
    revenue_inclusive_krw: revenueInclusive,
    revenue_exclusive_krw: revenueExclusive,
    vat_output_krw: vatOutput,
  };
}
