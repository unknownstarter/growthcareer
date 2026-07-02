/**
 * 운영자 페이지 role 결정 (ADR 0005 §4 Step 1 — 이전).
 *
 * Dual-mode 가드 (2026-06-27 sweep fix):
 *   1) Basic Auth surface (`/admin/*` 옛 모집 어드민): middleware 가 `x-admin-role`
 *      header 박음 → header 우선 통과
 *   2) LMS surface (`/[locale]/fan-to-pro/admin/*`): Supabase Auth.
 *      header 부재 → LMS user (super_admin OR program admin "fan-to-pro") 확인
 *
 * 이 단일 가드가 두 surface 모두 보호. 호출처는 변경 없음.
 *
 * 이전 사고 (2026-06-27):
 *   - fetchCohortRoster (commit 3c2c6fa) + backfillPaidApplicantsAction (commit c14878a)
 *     모두 header 없으면 throw → LMS surface 500/404
 *   - cohorts-dashboard 의 markAttendanceAction 도 use case 안에서 같은 throw 잠재
 *
 * Basic Auth viewer role 은 그대로 차단 (mutation 금지).
 *
 * 호환 보장:
 *   - 기존 admin header 통과 시 즉시 return (동작 0 변경)
 *   - viewer header 시 그대로 throw (Basic Auth viewer 차단)
 *   - header 없음 + LMS auth 도 없음 → throw (현 동작과 동일)
 */
import { headers } from "next/headers";
import { getLmsUser, isProgramAdmin } from "./lms-role";

export type AdminRole = "admin" | "viewer";

export const ADMIN_ROLE_HEADER = "x-admin-role";

/**
 * LMS user 가 super_admin 또는 fan-to-pro program admin 이면 true.
 * 미인증 / 자격 없음 시 false.
 *
 * Mira B0065 M-1 (2026-07-03): dynamic import → static 승격.
 * lms-role.ts 가 admin-role.ts 를 import 하지 않으므로 cycle 없음.
 */
async function isLmsAdminUser(): Promise<boolean> {
  try {
    const user = await getLmsUser();
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return await isProgramAdmin(user.id, "fan-to-pro");
  } catch {
    return false;
  }
}

export async function getAdminRole(): Promise<AdminRole> {
  const h = await headers();
  const raw = h.get(ADMIN_ROLE_HEADER);
  if (raw === "admin" || raw === "viewer") return raw;

  // LMS fallback
  if (await isLmsAdminUser()) return "admin";

  throw new Error(
    `[admin-role] missing or invalid ${ADMIN_ROLE_HEADER} header + no LMS admin user.`,
  );
}

export async function assertAdmin(): Promise<void> {
  const h = await headers();
  const raw = h.get(ADMIN_ROLE_HEADER);
  if (raw === "admin") return; // Basic Auth admin OK
  if (raw === "viewer") {
    throw new Error("[admin-role] forbidden: viewer role cannot mutate.");
  }

  // header 없음 → LMS fallback
  if (await isLmsAdminUser()) return;

  throw new Error("[admin-role] forbidden: not admin (no header, no LMS auth).");
}
