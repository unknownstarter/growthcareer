/**
 * Company repository — ADR 0005 §5 concrete function 패턴.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CompanySchema,
  type Company,
} from "@/src/programs/fan-to-pro/domain/entities/company";

const TABLE = "companies";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchAllCompanies(): Promise<Company[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CompanySchema.parse(row));
}

export async function fetchCompanyById(id: string): Promise<Company | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CompanySchema.parse(data);
}

export type InsertCompanyInput = {
  name: string;
  biz_no?: string | null;
  address?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  vat_issuer?: boolean;
  notes?: string | null;
};

export async function insertCompany(input: InsertCompanyInput): Promise<Company> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: input.name,
      biz_no: input.biz_no ?? null,
      address: input.address ?? null,
      contact_name: input.contact_name ?? null,
      contact_email: input.contact_email ?? null,
      bank_name: input.bank_name ?? null,
      bank_account: input.bank_account ?? null,
      bank_holder: input.bank_holder ?? null,
      vat_issuer: input.vat_issuer ?? false,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CompanySchema.parse(data);
}

export type UpdateCompanyInput = Partial<InsertCompanyInput>;

export async function updateCompany(
  id: string,
  patch: UpdateCompanyInput,
): Promise<Company> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CompanySchema.parse(data);
}
