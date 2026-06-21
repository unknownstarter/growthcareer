/**
 * CohortExpense repository - ADR 0005 §5 concrete function 패턴.
 *
 * service_role 사용. RLS 는 2차 방어선 (super_admin only).
 * 1차 가드는 server action 의 assertProgramAdmin / assertSuperAdmin.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CohortExpenseSchema,
  type CohortExpense,
  type ExpenseCategory,
  type ExpenseStatus,
} from "@/src/programs/fan-to-pro/domain/entities/cohort-expense";

const TABLE = "cohort_expenses";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchExpensesByCohort(
  cohortId: string,
): Promise<CohortExpense[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CohortExpenseSchema.parse(row));
}

export type InsertExpenseInput = {
  cohort_id: string;
  category: ExpenseCategory;
  description: string;
  amount_krw: number;
  vat_krw?: number;
  status?: ExpenseStatus;
  vendor_name?: string | null;
  vendor_biz_no?: string | null;
  invoice_number?: string | null;
  invoice_issued_at?: string | null;
  paid_at?: string | null;
  paid_via?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
};

export async function insertExpense(
  input: InsertExpenseInput,
): Promise<CohortExpense> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      cohort_id: input.cohort_id,
      category: input.category,
      description: input.description,
      amount_krw: input.amount_krw,
      vat_krw: input.vat_krw ?? 0,
      status: input.status ?? "planned",
      vendor_name: input.vendor_name ?? null,
      vendor_biz_no: input.vendor_biz_no ?? null,
      invoice_number: input.invoice_number ?? null,
      invoice_issued_at: input.invoice_issued_at ?? null,
      paid_at: input.paid_at ?? null,
      paid_via: input.paid_via ?? null,
      receipt_url: input.receipt_url ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CohortExpenseSchema.parse(data);
}

export type UpdateExpenseInput = Partial<Omit<InsertExpenseInput, "cohort_id">>;

export async function updateExpense(
  id: string,
  patch: UpdateExpenseInput,
): Promise<CohortExpense> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CohortExpenseSchema.parse(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
