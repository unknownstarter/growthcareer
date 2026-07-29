/**
 * B0083 Phase 1 Showcase 컴포넌트 barrel export.
 *
 * Slice 2 shell. Iris fetch layer 준비 완료 후 Slice 3 에서 페이지 조립.
 */

export { HeroUmbrellaStats } from "./HeroUmbrellaStats";
export { CohortShowcaseCard } from "./CohortShowcaseCard";
export { CohortShowcaseGrid } from "./CohortShowcaseGrid";
export { CourseCard } from "./CourseCard";
export { CourseGrid } from "./CourseGrid";
export { BundleCard } from "./BundleCard";
export { BundleGrid } from "./BundleGrid";
export { StoryCard } from "./StoryCard";
export { StoryGrid } from "./StoryGrid";
export { EmptyStoriesState } from "./EmptyStoriesState";

export type {
  HeroUmbrellaStatsData,
  CohortShowcase,
  CohortInstructor,
  Course,
  CourseInstructor,
  Bundle,
  StoryFrontmatter,
} from "@/src/programs/growth-career/application/dto/showcase-view";

export { formatKrw, formatPeriod } from "./format";
