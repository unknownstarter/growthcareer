/**
 * LMS role 결정 + 가드 (ADR 0008 §5~7) — 배럴 모듈.
 *
 * 이 파일은 관심사별 모듈의 배럴(re-export)이다. 56+ 호출처가 계속
 * `@/.../infrastructure/auth/lms-role` 에서 import 하도록 경로/시그니처 유지.
 *
 * 실제 구현 위치:
 *   - lms-session.ts   : LmsRole, LmsUser, getLmsUser
 *   - program-guards.ts: assertSuperAdmin, isProgramAdmin, assertProgramAdmin
 *   - cohort-guards.ts : assertCohortRole, getCohortMembershipRole, getCohortProgramId
 *   - student-guards.ts: assertCanAccessStudentCareer, assertCan*StudentNote,
 *                        assertCan*StudentProfile
 *   - material-guards.ts: assertCanUploadMaterial, assertCanDownloadMaterial
 *
 * 권한 모델 (3 계층):
 *   1) super_admin  — user_profiles.is_super_admin = true (글로벌, program 무관)
 *   2) program admin — program_memberships row (현재 fan-to-pro 만)
 *   3) cohort member — cohort_memberships row (role=instructor|student)
 *
 * CLAUDE.md §7.4: 모든 LMS server action 첫 줄에 assertSuperAdmin 또는 그에 준하는
 * 가드 의무. middleware path 차단만 신뢰 금지 (viewer role 사고 2026-06-09 lesson).
 */
import {
  getLmsUser,
  type LmsRole,
  type LmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/program-guards";

export type { LmsRole, LmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";
export { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";
export {
  assertSuperAdmin,
  isProgramAdmin,
  assertProgramAdmin,
} from "@/src/programs/fan-to-pro/infrastructure/auth/program-guards";
export {
  assertCohortRole,
  getCohortMembershipRole,
  getCohortProgramId,
} from "@/src/programs/fan-to-pro/infrastructure/auth/cohort-guards";
export {
  assertCanAccessStudentCareer,
  assertCanWriteStudentNote,
  assertCanReadStudentNote,
  assertCanWriteStudentProfile,
  assertCanReadStudentProfile,
} from "@/src/programs/fan-to-pro/infrastructure/auth/student-guards";
export {
  assertCanUploadMaterial,
  assertCanDownloadMaterial,
} from "@/src/programs/fan-to-pro/infrastructure/auth/material-guards";

// -------------------------------------------------------------------------
// 기존 호환 — 옛 코드가 assertLmsRole('super_admin') 호출하는 곳 안 깨지게.
// 새 코드는 위 함수들 사용.
// -------------------------------------------------------------------------

/** @deprecated use assertSuperAdmin / assertProgramAdmin / assertCohortRole */
export async function assertLmsRole(required: LmsRole): Promise<LmsUser> {
  if (required === "super_admin") return assertSuperAdmin();
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.role !== required) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} cannot perform ${required} action.`,
    );
  }
  return user;
}

/** @deprecated */
export async function assertLmsRoleIn(allowed: LmsRole[]): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin && allowed.includes("super_admin")) return user;
  if (!allowed.includes(user.role)) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} not in [${allowed.join(", ")}].`,
    );
  }
  return user;
}
