/**
 * Supabase / Postgres error 분류 helper.
 *
 * 운영 페이지가 Wave 2 entity (materials / announcements / consultations) 처럼
 * 아직 마이그레이션이 적용 안 된 테이블을 조회할 때 graceful empty state 로
 * 분기하기 위함.
 *
 * Postgres SQLSTATE:
 *   - 42P01 : undefined_table (relation "<x>" does not exist)
 *   - 42703 : undefined_column
 *
 * Supabase JS / postgrest 는 error.message 안에 위 sqlstate 또는
 * "does not exist" / "schema cache" 문구를 담아 throw.
 *
 * 본 helper 는 message 기반 (정확한 code 가 늘 보장되지 않음).
 */

const MISSING_TABLE_PATTERNS = [
  "does not exist",
  "schema cache",
  "could not find the table",
  "relation",
];

export function isMissingTableMessage(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  // "relation" 단독은 false positive 가능 — "does not exist" 와 조합되어야 함.
  if (lower.includes("does not exist")) return true;
  if (lower.includes("schema cache")) return true;
  if (lower.includes("could not find the table")) return true;
  return false;
}

export function isMissingTableError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof Error) return isMissingTableMessage(err.message);
  if (typeof err === "object") {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === "string" && isMissingTableMessage(obj.message))
      return true;
    if (obj.code === "42P01") return true;
  }
  if (typeof err === "string") return isMissingTableMessage(err);
  return false;
}

/** 사용 안 함 — pattern 목록 export 시 lint 회피용. */
export const _MISSING_TABLE_PATTERNS_DEBUG = MISSING_TABLE_PATTERNS;
