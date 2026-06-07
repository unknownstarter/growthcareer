/**
 * Instructors + payouts read-side.
 *
 * /admin/instructors 페이지의 server component 가 SSR 로 호출.
 * service_role 키 → middleware Basic Auth 가 단일 게이트.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type {
  InstructorPayoutRow,
  InstructorRow,
  InstructorTaxMode,
  InstructorDay,
} from "@/src/programs/fan-to-pro/domain/instructor";

function asTaxMode(value: unknown): InstructorTaxMode {
  return value === "tax_invoice" ? "tax_invoice" : "withholding_3_3";
}

function asDay(value: unknown): InstructorDay {
  return value === "sunday" ? "sunday" : "saturday";
}

export async function fetchInstructors(): Promise<{
  rows: InstructorRow[];
  error: string | null;
  supabaseAvailable: boolean;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { rows: [], error: null, supabaseAvailable: false };
  }

  const { data, error } = await supabase
    .from("instructors")
    .select(
      [
        "id",
        "name",
        "day",
        "phone",
        "email",
        "bank_name",
        "bank_account",
        "bank_holder",
        "tax_mode",
        "business_no",
        "resident_no",
        "base_fee_krw",
        "bonus_thirty_krw",
        "notes",
        "created_at",
      ].join(","),
    )
    .order("day", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return { rows: [], error: error.message, supabaseAvailable: true };
  }

  const rows: InstructorRow[] = (data ?? []).map((r) => {
    const raw = r as unknown as Record<string, unknown>;
    return {
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      day: asDay(raw.day),
      phone: raw.phone ? String(raw.phone) : null,
      email: raw.email ? String(raw.email) : null,
      bankName: raw.bank_name ? String(raw.bank_name) : null,
      bankAccount: raw.bank_account ? String(raw.bank_account) : null,
      bankHolder: raw.bank_holder ? String(raw.bank_holder) : null,
      taxMode: asTaxMode(raw.tax_mode),
      businessNo: raw.business_no ? String(raw.business_no) : null,
      residentNo: raw.resident_no ? String(raw.resident_no) : null,
      baseFeeKrw:
        typeof raw.base_fee_krw === "number" ? raw.base_fee_krw : 0,
      bonusThirtyKrw:
        typeof raw.bonus_thirty_krw === "number"
          ? raw.bonus_thirty_krw
          : null,
      notes: raw.notes ? String(raw.notes) : null,
      createdAt: String(raw.created_at ?? ""),
    };
  });

  return { rows, error: null, supabaseAvailable: true };
}

export async function fetchInstructorPayouts(options?: {
  cohortLabel?: string;
}): Promise<{
  rows: InstructorPayoutRow[];
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) return { rows: [], error: null };

  let query = supabase
    .from("instructor_payouts")
    .select(
      [
        "id",
        "instructor_id",
        "cohort_label",
        "base_fee_krw",
        "tax_krw",
        "net_krw",
        "enrolled_count_snapshot",
        "tax_mode_snapshot",
        "paid_at",
        "paid_by",
        "notes",
        "created_at",
      ].join(","),
    )
    .order("created_at", { ascending: false });

  if (options?.cohortLabel) {
    query = query.eq("cohort_label", options.cohortLabel);
  }

  const { data, error } = await query;
  if (error) return { rows: [], error: error.message };

  const rows: InstructorPayoutRow[] = (data ?? []).map((r) => {
    const raw = r as unknown as Record<string, unknown>;
    return {
      id: String(raw.id ?? ""),
      instructorId: String(raw.instructor_id ?? ""),
      cohortLabel: String(raw.cohort_label ?? ""),
      baseFeeKrw:
        typeof raw.base_fee_krw === "number" ? raw.base_fee_krw : 0,
      taxKrw: typeof raw.tax_krw === "number" ? raw.tax_krw : 0,
      netKrw: typeof raw.net_krw === "number" ? raw.net_krw : 0,
      enrolledCountSnapshot:
        typeof raw.enrolled_count_snapshot === "number"
          ? raw.enrolled_count_snapshot
          : 0,
      taxModeSnapshot: asTaxMode(raw.tax_mode_snapshot),
      paidAt: raw.paid_at ? String(raw.paid_at) : null,
      paidBy: raw.paid_by ? String(raw.paid_by) : null,
      notes: raw.notes ? String(raw.notes) : null,
      createdAt: String(raw.created_at ?? ""),
    };
  });

  return { rows, error: null };
}
