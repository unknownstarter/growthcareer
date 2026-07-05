"use server";

/**
 * Certificate PDF — server action (B0081).
 *
 * 학생 self-serve / admin preview 공용. HTML-only 반환 (B0062 pattern).
 * 클라이언트가 iframe srcDoc + window.print() 로 PDF 저장.
 *
 * dry-run 여부:
 *   - 학생 self 진입: dryRun=false — 이미 발급됐으면 재사용, 없으면 신규 발급번호 계산.
 *     insertCertificate 은 issue-certificate.ts 로 분리 (learn once + issue once 명확화).
 *   - admin preview: dryRun=true — serial_no="GC-FTP-PREVIEW" 로 미리보기만.
 *
 * 권한: assertCanReadStudentProfile — self / super_admin / program admin / cohort instructor.
 *
 * `경계에서만 검증` (Iris 룰): 첫 줄 zod safeParse + assertCanReadStudentProfile.
 * 내부 함수 (buildCertificateData 등) 는 재검증 없음.
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  loadCertificateContext,
  buildCertificateData,
} from "./build-certificate-data";
import { renderCertificateHtml } from "./certificate-template";
import { evaluateCompletionEligibility } from "@/src/programs/fan-to-pro/domain/services/certificate-eligibility";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GenerateCertificatePdfResult =
  | {
      status: "html-only";
      html: string;
      filename: string;
      serial_no: string;
      attendance_rate: number;
    }
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
 * 학생 수료증 HTML 생성 (server action).
 *
 * 흐름:
 *   1. zod 입력 검증
 *   2. assertCanReadStudentProfile 권한 가드
 *   3. loadCertificateContext (student + cohort + attendance)
 *   4. evaluateCompletionEligibility — fail 시 not-eligible 반환
 *   5. buildCertificateData (serial_no 계산, idempotent 재사용)
 *   6. renderCertificateHtml → HTML string
 */
export async function generateStudentCertificatePdfAction(
  input: unknown,
): Promise<GenerateCertificatePdfResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanReadStudentProfile(parsed.data.student_id);
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

    const data = await buildCertificateData(ctx, { dryRun: false });
    const html = renderCertificateHtml(data);

    const baseName = data.recipient_name_en || data.recipient_name_ko;
    const safeName = baseName
      .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
      .slice(0, 40);
    const filename = `certificate_${safeName}_${data.serial_no}.pdf`;

    return {
      status: "html-only",
      html,
      filename,
      serial_no: data.serial_no,
      attendance_rate: eligibility.attendance_rate,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Admin 미리보기용 (dry-run, 실제 발급 X). student detail 페이지에서 팝업으로 렌더.
 *
 * 발급번호는 "GC-FTP-PREVIEW" 로 고정 — 실제 발급 시 issue-certificate.ts 에서
 * generateSerialNo() 로 확정.
 *
 * 권한: assertCanReadStudentProfile.
 */
export async function previewCertificateForAdminAction(
  input: unknown,
): Promise<GenerateCertificatePdfResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanReadStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const ctx = await loadCertificateContext(parsed.data.student_id);
    if (!ctx) return { status: "error", error: "studentOrCohortNotFound" };

    // Preview 는 eligibility 통과 안 해도 렌더 가능 (admin 확인용).
    // 단 not-eligible 여부는 status 필드로 알림.
    const eligibility = evaluateCompletionEligibility({
      attendanceRate: ctx.attendanceRate,
      cohortStatus: ctx.cohort.status,
      studentStatus: ctx.student.status,
    });

    const data = await buildCertificateData(ctx, { dryRun: true });
    const html = renderCertificateHtml(data);

    const baseName = data.recipient_name_en || data.recipient_name_ko;
    const safeName = baseName
      .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
      .slice(0, 40);
    const filename = `certificate_preview_${safeName}.pdf`;

    return {
      status: "html-only",
      html,
      filename,
      serial_no: data.serial_no,
      attendance_rate:
        eligibility.ok
          ? eligibility.attendance_rate
          : (eligibility.attendance_rate ?? 0),
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
