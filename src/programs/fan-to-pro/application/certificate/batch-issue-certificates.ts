"use server";

/**
 * Certificate 일괄 발급 mutation (B0081 Slice 1).
 *
 * cohort 안 모든 active/completed 학생에게 순차 발급. seq 001, 002, ...
 * applicants.created_at ASC (신청 등록순) 정렬. race 방지 위해 병렬 X.
 *
 * 권한: super_admin only. 위반 시 error 반환.
 *
 * Idempotent:
 *   - 이미 발급된 학생 = already 로 분류 (skip, 기존 serial 반환)
 *   - 자격 부족 = not-eligible (skip, reason 명시)
 *   - error = 개별 학생 fail (전체 rollback X, 다음 학생 계속)
 *
 * 성능:
 *   - N 명 순차 실행 = N × single-issue latency (병렬 X, seq 안정성 우선)
 *   - 1기 30명 기준 예상 총 latency 5~10s. admin 이 초조하지 않은 UX 로 progress 표시.
 *
 * Cron 재사용:
 *   - Slice 2 (Cron) 에서 이 함수를 그대로 호출. cron trigger 는 별도 auth 로 wrap.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchApplicantById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { issueCertificateForStudentAction } from "./issue-certificate";

const InputSchema = z.object({
  cohort_id: z.string().uuid(),
});

export type BatchIssueStatus =
  | "issued"
  | "already"
  | "not-eligible"
  | "error";

export type BatchIssueEntry = {
  student_id: string;
  name: string;
  status: BatchIssueStatus;
  serial_no: string | null;
  attendance_rate: number | null;
  reason: string | null;
};

export type BatchIssueResult =
  | {
      status: "ok";
      counts: {
        issued: number;
        already: number;
        not_eligible: number;
        error: number;
        total: number;
      };
      entries: BatchIssueEntry[];
    }
  | { status: "error"; error: string };

/**
 * cohort 안 active students 일괄 수료증 발급.
 *
 * 흐름:
 *   1. zod 입력 검증
 *   2. assertSuperAdmin (super_admin 만, 권한 confusion 방지)
 *   3. cohort 안 students 조회 (status=active)
 *   4. 각 student → applicant.created_at 매핑 → ASC 정렬
 *   5. 순차 for-loop `issueCertificateForStudentAction` 호출
 *   6. 결과 분류 + aggregate + revalidatePath
 */
export async function batchIssueCertificatesForCohortAction(
  input: unknown,
): Promise<BatchIssueResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertSuperAdmin();
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const students = await fetchStudentsByCohort(parsed.data.cohort_id);
    if (students.length === 0) {
      return {
        status: "ok",
        counts: { issued: 0, already: 0, not_eligible: 0, error: 0, total: 0 },
        entries: [],
      };
    }

    // applicants.created_at 로 정렬 (신청 등록순).
    // fallback: student.created_at (applicant fetch 실패 시).
    const withCreatedAt = await Promise.all(
      students.map(async (s) => {
        let sortKey = s.created_at;
        try {
          const applicant = await fetchApplicantById(s.applicant_id);
          if (applicant?.createdAt) sortKey = applicant.createdAt;
        } catch {
          // fallback to student.created_at, silent
        }
        return { student: s, sortKey };
      }),
    );
    withCreatedAt.sort(
      (a, b) =>
        new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime(),
    );

    const entries: BatchIssueEntry[] = [];
    let issued = 0;
    let already = 0;
    let not_eligible = 0;
    let error = 0;

    // 순차 실행 (seq race 방지). generateSerialNo 는 (기존 completion count + 1)
    // 로 다음 seq 를 계산하므로 병렬 실행 시 같은 seq 가 두 번 나올 수 있음.
    for (const { student } of withCreatedAt) {
      const result = await issueCertificateForStudentAction({
        student_id: student.id,
      });

      if (result.status === "ok") {
        if (result.already_issued) {
          already += 1;
          entries.push({
            student_id: student.id,
            name: student.display_name,
            status: "already",
            serial_no: result.serial_no,
            attendance_rate: result.attendance_rate,
            reason: null,
          });
        } else {
          issued += 1;
          entries.push({
            student_id: student.id,
            name: student.display_name,
            status: "issued",
            serial_no: result.serial_no,
            attendance_rate: result.attendance_rate,
            reason: null,
          });
        }
      } else if (result.status === "not-eligible") {
        not_eligible += 1;
        entries.push({
          student_id: student.id,
          name: student.display_name,
          status: "not-eligible",
          serial_no: null,
          attendance_rate: result.attendance_rate,
          reason: result.reason,
        });
      } else {
        error += 1;
        entries.push({
          student_id: student.id,
          name: student.display_name,
          status: "error",
          serial_no: null,
          attendance_rate: null,
          reason: result.error,
        });
      }
    }

    // cohort detail 페이지 progress 카드 재계산.
    revalidatePath("/[locale]/fan-to-pro/admin/cohorts/[cohortSlug]", "page");

    return {
      status: "ok",
      counts: {
        issued,
        already,
        not_eligible,
        error,
        total: entries.length,
      },
      entries,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
