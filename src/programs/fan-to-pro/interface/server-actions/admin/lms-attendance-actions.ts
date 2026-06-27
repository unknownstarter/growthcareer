"use server";

/**
 * LMS Attendance server actions — /[locale]/fan-to-pro/admin/attendance 페이지용.
 *
 * Why 별도 wrapper:
 *   기존 markAttendance use case (application/use-cases/attendance/mark-attendance.ts)
 *   는 Basic Auth assertAdmin 첫 줄. LMS surface (Supabase Auth) 에서 호출 시
 *   x-admin-role header 없어 throw. 본 파일은 assertProgramAdmin("fan-to-pro") 가드
 *   기반 wrapper. 기존 use case 시그니처 / repository 는 무변경 (양 surface 공유).
 *
 * 보안 원칙 (CLAUDE.md §7.4 + Sage MED-5):
 *   1. 모든 mutation 첫 줄 assertProgramAdmin("fan-to-pro")
 *   2. zod 입력 검증 — 경계에서 한 번
 *   3. session.cohort_id == student.cohort_id 일치 검증 — IDOR 차단
 *   4. error.message 그대로 client 노출 X — user-facing code 만
 *   5. marked_by = user.id (UUID) — email PII 노출 회피
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  upsertAttendanceBulk,
  deleteAttendance,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import { fetchSessionById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import {
  AttendanceStatusSchema,
  MarkAttendanceInputSchema,
  normalizeAttendanceStatus,
  type AttendanceStatus,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

// -------------------------------------------------------------------------
// 공통 — revalidate, error code 정규화
// -------------------------------------------------------------------------

const REVALIDATE_PATHS = [
  "/ko/fan-to-pro/admin/attendance",
  "/en/fan-to-pro/admin/attendance",
  "/ko/fan-to-pro/admin/cohorts",
  "/en/fan-to-pro/admin/cohorts",
];

function revalidateAll(): void {
  for (const p of REVALIDATE_PATHS) {
    revalidatePath(p);
  }
}

/**
 * user-facing error code 화이트리스트.
 * 내부 error.message (Supabase / network / forbidden 등) 는 절대 client 노출 X.
 * 미확인 throw 는 'internal' 로 정규화 + console.error 만.
 */
type AttendanceErrorCode =
  | "invalidInput"
  | "sessionNotFound"
  | "studentNotFound"
  | "cohortMismatch"
  | "forbidden"
  | "internal";

function toUserError(err: unknown, fallback: AttendanceErrorCode = "internal"): AttendanceErrorCode {
  if (err instanceof Error && err.message.startsWith("[lms-role]")) {
    return "forbidden";
  }
  console.error("[lms-attendance-action]", err);
  return fallback;
}

// -------------------------------------------------------------------------
// Helper — session × student cohort 일치 검증 (IDOR 차단)
// -------------------------------------------------------------------------

type CohortCheckResult =
  | { ok: true; cohortId: string }
  | { ok: false; error: AttendanceErrorCode };

/**
 * session 의 cohort_id 와 student 의 cohort_id 가 일치하는지 검증.
 * 운영자가 cohort A 의 session 에 cohort B 의 student 를 mark 하려는 시도 차단.
 * 둘 다 존재해야 하며 cohort_id 동일해야 ok.
 */
async function checkSessionStudentSameCohort(
  sessionId: string,
  studentId: string,
): Promise<CohortCheckResult> {
  const [session, student] = await Promise.all([
    fetchSessionById(sessionId),
    fetchStudentById(studentId),
  ]);
  if (!session) return { ok: false, error: "sessionNotFound" };
  if (!student) return { ok: false, error: "studentNotFound" };
  if (session.cohort_id !== student.cohort_id) {
    return { ok: false, error: "cohortMismatch" };
  }
  return { ok: true, cohortId: session.cohort_id };
}

// -------------------------------------------------------------------------
// Action 1: 단건 mark (cell 클릭 1회 = 1 호출)
// -------------------------------------------------------------------------

export type MarkAttendanceLmsResult =
  | { status: "ok"; normalizedStatus: AttendanceStatus }
  | { status: "error"; error: AttendanceErrorCode };

