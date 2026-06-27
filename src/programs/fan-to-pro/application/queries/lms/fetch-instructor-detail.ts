/**
 * Query — instructor detail (B0050).
 *
 * /lms/admin/instructors/[id] 페이지가 사용. 한 페이지 SSR 에서 필요한
 * 모든 데이터를 1회에 응집:
 *   - instructor row (이름 / 회사 / 연락처 / 세무 / 강사료)
 *   - user_profile (LMS invite 여부 / last_login_at / auth user_id)
 *   - cohort 배정 list (cohort_memberships role=instructor)
 *   - 각 cohort 의 session list + 본인이 mark 한 출결 count
 *   - instructor_payouts list (회차 / 단가 / 송금 여부)
 *
 * 책임 분리:
 *   - 본 함수는 read-only aggregation 만. 검증 X.
 *   - 호출자 (server component) 가 assertProgramAdmin 가드.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type InstructorCohortAssignment = {
  cohort_id: string;
  cohort_name: string;
  cohort_slug: string;
  cohort_status: string;
  starts_on: string;
  ends_on: string;
  total_sessions: number;
  /** 본 강사가 instructor_id 로 잡힌 sessions count. */
  assigned_sessions: number;
  /** 본 강사가 marked_by 로 입력한 출결 row count. */
  marked_attendance_count: number;
};

export type InstructorSessionDetail = {
  session_id: string;
  cohort_id: string;
  cohort_name: string;
  idx: number | null;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  /** 본 강사 본인이 정식 배정 — sessions.instructor_id 비교. */
  assigned: boolean;
  /** 해당 session 에 본 강사가 mark 한 출결 row count. */
  marked_count: number;
  /** lecture_materials 가 session_id 로 연결된 자료 수. */
  material_count: number;
};

export type InstructorPayoutDetail = {
  id: string;
  cohort_label: string;
  base_fee_krw: number;
  tax_krw: number;
  net_krw: number;
  enrolled_count_snapshot: number;
  tax_mode_snapshot: "withholding_3_3" | "tax_invoice";
  paid_at: string | null;
  paid_by: string | null;
  created_at: string;
};

export type InstructorDetail = {
  // 기본
  instructor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tax_mode: "withholding_3_3" | "tax_invoice";
  base_fee_krw: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  business_no: string | null;
  resident_no: string | null;
  notes: string | null;
  day: "saturday" | "sunday";

  // 회사
  company_id: string | null;
  company_name: string | null;

  // LMS 계정
  user_id: string | null;
  invited: boolean;
  last_login_at: string | null;
  must_change_password: boolean;

  // 배정 + 진척
  cohort_assignments: InstructorCohortAssignment[];
  sessions: InstructorSessionDetail[];
  payouts: InstructorPayoutDetail[];
};

