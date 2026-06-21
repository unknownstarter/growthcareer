"use server";

/**
 * LMS Finance server actions - super_admin / program admin 전용.
 *
 * CRUD 대상:
 *   - cohort_expenses (비용 entry)
 *   - tax_filings (세무 신고 일정 + 상태)
 *
 * 가드: 모든 mutation 첫 줄 assertProgramAdmin('fan-to-pro').
 * (CLAUDE.md §7.4 - middleware path 차단만 신뢰 금지.)
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  insertExpense,
  updateExpense,
  deleteExpense,
  type InsertExpenseInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-expense-repository";
import {
  insertTaxFiling,
  updateTaxFiling,
  deleteTaxFiling,
  type InsertFilingInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/tax-filing-repository";
import { EXPENSE_CATEGORIES, EXPENSE_STATUSES } from "@/src/programs/fan-to-pro/domain/entities/cohort-expense";
import { FILING_TYPES, FILING_STATUSES } from "@/src/programs/fan-to-pro/domain/entities/tax-filing";

/* ─────────────────── cohort_expenses ─────────────────── */

const DateNullable = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const TextNullable = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const InsertExpenseSchema = z.object({
  cohort_id: z.string().uuid(),
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().min(1).max(500),
  amount_krw: z.number().int().min(0).max(1_000_000_000),
  vat_krw: z.number().int().min(0).max(100_000_000).optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  vendor_name: TextNullable,
  vendor_biz_no: TextNullable,
  invoice_number: TextNullable,
  invoice_issued_at: DateNullable,
  paid_at: DateNullable,
  paid_via: TextNullable,
  receipt_url: TextNullable,
  notes: TextNullable,
});

export type ExpenseActionResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

function revalidateFinance() {
  revalidatePath("/ko/fan-to-pro/admin/finance");
  revalidatePath("/en/fan-to-pro/admin/finance");
}

export async function createExpenseAction(
  input: unknown,
): Promise<ExpenseActionResult> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = InsertExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  try {
    const expense = await insertExpense(parsed.data as InsertExpenseInput);
    revalidateFinance();
    return { status: "ok", id: expense.id };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}

const UpdateExpenseSchema = InsertExpenseSchema.omit({ cohort_id: true })
  .partial()
  .extend({ id: z.string().uuid() });

export async function updateExpenseAction(
  input: unknown,
): Promise<ExpenseActionResult> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = UpdateExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const { id, ...patch } = parsed.data;
  try {
    await updateExpense(id, patch);
    revalidateFinance();
    return { status: "ok", id };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function deleteExpenseAction(
  input: unknown,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    await deleteExpense(parsed.data.id);
    revalidateFinance();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}

/* ─────────────────── tax_filings ─────────────────── */

const InsertFilingSchema = z.object({
  filing_type: z.enum(FILING_TYPES),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(FILING_STATUSES).optional(),
  filing_amount_krw: z.number().int().min(0).max(10_000_000_000).nullable().optional(),
  filed_at: DateNullable,
  paid_at: DateNullable,
  reference_no: TextNullable,
  notes: TextNullable,
});

export type FilingActionResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

export async function createFilingAction(
  input: unknown,
): Promise<FilingActionResult> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = InsertFilingSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    const filing = await insertTaxFiling(parsed.data as InsertFilingInput);
    revalidateFinance();
    return { status: "ok", id: filing.id };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}

const UpdateFilingSchema = InsertFilingSchema.partial().extend({
  id: z.string().uuid(),
});

export async function updateFilingAction(
  input: unknown,
): Promise<FilingActionResult> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = UpdateFilingSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const { id, ...patch } = parsed.data;
  try {
    await updateTaxFiling(id, patch);
    revalidateFinance();
    return { status: "ok", id };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function deleteFilingAction(
  input: unknown,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertProgramAdmin("fan-to-pro");
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    await deleteTaxFiling(parsed.data.id);
    revalidateFinance();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : "unknown" };
  }
}
