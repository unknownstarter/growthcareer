/**
 * Query — cohort 의 student list + 각 student 의 user_profile (있으면).
 *
 * /lms/admin/students 페이지가 사용. invite 발송 여부 / last_login_at 도 같이.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type StudentWithProfile = {
  student_id: string;
  applicant_id: string;
  display_name: string;
  name_ko: string | null;
  status: string;
  email: string | null;
  phone: string | null;
  invited: boolean;
  last_login_at: string | null;
  // 결제 정보 (applicants join).
  payment_status: string | null;
  paid_amount_krw: number | null;
  payment_confirmed_at: string | null;
  depositor_name_observed: string | null;
  refunded_at: string | null;
};

export async function fetchStudentsWithProfiles(input: {
  cohort_id: string;
}): Promise<
  | { status: "ok"; data: StudentWithProfile[] }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data: students, error } = await supabase
    .from("students")
    .select(
      "id, applicant_id, display_name, status, applicants(email, phone, redacted_at, status, paid_amount_krw, payment_confirmed_at, depositor_name_observed, refunded_at)",
    )
    .eq("cohort_id", input.cohort_id)
    .order("display_name", { ascending: true });
  if (error) return { status: "error", error: error.message };

  const rows = (students ?? []) as Array<{
    id: string;
    applicant_id: string;
    display_name: string;
    status: string;
    applicants?: {
      email?: string;
      phone?: string;
      redacted_at?: string | null;
      status?: string;
      paid_amount_krw?: number | null;
      payment_confirmed_at?: string | null;
      depositor_name_observed?: string | null;
      refunded_at?: string | null;
    } | null;
  }>;

  // profile 조회 (student_id 인덱스).
  const ids = rows.map((r) => r.id);
  let profileMap = new Map<string, { last_login_at: string | null }>();
  let namekoMap = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from("user_profiles")
      .select("student_id, last_login_at")
      .in("student_id", ids);
    if (pErr) return { status: "error", error: pErr.message };
    profileMap = new Map(
      (profiles ?? []).map((p) => {
        const raw = p as Record<string, unknown>;
        return [
          String(raw.student_id ?? ""),
          {
            last_login_at: raw.last_login_at ? String(raw.last_login_at) : null,
          },
        ];
      }),
    );

    // student_profile.name_ko join (B0052 — 강사님 한국어 인식용)
    const { data: sps } = await supabase
      .from("student_profile")
      .select("student_id, name_ko")
      .in("student_id", ids);
    namekoMap = new Map(
      (sps ?? []).map((p) => {
        const raw = p as Record<string, unknown>;
        return [
          String(raw.student_id ?? ""),
          raw.name_ko ? String(raw.name_ko) : null,
        ];
      }),
    );
  }

  return {
    status: "ok",
    data: rows.map((r) => {
      const profile = profileMap.get(r.id);
      return {
        student_id: r.id,
        applicant_id: r.applicant_id,
        display_name: r.display_name,
        name_ko: namekoMap.get(r.id) ?? null,
        status: r.status,
        email: r.applicants?.email ?? null,
        phone: r.applicants?.phone ?? null,
        invited: !!profile,
        last_login_at: profile?.last_login_at ?? null,
        payment_status: r.applicants?.status ?? null,
        paid_amount_krw: r.applicants?.paid_amount_krw ?? null,
        payment_confirmed_at: r.applicants?.payment_confirmed_at ?? null,
        depositor_name_observed: r.applicants?.depositor_name_observed ?? null,
        refunded_at: r.applicants?.refunded_at ?? null,
      };
    }),
  };
}
