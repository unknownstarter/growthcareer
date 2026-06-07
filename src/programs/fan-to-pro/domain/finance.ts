/**
 * Finance - 재무 집계 도메인 타입.
 *
 * B0018 Wave 2 T6 의 fetchFinanceKpi / exportFinanceCsv 가 반환하는 결과
 * 타입을 단일 진실 소스로 박제한다. UI 와 server action 양쪽이 import.
 *
 * KPI 정의 (spec §4.2 노아 결정 10, 4장):
 *   - revenue            : applicants.paid_amount_krw 합계 (status ∈ paid|enrolled).
 *   - refunds            : applicants.paid_amount_krw 합계 (status = refunded).
 *   - instructorPayouts  : instructor_payouts.net_krw 합계 (paid_at NOT NULL).
 *   - margin             : revenue - refunds - instructorPayouts.
 *                          marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0.
 */

export type FinanceKpiBucket = {
  count: number;
  totalKrw: number;
};

export type FinanceKpi = {
  revenue: FinanceKpiBucket;
  refunds: FinanceKpiBucket;
  instructorPayouts: FinanceKpiBucket;
  margin: {
    krw: number;
    percent: number;
  };
};

export type FinanceKpiResult =
  | { status: "ok"; kpi: FinanceKpi }
  | { status: "error"; error: string };

/**
 * CSV export 의 단일 row.
 *
 * 회계사 공유용 단일 ledger. 분류 (kind) 로 매출/환불/강사료 모두 한 파일에.
 */
export type FinanceLedgerRow = {
  date: string;        // YYYY-MM-DD (KST 기준)
  kind: "revenue" | "refund" | "instructor_payout";
  refId: string;       // applicant_id 또는 instructor_id
  refLabel: string;    // 이름 (PII 파기된 경우 [redacted])
  amountKrw: number;   // 매출 +, 환불 -, 강사료 -
  notes: string;
};

export type FinanceCsvResult =
  | {
      status: "ok";
      csv: string;
      filename: string;
      rowCount: number;
    }
  | { status: "error"; error: string };
