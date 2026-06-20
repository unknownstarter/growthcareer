/**
 * 운영자 페이지 role 결정 (ADR 0005 §4 Step 1 — 이전).
 *
 * 기존 위치 (`src/programs/fan-to-pro/admin/role.ts`) 는 shim 1줄로 re-export.
 * 호출처 import 경로 변경 X — 동작 변경 0.
 *
 * middleware 가 매 요청마다 자격을 검증하고 `x-admin-role` 헤더로 결과를 박아
 * server component / server action 에 전달. helper 는 그 헤더를 읽고 strict
 * union 으로 노출.
 *
 * - admin: 전체 권한 (CRUD + 메시지 + PII 파기 + 재무 + 강사)
 * - viewer: 신청자 명단 read-only. 강사 / 재무 탭 차단 + 모든 mutation 차단
 *
 * 헤더 부재 / 알 수 없는 값은 immediate throw (fail closed).
 * server action 에서 viewer 가 호출하면 throw 해 mutation 을 막음 (assertAdmin).
 */
import { headers } from "next/headers";

export type AdminRole = "admin" | "viewer";

export const ADMIN_ROLE_HEADER = "x-admin-role";

export async function getAdminRole(): Promise<AdminRole> {
  const h = await headers();
  const raw = h.get(ADMIN_ROLE_HEADER);
  if (raw === "admin" || raw === "viewer") return raw;
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
