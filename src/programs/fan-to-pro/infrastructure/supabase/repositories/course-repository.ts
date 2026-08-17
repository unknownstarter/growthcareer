/**
 * Course repository — B0068 ADR 0013.
 *
 * Repository 책임: Supabase row → entity 변환 + 단순 CRUD.
 * 비즈니스 규칙 (상태 전이, 판매 가능 여부) 은 domain entity 또는 use case.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CourseSchema,
  type Course,
  type CourseStatus,
} from "@/src/programs/fan-to-pro/domain/entities/course";

const TABLE = "courses";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 특정 program 의 모든 course. order_idx ASC. */
export async function fetchCoursesByProgram(
  programId: string,
): Promise<Course[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .order("order_idx", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CourseSchema.parse(row));
}

/** program × slug 로 단일 course. */
export async function fetchCourseBySlug(
  programId: string,
  slug: string,
): Promise<Course | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CourseSchema.parse(data);
}

/** id 로 단일 course. */
export async function fetchCourseById(id: string): Promise<Course | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CourseSchema.parse(data);
}

/** 판매 중인 course (open) — 랜딩·pricing 페이지에서 사용. */
export async function fetchOpenCoursesByProgram(
  programId: string,
): Promise<Course[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .eq("status", "open")
    .order("order_idx", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CourseSchema.parse(row));
}

/**
 * course_id 집합 → title_ko 맵 (태스크 #24 Phase 4, UI course-aware 라벨용).
 *
 * 회차 그룹핑 UI 가 course 이름만 필요할 때 사용 (전체 entity parse 불필요).
 * 조회 실패 / supabase 없음 / 빈 입력 → 빈 Map. UI 는 title 없으면 라벨 생략 →
 * 1기(단일 course) 무회귀 유지.
 */
export async function fetchCourseTitlesByIds(
  courseIds: readonly string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(courseIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const supabase = getSupabaseServer();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, title_ko")
    .in("id", unique);
  if (error || !data) return map;
  for (const row of data as Array<{ id: string; title_ko: string | null }>) {
    if (row.id && row.title_ko) map.set(row.id, row.title_ko);
  }
  return map;
}

export type InsertCourseInput = {
  program_id: string;
  slug: string;
  title_ko: string;
  title_en?: string | null;
  description?: string | null;
  order_idx?: number;
  status?: CourseStatus;
  price_krw?: number | null;
  session_count?: number | null;
};

export async function insertCourse(input: InsertCourseInput): Promise<Course> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      program_id: input.program_id,
      slug: input.slug,
      title_ko: input.title_ko,
      title_en: input.title_en ?? null,
      description: input.description ?? null,
      order_idx: input.order_idx ?? 0,
      status: input.status ?? "draft",
      price_krw: input.price_krw ?? null,
      session_count: input.session_count ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CourseSchema.parse(data);
}

/**
 * 상태 전이 UPDATE — optimistic concurrency (WHERE status=expected).
 * 0 row 면 stale.
 */
export async function updateCourseStatus(
  id: string,
  expectedStatus: CourseStatus,
  nextStatus: CourseStatus,
): Promise<
  { status: "ok" } | { status: "stale" } | { status: "error"; error: string }
> {
  const supabase = requireClient();
  const { error, count } = await supabase
    .from(TABLE)
    .update({ status: nextStatus }, { count: "exact" })
    .eq("id", id)
    .eq("status", expectedStatus);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale" };
  return { status: "ok" };
}
