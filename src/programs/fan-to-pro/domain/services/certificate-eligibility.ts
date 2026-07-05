/**
 * Certificate eligibility — 도메인 룰 (B0081).
 *
 * 발급 자격 판정 = 순수 함수. 외부 의존성 0 (Supabase / fs / http 금지).
 *
 * `canIssueCompletion` (certificate.ts entity §36) 은 boolean 만 반환.
 * 여기선 UI 가 세부 이유 표시할 수 있게 discriminated union 으로 확장.
 *
 * 임계값:
 *   - COMPLETION_ATTENDANCE_THRESHOLD = 0.75 (75%) — 노아 승인 (2026-07-04)
 */

export const COMPLETION_ATTENDANCE_THRESHOLD = 0.75;

export type EligibilityInput = {
  /** 0-1 (0.75 = 75%). null = 아직 회차 진행 전 (ended 회차 0). */
  attendanceRate: number | null;
  /** cohort.status */
  cohortStatus: string;
  /** student.status */
  studentStatus: string;
};

export type EligibilityResult =
  | {
      ok: true;
      attendance_rate: number;
    }
  | {
      ok: false;
      reason:
        | "cohort_in_progress"
        | "cohort_cancelled"
        | "student_inactive"
        | "attendance_below_threshold";
      attendance_rate: number | null;
    };

/**
 * completion 수료증 발급 자격 판정.
 *
 * 통과 순서 (fail-fast):
 *   1. cohort 종강 여부 (`completed`) — 아니면 cohort_in_progress
 *   2. cohort cancelled — 폐강 시 발급 X
 *   3. student status — active / completed 외엔 발급 X (withdrawn 자퇴 등)
 *   4. attendance_rate ≥ 0.75
 */
export function evaluateCompletionEligibility(
  input: EligibilityInput,
): EligibilityResult {
  if (input.cohortStatus === "cancelled") {
    return {
      ok: false,
      reason: "cohort_cancelled",
      attendance_rate: input.attendanceRate,
    };
  }
  if (input.cohortStatus !== "completed") {
    return {
      ok: false,
      reason: "cohort_in_progress",
      attendance_rate: input.attendanceRate,
    };
  }
  if (
    input.studentStatus !== "active" &&
    input.studentStatus !== "completed"
  ) {
    return {
      ok: false,
      reason: "student_inactive",
      attendance_rate: input.attendanceRate,
    };
  }

  const rate = input.attendanceRate ?? 0;
  if (rate < COMPLETION_ATTENDANCE_THRESHOLD) {
    return {
      ok: false,
      reason: "attendance_below_threshold",
      attendance_rate: rate,
    };
  }
  return { ok: true, attendance_rate: rate };
}
