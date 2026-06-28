/**
 * Student Session Detail query (B0060) — 회차 1개의 상세 view.
 *
 * 학생이 list 에서 회차 클릭 시 상세 페이지가 호출. 본인 출결 + 회차 자료 list
 * + 강의 내용 / instructor 정보.
 *
 * 권한 가드 — 첫 줄 `assertCanReadStudentProfile(student_id)`. 통과 조건:
 *   super_admin / 본인 / program admin / cohort instructor.
 *
 * IDOR 차단 — student.cohort_id 와 session.cohort_id 일치 확인. 다른 cohort 의
 * session_id 로 호출하면 `sessionCohortMismatch` error.
 *
 * 자료 가시성 — published OR (scheduled AND visible_from <= now). lms-role.ts
 * §475 의 student 가시성 룰과 동기. draft / scheduled-future / archived 차단.
 *
 * 자료 범위 — (a) session_id 직접 연결 OR (b) week_number 가 session.idx 와 일치
 *   하고 cohort_id 일치 (회차 미연결 자료 fallback).
 *
 * Cache 정책: 실시간 변동 — cache 없음.
 *
 * Performance: 5 query — session + attendance + materials + instructor +
 * cohort meta. p95 ~120-200ms 추정.
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { AttendanceStatus } from "@/src/programs/fan-to-pro/domain/entities/attendance";
import type {
  LectureMaterialStorageMethod,
  LectureMaterialVisibility,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

export const FetchStudentSessionDetailInputSchema = z.object({
  student_id: z.string().uuid(),
  session_id: z.string().uuid(),
});

export type FetchStudentSessionDetailInput = z.infer<
  typeof FetchStudentSessionDetailInputSchema
>;

export type StudentSessionDetailMaterial = {
  id: string;
  week_number: number | null;
  title: string;
  description: string | null;
  storage_method: LectureMaterialStorageMethod;
  file_name: string | null;
  file_size_bytes: number | null;
  external_url: string | null;
  visibility: LectureMaterialVisibility;
};

export type StudentSessionDetail = {
  session: {
    id: string;
    idx: number | null;
    starts_at: string;
    ends_at: string;
    title: string;
    topic: string | null;
    /** sessions.notes 컬럼 — 강의 내용 long form. session.description 으로 노출. */
    description: string | null;
    location: string | null;
    status: "scheduled" | "in_progress" | "ended" | "cancelled";
  };
  cohort_id: string;
  cohort_slug: string;
  instructor: {
    id: string;
    name: string;
    company_name: string | null;
  } | null;
  my_attendance: {
    status: AttendanceStatus | "unmarked";
    late_minutes: number | null;
    notes: string | null;
    marked_at: string | null;
  };
  materials: StudentSessionDetailMaterial[];
};

export type StudentSessionDetailResult =
  | { status: "ok"; data: StudentSessionDetail }
  | { status: "error"; error: string };

