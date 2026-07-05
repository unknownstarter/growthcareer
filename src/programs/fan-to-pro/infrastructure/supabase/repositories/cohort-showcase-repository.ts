/**
 * CohortShowcase repository. ADR 0016 Phase 1.
 *
 * /cohorts/[showcaseSlug] 공개 라우트가 소비하는 read-only 접근.
 *
 * 경계 원칙 (Iris §7.4):
 *   - showcase_slug IS NOT NULL 인 row 만 반환 (내부 draft cohort 노출 방지)
 *   - Zod 스키마로 row 정규화 (starts_on/ends_on → starts_at/ends_at 매핑)
 *   - 예외는 throw 로 경계 상단에 위임 (use case 에서 처리)
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CohortShowcaseSchema,
  HeroStatSchema,
  type CohortShowcase,
} from "@/src/programs/fan-to-pro/domain/entities/cohort-showcase";

const TABLE = "cohorts";

/** DB row → CohortShowcase 정규화. starts_on/ends_on → starts_at/ends_at. */
type CohortShowcaseRow = {
  id: string;
  slug: string;
  showcase_slug: string;
  program_id: string;
  course_id: string | null;
  starts_on: string;
  ends_on: string;
  status: string;
  hero_stat: unknown;
  thumbnail_path: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  "id, slug, showcase_slug, program_id, course_id, starts_on, ends_on, status, hero_stat, thumbnail_path, created_at";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

function normalize(row: CohortShowcaseRow): CohortShowcase {
  // Sage MED (2026-07-05): hero_stat 이 malformed 면 전체 row parse 실패 → 페이지 500.
  // hero_stat 만 별도 safeParse 로 실패 시 null downgrade.
  const heroStatParsed = row.hero_stat
    ? HeroStatSchema.safeParse(row.hero_stat)
    : null;
  const heroStat = heroStatParsed?.success ? heroStatParsed.data : null;

  return CohortShowcaseSchema.parse({
    id: row.id,
    slug: row.slug,
    showcase_slug: row.showcase_slug,
    program_id: row.program_id,
    course_id: row.course_id,
    starts_at: row.starts_on,
    ends_at: row.ends_on,
    status: row.status,
    hero_stat: heroStat,
    thumbnail_path: row.thumbnail_path,
    created_at: row.created_at,
  });
}

/**
 * 공개 노출 가능한 모든 cohort. showcase_slug IS NOT NULL.
 *
 * 정렬: ends_on DESC (최근 종료 cohort 우선). Wave 1 는 fan-to-pro-1 하나만 있을 것.
 * cancelled 는 제외 (전시 목적).
 */
export async function fetchPubliclyDisplayableCohorts(): Promise<CohortShowcase[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .not("showcase_slug", "is", null)
    .neq("status", "cancelled")
    .order("ends_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalize(row as CohortShowcaseRow));
}

/**
 * showcase_slug 단일 조회. 없거나 showcase_slug 미설정이면 null.
 * cancelled 도 여기서는 반환 (감사 열람 시 접근 가능).
 */
export async function fetchCohortShowcaseBySlug(
  showcaseSlug: string,
): Promise<CohortShowcase | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .eq("showcase_slug", showcaseSlug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalize(data as CohortShowcaseRow);
}

/**
 * 상단 랜딩 노출용 featured cohort. ends_on DESC, LIMIT N.
 *
 * cancelled 제외. hero_stat 이 null 이어도 반환 (콘텐츠 채우기 전 단계 허용).
 * Wave 1 렌더 layer 에서 hero_stat null 처리는 별도.
 */
export async function fetchFeaturedCohorts(
  limit: number = 3,
): Promise<CohortShowcase[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .not("showcase_slug", "is", null)
    .neq("status", "cancelled")
    .order("ends_on", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalize(row as CohortShowcaseRow));
}
