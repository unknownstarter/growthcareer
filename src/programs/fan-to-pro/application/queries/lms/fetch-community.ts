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
  fetchAuthorInfo,
  fetchCommentRows,
  fetchDisplayNames,
  fetchPostRow,
  fetchPostRows,
  resolveFanToProProgramId,
  type AuthorInfo,
  type AuthorCohortLabel,
  type AuthorRole,
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
  /** fan-to-pro cohort membership 기준 역할. 겸임 시 instructor 우선. 없으면 null. */
  authorRole: AuthorRole;
  /** 작성자의 fan-to-pro cohort 라벨들 (starts_on asc, 예: 1기 → 2기). 없으면 빈 배열. */
  authorCohorts: AuthorCohortLabel[];
  isOwn: boolean;
};

export type CommunityCommentView = {
  id: string;
  postId: string;
  body: string;
  status: "published" | "hidden";
  createdAt: string;
  authorName: string;
  /** fan-to-pro cohort membership 기준 역할. 겸임 시 instructor 우선. 없으면 null. */
  authorRole: AuthorRole;
  /** 작성자의 fan-to-pro cohort 라벨들 (starts_on asc). 없으면 빈 배열. */
  authorCohorts: AuthorCohortLabel[];
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

const EMPTY_COHORTS: AuthorCohortLabel[] = [];

function authorRoleOf(
  createdBy: string | null,
  info: Map<string, AuthorInfo>,
): AuthorRole {
  return createdBy ? (info.get(createdBy)?.role ?? null) : null;
}

function authorCohortsOf(
  createdBy: string | null,
  info: Map<string, AuthorInfo>,
): AuthorCohortLabel[] {
  return createdBy ? (info.get(createdBy)?.cohorts ?? EMPTY_COHORTS) : EMPTY_COHORTS;
}

function toPostView(
  row: CommunityPostRow,
  names: Map<string, string>,
  info: Map<string, AuthorInfo>,
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
    authorRole: authorRoleOf(row.created_by, info),
    authorCohorts: authorCohortsOf(row.created_by, info),
    isOwn: !!row.created_by && row.created_by === meId,
  };
}

function toCommentView(
  row: CommunityCommentRow,
  names: Map<string, string>,
  info: Map<string, AuthorInfo>,
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
    authorRole: authorRoleOf(row.created_by, info),
    authorCohorts: authorCohortsOf(row.created_by, info),
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

    const authorIds = rows
      .map((r) => r.created_by)
      .filter((id): id is string => !!id);
    // 두 batch (display_name + author-info) 병렬. author-info 는 내부 2 쿼리.
    const [names, info] = await Promise.all([
      fetchDisplayNames(authorIds),
      fetchAuthorInfo(authorIds),
    ]);
    const canModerate =
      me.isSuperAdmin || (await isProgramAdmin(me.id, PROGRAM_SLUG));

    return {
      status: "ok",
      posts: rows.map((r) => toPostView(r, names, info, me.id)),
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
    // post 작성자 + 모든 comment 작성자를 단일 batch (display_name + author-info 병렬).
    const [names, info] = await Promise.all([
      fetchDisplayNames(authorIds),
      fetchAuthorInfo(authorIds),
    ]);

    const canModerate =
      me.isSuperAdmin || (await isProgramAdmin(me.id, PROGRAM_SLUG));

    return {
      status: "ok",
      post: toPostView(postRow, names, info, me.id),
      comments: commentRows.map((c) => toCommentView(c, names, info, me.id)),
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
