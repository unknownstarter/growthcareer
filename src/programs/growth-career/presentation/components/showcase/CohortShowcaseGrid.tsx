import type { CohortShowcase, CohortInstructor } from "@/src/programs/growth-career/application/dto/showcase-view";
import { CohortShowcaseCard } from "./CohortShowcaseCard";

/**
 * 기수 showcase grid. 우산 랜딩 = variant="landing" (최대 3개) /
 * /cohorts 아카이브 = variant="archive" (전체).
 *
 * Server Component. Iris fetch layer 가 각 cohort 의 instructors 를
 * cohortSlug 로 lookup 해 매핑 후 전달.
 */
export function CohortShowcaseGrid({
  cohorts,
  variant,
  instructorsByCohortSlug = {},
}: {
  cohorts: CohortShowcase[];
  variant: "landing" | "archive";
  instructorsByCohortSlug?: Record<string, CohortInstructor[]>;
}) {
  const shown = variant === "landing" ? cohorts.slice(0, 3) : cohorts;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-fg-muted">기수 데이터 준비 중입니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((cohort) => (
        <CohortShowcaseCard
          key={cohort.slug}
          cohort={cohort}
          instructors={instructorsByCohortSlug[cohort.slug]}
        />
      ))}
    </div>
  );
}
