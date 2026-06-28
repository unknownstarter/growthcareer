/**
 * 로그인 / 콜백 / change-password 후 도달할 경로 계산 (ADR 0008 §6).
 *
 * 결정 규칙:
 *   1. super_admin → /[locale]/fan-to-pro/admin/dashboard
 *   2. program admin (program_memberships) → /[locale]/fan-to-pro/admin/dashboard
 *      (현 단계 super_admin 과 동일 surface. multi-program 확장 시 program 별 분기)
 *   3. cohort instructor → /[locale]/fan-to-pro/<cohortSlug>/instructor/dashboard
 *   4. cohort student → /[locale]/fan-to-pro/<cohortSlug>/student/dashboard
 *   5. 어디에도 속하지 X → /[locale]/auth/login?error=no_membership
 *
 * 여러 cohort_memberships 가 있으면:
 *   - 가장 최근 (created_at DESC) cohort 의 surface 로.
 *   - 향후 cohort 선택 UI 도입 시 변경 가능.
 *
 * 본 함수는 server-side 호출 — server component / server action / route handler.
 */
import type { LmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export async function resolvePostLoginRedirect(
  user: LmsUser,
  locale: string,
): Promise<string> {
  // super_admin = 글로벌. cohort_memberships / program_memberships 검사 건너뜀.
  if (user.isSuperAdmin) {
    return `/${locale}/fan-to-pro/admin/dashboard`;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    // service_role 없음 = post-login 결정 불가. login 으로 돌려보냄.
    return `/${locale}/auth/login?error=server_unavailable`;
  }

  // program admin 검사 (현 단계 fan-to-pro 1 program 만).
  const { data: programAdmin } = await supabase
    .from("program_memberships")
    .select("program_id, role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (programAdmin) {
    // program slug 조회. (현 단계 fan-to-pro 만 — 미래엔 program slug 별 분기)
    const { data: program } = await supabase
      .from("programs")
      .select("slug")
      .eq("id", programAdmin.program_id)
      .single();
    const slug = program?.slug ?? "fan-to-pro";
    return `/${locale}/${slug}/admin/dashboard`;
  }

  // cohort 멤버십 (instructor 우선, 그 다음 student).
  const { data: memberships } = await supabase
    .from("cohort_memberships")
    .select("cohort_id, role, created_at, cohorts!inner(slug, program_id, programs(slug))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (memberships && memberships.length > 0) {
    // instructor 가 student 보다 우선 (강사가 학생으로도 가입된 경우 강사 surface).
    const instructor = memberships.find((m) => m.role === "instructor");
    const target = instructor ?? memberships[0];

    // 중첩된 cohort + program slug.
    // supabase 의 nested select 결과는 array 또는 object 둘 다 가능. defensive.
    const cohortObj = Array.isArray(target.cohorts)
      ? target.cohorts[0]
      : (target.cohorts as { slug?: string; programs?: { slug?: string } | { slug?: string }[] } | null);
    if (!cohortObj?.slug) {
      return `/${locale}/auth/login?error=cohort_missing`;
    }
    const programObj = Array.isArray(cohortObj.programs)
      ? cohortObj.programs[0]
      : cohortObj.programs;
    const programSlug = programObj?.slug ?? "fan-to-pro";

    // 학생 dashboard 신설 (B0058) — 로그인 직후 빠른 3 link (프로필/자료/커리어)
    // 강사 surface 는 1기 미구현 — 일단 student dashboard 로 fallback (운영 영향 0).
    return `/${locale}/${programSlug}/${cohortObj.slug}/student/dashboard`;
  }

  // 어디에도 속하지 X.
  return `/${locale}/auth/login?error=no_membership`;
}
