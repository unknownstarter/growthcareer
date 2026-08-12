/**
 * Community repository, LMS 인앱 커뮤니티 (스코프 B: program 알럼나이 통합).
 *
 * 인증 전략 (Sage 조건):
 *   - alumni read/write (list/detail/insert/update) = **authenticated 세션 client**
 *     (getSupabaseAuthServer) 로 실행 → RLS + 컬럼 grant 가 실제 방어선.
 *   - 작성자 표시명(user_profiles.display_name) 은 authenticated 세션에서
 *     타인 row read 불가(self_read 정책만 존재) → **service_role** 로 batch 조회.
 *     display_name 은 커뮤니티에 이미 노출되는 값이라 read 안전.
 *   - pinned 토글 / 타인 글 hide(moderation) = 오직 service_role + assertAdmin
 *     경유 (본 파일의 *ByAdmin 함수). authenticated 는 pinned/comment_count 컬럼
 *     update grant 자체가 없음.
 *
 * program_id resolve = service_role 조회 (programs 는 authenticated read grant
 * 여부와 무관하게 안정적으로 lookup). React cache 로 request 당 1회.
 *
 * comment_count 는 DB 트리거(community_comments_sync_count)가 자동 갱신 →
 * 여기서 직접 건드리지 않음.
 */
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const PROGRAM_SLUG = "fan-to-pro";

// -------------------------------------------------------------------------
// program_id resolve (service_role, cached)
// -------------------------------------------------------------------------

/**
 * fan-to-pro program 의 id 를 resolve. request 당 1회 (React cache).
 * 미설정/미존재 시 null.
 */
export const resolveFanToProProgramId = cache(
  async (): Promise<string | null> => {
    const supabase = getSupabaseServer();
    if (!supabase) return null;
    const { data } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", PROGRAM_SLUG)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  },
);

/**
 * fan-to-pro program 의 표시명 (programs.name, 예: "Fan to Pro"). request 당 1회.
 * 미존재/미설정 시 fallback "Fan to Pro" (칩 라벨 공백 방지).
 */
export const resolveFanToProProgramName = cache(async (): Promise<string> => {
  const supabase = getSupabaseServer();
  if (!supabase) return "Fan to Pro";
  const { data } = await supabase
    .from("programs")
    .select("name")
    .eq("slug", PROGRAM_SLUG)
    .maybeSingle();
  const name = (data?.name as string | undefined) ?? "";
  return name.trim() || "Fan to Pro";
});

// -------------------------------------------------------------------------
// author display_name batch 조회 (service_role)
// -------------------------------------------------------------------------

/**
 * created_by(auth.users.id) 집합에 대한 display_name map.
 * authenticated 세션은 self_read 만 가능하므로 service_role 로 조회.
 * created_by 가 null(계정 삭제로 익명화) 이면 map 에 없음 → 호출부에서 fallback.
 */
export async function fetchDisplayNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  if (ids.length === 0) return map;

  const supabase = getSupabaseServer();
  if (!supabase) return map;

  const { data } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .in("id", ids);

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const id = r.id ? String(r.id) : "";
    const name = r.display_name ? String(r.display_name) : "";
    if (id && name) map.set(id, name);
  }
  return map;
}

// -------------------------------------------------------------------------
// author role + cohort 라벨 batch 조회 (service_role)
// -------------------------------------------------------------------------

/** 작성자 역할 — 겸임 시 instructor 우선. membership 없으면 null. */
export type AuthorRole = "instructor" | "student" | null;

/** 커뮤니티 칩용 cohort 라벨. label = cohorts.name ("1기"), programName = programs.name. */
export type AuthorCohortLabel = { label: string; programName: string };

/** userId 별 작성자 부가정보 (역할 + 소속 cohort 라벨들). */
export type AuthorInfo = {
  role: AuthorRole;
  cohorts: AuthorCohortLabel[];
};

/**
 * created_by 집합에 대한 작성자 역할 + fan-to-pro cohort 라벨 map.
 *
 * 스코프 B (fan-to-pro program 통합 커뮤니티) 라 **해당 program 의 cohort membership 만**
 * 반영. 다른 program membership 은 이 커뮤니티에서 표시 안 함.
 *
 * 인증: cohort_memberships / cohorts / programs 는 authenticated 세션에서 타인 row
 * read 불가 (cohort_memberships self_read 정책만) → display_name batch 와 동일하게
 * service_role 로 조회. 역할/기수는 커뮤니티에 노출할 값이라 read 안전.
 *
 * 쿼리 수 = 2 (programName 은 이미 resolve 된 값 재사용).
 *   1) programs 에서 programName 1회 (resolveFanToProProgramName, cached).
 *   2) cohort_memberships JOIN cohorts (program 필터) 를 .in('user_id', ids) 단일 쿼리.
 * N+1 없음 — userId 수 무관 상수 쿼리.
 *
 * role 유도: instructor membership 하나라도 있으면 instructor, 아니면 student
 * membership 있으면 student, 아무 것도 없으면 null.
 * cohorts: 그 유저의 fan-to-pro cohort 라벨. starts_on asc 정렬 (1기 → 2기). 중복 제거.
 */
