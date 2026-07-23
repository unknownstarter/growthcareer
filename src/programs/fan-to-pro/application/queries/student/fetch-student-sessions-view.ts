/**
 * Student Sessions View query (B0060) — 학생 본인 [수업] 메뉴 list view.
 *
 * 본인 cohort 의 회차 list + 본인 출결 + 회차별 자료 count 통합. 학생 페이지
 * (`/[locale]/fan-to-pro/[cohortSlug]/student/sessions`) 가 호출.
 *
 * 권한 가드 — 첫 줄에 `assertCanReadStudentProfile(studentId)`. 통과 조건:
 *   super_admin / 본인 / program admin / cohort instructor (lms-role.ts §610).
 *
 * IDOR — student.cohort_id 기반으로만 sessions / materials 조회. 다른 cohort
 * 데이터는 absolute 0.
 *
 * ADR 0005 §2 — queries/ = CQRS read 전용. 호출자가 가드 (assertCan*).
 * ADR 0010 — applicants 미접근. students → cohort → sessions / attendance /
 * lecture_materials 만.
 *
 * Cache 정책: 출결·자료 실시간 변동 — cache 없음. 호출 page 가 force-dynamic.
 *
 * Performance: cohort 당 sessions ~8 + attendance ~8 (본인만) + materials ~20-50
 * = total 3 query + 2 join (instructor / company). p95 ~150-250ms 추정.
 */
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { AttendanceStatus } from "@/src/programs/fan-to-pro/domain/entities/attendance";
import { hasSessionElapsed } from "@/src/programs/fan-to-pro/domain/entities/session";

export type StudentSessionAttendanceStatus = AttendanceStatus | "unmarked";

export type StudentSessionRow = {
  session_id: string;
  idx: number | null;
  starts_at: string;
  ends_at: string;
  title: string;
  topic: string | null;
  instructor_name: string | null;
  instructor_company: string | null;
  session_status: "scheduled" | "in_progress" | "ended" | "cancelled";
  my_attendance_status: StudentSessionAttendanceStatus;
  late_minutes: number | null;
  attendance_notes: string | null;
  materials_count: number;
};

export type StudentSessionsView = {
  cohort_id: string;
  cohort_slug: string;
  cohort_name: string;
  cohort_starts_on: string;
  cohort_ends_on: string;
  total_sessions: number;
  /** present + late count (본인 기준). */
  attended_count: number;
  /** ended 회차 중 본인 출석률 (0-1). ended 0 이면 0. */
  attendance_rate: number;
  rows: StudentSessionRow[];
};

export type StudentSessionsViewResult =
  | { status: "ok"; data: StudentSessionsView }
  | { status: "error"; error: string };

