/**
 * Program 단위 / 글로벌 가드 (ADR 0008 §5~7).
 *
 * 가드 함수 — server action 1차 가드 (RLS 가 2차).
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
 * super_admin 만. 위반 시 throw.
 *
 * 사용 예:
 *   await assertSuperAdmin();
 */
export async function assertSuperAdmin(): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (!user.isSuperAdmin) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not super_admin.`,
    );
  }
  return user;
}

/**
 * program admin 또는 super_admin. 위반 시 throw.
 *
 * 사용 예:
 *   await assertProgramAdmin('fan-to-pro');
 */
/**
 * (user × program) 의 admin 여부 — React `cache()` 로 동일 request 안에서 중복 호출 시
 * 한 번만 DB query. layout + page + server action 이 같은 user 의 권한 검증 시 효율.
 */
export const isProgramAdmin = cache(
  async (userId: string, programSlug: string): Promise<boolean> => {
    const supabase = getSupabaseServer();
    if (!supabase) return false;

    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", programSlug)
      .single();
    if (!program) return false;

    const { data: membership } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .eq("role", "admin")
      .maybeSingle();

    return !!membership;
  },
);

export async function assertProgramAdmin(
  programSlug: string,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) return user;

  const ok = await isProgramAdmin(user.id, programSlug);
  if (!ok) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} is not admin of program ${programSlug}.`,
    );
  }
  return user;
}
