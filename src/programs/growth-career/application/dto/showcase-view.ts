/**
 * B0083 Phase 1 Showcase 컴포넌트 공통 타입.
 *
 * Luna Slice 2. Iris fetch layer 와 정합하는 wire shape.
 * 이 파일은 컴포넌트 shell 의 props 계약이며, Iris application/queries
 * 에서 여기 shape 을 반환하도록 매핑한다.
 *
 * 절대 룰:
 * - Server Component 우선. Client 필요 시 각 컴포넌트가 명시.
 * - 그라데이션 X. 다크 톤 tokens 만 (`bg-bg`, `text-fg`, `border-border`,
 *   `brand-pink`).
 * - 매출은 원 단위 (숫자 그대로, 축약 X). formatter 는 컴포넌트 안에서 처리.
 * - §6.5 부호 규칙 (em dash / interpunct / 곡선 따옴표 / 단일 ellipsis) X.
 */

/**
 * 우산 랜딩 Hero 지표.
 * cohortCount / graduateCount / countryCount + headlineStat (raw fraction).
 */
export type HeroUmbrellaStatsData = {
  cohortCount: number;
  graduateCount: number;
  countryCount: number;
  headlineStat: {
    numerator: number;
    denominator: number;
    label: string;
  };
  nextCohortCta:
    | { type: "apply"; href: string; label: string }
    | { type: "waitlist"; href: string; label: string }
    | { type: "closed"; label: string };
  backgroundImage: {
    src: string;
    alt: string;
  };
};

/**
 * 기수 showcase. /cohorts + /cohorts/[slug] + 우산 랜딩에서 재사용.
 * cohorts 테이블의 showcase_slug / hero_stat / thumbnail_path 매핑.
 */
export type CohortShowcase = {
  slug: string;
  name: string;
  period: {
    startDate: string;
    endDate: string;
  };
  graduateCount: number;
  heroStat: {
    numerator: number;
    denominator: number;
    label: string;
  } | null;
  thumbnailSrc: string | null;
  detailHref: string;
};

export type CohortInstructor = {
  name: string;
  avatarSrc: string | null;
};

/**
 * 단과 코스 카드 shape. courses 테이블 매핑.
 * price_krw 는 원 단위 (숫자 그대로).
 */
export type Course = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  sessionCount: number | null;
  durationLabel: string | null;
  priceKrw: number | null;
  detailHref: string;
};

export type CourseInstructor = {
  name: string;
  avatarSrc: string | null;
};

/**
 * 번들 카드 shape. bundles + bundle_courses 매핑.
 * priceKrw = 할인 후 최종 가격. originalPriceKrw = 개별 course 합계 (표시용).
 */
export type Bundle = {
  slug: string;
  name: string;
  description: string | null;
  priceKrw: number | null;
  originalPriceKrw: number | null;
  discountKrw: number | null;
  courseCount: number;
  detailHref: string;
};

/**
 * 수료생 스토리 카드 shape. 인터뷰 mdx frontmatter 매핑.
 * frontmatter 필드가 어드민 DB 에 없어도 컴포넌트가 렌더 가능하도록 nullable.
 */
export type StoryFrontmatter = {
  slug: string;
  name: string;
  anonymous: boolean;
  avatarSrc: string | null;
  nationality: string;
  cohortName: string;
  visaJourney: string | null;
  currentRole: string | null;
  quote: string;
  detailHref: string;
};
