/**
 * Query — cohort 의 student list + 각 student 의 attendance summary +
 * applicant 마스터 정보 (연락처 / 입금 / 비자 / 국적).
 *
 * ADR 0005 §2 폴더 — queries/ = CQRS read 전용 use case.
 * UI (dashboard) 가 직접 이 함수를 호출 (server component / server action).
 *
 * 반환:
 *   - cohort 정보
 *   - sessions list (cohort 안의)
 *   - students list (display_name + applicant 정보 + 출석 통계)
 *   - 각 student × session attendance matrix (UI 가 표 렌더)
 */
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchAttendanceByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  calculateAttendanceRate,
  type AttendanceStatus,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";
import type { Session } from "@/src/programs/fan-to-pro/domain/entities/session";
import { getElapsedSessionIds } from "@/src/programs/fan-to-pro/domain/entities/session";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";
import type { ApplicantStatus } from "@/src/programs/fan-to-pro/application/dto/applicant-row";

/**
 * roster 행에 붙는 applicant 정보 — 노아 운영 화면용 PII.
 * 모든 필드 nullable — applicant 가 PII 파기 (redacted_at) 되었거나 join 실패 시 fallback.
 */
export type StudentApplicantInfo = {
  applicant_id: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  visa: string | null;
  status: ApplicantStatus | null;
  paid_amount_krw: number | null;
  depositor_name_observed: string | null;
  payment_confirmed_at: string | null;
};

/**
 * student_profile 에서 UI 에 필요한 필드 (학생 편집 가능 사본).
 * applicants 원본과 다르면 profile 우선 (CLAUDE.md §8 룰).
 */
export type StudentProfileInfo = {
  name_ko: string | null;
  nationality: string | null;
};

export type CohortRosterStudentRow = {
  student: Student;
  applicant: StudentApplicantInfo | null;
  /** student_profile.name_ko — 강사님 한국어 인식용 (B0052). */
  nameKo: string | null;
  /** student_profile 편집 사본 (nationality 등). applicant 대비 우선. */
  profile: StudentProfileInfo | null;
  attendanceRate: number;
  /** 출석 회차 수 / 전체 회차 (text "5/8" 등). */
  presentCount: number;
  totalSessions: number;
  /** sessionId → attendance status (없으면 'unmarked'). */
  attendanceMap: Record<string, AttendanceStatus | "unmarked">;
};

export type CohortRoster = {
  cohort: Cohort;
  sessions: Session[];
  students: CohortRosterStudentRow[];
};

export type CohortRosterResult =
  | { status: "ok"; data: CohortRoster }
  | { status: "error"; error: string };

/**
 * 가드는 호출 page.tsx 에 위임:
 *   - LMS surface (`(lms)/admin/cohorts/page.tsx`) — layout assertProgramAdmin + page assertProgramAdmin
 *   - Basic Auth (`app/admin/cohorts/page.tsx`) — middleware Basic Auth + page assertAdmin
 *
 * 이전: 본 함수 첫 줄 `assertAdmin()` 으로 Basic Auth `x-admin-role` header 강제.
 * LMS surface 는 Supabase Auth 라 header 없음 → throw → 500. 두 surface 가 같은
 * query 를 공유하므로 가드를 호출처로 끌어올림 (2026-06-27 fix).
 */