export async function fetchInstructorDetail(
  instructorId: string,
): Promise<
  | { status: "ok"; data: InstructorDetail }
  | { status: "not_found" }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // 1. instructor + company join.
  const { data: instructorRaw, error: instructorErr } = await supabase
    .from("instructors")
    .select(
      "id, name, email, phone, day, tax_mode, base_fee_krw, bank_name, bank_account, bank_holder, business_no, resident_no, notes, company_id, companies(name)",
    )
    .eq("id", instructorId)
    .maybeSingle();

  if (instructorErr) return { status: "error", error: instructorErr.message };
  if (!instructorRaw) return { status: "not_found" };

  const inst = instructorRaw as unknown as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    day: string | null;
    tax_mode: string;
    base_fee_krw: number | null;
    bank_name: string | null;
    bank_account: string | null;
    bank_holder: string | null;
    business_no: string | null;
    resident_no: string | null;
    notes: string | null;
    company_id: string | null;
    companies?: { name?: string } | { name?: string }[] | null;
  };

  const companyField = inst.companies;
  const companyName = Array.isArray(companyField)
    ? (companyField[0]?.name ?? null)
    : (companyField?.name ?? null);

  // 2. user_profile + auth user_id.
  const { data: profileRaw, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, last_login_at, must_change_password")
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (profileErr && profileErr.code !== "PGRST116") {
    return { status: "error", error: profileErr.message };
  }
  const profile = profileRaw as
    | { id: string; last_login_at: string | null; must_change_password: boolean }
    | null;

  const userId = profile?.id ?? null;

  // 3. cohort_memberships (role=instructor) + cohort meta.
  let assignments: InstructorCohortAssignment[] = [];
  let cohortIds: string[] = [];
  if (userId) {
    const { data: cmRaw, error: cmErr } = await supabase
      .from("cohort_memberships")
      .select("cohort_id, cohorts(id, name, slug, status, starts_on, ends_on)")
      .eq("user_id", userId)
      .eq("role", "instructor");
    if (cmErr) return { status: "error", error: cmErr.message };

    const cmRows = (cmRaw ?? []) as unknown as Array<{
      cohort_id: string;
      cohorts: { id: string; name: string; slug: string; status: string; starts_on: string; ends_on: string } | null;
    }>;

    cohortIds = cmRows
      .map((r) => r.cohorts?.id)
      .filter((v): v is string => Boolean(v));

    assignments = cmRows
      .filter((r) => r.cohorts)
      .map((r) => ({
        cohort_id: r.cohorts!.id,
        cohort_name: r.cohorts!.name,
        cohort_slug: r.cohorts!.slug,
        cohort_status: r.cohorts!.status,
        starts_on: r.cohorts!.starts_on,
        ends_on: r.cohorts!.ends_on,
        total_sessions: 0,
        assigned_sessions: 0,
        marked_attendance_count: 0,
      }))
      .sort((a, b) => b.starts_on.localeCompare(a.starts_on));
  }

  // 4. sessions of those cohorts.
  let sessions: InstructorSessionDetail[] = [];
  if (cohortIds.length > 0) {
    const { data: sessionRaw, error: sErr } = await supabase
      .from("sessions")
      .select("id, cohort_id, idx, title, starts_at, ends_at, status, instructor_id")
      .in("cohort_id", cohortIds)
      .order("starts_at", { ascending: true });
    if (sErr) return { status: "error", error: sErr.message };

    const sessionRows = (sessionRaw ?? []) as Array<{
      id: string;
      cohort_id: string;
      idx: number | null;
      title: string;
      starts_at: string;
      ends_at: string;
      status: string;
      instructor_id: string | null;
    }>;

    const cohortNameById = new Map(
      assignments.map((a) => [a.cohort_id, a.cohort_name]),
    );
    const sessionIds = sessionRows.map((s) => s.id);

    // 5. lecture_materials count per session (본 강사 cohort 전체).
    let materialCountBySession = new Map<string, number>();
    if (sessionIds.length > 0) {
      const { data: matRaw, error: mErr } = await supabase
        .from("lecture_materials")
        .select("session_id")
        .in("session_id", sessionIds);
      if (mErr) return { status: "error", error: mErr.message };
      const matRows = (matRaw ?? []) as Array<{ session_id: string | null }>;
      for (const m of matRows) {
        if (!m.session_id) continue;
        materialCountBySession.set(
          m.session_id,
          (materialCountBySession.get(m.session_id) ?? 0) + 1,
        );
      }
    }

    // 6. attendance count per session, marked_by=userId.
    let markedCountBySession = new Map<string, number>();
    if (userId && sessionIds.length > 0) {
      const { data: attRaw, error: aErr } = await supabase
        .from("attendance")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("marked_by", userId);
      if (aErr) return { status: "error", error: aErr.message };
      const attRows = (attRaw ?? []) as Array<{ session_id: string }>;
      for (const a of attRows) {
        markedCountBySession.set(
          a.session_id,
          (markedCountBySession.get(a.session_id) ?? 0) + 1,
        );
      }
    }

    sessions = sessionRows.map((s) => ({
      session_id: s.id,
      cohort_id: s.cohort_id,
      cohort_name: cohortNameById.get(s.cohort_id) ?? "",
      idx: s.idx,
      title: s.title,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      status: s.status,
      assigned: s.instructor_id === instructorId,
      marked_count: markedCountBySession.get(s.id) ?? 0,
      material_count: materialCountBySession.get(s.id) ?? 0,
    }));

    // assignment aggregation 채우기.
    for (const a of assignments) {
      const cohortSessions = sessions.filter((s) => s.cohort_id === a.cohort_id);
      a.total_sessions = cohortSessions.length;
      a.assigned_sessions = cohortSessions.filter((s) => s.assigned).length;
      a.marked_attendance_count = cohortSessions.reduce(
        (sum, s) => sum + s.marked_count,
        0,
      );
    }
  }

  // 7. instructor_payouts.
  const { data: payoutRaw, error: pErr } = await supabase
    .from("instructor_payouts")
    .select(
      "id, cohort_label, base_fee_krw, tax_krw, net_krw, enrolled_count_snapshot, tax_mode_snapshot, paid_at, paid_by, created_at",
    )
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });
  if (pErr) return { status: "error", error: pErr.message };

  const payouts: InstructorPayoutDetail[] = (payoutRaw ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    return {
      id: String(raw.id ?? ""),
      cohort_label: String(raw.cohort_label ?? ""),
      base_fee_krw: typeof raw.base_fee_krw === "number" ? raw.base_fee_krw : 0,
      tax_krw: typeof raw.tax_krw === "number" ? raw.tax_krw : 0,
      net_krw: typeof raw.net_krw === "number" ? raw.net_krw : 0,
      enrolled_count_snapshot:
        typeof raw.enrolled_count_snapshot === "number"
          ? raw.enrolled_count_snapshot
          : 0,
      tax_mode_snapshot:
        raw.tax_mode_snapshot === "tax_invoice"
          ? "tax_invoice"
          : "withholding_3_3",
      paid_at: raw.paid_at ? String(raw.paid_at) : null,
      paid_by: raw.paid_by ? String(raw.paid_by) : null,
      created_at: String(raw.created_at ?? ""),
    };
  });

  return {
    status: "ok",
    data: {
      instructor_id: inst.id,
      name: inst.name,
      email: inst.email,
      phone: inst.phone,
      day: inst.day === "sunday" ? "sunday" : "saturday",
      tax_mode:
        inst.tax_mode === "tax_invoice" ? "tax_invoice" : "withholding_3_3",
      base_fee_krw:
        typeof inst.base_fee_krw === "number" ? inst.base_fee_krw : 0,
      bank_name: inst.bank_name,
      bank_account: inst.bank_account,
      bank_holder: inst.bank_holder,
      business_no: inst.business_no,
      resident_no: inst.resident_no,
      notes: inst.notes,
      company_id: inst.company_id,
      company_name: companyName,
      user_id: userId,
      invited: !!profile,
      last_login_at: profile?.last_login_at ?? null,
      must_change_password: profile?.must_change_password ?? false,
      cohort_assignments: assignments,
      sessions,
      payouts,
    },
  };
}
