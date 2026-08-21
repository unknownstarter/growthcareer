/**
 * 앱 전역 에러코드 taxonomy (Tier 1 관측성).
 *
 * 목적: 서버 로그 / GA4 이벤트에서 실패를 **안정된 코드**로 집계·검색하기 위함.
 * 사용자 노출 문구가 아니라 로깅/알림용 식별자다 (UI 친화 문구는 별도).
 * 새 실패 지점이 생기면 여기 코드를 추가하고 로그/이벤트에 그 코드를 실어보낸다.
 *
 * 배경: 2026-08-21 배포 스큐로 신청 제출이 클라이언트에서 조용히 실패했으나
 * 서버 로그·알림에 안 잡혀 사용자 제보로만 인지. 실패를 코드화 → 관측 가능하게.
 */
export const APP_ERROR = {
  // 신청 (Recruitment)
  APPLY_INSERT_FAILED: "APPLY_INSERT_FAILED", // applicants INSERT 실패 (DB)
  APPLY_VALIDATION_FAILED: "APPLY_VALIDATION_FAILED", // zod 검증 실패
  // 어드민 mutation (상태 변경 / 입금 확인 / 일괄 확정 등) DB 에러
  ADMIN_MUTATION_FAILED: "ADMIN_MUTATION_FAILED",
  // 배포 스큐 (클라이언트 번들 <-> 서버 액션 ID 불일치)
  SKEW_ACTION_MISSING: "SKEW_ACTION_MISSING",
  // 분류 안 됨 (에러 바운더리가 잡은 예상 밖 throw)
  UNKNOWN: "UNKNOWN",
} as const;

export type AppErrorCode = (typeof APP_ERROR)[keyof typeof APP_ERROR];

/**
 * 배포 스큐 에러 판별 — Next 서버 액션 ID 가 새 배포 서버에 없을 때 발생하는
 * UnrecognizedActionError. 클라이언트에서만 관측되므로 message 로 판별한다.
 */
export function isSkewError(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /unrecognizedaction|server action.*(not be found|was not found)|failed to find server action/i.test(
    msg,
  );
}

/**
 * 서버 로그용 구조화 헬퍼 — grep 하기 좋은 단일 라인: `[app-error] CODE detail`.
 * Vercel Observability 에서 `[app-error]` 로 검색하면 실패 이벤트만 모인다.
 */
export function logAppError(code: AppErrorCode, detail?: unknown): void {
  // eslint-disable-next-line no-console
  console.error("[app-error]", code, detail ?? "");
}
