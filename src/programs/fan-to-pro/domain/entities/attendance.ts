/**
 * Attendance entity — ADR 0005 §6.
 *
 * Invariant:
 * - status ∈ {present, late, absent, excused}
 *   (ADR 0005 표는 present/late/absent 3종이나 운영 현실 반영 — 사전 양해
 *    공석 (병가/공무) 구분 위해 excused 추가).
 * - (student_id, session_id) UNIQUE
 *
 * 비즈니스 룰:
 * - 출결 mark 1회 + 운영자 정정 (history 별도 트래킹은 Wave 4 audit)
 * - late_minutes ≥ 30 → 운영자 판단 absent 로 격하 (use case 가 처리)
 */
import { z } from "zod";

export const ATTENDANCE_STATUSES = [
  "present",
  "late",
  "absent",
  "excused",
] as const;

export const AttendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);
export type AttendanceStatus = z.infer<typeof AttendanceStatusSchema>;

export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: AttendanceStatusSchema,
  late_minutes: z.number().int().nonnegative().nullable(),
  marked_by: z.string().nullable(),
  marked_at: z.string(),
  notes: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Attendance = z.infer<typeof AttendanceSchema>;

/** 출결 mark 입력 (use case 가 받는 입력). */
export const MarkAttendanceInputSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: AttendanceStatusSchema,
  late_minutes: z.number().int().nonnegative().max(180).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type MarkAttendanceInput = z.infer<typeof MarkAttendanceInputSchema>;

/**
 * late_minutes 기준 status 자동 격하 (도메인 룰).
 * 30분 이상 지각 = absent 로 처리 (강사 합의된 운영 룰).
 */
const LATE_TO_ABSENT_THRESHOLD_MIN = 30;

export function normalizeAttendanceStatus(
  status: AttendanceStatus,
  lateMinutes: number | null | undefined,
): AttendanceStatus {
  if (status === "late" && lateMinutes != null && lateMinutes >= LATE_TO_ABSENT_THRESHOLD_MIN) {
    return "absent";
  }
  return status;
}

/**
 * 출석률 계산 (수료 자격 판정 — Wave 2 certificates entity 가 사용).
 * present + late 만 출석으로 카운트. absent / excused 는 결석.
 */
export function calculateAttendanceRate(
  attendances: Pick<Attendance, "status">[],
  totalSessions: number,
): number {
  if (totalSessions === 0) return 0;
  const presentCount = attendances.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  return presentCount / totalSessions;
}

/** 수료 임계점 (Wave 2 사용). 0.75 = 8회 중 6회 출석. */
export const COMPLETION_ATTENDANCE_THRESHOLD = 0.75;
