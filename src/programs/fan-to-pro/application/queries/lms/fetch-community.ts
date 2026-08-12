/**
 * Query, LMS 인앱 커뮤니티 read (스코프 B: fan-to-pro program 알럼나이 통합).
 *
 * 인증: 목록/상세 row 조회는 authenticated 세션 client(RLS 가 가시성 필터).
 *       작성자 표시명은 service_role batch(authenticated 는 타인 profile read 불가).
 *
 * canModerate = super_admin OR fan-to-pro program admin. isOwn = created_by == me.
 * 미인증 시 status:'error'(unauthenticated).
 */
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { isProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/program-guards";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import {
  fetchCommentRows,
  fetchDisplayNames,
  fetchPostRow,
  fetchPostRows,
  resolveFanToProProgramId,
  type CommunityCommentRow,
  type CommunityPostRow,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/community-repository";

const PROGRAM_SLUG = "fan-to-pro";
const DELETED_AUTHOR = "탈퇴한 사용자";

// -------------------------------------------------------------------------
// view models (Luna 가 UI 에 바로 바인딩)
// -------------------------------------------------------------------------

export type CommunityPostView = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  status: "published" | "hidden";
  commentCount: number;
  createdAt: string;
  updatedAt: string | null;
  authorName: string;
  isOwn: boolean;
};

export type CommunityCommentView = {
  id: string;
  postId: string;
  body: string;
  status: "published" | "hidden";
  createdAt: string;
  authorName: string;
  isOwn: boolean;
};

export type CommunityListResult =
  | {
      status: "ok";
      posts: CommunityPostView[];
      canModerate: boolean;
      meId: string;
    }
  | { status: "error"; error: string };

export type CommunityPostDetailResult =
  | {
      status: "ok";
      post: CommunityPostView;
      comments: CommunityCommentView[];
      canModerate: boolean;
      meId: string;
    }
  | { status: "error"; error: string };

// -------------------------------------------------------------------------
// helpers
// -------------------------------------------------------------------------

function toPostView(
  row: CommunityPostRow,
  names: Map<string, string>,
  meId: string,
): CommunityPostView {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    pinned: row.pinned,
    status: row.status,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.created_by
      ? (names.get(row.created_by) ?? DELETED_AUTHOR)
      : DELETED_AUTHOR,
    isOwn: !!row.created_by && row.created_by === meId,
  };
}

function toCommentView(
  row: CommunityCommentRow,
  names: Map<string, string>,
  meId: string,
): CommunityCommentView {
  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    authorName: row.created_by
      ? (names.get(row.created_by) ?? DELETED_AUTHOR)
      : DELETED_AUTHOR,
    isOwn: !!row.created_by && row.created_by === meId,
  };
}

// -------------------------------------------------------------------------
// queries
// -------------------------------------------------------------------------

/** program 내 글 목록 + 작성자 표시명 + isOwn/canModerate. */
export async function fetchCommunityPosts(): Promise<CommunityListResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  const programId = await resolveFanToProProgramId();
  if (!programId) return { status: "error", error: "programUnavailable" };

  try {
    const auth = await getSupabaseAuthServer();
    const rows = await fetchPostRows(auth, programId);

    const names = await fetchDisplayNames(
      rows.map((r) => r.created_by).filter((id): id is string => !!id),
    );
    const canModerate =
      me.isSuperAdmin || (await isProgramAdmin(me.id, PROGRAM_SLUG));

    return {
      status: "ok",
      posts: rows.map((r) => toPostView(r, names, me.id)),
      canModerate,
      meId: me.id,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

/** 글 1개 + 댓글 목록 (작성자 표시명 포함). RLS 통과 못 하면 notFound. */
export async function fetchCommunityPost(
  postId: string,
): Promise<CommunityPostDetailResult> {
  const me = await getLmsUser();
  if (!me) return { status: "error", error: "unauthenticated" };

  try {
    const auth = await getSupabaseAuthServer();
    const postRow = await fetchPostRow(auth, postId);
    if (!postRow) return { status: "error", error: "notFound" };

    const commentRows = await fetchCommentRows(auth, postId);

    const authorIds = [
      postRow.created_by,
      ...commentRows.map((c) => c.created_by),
    ].filter((id): id is string => !!id);
    const names = await fetchDisplayNames(authorIds);

    const canModerate =
      me.isSuperAdmin || (await isProgramAdmin(me.id, PROGRAM_SLUG));

    return {
      status: "ok",
      post: toPostView(postRow, names, me.id),
      comments: commentRows.map((c) => toCommentView(c, names, me.id)),
      canModerate,
      meId: me.id,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
