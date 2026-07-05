"use server";

/**
 * Certificate 실 발급 mutation (B0081).
 *
 * 학생 self-serve 또는 admin 수동 발급. 통과 시 certificates 테이블에 row 삽입 +
 * serial_no 확정.
 *
 * 권한:
 *   - super_admin / program admin / student-self 모두 가능.
 *   - assertCanReadStudentProfile 재사용 — read 권한 있으면 발급 가능 (self-serve).
 *
 * Idempotent:
 *   - (student_id, kind) UNIQUE 제약 (certificate.ts §7 invariant).
 *   - 이미 발급된 row 있으면 그 serial_no 반환 (retry-safe).
 *
 * Audit:
 *   - issued_by = 로그인 사용자 (user_profiles.id / auth.users.id).
 *   - attendance_rate 저장 (%로 변환 후).
 *   - notes 에 발급 시점 컨텍스트 남김.
 */
import { z } from "zod";
import {
  assertCanReadStudentProfile,
  getLmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCertificatesByStudent, insertCertificate } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { loadCertificateContext } from "./build-certificate-data";
import { generateSerialNo } from "./serial-no";
import { evaluateCompletionEligibility } from "@/src/programs/fan-to-pro/domain/services/certificate-eligibility";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type IssueCertificateResult =
  | { status: "ok"; serial_no: string; attendance_rate: number; already_issued: boolean }
  | {
      status: "not-eligible";
      reason:
        | "cohort_in_progress"
        | "cohort_cancelled"
        | "student_inactive"
        | "attendance_below_threshold";
      attendance_rate: number | null;
    }
  | { status: "error"; error: string };

/**
 * 학생 completion 수료증 발급 (idempotent).
 *
 * 흐름:
 *   1. zod 입력 검증
 *   2. assertCanReadStudentProfile — self / admin 모두 통과
 *   3. loadCertificateContext (student + cohort + attendance)
 *   4. evaluateCompletionEligibility — 실패 시 not-eligible 반환
 *   5. 이미 발급됐으면 그 serial_no 재사용 (already_issued=true)
 *   6. 신규 발급 → generateSerialNo + insertCertificate
 */
export async function issueCertificateForStudentAction(
  input: unknown,
): Promise<IssueCertificateResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  let user;
  try {
    user = await assertCanReadStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const ctx = await loadCertificateContext(parsed.data.student_id);
    if (!ctx) return { status: "error", error: "studentOrCohortNotFound" };

    const eligibility = evaluateCompletionEligibility({
      attendanceRate: ctx.attendanceRate,
      cohortStatus: ctx.cohort.status,
      studentStatus: ctx.student.status,
    });

    if (!eligibility.ok) {
      return {
        status: "not-eligible",
        reason: eligibility.reason,
        attendance_rate: eligibility.attendance_rate,
      };
    }

    // 이미 발급된 completion 있으면 재사용
    const existing = await fetchCertificatesByStudent(parsed.data.student_id);
    const already = existing.find(
      (c) => c.cohort_id === ctx.cohort.id && c.kind === "completion",
    );
    if (already) {
      return {
        status: "ok",
        serial_no: already.serial_no,
        attendance_rate: eligibility.attendance_rate,
        already_issued: true,
      };
    }

    // 신규 발급
    const serialNo = await generateSerialNo(
      parsed.data.student_id,
      ctx.cohort.id,
    );
    const attendancePercent = Math.round(eligibility.attendance_rate * 100);

    // getLmsUser() 이미 assertCanReadStudentProfile 이 호출 — cache() 로 1회 재사용.
    const meUser = await getLmsUser();
    const issuedBy = meUser?.id ?? user.id;

    const inserted = await insertCertificate({
      student_id: parsed.data.student_id,
      cohort_id: ctx.cohort.id,
      kind: "completion",
      serial_no: serialNo,
      issued_by: issuedBy,
      attendance_rate: attendancePercent,
      notes: `Issued by ${meUser?.isSuperAdmin ? "super_admin" : "self-or-admin"} at ${new Date().toISOString()}`,
    });

    return {
      status: "ok",
      serial_no: inserted.serial_no,
      attendance_rate: eligibility.attendance_rate,
      already_issued: false,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
