/**
 * Use case — 출결 mark / 정정.
 *
 * 단건 + 일괄 모두 지원. UI 가 session 전체 학생 출결을 한 번에 저장하는
 * 패턴이 자연스러워 일괄 처리 채택.
 *
 * normalizeAttendanceStatus 적용 — late_minutes ≥ 30 이면 자동 absent.
 */
import { z } from "zod";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import {
  upsertAttendanceBulk,
  type UpsertAttendanceInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import { fetchSessionById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import {
  AttendanceStatusSchema,
  normalizeAttendanceStatus,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";
import type { Attendance } from "@/src/programs/fan-to-pro/domain/entities/attendance";

const EntrySchema = z.object({
  student_id: z.string().uuid(),
  status: AttendanceStatusSchema,
  late_minutes: z.number().int().nonnegative().max(180).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const InputSchema = z.object({
  session_id: z.string().uuid(),
  marked_by: z.string().min(1).max(60),
  entries: z.array(EntrySchema).min(1).max(100),
});

export type MarkAttendanceInput = z.infer<typeof InputSchema>;
export type MarkAttendanceResult =
  | { status: "ok"; data: Attendance[]; normalizedCount: number }
  | { status: "error"; error: string };

export async function markAttendance(
  input: unknown,
): Promise<MarkAttendanceResult> {
  await assertAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    // session 존재 검증.
    const session = await fetchSessionById(parsed.data.session_id);
    if (!session) return { status: "error", error: "sessionNotFound" };

    // Mira B0065 HIGH-1 fix — cross-cohort IDOR 차단.
    // session.cohort_id 와 각 entry 의 student.cohort_id 일치 확인.
    // 1기 단독 운영에는 위험 낮지만 2기 병행 시 데이터 오염 방지.
    const studentIds = parsed.data.entries.map((e) => e.student_id);
    const students = await Promise.all(
      studentIds.map((id) => fetchStudentById(id).catch(() => null)),
    );
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      if (!s) return { status: "error", error: "studentNotFound" };
      if (s.cohort_id !== session.cohort_id) {
        return { status: "error", error: "cohortMismatch" };
      }
    }

    // 도메인 룰 적용 — late_minutes ≥ 30 자동 absent.
    let normalizedCount = 0;
    const dtos: UpsertAttendanceInput[] = parsed.data.entries.map((entry) => {
      const normalized = normalizeAttendanceStatus(
        entry.status,
        entry.late_minutes ?? null,
      );
      if (normalized !== entry.status) normalizedCount += 1;
      return {
        session_id: parsed.data.session_id,
        student_id: entry.student_id,
        status: normalized,
        late_minutes: entry.late_minutes ?? null,
        notes: entry.notes ?? null,
        marked_by: parsed.data.marked_by,
      };
    });

    const saved = await upsertAttendanceBulk(dtos);
    return { status: "ok", data: saved, normalizedCount };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
