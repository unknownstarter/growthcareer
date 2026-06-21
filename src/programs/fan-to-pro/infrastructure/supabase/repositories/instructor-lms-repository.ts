/**
 * Instructor LMS repository — Wave 2 회사 단위 LMS 페이지에서 사용.
 *
 * 기존 `fan-to-pro/admin/fetch-instructors.ts` (다크 어드민 readonly) 는 변경 X.
 * 본 파일은 신규 /lms/admin/instructors 의 invite + company 연결 작업용.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type InstructorLmsRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  tax_mode: "withholding_3_3" | "tax_invoice";
};

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchInstructorsLms(): Promise<InstructorLmsRow[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("instructors")
    .select("id, name, email, phone, company_id, tax_mode")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    return {
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      email: raw.email ? String(raw.email) : null,
      phone: raw.phone ? String(raw.phone) : null,
      company_id: raw.company_id ? String(raw.company_id) : null,
      tax_mode:
        raw.tax_mode === "tax_invoice"
          ? "tax_invoice"
          : "withholding_3_3",
    };
  });
}

export async function fetchInstructorById(
  id: string,
): Promise<InstructorLmsRow | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("instructors")
    .select("id, name, email, phone, company_id, tax_mode")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const raw = data as Record<string, unknown>;
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: raw.email ? String(raw.email) : null,
    phone: raw.phone ? String(raw.phone) : null,
    company_id: raw.company_id ? String(raw.company_id) : null,
    tax_mode:
      raw.tax_mode === "tax_invoice" ? "tax_invoice" : "withholding_3_3",
  };
}

/** instructor 의 company_id 변경. */
export async function updateInstructorCompany(
  instructorId: string,
  companyId: string | null,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from("instructors")
    .update({ company_id: companyId })
    .eq("id", instructorId);
  if (error) throw new Error(error.message);
}