export async function fetchCohortRoster(
  cohortId: string,
): Promise<CohortRosterResult> {
  try {
    const cohort = await fetchCohortById(cohortId);
    if (!cohort) return { status: "error", error: "cohortNotFound" };

    const [sessions, students, attendances] = await Promise.all([
      fetchSessionsByCohort(cohortId),
      fetchStudentsByCohort(cohortId),
      fetchAttendanceByCohort(cohortId),
    ]);

    // applicant join — students 가 0명이면 skip.
    const applicantIds = students.map((s) => s.applicant_id);
    const studentIds = students.map((s) => s.id);
    const [applicantMap, profileMap] = await Promise.all([
      fetchApplicantInfoMap(applicantIds),
      fetchStudentProfileMap(studentIds),
    ]);

    const totalSessions = sessions.length;
    // 출석률 분모 = 진행된 회차(hasSessionElapsed). sessions.length(미래 포함)로
    // 세면 진행 중 코호트에서 출석률이 낮게 왜곡됨. cert/개요/학생뷰와 통일
    // (2026-07-23 사고). totalSessions 필드는 전체 계획 회차로 표시용 유지.
    const elapsedSessionIds = getElapsedSessionIds(sessions);
    const elapsedSessionCount = elapsedSessionIds.size;

    const studentRows: CohortRosterStudentRow[] = students.map((student) => {
      const myAttendances = attendances.filter(
        (a) => a.student_id === student.id,
      );
      const myElapsedAttendances = myAttendances.filter((a) =>
        elapsedSessionIds.has(a.session_id),
      );
      const attendanceRate = calculateAttendanceRate(
        myElapsedAttendances,
        elapsedSessionCount,
      );
      const presentCount = myElapsedAttendances.filter(
        (a) => a.status === "present" || a.status === "late",
      ).length;
      const attendanceMap: Record<string, AttendanceStatus | "unmarked"> = {};
      for (const session of sessions) {
        const att = myAttendances.find((a) => a.session_id === session.id);
        attendanceMap[session.id] = att ? att.status : "unmarked";
      }
      const profile = profileMap.get(student.id) ?? null;
      return {
        student,
        applicant: applicantMap.get(student.applicant_id) ?? null,
        nameKo: profile?.name_ko ?? null,
        profile,
        attendanceRate,
        presentCount,
        totalSessions,
        attendanceMap,
      };
    });

    return {
      status: "ok",
      data: {
        cohort,
        sessions,
        students: studentRows,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

/**
 * applicant id list → applicant 정보 Map.
 *
 * applicants 테이블이 비어있거나 join 실패해도 throw 하지 않고 빈 Map 반환 —
 * roster 자체는 student 만으로도 표시 가능해야 함.
 */
/**
 * student_profile join — name_ko (B0052) + nationality (2026-07-05 bug fix).
 * 학생 편집 사본이 applicants 원본보다 우선. 비어있거나 join 실패 시 빈 Map.
 */
async function fetchStudentProfileMap(
  studentIds: string[],
): Promise<Map<string, StudentProfileInfo>> {
  const map = new Map<string, StudentProfileInfo>();
  if (studentIds.length === 0) return map;
  const supabase = getSupabaseServer();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from("student_profile")
    .select("student_id, name_ko, nationality")
    .in("student_id", studentIds);
  if (error || !data) return map;
  for (const row of data as Array<Record<string, unknown>>) {
    const sid = String(row.student_id ?? "");
    if (!sid) continue;
    map.set(sid, {
      name_ko: row.name_ko ? String(row.name_ko) : null,
      nationality: row.nationality ? String(row.nationality) : null,
    });
  }
  return map;
}

async function fetchApplicantInfoMap(
  applicantIds: string[],
): Promise<Map<string, StudentApplicantInfo>> {
  const map = new Map<string, StudentApplicantInfo>();
  if (applicantIds.length === 0) return map;

  const supabase = getSupabaseServer();
  if (!supabase) return map;

  const { data, error } = await supabase
    .from("applicants")
    .select(
      [
        "id",
        "email",
        "phone",
        "nationality",
        "visa",
        "status",
        "paid_amount_krw",
        "depositor_name_observed",
        "payment_confirmed_at",
      ].join(","),
    )
    .in("id", applicantIds);

  if (error || !data) return map;

  for (const row of data as unknown as Array<Record<string, unknown>>) {
    const raw = row;
    const id = String(raw.id ?? "");
    if (!id) continue;
    map.set(id, {
      applicant_id: id,
      email: raw.email ? String(raw.email) : null,
      phone: raw.phone ? String(raw.phone) : null,
      nationality: raw.nationality ? String(raw.nationality) : null,
      visa: raw.visa ? String(raw.visa) : null,
      status: raw.status ? (String(raw.status) as ApplicantStatus) : null,
      paid_amount_krw:
        typeof raw.paid_amount_krw === "number" ? raw.paid_amount_krw : null,
      depositor_name_observed: raw.depositor_name_observed
        ? String(raw.depositor_name_observed)
        : null,
      payment_confirmed_at: raw.payment_confirmed_at
        ? String(raw.payment_confirmed_at)
        : null,
    });
  }

  return map;
}
