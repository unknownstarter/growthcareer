/**
 * Query — cohort 의 student list + 각 student 의 attendance summary.
 *
 * ADR 0005 §2 폴더 — queries/ = CQRS read 전용 use case.
 * UI (dashboard) 가 직접 이 함수를 호출 (server component / server action).
 *
 * 반환:
 *   - cohort 정보
 *   - sessions list (cohort 안의)
 *   - students list (display_name + 출석 통계)
 *   - 각 student × session attendance matrix (UI 가 표 렌더)
 */
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchAttendanceByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import {
  calculateAttendanceRate,
  type AttendanceStatus,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";
import type { Session } from "@/src/programs/fan-to-pro/domain/entities/session";
import type { Student } from "@/src/programs/fan-to-pro/domain/entities/student";

export type CohortRosterStudentRow = {
  student: Student;
  attendanceRate: number;
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

export async function fetchCohortRoster(
  cohortId: string,
): Promise<CohortRosterResult> {
  await assertAdmin();

  try {
    const cohort = await fetchCohortById(cohortId);
    if (!cohort) return { status: "error", error: "cohortNotFound" };

    const [sessions, students, attendances] = await Promise.all([
      fetchSessionsByCohort(cohortId),
      fetchStudentsByCohort(cohortId),
      fetchAttendanceByCohort(cohortId),
    ]);

    const totalSessions = sessions.length;

    const studentRows: CohortRosterStudentRow[] = students.map((student) => {
      const myAttendances = attendances.filter(
        (a) => a.student_id === student.id,
      );
      const attendanceRate = calculateAttendanceRate(myAttendances, totalSessions);
      const attendanceMap: Record<string, AttendanceStatus | "unmarked"> = {};
      for (const session of sessions) {
        const att = myAttendances.find((a) => a.session_id === session.id);
        attendanceMap[session.id] = att ? att.status : "unmarked";
      }
      return { student, attendanceRate, attendanceMap };
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
