"use server";

/**
 * LMS 인앱 커뮤니티, alumni(본인) server actions.
 *
 * 인증: 전부 **authenticated 세션 client**(getSupabaseAuthServer) 로 실행.
 *   RLS(cp_alumni_insert / cp_alumni_update / cc_alumni_*) + 컬럼 grant(title,
 *   body, status 만) 가 실제 방어선. service_role 우회 안 함.
 *
 * 모더레이션(pinned 토글 / 타인 글 hide) 은 별도 파일 lms-community-moderation-actions.ts
 *   (service_role + assertAdmin). 본 파일엔 없음.
 *
 * 반환: throw 대신 { status } 객체 (admin-actions 패턴).
 * comment_count 는 DB 트리거가 자동 갱신 → 여기서 안 건드림.
 *
 * revalidate: 커뮤니티 라우트는 Luna slice 에서 확정 → 아래 revalidateCommunity()
 *   가 알려진 경로 best-effort. 라우트 확정되면 여기만 갱신.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import { resolveFanToProProgramId } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/community-repository";

// -------------------------------------------------------------------------
// revalidate (Luna slice 에서 라우트 확정)
// -------------------------------------------------------------------------

/**
 * 커뮤니티는 program 통합 뷰 (스코프 B) — 진입 cohort 무관 같은 데이터.
 * 학생/강사 두 surface 의 커뮤니티 목록 + 상세 트리를 함께 무효화한다.
 * dynamic 세그먼트([locale]/[cohortSlug]/[postId]) 를 포함한 page 레벨 무효화라
 * 모든 param 값(cohort slug, post id)을 커버한다.
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

// -------------------------------------------------------------------------
// schemas
// -------------------------------------------------------------------------

const CreatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  body: z.string().trim().min(1).max(5000),
});

const EditPostSchema = z.object({
  postId: z.string().uuid(),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  body: z.string().trim().min(1).max(5000),
});

const PostIdSchema = z.object({ postId: z.string().uuid() });

const CreateCommentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

const EditCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

const CommentIdSchema = z.object({ commentId: z.string().uuid() });

// -------------------------------------------------------------------------
// result types
// -------------------------------------------------------------------------

export type CommunityMutationResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export type CreatePostResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

export type CreateCommentResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

// -------------------------------------------------------------------------
// posts
// -------------------------------------------------------------------------

/**
 * 글 작성. created_by=본인, program_id=resolved(fan-to-pro), pinned=false,
 * status='published'. RLS 가 program 소속 검증.
 */
export async function createPostAction(
  input: unknown,
): Promise<CreatePostResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = CreatePostSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const programId = await resolveFanToProProgramId();
  if (!programId) return { status: "error", error: "programUnavailable" };

  try {
    const auth = await getSupabaseAuthServer();
    const { data, error } = await auth
      .from("community_posts")
      .insert({
        program_id: programId,
        created_by: me.id,
        title: parsed.data.title ?? null,
        body: parsed.data.body,
        pinned: false,
        status: "published",
      })
      .select("id")
      .single();
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok", id: String((data as { id: string }).id) };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * 본인 글 수정 (RLS cp_alumni_update). title/body 만. status/pinned/program_id
 * 안 건드림 (grant 에도 없어 이중 차단).
 */
export async function editPostAction(
  input: unknown,
): Promise<CommunityMutationResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = EditPostSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const auth = await getSupabaseAuthServer();
    const { error } = await auth
      .from("community_posts")
      .update({ title: parsed.data.title ?? null, body: parsed.data.body })
      .eq("id", parsed.data.postId);
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * 본인 글 soft-delete. status='hidden' (RLS cp_alumni_update, 본인 글만).
 */
export async function softDeletePostAction(
  input: unknown,
): Promise<CommunityMutationResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = PostIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const auth = await getSupabaseAuthServer();
    const { error } = await auth
      .from("community_posts")
      .update({ status: "hidden" })
      .eq("id", parsed.data.postId);
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

// -------------------------------------------------------------------------
// comments
// -------------------------------------------------------------------------

/**
 * 댓글 작성. created_by=본인, status='published'. 트리거가 comment_count++.
 * RLS(cc_alumni_insert) 가 published post + program 소속 검증.
 */
export async function createCommentAction(
  input: unknown,
): Promise<CreateCommentResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = CreateCommentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const auth = await getSupabaseAuthServer();
    const { data, error } = await auth
      .from("community_comments")
      .insert({
        post_id: parsed.data.postId,
        created_by: me.id,
        body: parsed.data.body,
        status: "published",
      })
      .select("id")
      .single();
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok", id: String((data as { id: string }).id) };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/** 본인 댓글 수정 (RLS cc_alumni_update). body 만. */
export async function editCommentAction(
  input: unknown,
): Promise<CommunityMutationResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = EditCommentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const auth = await getSupabaseAuthServer();
    const { error } = await auth
      .from("community_comments")
      .update({ body: parsed.data.body })
      .eq("id", parsed.data.commentId);
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * 본인 댓글 soft-delete. status='hidden'. 트리거가 comment_count--.
 */
export async function softDeleteCommentAction(
  input: unknown,
): Promise<CommunityMutationResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const parsed = CommentIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const auth = await getSupabaseAuthServer();
    const { error } = await auth
      .from("community_comments")
      .update({ status: "hidden" })
      .eq("id", parsed.data.commentId);
    if (error) return { status: "error", error: error.message };

    revalidateCommunity();
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
