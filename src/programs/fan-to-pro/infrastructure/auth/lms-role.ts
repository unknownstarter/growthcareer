/**
 * LMS role 결정 + 가드 (ADR 0007 §3).
 *
 * 기존 `admin-role.ts` (Basic Auth, /admin/*) 와 별개. 본 파일은 Supabase
 * Auth 기반 (/lms/*) 의 role 헬퍼.
 *
 * 헤더 기반이 아닌 session 기반 — middleware 가 session refresh 만 하고
 * role 은 server component / server action 에서 매번 user_profiles 조회.
 *
 * 사용처:
 *   - server component: getLmsUser() → user + role + profile
 *   - server action: assertLmsRole('super_admin') 으로 mutation 차단
 *
 * 패턴 = 기존 assertAdmin() 와 동일. CLAUDE.md §7.4 의 "운영자 페이지
 * server action 에 assertAdmin() 누락 금지" 룰을 LMS 에도 동일하게 적용.
 */
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export type LmsRole = "super_admin" | "instructor" | "student";

export interface LmsUser {
  id: string; // auth.users.id
  email: string;
  role: LmsRole;
  displayName: string;
  companyId: string | null;
  studentId: string | null;
  instructorId: string | null;
}

/**
 * 현재 session 의 LMS user + profile. session 없거나 profile 없으면 null.
 *
 * profile 조회는 service_role client 로 — anon client 는 self_read RLS 통과
 * 가능하지만 service_role 이 빠르고 단순. user_profiles 는 PII 가 강하지
 * 않아 (이름·이메일) service_role 으로 read 해도 OK.
 */
export async function getLmsUser(): Promise<LmsUser | null> {
  const auth = await getSupabaseAuthServer();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) return null;

  const supabase = getSupabaseServer();
  if (!supabase) {
    // Supabase 미설정 = 로컬 dev fallback. session 만으로 super_admin 가정 X.
    return null;
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(
      "id, role, display_name, email, company_id, student_id, instructor_id",
    )
    .eq("id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    displayName: profile.display_name,
    companyId: profile.company_id,
    studentId: profile.student_id,
    instructorId: profile.instructor_id,
  };
}

/**
 * server action 1차 가드. role 불일치 시 throw.
 *
 * 사용 예 (Step 2~4 의 mutation):
 *   await assertLmsRole('super_admin');
 *
 * middleware 의 URL 차단은 1차, 본 함수는 2차 (mutation 차단). viewer role
 * 사고 (2026-06-09) 의 lesson — middleware path 차단만 신뢰 금지.
 */
export async function assertLmsRole(required: LmsRole): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) {
    throw new Error("[lms-role] unauthenticated.");
  }
  if (user.role !== required) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} cannot perform ${required} action.`,
    );
  }
  return user;
}

/**
 * 여러 role 허용 (예: super_admin 또는 instructor).
 */
export async function assertLmsRoleIn(allowed: LmsRole[]): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) {
    throw new Error("[lms-role] unauthenticated.");
  }
  if (!allowed.includes(user.role)) {
    throw new Error(
      `[lms-role] forbidden: role=${user.role} not in [${allowed.join(", ")}].`,
    );
  }
  return user;
}
