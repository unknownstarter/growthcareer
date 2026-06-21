/**
 * CohortExpense entity - cohort 단위 비용 entry.
 *
 * 회계 모델 (일반 과세 사업자):
 *   amount_krw = 부가세 별도 금액 (공급가액)
 *   vat_krw    = 부가세 (보통 10%)
 *   total_krw  = generated (amount + vat)
 *
 *   status='paid' 또는 'committed' 합산이 손익 계산 입력.
 *   vat_krw 합산이 매입세액 (부가세 환급).
 *
 * State machine:
 *   planned → committed → paid
 *                       → cancelled
 *   paid → reimbursed (환수 시)
 *
 * domain layer 룰: 외부 의존성 0 (zod 만).
 */
import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "instructor_fee",
  "venue_rental",
  "event",
  "materials",
  "marketing",
  "other",
] as const;

export const EXPENSE_STATUSES = [
  "planned",
  "committed",
  "paid",
  "reimbursed",
  "cancelled",
] as const;

export const ExpenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const ExpenseStatusSchema = z.enum(EXPENSE_STATUSES);
export type ExpenseStatus = z.infer<typeof ExpenseStatusSchema>;

export const CohortExpenseSchema = z.object({
  id: z.string().uuid(),
  cohort_id: z.string().uuid(),
  category: ExpenseCategorySchema,
  description: z.string().min(1),
  amount_krw: z.number().int().min(0),
  vat_krw: z.number().int().min(0),
  total_krw: z.number().int().min(0),
  status: ExpenseStatusSchema,
  vendor_name: z.string().nullish(),
  vendor_biz_no: z.string().nullish(),
  invoice_number: z.string().nullish(),
  invoice_issued_at: z.string().nullish(),
  paid_at: z.string().nullish(),
  paid_via: z.string().nullish(),
  receipt_url: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().uuid().nullish(),
  created_at: z.string(),
  updated_at: z.string().nullish(),
});

export type CohortExpense = z.infer<typeof CohortExpenseSchema>;

export const EXPENSE_CATEGORY_LABEL_KO: Record<ExpenseCategory, string> = {
  instructor_fee: "강사료 (외주비)",
  venue_rental: "임차료 (강의장)",
  event: "회의비 / 행사비",
  materials: "소모품비 / 자료비",
  marketing: "영업판촉비 / 광고선전비",
  other: "기타",
};

export const EXPENSE_STATUS_LABEL_KO: Record<ExpenseStatus, string> = {
  planned: "예정",
  committed: "확정",
  paid: "지급 완료",
  reimbursed: "환수",
  cancelled: "취소",
};

/**
 * 손익 합산 시 비용으로 인정하는 status.
 * - committed = 계약 체결 (회계상 미지급비용)
 * - paid      = 실 지급
 * - reimbursed = 환수받음 → 비용 차감 (실제 net 비용에서 빠짐)
 * - planned   = 아직 미확정 (분리 표시)
 * - cancelled = 취소 (제외)
 */
export function isCountedAsExpense(status: ExpenseStatus): boolean {
  return status === "committed" || status === "paid";
}

/**
 * 부가세 매입세액 합산 시 인정 - 세금계산서 발급 받은 경우만.
 * paid + invoice_number 있어야 환급 가능 (현실 회계 룰).
 * 본 함수는 단순화: status=paid 또는 committed 이면 vat 인정 가정.
 * 더 엄밀히는 invoice_number 있을 때만 합산.
 */
export function isVatReclaimable(expense: Pick<CohortExpense, "status" | "invoice_number">): boolean {
  if (!isCountedAsExpense(expense.status)) return false;
  return Boolean(expense.invoice_number);
}
