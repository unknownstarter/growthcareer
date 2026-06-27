/**
 * Attendance repository — ADR 0005 §5.
 *
 * Upsert 패턴: (session_id, student_id) UNIQUE 기준으로 INSERT 또는 UPDATE.
 * 운영자가 출결 mark 후 정정 가능 — 단일 row 갱신.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  AttendanceSchema,
  type Attendance,
  type AttendanceStatus,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";

const TABLE = "attendance";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** session 의 모든 attendance — UI 가 student × status 매트릭스 렌더. */
export async function fetchAttendanceBySession(
  sessionId: string,
): Promise<Attendance[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AttendanceSchema.parse(row));
}

/** student 의 모든 attendance — 출석률 계산용. */
export async function fetchAttendanceByStudent(
  studentId: string,
): Promise<Attendance[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AttendanceSchema.parse(row));
}

/** cohort 의 모든 student × session attendance — dashboard 매트릭스. */
export async function fetchAttendanceByCohort(
  cohortId: string,
): Promise<Attendance[]> {
  const supabase = requireClient();
  // sessions(cohort_id) 와 join.
  const { data: sessionRows, error: sessionsErr } = await supabase
    .from("sessions")
    .select("id")
    .eq("cohort_id", cohortId);
  if (sessionsErr) throw new Error(sessionsErr.message);
  const sessionIds = (sessionRows ?? []).map((r) =>
    String((r as Record<string, unknown>).id),
  );
  if (sessionIds.length === 0) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("session_id", sessionIds);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AttendanceSchema.parse(row));
}

export type UpsertAttendanceInput = {
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  late_minutes?: number | null;
  notes?: string | null;
  marked_by: string;
};

/**
 * UPSERT — (session_id, student_id) UNIQUE 기준.
 * INSERT 새 row 또는 UPDATE 기존 row.
 */
export async function upsertAttendance(
  input: UpsertAttendanceInput,
): Promise<Attendance> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        session_id: input.session_id,
        student_id: input.student_id,
        status: input.status,
        late_minutes: input.late_minutes ?? null,
        notes: input.notes ?? null,
        marked_by: input.marked_by,
        marked_at: new Date().toISOString(),
      },
      { onConflict: "session_id,student_id" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return AttendanceSchema.parse(data);
}

/** 여러 attendance 일괄 upsert — 운영자가 session 전체 학생 출결 한 번에 저장. */
export async function upsertAttendanceBulk(
  inputs: UpsertAttendanceInput[],
): Promise<Attendance[]> {
  const supabase = requireClient();
  if (inputs.length === 0) return [];
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      inputs.map((input) => ({
        session_id: input.session_id,
        student_id: input.student_id,
        status: input.status,
        late_minutes: input.late_minutes ?? null,
        notes: input.notes ?? null,
        marked_by: input.marked_by,
        marked_at: now,
      })),
      { onConflict: "session_id,student_id" },
    )
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AttendanceSchema.parse(row));
}

/**
 * 출석 mark 삭제 (unmarked 상태로 되돌리기) — 운영자가 실수 mark 시 정정.
 * (session_id, student_id) UNIQUE 기준 1 row 삭제. 없으면 no-op.
 */
export async function deleteAttendance(
  sessionId: string,
  studentId: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("session_id", sessionId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}