export async function fetchStudentSessionDetail(
  rawInput: FetchStudentSessionDetailInput,
): Promise<StudentSessionDetailResult> {
  // 1) 입력 검증 (zod 경계).
  const parsed = FetchStudentSessionDetailInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const { student_id: studentId, session_id: sessionId } = parsed.data;

  // 2) 권한 가드.
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

  // 3) student + session 병렬 조회.
  const [studentRes, sessionRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, cohort_id")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select(
        "id, cohort_id, instructor_id, idx, starts_at, ends_at, title, topic, notes, location, status",
      )
      .eq("id", sessionId)
      .maybeSingle(),
  ]);

  if (studentRes.error) {
    return { status: "error", error: studentRes.error.message };
  }
  if (!studentRes.data) {
    return { status: "error", error: `unknownStudent: ${studentId}` };
  }
  if (sessionRes.error) {
    return { status: "error", error: sessionRes.error.message };
  }
  if (!sessionRes.data) {
    return { status: "error", error: `unknownSession: ${sessionId}` };
  }

  const studentCohortId = (studentRes.data as { cohort_id: string }).cohort_id;
  const session = sessionRes.data as {
    id: string;
    cohort_id: string;
    instructor_id: string | null;
    idx: number | null;
    starts_at: string;
    ends_at: string;
    title: string;
    topic: string | null;
    notes: string | null;
    location: string | null;
    status: "scheduled" | "in_progress" | "ended" | "cancelled";
  };

  // 4) IDOR 차단 — student 의 cohort 와 session 의 cohort 일치 검증.
  //    super_admin / program admin / instructor 도 cohort mismatch 면 차단 — 잘못된
  //    조합을 방지해 데이터 표시 일관성 확보.
  if (session.cohort_id !== studentCohortId) {
    return {
      status: "error",
      error: `sessionCohortMismatch: session=${sessionId} expected=${studentCohortId}`,
    };
  }
  const cohortId = studentCohortId;

  // 5) cohort slug + instructor + attendance + materials 병렬.
  const nowIso = new Date().toISOString();
  const [cohortRes, instructorRes, attendanceRes, materialsRes] =
    await Promise.all([
      supabase
        .from("cohorts")
        .select("id, slug")
        .eq("id", cohortId)
        .maybeSingle(),
      session.instructor_id
        ? supabase
            .from("instructors")
            .select("id, name, company_id, companies(name)")
            .eq("id", session.instructor_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from("attendance")
        .select("status, late_minutes, notes, marked_at")
        .eq("session_id", sessionId)
        .eq("student_id", studentId)
        .maybeSingle(),
      // 자료 — session_id 직접 OR (week_number = session.idx AND cohort 일치).
      // session.idx 가 null 이면 OR 절 두번째 조건이 false (idx null = week 없음).
      session.idx !== null
        ? supabase
            .from("lecture_materials")
            .select(
              "id, week_number, title, description, storage_method, file_name, file_size_bytes, external_url, visibility, visible_from, session_id",
            )
            .eq("cohort_id", cohortId)
            .or(`session_id.eq.${sessionId},week_number.eq.${session.idx}`)
            .or(
              `visibility.eq.published,and(visibility.eq.scheduled,visible_from.lte.${nowIso})`,
            )
            .order("week_number", { ascending: true, nullsFirst: false })
            .order("title", { ascending: true })
        : supabase
            .from("lecture_materials")
            .select(
              "id, week_number, title, description, storage_method, file_name, file_size_bytes, external_url, visibility, visible_from, session_id",
            )
            .eq("cohort_id", cohortId)
            .eq("session_id", sessionId)
            .or(
              `visibility.eq.published,and(visibility.eq.scheduled,visible_from.lte.${nowIso})`,
            )
            .order("title", { ascending: true }),
    ]);

  if (cohortRes.error) {
    return { status: "error", error: cohortRes.error.message };
  }
  if (!cohortRes.data) {
    return { status: "error", error: `unknownCohort: ${cohortId}` };
  }
  if (instructorRes.error) {
    return { status: "error", error: instructorRes.error.message };
  }
  if (attendanceRes.error) {
    return { status: "error", error: attendanceRes.error.message };
  }
  if (materialsRes.error) {
    return { status: "error", error: materialsRes.error.message };
  }

  // 6) instructor 추출.
  let instructor: StudentSessionDetail["instructor"] = null;
  if (instructorRes.data) {
    const row = instructorRes.data as {
      id: string;
      name: string;
      company_id: string | null;
      companies: { name: string } | { name: string }[] | null;
    };
    const companies = row.companies;
    const companyName = Array.isArray(companies)
      ? companies[0]?.name ?? null
      : (companies?.name ?? null);
    instructor = {
      id: row.id,
      name: row.name,
      company_name: companyName,
    };
  }

  // 7) attendance 추출.
  const att = attendanceRes.data as {
    status: AttendanceStatus;
    late_minutes: number | null;
    notes: string | null;
    marked_at: string;
  } | null;
  const myAttendance: StudentSessionDetail["my_attendance"] = att
    ? {
        status: att.status,
        late_minutes: att.late_minutes,
        notes: att.notes,
        marked_at: att.marked_at,
      }
    : {
        status: "unmarked",
        late_minutes: null,
        notes: null,
        marked_at: null,
      };

  // 8) materials 필터링 — Supabase `or` 체이닝은 동일 필드 X 이슈가 있어
  //    visibility 재검증을 코드로 한번 더 (방어). published 또는 (scheduled +
  //    visible_from <= now).
  const materials: StudentSessionDetailMaterial[] = [];
  const now = Date.now();
  for (const m of (materialsRes.data ?? []) as Array<{
    id: string;
    week_number: number | null;
    title: string;
    description: string | null;
    storage_method: LectureMaterialStorageMethod;
    file_name: string | null;
    file_size_bytes: number | null;
    external_url: string | null;
    visibility: LectureMaterialVisibility;
    visible_from: string | null;
    session_id: string | null;
  }>) {
    const visible =
      m.visibility === "published" ||
      (m.visibility === "scheduled" &&
        !!m.visible_from &&
        new Date(m.visible_from).getTime() <= now);
    if (!visible) continue;
    materials.push({
      id: m.id,
      week_number: m.week_number,
      title: m.title,
      description: m.description,
      storage_method: m.storage_method,
      file_name: m.file_name,
      file_size_bytes: m.file_size_bytes,
      external_url: m.external_url,
      visibility: m.visibility,
    });
  }

  return {
    status: "ok",
    data: {
      session: {
        id: session.id,
        idx: session.idx,
        starts_at: session.starts_at,
        ends_at: session.ends_at,
        title: session.title,
        topic: session.topic,
        description: session.notes,
        location: session.location,
        status: session.status,
      },
      cohort_id: cohortId,
      cohort_slug: (cohortRes.data as { slug: string }).slug,
      instructor,
      my_attendance: myAttendance,
      materials,
    },
  };
}