export async function fetchAuthorInfo(
  userIds: string[],
): Promise<Map<string, AuthorInfo>> {
  const map = new Map<string, AuthorInfo>();
  const ids = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  if (ids.length === 0) return map;

  const supabase = getSupabaseServer();
  if (!supabase) return map;

  const programId = await resolveFanToProProgramId();
  if (!programId) return map;

  const programName = await resolveFanToProProgramName();

  // cohort_memberships INNER JOIN cohorts, program 필터 + starts_on 정렬.
  // 단일 쿼리 (.in('user_id', ids)). cohorts!inner 로 다른 program cohort 는 제외.
  const { data } = await supabase
    .from("cohort_memberships")
    .select("user_id, role, cohorts!inner(name, starts_on, program_id)")
    .in("user_id", ids)
    .eq("cohorts.program_id", programId)
    .order("starts_on", {
      ascending: true,
      referencedTable: "cohorts",
    });

  // userId 별 집계: 역할 우선순위 + cohort 라벨 (정렬 유지 + 중복 제거).
  type Agg = { hasInstructor: boolean; hasStudent: boolean; labels: string[] };
  const agg = new Map<string, Agg>();

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const userId = r.user_id ? String(r.user_id) : "";
    if (!userId) continue;

    const cohort = r.cohorts as { name?: unknown } | null;
    const role = r.role === "instructor" ? "instructor" : "student";
    const label = cohort?.name ? String(cohort.name) : "";

    const entry = agg.get(userId) ?? {
      hasInstructor: false,
      hasStudent: false,
      labels: [],
    };
    if (role === "instructor") entry.hasInstructor = true;
    else entry.hasStudent = true;
    if (label && !entry.labels.includes(label)) entry.labels.push(label);
    agg.set(userId, entry);
  }

  for (const [userId, entry] of agg) {
    const role: AuthorRole = entry.hasInstructor
      ? "instructor"
      : entry.hasStudent
        ? "student"
        : null;
    map.set(userId, {
      role,
      cohorts: entry.labels.map((label) => ({ label, programName })),
    });
  }

  return map;
}

// -------------------------------------------------------------------------
// raw row types (DB shape)
// -------------------------------------------------------------------------

export type CommunityPostRow = {
  id: string;
  program_id: string;
  created_by: string | null;
  title: string | null;
  body: string;
  pinned: boolean;
  status: "published" | "hidden";
  comment_count: number;
  created_at: string;
  updated_at: string | null;
};

export type CommunityCommentRow = {
  id: string;
  post_id: string;
  created_by: string | null;
  body: string;
  status: "published" | "hidden";
  created_at: string;
};

// -------------------------------------------------------------------------
// alumni read (authenticated client, RLS filters visibility)
// -------------------------------------------------------------------------

/**
 * program 내 글 목록 (authenticated client). RLS 가 published + 본인 hidden 만 반환.
 * 정렬 pinned desc, created_at desc. status 는 published 로도 명시(방어적).
 */
export async function fetchPostRows(
  auth: SupabaseClient,
  programId: string,
): Promise<CommunityPostRow[]> {
  const { data, error } = await auth
    .from("community_posts")
    .select(
      "id, program_id, created_by, title, body, pinned, status, comment_count, created_at, updated_at",
    )
    .eq("program_id", programId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommunityPostRow[];
}

/** 글 1개 (authenticated client). RLS 통과 못 하면 null. */
export async function fetchPostRow(
  auth: SupabaseClient,
  postId: string,
): Promise<CommunityPostRow | null> {
  const { data, error } = await auth
    .from("community_posts")
    .select(
      "id, program_id, created_by, title, body, pinned, status, comment_count, created_at, updated_at",
    )
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CommunityPostRow | null) ?? null;
}

/** post 의 댓글 목록 (authenticated client). RLS 가 published + 본인 반환. */
export async function fetchCommentRows(
  auth: SupabaseClient,
  postId: string,
): Promise<CommunityCommentRow[]> {
  const { data, error } = await auth
    .from("community_comments")
    .select("id, post_id, created_by, body, status, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CommunityCommentRow[];
}