export async function fetchStudentSessionsView(
  studentId: string,
): Promise<StudentSessionsViewResult> {
  // 1) 권한 가드 — viewer role 사고 (2026-06-09) 박제 룰. 첫 줄.
  try {
    await assertCanReadStudentProfile(studentId);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return { status: "error", error: "supabaseUnavailable" };
  }

  // 2) student → cohort_id.
  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id, cohort_id")
    .eq("id", studentId)
    .maybeSingle();
  if (studentErr) {
    return { status: "error", error: studentErr.message };
  }
  if (!student) {
    return { status: "error", error: `unknownStudent: ${studentId}` };
  }
  const cohortId = (student as { cohort_id: string }).cohort_id;

  // 3) cohort meta.
  const { data: cohort, error: cohortErr } = await supabase
    .from("cohorts")
    .select("id, slug, name, starts_on, ends_on")
    .eq("id", cohortId)
    .maybeSingle();
  if (cohortErr) {
    return { status: "error", error: cohortErr.message };
  }
  if (!cohort) {
    return { status: "error", error: `unknownCohort: ${cohortId}` };
  }

  // 4) sessions (idx asc, starts_at asc 보조), attendance (본인만), materials count
  // — 3-way 병렬.
  const [sessionsRes, attendanceRes, materialsRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, idx, starts_at, ends_at, title, topic, status, instructor_id",
      )
      .eq("cohort_id", cohortId)
      .order("idx", { ascending: true, nullsFirst: false })
      .order("starts_at", { ascending: true }),
    supabase
      .from("attendance")
      .select("session_id, status, late_minutes, notes")
      .eq("student_id", studentId),
    supabase
      .from("lecture_materials")
      .select("session_id")
      .eq("cohort_id", cohortId)
      .or(
        `visibility.eq.published,and(visibility.eq.scheduled,visible_from.lte.${new Date().toISOString()})`,
      ),
  ]);

  if (sessionsRes.error) {
    return { status: "error", error: sessionsRes.error.message };
  }
  if (attendanceRes.error) {
    return { status: "error", error: attendanceRes.error.message };
  }
  if (materialsRes.error) {
    return { status: "error", error: materialsRes.error.message };
  }

  const sessionRows = (sessionsRes.data ?? []) as Array<{
    id: string;
    idx: number | null;
    starts_at: string;
    ends_at: string;
    title: string;
    topic: string | null;
    status: "scheduled" | "in_progress" | "ended" | "cancelled";
    instructor_id: string | null;
  }>;

  const attendanceRows = (attendanceRes.data ?? []) as Array<{
    session_id: string;
    status: AttendanceStatus;
    late_minutes: number | null;
    notes: string | null;
  }>;

  const materialRows = (materialsRes.data ?? []) as Array<{
    session_id: string | null;
  }>;

  // 5) instructor → company 조인 (sessions 에 instructor_id 있는 것들만).
  const instructorIds = Array.from(
    new Set(
      sessionRows
        .map((s) => s.instructor_id)
        .filter((v): v is string => v !== null),
    ),
  );

  type InstructorRow = {
    id: string;
    name: string;
    company_id: string | null;
    company_name: string | null;
  };
  const instructorById = new Map<string, InstructorRow>();

  if (instructorIds.length > 0) {
    // company name 은 join 으로 한 query. companies!left join — instructor 가
    // company 없는 경우도 OK.
    const { data: instructorsData, error: instErr } = await supabase
      .from("instructors")
      .select("id, name, company_id, companies(name)")
      .in("id", instructorIds);

    if (instErr) {
      return { status: "error", error: instErr.message };
    }

    for (const row of (instructorsData ?? []) as Array<{
      id: string;
      name: string;
      company_id: string | null;
      companies: { name: string } | { name: string }[] | null;
    }>) {
      const companies = row.companies;
      const companyName = Array.isArray(companies)
        ? companies[0]?.name ?? null
        : (companies?.name ?? null);
      instructorById.set(row.id, {
        id: row.id,
        name: row.name,
        company_id: row.company_id,
        company_name: companyName,
      });
    }
  }

  // 6) 본인 attendance 인덱싱.
  const attendanceBySession = new Map<
    string,
    { status: AttendanceStatus; late_minutes: number | null; notes: string | null }
  >();
  for (const a of attendanceRows) {
    attendanceBySession.set(a.session_id, {
      status: a.status,
      late_minutes: a.late_minutes,
      notes: a.notes,
    });
  }

  // 7) materials count by session_id (null session_id 는 cohort-wide 자료 — 회차
  //    카운트에서 제외).
  const materialsCountBySession = new Map<string, number>();
  for (const m of materialRows) {
    if (!m.session_id) continue;
    materialsCountBySession.set(
      m.session_id,
      (materialsCountBySession.get(m.session_id) ?? 0) + 1,
    );
  }

  // 8) row 빌드.
  const rows: StudentSessionRow[] = sessionRows.map((s) => {
    const instructor = s.instructor_id
      ? instructorById.get(s.instructor_id)
      : undefined;
    const att = attendanceBySession.get(s.id);
    return {
      session_id: s.id,
      idx: s.idx,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      title: s.title,
      topic: s.topic,
      instructor_name: instructor?.name ?? null,
      instructor_company: instructor?.company_name ?? null,
      session_status: s.status,
      my_attendance_status: att?.status ?? "unmarked",
      late_minutes: att?.late_minutes ?? null,
      attendance_notes: att?.notes ?? null,
      materials_count: materialsCountBySession.get(s.id) ?? 0,
    };
  });

  // 9) 출석률 — 진행된 회차 중 본인 present+late / 진행된 회차 수.
  //    "진행된 회차" = hasSessionElapsed (status=ended 또는 ends_at<now 비취소).
  //    status=ended 명시 전환에 의존 X — 2026-07-23 출석률 0% 사고 방지.
  const elapsedSessionIds = new Set(
    sessionRows.filter((s) => hasSessionElapsed(s)).map((s) => s.id),
  );
  let attendedCount = 0;
  for (const a of attendanceRows) {
    if (!elapsedSessionIds.has(a.session_id)) continue;
    if (a.status === "present" || a.status === "late") attendedCount += 1;
  }
  const attendanceRate =
    elapsedSessionIds.size > 0 ? attendedCount / elapsedSessionIds.size : 0;

  return {
    status: "ok",
    data: {
      cohort_id: cohortId,
      cohort_slug: (cohort as { slug: string }).slug,
      cohort_name: (cohort as { name: string }).name,
      cohort_starts_on: (cohort as { starts_on: string }).starts_on,
      cohort_ends_on: (cohort as { ends_on: string }).ends_on,
      total_sessions: sessionRows.length,
      attended_count: attendedCount,
      attendance_rate: attendanceRate,
      rows,
    },
  };
}
