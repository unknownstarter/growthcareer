/**
 * Query — instructor list + user_profile + company.
 *
 * /lms/admin/instructors 페이지가 사용.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type InstructorWithProfile = {
  instructor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  company_name: string | null;
  tax_mode: "withholding_3_3" | "tax_invoice";
  invited: boolean;
  last_login_at: string | null;
};

export async function fetchInstructorsWithProfiles(): Promise<
  | { status: "ok"; data: InstructorWithProfile[] }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data: instructors, error } = await supabase
    .from("instructors")
    .select(
      "id, name, email, phone, company_id, tax_mode, companies(name)",
    )
    .order("name", { ascending: true });
  if (error) return { status: "error", error: error.message };

  const rows = (instructors ?? []) as Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company_id: string | null;
    tax_mode: string;
    companies?: { name?: string } | null;
  }>;

  const ids = rows.map((r) => r.id);
  let profileMap = new Map<string, { last_login_at: string | null }>();
  if (ids.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("user_profiles")
      .select("instructor_id, last_login_at")
      .in("instructor_id", ids);
    if (pErr) return { status: "error", error: pErr.message };
    profileMap = new Map(
      (profiles ?? []).map((p) => {
        const raw = p as Record<string, unknown>;
        return [
          String(raw.instructor_id ?? ""),
          {
            last_login_at: raw.last_login_at ? String(raw.last_login_at) : null,
          },
        ];
      }),
    );
  }

  return {
    status: "ok",
    data: rows.map((r) => {
      const profile = profileMap.get(r.id);
      return {
        instructor_id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        company_id: r.company_id,
        company_name: r.companies?.name ?? null,
        tax_mode:
          r.tax_mode === "tax_invoice" ? "tax_invoice" : "withholding_3_3",
        invited: !!profile,
        last_login_at: profile?.last_login_at ?? null,
      };
    }),
  };
}