export async function markAttendanceLmsAction(
  input: unknown,
): Promise<MarkAttendanceLmsResult> {
  let user;
  try {
    user = await assertProgramAdmin("fan-to-pro");
  } catch (err) {
    return { status: "error", error: toUserError(err, "forbidden") };
  }

  const parsed = MarkAttendanceInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const check = await checkSessionStudentSameCohort(
      parsed.data.session_id,
      parsed.data.student_id,
    );
    if (!check.ok) return { status: "error", error: check.error };

    const normalized = normalizeAttendanceStatus(
      parsed.data.status,
      parsed.data.late_minutes ?? null,
    );
    await upsertAttendanceBulk([
      {
        session_id: parsed.data.session_id,
        student_id: parsed.data.student_id,
        status: normalized,
        late_minutes: parsed.data.late_minutes ?? null,
        notes: parsed.data.notes ?? null,
        marked_by: user.id,
      },
    ]);
    revalidateAll();
    return { status: "ok", normalizedStatus: normalized };
  } catch (err) {
    return { status: "error", error: toUserError(err) };
  }
}

// -------------------------------------------------------------------------
// Action 2: 일괄 mark (회차 헤더 클릭 → 그 회차 학생 전원 같은 status)
// -------------------------------------------------------------------------

const BulkInputSchema = z.object({
  session_id: z.string().uuid(),
  marks: z
    .array(
      z.object({
        student_id: z.string().uuid(),
        status: AttendanceStatusSchema,
        late_minutes: z.number().int().nonnegative().max(180).nullable().optional(),
        notes: z.string().max(500).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export type MarkAttendanceBulkLmsResult =
  | { status: "ok"; marked: number; normalizedCount: number }
  | { status: "error"; error: AttendanceErrorCode };

export async function markAttendanceBulkLmsAction(
  input: unknown,
): Promise<MarkAttendanceBulkLmsResult> {
  let user;
  try {
    user = await assertProgramAdmin("fan-to-pro");
  } catch (err) {
    return { status: "error", error: toUserError(err, "forbidden") };
  }

  const parsed = BulkInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    // session 1회 fetch.
    const session = await fetchSessionById(parsed.data.session_id);
    if (!session) return { status: "error", error: "sessionNotFound" };

    // students batch fetch — 모두 같은 cohort 확인. 1+N 회피 위해 Promise.all.
    const students = await Promise.all(
      parsed.data.marks.map((m) => fetchStudentById(m.student_id)),
    );
    for (const s of students) {
      if (!s) return { status: "error", error: "studentNotFound" };
      if (s.cohort_id !== session.cohort_id) {
        return { status: "error", error: "cohortMismatch" };
      }
    }

    let normalizedCount = 0;
    const rows = parsed.data.marks.map((m) => {
      const normalized = normalizeAttendanceStatus(
        m.status,
        m.late_minutes ?? null,
      );
      if (normalized !== m.status) normalizedCount += 1;
      return {
        session_id: parsed.data.session_id,
        student_id: m.student_id,
        status: normalized,
        late_minutes: m.late_minutes ?? null,
        notes: m.notes ?? null,
        marked_by: user.id,
      };
    });

    const saved = await upsertAttendanceBulk(rows);
    revalidateAll();
    return { status: "ok", marked: saved.length, normalizedCount };
  } catch (err) {
    return { status: "error", error: toUserError(err) };
  }
}

// -------------------------------------------------------------------------
// Action 3: clear (운영자 실수 정정 — unmarked 로 복원)
// -------------------------------------------------------------------------

const ClearInputSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export type MarkAttendanceClearLmsResult =
  | { status: "ok" }
  | { status: "error"; error: AttendanceErrorCode };

export async function markAttendanceClearLmsAction(
  input: unknown,
): Promise<MarkAttendanceClearLmsResult> {
  try {
    await assertProgramAdmin("fan-to-pro");
  } catch (err) {
    return { status: "error", error: toUserError(err, "forbidden") };
  }

  const parsed = ClearInputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }

  try {
    const check = await checkSessionStudentSameCohort(
      parsed.data.session_id,
      parsed.data.student_id,
    );
    if (!check.ok) return { status: "error", error: check.error };

    await deleteAttendance(parsed.data.session_id, parsed.data.student_id);
    revalidateAll();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", error: toUserError(err) };
  }
}
