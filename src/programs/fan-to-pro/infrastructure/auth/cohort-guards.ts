/**
 * Cohort 단위 role 가드 + membership/program 조회 헬퍼 (ADR 0008 §5~7).
 *
 * CLAUDE.md §7.4: 모든 LMS server action 첫 줄에 assertSuperAdmin 또는 그에 준하는
 * 가드 의무. middleware path 차단만 신뢰 금지 (viewer role 사고 2026-06-09 lesson).
 */
import { cache } from "react";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  getLmsUser,
  type LmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";

/**
 * cohort 단위 role 가드 (instructor 또는 student). super_admin / program admin
 * 도 통과.
 *
 * 사용 예:
 *   await assertCohortRole(cohortId, 'instructor');
 */
export async function assertCohortRole(
  cohortId: string,
  role: "instructor" | "student",
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  // program admin 도 통과 — cohort 의 program 검사.
  const { data: cohort } = await supabase
    .from("cohorts")
    .select("program_id")
    .eq("id", cohortId)
    .single();
  if (!cohort) throw new Error(`[lms-role] unknownCohort: ${cohortId}`);

  const { data: programMembership } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", cohort.program_id)
    .eq("role", "admin")
    .maybeSingle();
  if (programMembership) return user;

  // cohort 자체의 membership.
  const { data: cm } = await supabase
    .from("cohort_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("cohort_id", cohortId)
    .eq("role", role)
    .maybeSingle();
  if (!cm) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not ${role} of cohort ${cohortId}.`,
    );
  }
  return user;
}

/**
 * (user × cohort) 의 cohort_membership 조회 — instructor / student / null.
 * cache 로 동일 request 안에서 중복 조회 회피.
 */
export const getCohortMembershipRole = cache(
  async (
    userId: string,
    cohortId: string,
  ): Promise<"instructor" | "student" | null> => {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase
      .from("cohort_memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("cohort_id", cohortId)
      .maybeSingle();
    if (!data) return null;
    const role = data.role as string;
    if (role === "instructor" || role === "student") return role;
    return null;
  },
);

/**
 * cohort 의 program_id 조회 — cache.
 */
export const getCohortProgramId = cache(
  async (cohortId: string): Promise<string | null> => {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase
      .from("cohorts")
      .select("program_id")
      .eq("id", cohortId)
      .maybeSingle();
    return (data?.program_id as string | undefined) ?? null;
  },
);
