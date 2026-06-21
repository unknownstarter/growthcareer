/**
 * TaxFiling repository - ADR 0005 §5 concrete function 패턴.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  TaxFilingSchema,
  type TaxFiling,
  type FilingStatus,
  type FilingType,
} from "@/src/programs/fan-to-pro/domain/entities/tax-filing";

const TABLE = "tax_filings";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchAllTaxFilings(): Promise<TaxFiling[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => TaxFilingSchema.parse(row));
}

export type InsertFilingInput = {
  filing_type: FilingType;
  period_start: string;
  period_end: string;
  due_date: string;
  status?: FilingStatus;
  filing_amount_krw?: number | null;
  filed_at?: string | null;
  paid_at?: string | null;
  reference_no?: string | null;
  notes?: string | null;
};

export async function insertTaxFiling(
  input: InsertFilingInput,
): Promise<TaxFiling> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      filing_type: input.filing_type,
      period_start: input.period_start,
      period_end: input.period_end,
      due_date: input.due_date,
      status: input.status ?? "pending",
      filing_amount_krw: input.filing_amount_krw ?? null,
      filed_at: input.filed_at ?? null,
      paid_at: input.paid_at ?? null,
      reference_no: input.reference_no ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return TaxFilingSchema.parse(data);
}

export type UpdateFilingInput = Partial<InsertFilingInput>;

export async function updateTaxFiling(
  id: string,
  patch: UpdateFilingInput,
): Promise<TaxFiling> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return TaxFilingSchema.parse(data);
}

export async function deleteTaxFiling(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
