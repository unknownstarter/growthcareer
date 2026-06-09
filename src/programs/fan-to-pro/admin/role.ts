/**
 * 운영자 페이지 role 결정. middleware 가 매 요청마다 자격을 검증하고
 * `x-admin-role` 헤더로 결과를 박아 server component / server action 에
 * 전달한다. helper 는 그 헤더를 읽고 strict union 으로 노출.
 *
 * - admin: 전체 권한 (CRUD + 메시지 + PII 파기 + 재무 + 강사)
 * - viewer: 신청자 명단 read-only. 강사 / 재무 탭 차단 + 모든 mutation 차단
 *
 * 헤더 부재 / 알 수 없는 값은 immediate throw 한다. server action 에서 호출
 * 시 viewer 면 throw 해 mutation 을 막는다 (assertAdmin helper 별도).
 */
import { headers } from "next/headers";

export type AdminRole = "admin" | "viewer";

export const ADMIN_ROLE_HEADER = "x-admin-role";

export async function getAdminRole(): Promise<AdminRole> {
  const h = await headers();
  const raw = h.get(ADMIN_ROLE_HEADER);
  if (raw === "admin" || raw === "viewer") return raw;
  // middleware 가 통과시킨 요청은 반드시 role 헤더가 있어야 한다. 없으면 설정
  // 오류 — fail closed (admin 으로 fallback 금지).
  throw new Error(
    `[admin-role] missing or invalid ${ADMIN_ROLE_HEADER} header. middleware must set this.`,
  );
}

export async function assertAdmin(): Promise<void> {
  const role = await getAdminRole();
  if (role !== "admin") {
    throw new Error("[admin-role] forbidden: viewer role cannot mutate.");
  }
}
