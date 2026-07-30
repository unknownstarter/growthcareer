/**
 * LMS session + user profile 조회 (ADR 0008 §5~7).
 *
 * 권한 모델 (3 계층):
 *   1) super_admin  — user_profiles.is_super_admin = true (글로벌, program 무관)
 *   2) program admin — program_memberships row (현재 fan-to-pro 만)
 *   3) cohort member — cohort_memberships row (role=instructor|student)
 *
 * 기존 user_profiles.role 컬럼은 deprecated — backward compat 만 유지.
 *
 * 사용처:
 *   - server component: getLmsUser() → LmsUser (id + email + flags + memberships)
 */
import { cache } from "react";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

// 기존 role 문자열 호환용 (deprecated — 새 코드는 isSuperAdmin/membership 사용).
export type LmsRole = "super_admin" | "instructor" | "student";

export interface LmsUser {
  id: string; // auth.users.id
  email: string;
  displayName: string;

  // 새 모델 (ADR 0008).
  isSuperAdmin: boolean;
  mustChangePassword: boolean;

  // 기존 호환 — Step 2 의 admin server action 안 깨지게.
  // 새 코드는 isSuperAdmin / cohort_memberships 우선.
  role: LmsRole;
  companyId: string | null;
  studentId: string | null;
  instructorId: string | null;
}

/**
 * 현재 session 의 LMS user + profile. session 없거나 profile 없으면 null.
 *
 * profile 조회는 service_role client 로 — anon client 보다 단순. user_profiles 는
 * PII 강도 낮아 service_role read 안전.
 *
 * 기존 role 컬럼이 null 인 새 invite 사용자도 처리 — is_super_admin / 또는
 * cohort_memberships 에서 역으로 추론.
 */
/**
 * React `cache()` 로 request 당 1회만 실행. layout + page 가 둘 다
 * `getLmsUser()` 호출해도 user_profiles + cohort_memberships query
 * 1세트만 발생 — 페이지 진입 속도 개선.
 */
export const getLmsUser = cache(async (): Promise<LmsUser | null> => {
  const auth = await getSupabaseAuthServer();
  // #11: getUser()(Auth 서버 네트워크 왕복) → getClaims()(ES256 로컬 JWKS 검증).
  // ES256 비대칭 키 활성(실측) → 네트워크 0. claims.sub = auth.users.id.
  // 주의: getClaims 는 로컬 검증이라 revocation(로그아웃/ban)이 access token
  // 만료까지 지연될 수 있음. 그러나 인가(role/membership)는 아래 DB 조회로
  // 매 요청 실시간 유지 → 데이터 접근은 즉시 반영. mutation 은 assert* + RLS 2중.
  const { data: claimsData, error: claimsError } = await auth.auth.getClaims();
  // Sage LOW-1: 검증 실패 원인(서명 불일치/JWKS 롤테이션 등)을 로그로 남김.
  // 값 노출 없이 error.name 만. 인증 결과는 fail-closed(아래 !userId).
  if (claimsError) {
    console.warn("[lms-role] getClaims failed:", claimsError.name);
  }
  const userId = claimsData?.claims?.sub;

  if (!userId) return null;

  const supabase = getSupabaseServer();
  if (!supabase) {
    // Supabase 미설정 = 로컬 dev fallback. super_admin 가정 X.
    return null;
  }

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(
      "id, display_name, email, company_id, student_id, instructor_id, is_super_admin, must_change_password",
    )
    .eq("id", userId)
    .single();

  if (error || !profile) return null;

  // Mira B0065 M-2 (2026-07-03): user_profiles.role 컬럼 삭제 후 순수 추론.
  // 권한 결정 = is_super_admin OR program_memberships OR cohort_memberships.
  let inferredRole: LmsRole = "student";
  if (profile.is_super_admin) {
    inferredRole = "super_admin";
  } else {
    // cohort membership 첫 행으로 추론 (instructor 우선).
    const { data: cm } = await supabase
      .from("cohort_memberships")
      .select("role")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (cm && cm.length > 0) {
      const inst = cm.find((r) => r.role === "instructor");
      inferredRole = inst ? "instructor" : (cm[0].role as LmsRole);
    }
  }

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    isSuperAdmin: Boolean(profile.is_super_admin),
    mustChangePassword: Boolean(profile.must_change_password),
    role: inferredRole,
    companyId: profile.company_id,
    studentId: profile.student_id,
    instructorId: profile.instructor_id,
  };
});
