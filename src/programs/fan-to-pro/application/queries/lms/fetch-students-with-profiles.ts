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
  status: string;
  email: string | null;
  phone: string | null;
  invited: boolean;
  last_login_at: string | null;
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
      "id, applicant_id, display_name, status, applicants(email, phone, redacted_at)",
    )
    .eq("cohort_id", input.cohort_id)
    .order("display_name", { ascending: true });
  if (error) return { status: "error", error: error.message };

  const rows = (students ?? []) as Array<{
    id: string;
    applicant_id: string;
    display_name: string;
    status: string;
    applicants?: { email?: string; phone?: string; redacted_at?: string | null } | null;
  }>;

  // profile 조회 (student_id 인덱스).
  const ids = rows.map((r) => r.id);
  let profileMap = new Map<string, { last_login_at: string | null }>();
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
  }

  return {
    status: "ok",
    data: rows.map((r) => {
      const profile = profileMap.get(r.id);
      return {
        student_id: r.id,
        applicant_id: r.applicant_id,
        display_name: r.display_name,
        status: r.status,
        email: r.applicants?.email ?? null,
        phone: r.applicants?.phone ?? null,
        invited: !!profile,
        last_login_at: profile?.last_login_at ?? null,
      };
    }),
  };
}
