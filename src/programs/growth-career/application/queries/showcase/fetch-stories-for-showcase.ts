/**
 * fetchStoriesForShowcase — 우산 랜딩 / /stories 아카이브용 story grid.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * shape: `StoryFrontmatter[]` (presentation/showcase/types.ts) —
 *   presentation wire shape 이며 domain `StoryFrontmatter` (raw frontmatter) 와 다름.
 *
 * 매핑 (raw → wire):
 *   - name          : anonymous=true 면 이니셜 처리 (ㅇ / N)
 *   - avatarSrc     : photo_path → story-photos bucket public URL
 *                     photo_path 비어있으면 null
 *   - nationality   : raw.nationality 그대로
 *   - cohortName    : cohort_showcase_slug (Wave 2 에서 cohorts.name 조회로 개선)
 *   - visaJourney   : visa_journey 를 " → " 로 join (§6.5 부호 규칙 위반 회피
 *                     — → 는 화살표 UI 요소로 허용)
 *   - currentRole   : raw.current_role
 *   - quote         : quotes[0] (없으면 "")
 *   - detailHref    : slug 기반 라우트
 *
 * cohort_showcase_slug 필터:
 *   - null 이면 전체 story
 *   - 지정 시 해당 cohort 로만 필터 (cohort 상세 페이지용)
 *
 * limit:
 *   - number 지정 시 상위 N (published_at DESC).
 *
 * 실패 정책: content dir 없거나 파일 없으면 empty. throw 없음.
 */
import {
  getAllStories,
  getStoriesByCohortShowcaseSlug,
} from "@/src/programs/growth-career/infrastructure/content/story-loader";
import type { StoryFrontmatter as StoryWire } from "@/src/programs/growth-career/application/dto/showcase-view";
import type { StoryFrontmatter as StoryRaw } from "@/src/programs/growth-career/domain/content/story-frontmatter";

export type FetchStoriesForShowcaseInput = {
  locale: "ko" | "en";
  cohortShowcaseSlug?: string | null;
  limit?: number;
  detailHrefFn: (storySlug: string) => string;
};

export function fetchStoriesForShowcase(
  input: FetchStoriesForShowcaseInput,
): StoryWire[] {
  const raw = input.cohortShowcaseSlug
    ? getStoriesByCohortShowcaseSlug({
        locale: input.locale,
        cohortSlug: input.cohortShowcaseSlug,
      })
    : getAllStories({ locale: input.locale });

  const limited =
    typeof input.limit === "number" ? raw.slice(0, input.limit) : raw;

  return limited.map((r) => mapToWire(r, input.detailHrefFn));
}

function mapToWire(
  r: StoryRaw,
  detailHrefFn: (slug: string) => string,
): StoryWire {
  return {
    slug: r.slug,
    name: r.anonymous ? maskName(r.name) : r.name,
    anonymous: r.anonymous,
    avatarSrc: resolvePhotoUrl(r.photo_path),
    nationality: r.nationality,
    cohortName: r.cohort_showcase_slug,
    visaJourney: r.visa_journey.length > 0 ? r.visa_journey.join(" → ") : null,
    currentRole: r.current_role ?? null,
    quote: r.quotes[0] ?? "",
    detailHref: detailHrefFn(r.slug),
  };
}

/**
 * anonymous 시 이니셜 마스킹.
 * 한글 = 첫 글자 + "**", 영문 = 첫 글자 + ". ***".
 */
function maskName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "익명";
  const first = trimmed[0];
  const hasHangul = /[ㄱ-힝]/.test(first);
  return hasHangul ? `${first}**` : `${first}. ***`;
}

function resolvePhotoUrl(photoPath: string): string | null {
  if (!photoPath || photoPath.trim().length === 0) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  // photo_path 는 이미 "story-photos/..." prefix 포함 가정.
  return `${supabaseUrl}/storage/v1/object/public/${photoPath}`;
}
