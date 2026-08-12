"use server";

/**
 * LMS 인앱 커뮤니티, 모더레이션 server actions (Sage 조건).
 *
 * 이 두 함수만 service_role + assertAdmin 경유:
 *   - pinPostAction        : pinned 토글 (authenticated 는 pinned grant 없음 → 필수)
 *   - adminHidePostAction  : 타인 글 hide (모더레이션)
 *
 * §7.4: 첫 줄에 assertAdmin() 필수 (누락 금지). assertAdmin 은 Basic Auth admin
 *   header 또는 LMS super_admin / fan-to-pro program admin 을 통과시킴.
 *
 * assertAdmin 실패 시 throw → try/catch 로 감싸 { status:'error' } 로 정규화.
 * comment_count 는 트리거가 유지 → 안 건드림.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/admin-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

/**
 * 커뮤니티 program 통합 뷰 — 학생/강사 두 surface 목록 + 상세 트리 무효화.
 * dynamic 세그먼트 page 레벨 무효화로 모든 cohort slug / post id 커버.
 */
function revalidateCommunity(): void {
  revalidatePath(
    "/[locale]/fan-to-pro/[cohortSlug]/student/community",
    "page",
  );
  revalidatePath(
    "/[locale]/fan-to-pro/[cohortSlug]/student/community/[postId]",
    "page",
  );
  revalidatePath(
    "/[locale]/fan-to-pro/[cohortSlug]/instructor/community",
    "page",
  );
  revalidatePath(
    "/[locale]/fan-to-pro/[cohortSlug]/instructor/community/[postId]",
    "page",
  );
}

const PinSchema = z.object({
  postId: z.string().uuid(),
  pinned: z.boolean(),
});

const HideSchema = z.object({ postId: z.string().uuid() });

export type ModerationResult =
  | { status: "ok" }
  | { status: "error"; error: string };

/**
 * pinned 토글. **service_role 필수**, authenticated 는 pinned 컬럼 update grant 없음.
 * assertAdmin() 이 첫 줄.
 */
export async function pinPostAction(
  input: unknown,
): Promise<ModerationResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  const parsed = PinSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error } = await supabase
    .from("community_posts")
    .update({ pinned: parsed.data.pinned })
    .eq("id", parsed.data.postId);
  if (error) return { status: "error", error: error.message };

  revalidateCommunity();
  return { status: "ok" };
}

/**
 * 타인 글 모더레이션 hide. status='hidden'. **service_role** (authenticated 는
 * 본인 글만 update 가능하므로 타인 글 hide 불가). assertAdmin() 이 첫 줄.
 */
export async function adminHidePostAction(
  input: unknown,
): Promise<ModerationResult> {
  try {
    await assertAdmin();
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  const parsed = HideSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error } = await supabase
    .from("community_posts")
    .update({ status: "hidden" })
    .eq("id", parsed.data.postId);
  if (error) return { status: "error", error: error.message };

  revalidateCommunity();
  return { status: "ok" };
}
