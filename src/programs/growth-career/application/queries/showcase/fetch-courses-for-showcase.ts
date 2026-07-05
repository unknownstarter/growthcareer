/**
 * fetchCoursesForShowcase — /courses + 우산 랜딩 미리보기용 course grid.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * shape: `Course[]` + `Record<courseSlug, CourseInstructor>`
 *   (presentation/showcase/types.ts)
 *
 * 필터:
 *   - status='open' 만 (isCoursePubliclyPurchasable).
 *     draft 는 어드민 내부, archived 는 히스토리 — 랜딩 노출 X.
 *
 * course → instructor 매핑:
 *   - instructors.course_ids uuid[] 배열로 담기지만 실제 backfill 은
 *     아직 안 되어 있어 매핑 실패 케이스 잦음.
 *   - 매핑 실패 (course 에 해당하는 instructor 없음) → 그 course 에 대해
 *     instructor entry 를 만들지 않음 (CourseCard 가 optional 처리).
 *   - instructors 는 avatar 컬럼 없음 → avatarSrc: null.
 *
 * category / durationLabel:
 *   - courses 테이블에 category 컬럼 아직 없음 → null.
 *   - durationLabel = session_count 기반 "N회". null 이면 null.
 *
 * 실패 정책: Supabase 미연결 시 empty.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type {
  Course as CourseWire,
  CourseInstructor,
} from "@/src/programs/growth-career/presentation/components/showcase/types";

export type FetchCoursesForShowcaseInput = {
  /** 특정 program 만. 예: "fan-to-pro". null 이면 전체 program. */
  programSlug: string | null;
  detailHrefFn: (courseSlug: string) => string;
  /** landing preview 시 3개로 제한. */
  maxItems?: number;
};

export type FetchCoursesForShowcaseResult = {
  courses: CourseWire[];
  instructorsBySlug: Record<string, CourseInstructor>;
};

export async function fetchCoursesForShowcase(
  input: FetchCoursesForShowcaseInput,
): Promise<FetchCoursesForShowcaseResult> {
  const supabase = getSupabaseServer();
  if (!supabase) return { courses: [], instructorsBySlug: {} };

  let programId: string | null = null;
  if (input.programSlug) {
    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("slug", input.programSlug)
      .maybeSingle();
    programId = (program as { id: string } | null)?.id ?? null;
    if (!programId) return { courses: [], instructorsBySlug: {} };
  }

  let query = supabase
    .from("courses")
    .select("id, slug, title_ko, description, price_krw, session_count, order_idx")
    .eq("status", "open")
    .order("order_idx", { ascending: true });
  if (programId) {
    query = query.eq("program_id", programId);
  }

  const { data: courseRows } = await query;
  const rows = (courseRows ?? []) as Array<{
    id: string;
    slug: string;
    title_ko: string;
    description: string | null;
    price_krw: number | null;
    session_count: number | null;
    order_idx: number;
  }>;
  const limited =
    typeof input.maxItems === "number" ? rows.slice(0, input.maxItems) : rows;

  const courses: CourseWire[] = limited.map((c) => ({
    slug: c.slug,
    name: c.title_ko,
    category: null,
    description: c.description,
    sessionCount: c.session_count,
    durationLabel: c.session_count ? `${c.session_count}회` : null,
    priceKrw: c.price_krw,
    detailHref: input.detailHrefFn(c.slug),
  }));

  const instructorsBySlug = await mapInstructorsToCourses({
    supabase,
    courseIds: limited.map((c) => c.id),
    courseSlugById: new Map(limited.map((c) => [c.id, c.slug])),
  });

  return { courses, instructorsBySlug };
}

async function mapInstructorsToCourses({
  supabase,
  courseIds,
  courseSlugById,
}: {
  supabase: NonNullable<ReturnType<typeof getSupabaseServer>>;
  courseIds: string[];
  courseSlugById: Map<string, string>;
}): Promise<Record<string, CourseInstructor>> {
  if (courseIds.length === 0) return {};

  // instructors.course_ids uuid[] 배열 overlap.
  const { data: instructorRows } = await supabase
    .from("instructors")
    .select("name, course_ids")
    .overlaps("course_ids", courseIds);

  const out: Record<string, CourseInstructor> = {};
  for (const row of instructorRows ?? []) {
    const r = row as { name: string; course_ids: string[] | null };
    const ids = r.course_ids ?? [];
    for (const cid of ids) {
      const slug = courseSlugById.get(cid);
      if (!slug) continue;
      // 한 course 에 강사 여러 명일 시 첫 매칭만 유지 (CourseCard 는 단일).
      if (out[slug]) continue;
      out[slug] = { name: r.name, avatarSrc: null };
    }
  }
  return out;
}
