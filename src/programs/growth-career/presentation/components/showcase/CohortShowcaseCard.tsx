import type { CohortShowcase, CohortInstructor } from "./types";
import { formatPeriod } from "./format";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

/**
 * 기수 showcase 카드. 우산 랜딩 + /cohorts 아카이브에서 재사용.
 *
 * Server Component. 강사 얼굴은 최대 3명, 초과 시 "+N".
 * 대표 성과는 raw fraction (`8/10`) 강조. brand-pink accent.
 *
 * Luna B0083 UX spec §2 기반.
 */
export function CohortShowcaseCard({
  cohort,
  instructors = [],
}: {
  cohort: CohortShowcase;
  instructors?: CohortInstructor[];
}) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl bg-surface border border-border",
        "transition-colors hover:bg-surface-elevated hover:border-border-strong",
      )}
    >
      <a
        href={cohort.detailHref}
        className="flex flex-col h-full outline-none focus-visible:ring-2 focus-visible:ring-brand-purple"
        aria-label={`${cohort.name} 상세 보기`}
      >
        <ThumbnailBlock cohort={cohort} />
        <div className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1">
            <h3
              className="text-xl font-bold text-fg"
              style={{ letterSpacing: "-0.02em" }}
            >
              {cohort.name}
            </h3>
            <time
              dateTime={`${cohort.period.startDate}/${cohort.period.endDate}`}
              className="text-sm text-fg-muted"
            >
              {formatPeriod(cohort.period.startDate, cohort.period.endDate)}
            </time>
          </div>

          {instructors.length > 0 && (
            <InstructorStack instructors={instructors} />
          )}

          <div className="flex flex-col gap-1 mt-auto pt-2">
            <p className="text-sm text-fg-muted">
              수료 {cohort.graduateCount}명
            </p>
            {cohort.heroStat && (
              <p className="text-lg font-bold text-brand-pink">
                {cohort.heroStat.label} {cohort.heroStat.numerator}/
                {cohort.heroStat.denominator}
              </p>
            )}
          </div>

          <span
            aria-hidden
            className="text-sm text-fg group-hover:text-brand-pink"
          >
            자세히 보기 →
          </span>
        </div>
      </a>
    </article>
  );
}

function ThumbnailBlock({ cohort }: { cohort: CohortShowcase }) {
  if (!cohort.thumbnailSrc) {
    return (
      <div
        aria-hidden
        className="aspect-video w-full bg-surface-elevated border-b border-border"
      />
    );
  }
  return (
    <div className="aspect-video w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cohort.thumbnailSrc}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function InstructorStack({
  instructors,
}: {
  instructors: CohortInstructor[];
}) {
  const shown = instructors.slice(0, 3);
  const overflow = instructors.length - shown.length;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {shown.map((ins, i) => (
          <div
            key={`${ins.name}-${i}`}
            className={cn(
              "flex items-center justify-center rounded-full h-12 w-12",
              "border-2 border-surface bg-brand-purple text-fg font-black text-sm",
            )}
            style={{ letterSpacing: "-0.04em" }}
            aria-label={`${ins.name} 강사`}
          >
            {ins.avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ins.avatarSrc}
                alt={`${ins.name} 프로필`}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span aria-hidden>{ins.name.slice(0, 2)}</span>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div
            aria-label={`외 ${overflow}명`}
            className={cn(
              "flex items-center justify-center rounded-full h-12 w-12",
              "border-2 border-surface bg-bg text-fg-muted text-xs font-bold",
            )}
          >
            +{overflow}
          </div>
        )}
      </div>
      <p className="text-xs uppercase text-fg-subtle" style={{ letterSpacing: "0.2em" }}>
        강사진
      </p>
    </div>
  );
}
