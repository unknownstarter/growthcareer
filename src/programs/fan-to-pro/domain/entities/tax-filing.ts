/**
 * TaxFiling entity - 세무 신고 일정 + 상태.
 *
 * 노아 = 일반 과세 사업자 (Dropdown, 154-28-02110), 학원 미등록.
 *
 * Filing types:
 *   vat_q1              - 부가세 1기 (1-6월), due 7/25
 *   vat_q2              - 부가세 2기 (7-12월), due 익년 1/25
 *   vat_predeclaration  - 부가세 예정신고 (4/25, 10/25) - 일반 사업자는 보통 안 함
 *   income_tax          - 종합소득세, due 익년 5/31
 *   withholding_report  - 원천징수 지급명세서, due 익년 3/10
 *
 * State machine:
 *   pending → in_progress → filed → paid
 *           → not_applicable (해당 없음 - 예: 매출 0 / 강사 세금계산서 발행 시 원천징수 X)
 *
 * domain layer 룰: 외부 의존성 0 (zod 만).
 */
import { z } from "zod";

export const FILING_TYPES = [
  "vat_q1",
  "vat_q2",
  "vat_predeclaration",
  "income_tax",
  "withholding_report",
] as const;

export const FILING_STATUSES = [
  "pending",
  "in_progress",
  "filed",
  "paid",
  "not_applicable",
] as const;

export const FilingTypeSchema = z.enum(FILING_TYPES);
export type FilingType = z.infer<typeof FilingTypeSchema>;

export const FilingStatusSchema = z.enum(FILING_STATUSES);
export type FilingStatus = z.infer<typeof FilingStatusSchema>;

export const TaxFilingSchema = z.object({
  id: z.string().uuid(),
  filing_type: FilingTypeSchema,
  period_start: z.string(),
  period_end: z.string(),
  due_date: z.string(),
  status: FilingStatusSchema,
  filing_amount_krw: z.number().int().nullish(),
  filed_at: z.string().nullish(),
  paid_at: z.string().nullish(),
  reference_no: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export type TaxFiling = z.infer<typeof TaxFilingSchema>;

export const FILING_TYPE_LABEL_KO: Record<FilingType, string> = {
  vat_q1: "부가세 1기 (1-6월)",
  vat_q2: "부가세 2기 (7-12월)",
  vat_predeclaration: "부가세 예정신고",
  income_tax: "종합소득세",
  withholding_report: "원천징수 지급명세서",
};

export const FILING_STATUS_LABEL_KO: Record<FilingStatus, string> = {
  pending: "예정",
  in_progress: "진행 중",
  filed: "신고 완료",
  paid: "납부 완료",
  not_applicable: "해당 없음",
};

/**
 * D-day 계산 (오늘 기준 due_date 까지 남은 일수).
 * 음수 = 지난 일수.
 */
export function daysUntilDue(dueDateIso: string, todayIso?: string): number {
  const today = todayIso ? new Date(todayIso + "T00:00:00+09:00") : new Date();
  const due = new Date(dueDateIso + "T23:59:59+09:00");
  return Math.ceil((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** 30일 이내 due + 미완료 상태인지 (강조 표시용). */
export function isUpcoming(
  filing: Pick<TaxFiling, "due_date" | "status">,
  thresholdDays = 30,
): boolean {
  if (filing.status === "filed" || filing.status === "paid" || filing.status === "not_applicable") {
    return false;
  }
  const days = daysUntilDue(filing.due_date);
  return days >= 0 && days <= thresholdDays;
}

/** 지났는데 미완료 → overdue. */
export function isOverdue(
  filing: Pick<TaxFiling, "due_date" | "status">,
): boolean {
  if (filing.status === "filed" || filing.status === "paid" || filing.status === "not_applicable") {
    return false;
  }
  return daysUntilDue(filing.due_date) < 0;
}
