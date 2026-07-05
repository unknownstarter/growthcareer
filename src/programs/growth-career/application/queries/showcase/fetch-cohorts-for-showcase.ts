/**
 * fetchCohortsForShowcase — 우산 랜딩 / /cohorts 아카이브용 cohort grid.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * shape: `CohortShowcase[]` + `Record<cohortSlug, CohortInstructor[]>`
 *   (presentation/showcase/types.ts)
 *
 * variant:
 *   - landing : 최근 3개 (ends_on DESC)
 *   - archive : 전체
 *
 * cohort → instructor 매핑:
 *   - sessions.instructor_id 로 assigned instructor 조회
 *   - sessions 는 cohort_id 컬럼 X (idx 기반 single table) → 현재 시점에는
 *     "모든 cohort 가 같은 sessions 8회 공유" 전제. 1기까지 유효한 가정.
 *   - Wave 2 에서 sessions.cohort_id 도입되면 여기서 per-cohort 로 fan-out.
 *   - 지금은 instructorsByCohortSlug = 모든 cohort 에 동일 instructor set.
 *   - instructor avatar 컬럼 없음 → avatarSrc: null.
 *
 * 실패 정책:
 *   - Supabase 미연결 시 { cohorts: [], instructorsByCohortSlug: {} }.
 *   - instructor 조회 실패 시 instructorsByCohortSlug 만 {} 로 fallback.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchPubliclyDisplayableCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-showcase-repository";
import type {
  CohortShowcase as CohortShowcaseWire,
  CohortInstructor,
} from "@/src/programs/growth-career/presentation/components/showcase/types";

export type FetchCohortsForShowcaseInput = {
  variant: "landing" | "archive";
  /** 상세 링크 경로 함수. locale 는 호출자가 결정. */
  detailHrefFn: (showcaseSlug: string) => string;
};

export type FetchCohortsForShowcaseResult = {
  cohorts: CohortShowcaseWire[];
  instructorsByCohortSlug: Record<string, CohortInstructor[]>;
};

const LANDING_LIMIT = 3;

export async function fetchCohortsForShowcase(
  input: FetchCohortsForShowcaseInput,
): Promise<FetchCohortsForShowcaseResult> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { cohorts: [], instructorsByCohortSlug: {} };
  }

  const rows = await fetchPubliclyDisplayableCohorts().catch(() => []);
  if (rows.length === 0) {
    return { cohorts: [], instructorsByCohortSlug: {} };
  }

  const limited =
    input.variant === "landing" ? rows.slice(0, LANDING_LIMIT) : rows;

  // graduateCount = active students per cohort.
  const cohortIds = limited.map((c) => c.id);
  const { data: studentRows } = await supabase
    .from("students")
    .select("cohort_id")
    .in("cohort_id", cohortIds)
    .eq("status", "active");

  const graduateByCohort = new Map<string, number>();
  for (const row of studentRows ?? []) {
    const cid = (row as { cohort_id: string }).cohort_id;
    graduateByCohort.set(cid, (graduateByCohort.get(cid) ?? 0) + 1);
  }

  const cohorts: CohortShowcaseWire[] = limited.map((c) => ({
    slug: c.showcase_slug,
    name: c.showcase_slug, // Wave 2: cohorts.name 이 있으면 대체
    period: {
      startDate: c.starts_at,
      endDate: c.ends_at,
    },
    graduateCount: graduateByCohort.get(c.id) ?? 0,
    heroStat: c.hero_stat
      ? {
          numerator: c.hero_stat.value,
          denominator: c.hero_stat.denominator ?? c.hero_stat.value,
          label: c.hero_stat.label,
        }
      : null,
    thumbnailSrc: resolveThumbnailUrl(c.thumbnail_path),
    detailHref: input.detailHrefFn(c.showcase_slug),
  }));

  // Instructor set. 현재 sessions 는 single-table, cohort_id 없음.
  // 모든 cohort 가 같은 instructor set 를 공유하는 것으로 가정 (1기 시점 유효).
  const instructors = await fetchAssignedInstructors(supabase).catch(() => []);
  const instructorsByCohortSlug: Record<string, CohortInstructor[]> = {};
  for (const cohort of cohorts) {
    instructorsByCohortSlug[cohort.slug] = instructors;
  }

  return { cohorts, instructorsByCohortSlug };
}

async function fetchAssignedInstructors(
  supabase: NonNullable<ReturnType<typeof getSupabaseServer>>,
): Promise<CohortInstructor[]> {
  // sessions.instructor_id → instructors.name 조인.
  const { data } = await supabase
    .from("sessions")
    .select("instructor_id, instructors!inner(name)")
    .not("instructor_id", "is", null);

  const seen = new Set<string>();
  const out: CohortInstructor[] = [];
  for (const row of data ?? []) {
    const inst = (row as { instructors: { name: string } | { name: string }[] })
      .instructors;
    const name = Array.isArray(inst) ? inst[0]?.name : inst?.name;
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, avatarSrc: null });
  }
  return out;
}

function resolveThumbnailUrl(path: string | null): string | null {
  if (!path) return null;
  // cohort-thumbnails bucket public read.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
}
