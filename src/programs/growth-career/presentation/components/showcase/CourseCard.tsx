import type { Course, CourseInstructor } from "@/src/programs/growth-career/application/dto/showcase-view";
import { formatKrw } from "./format";
import { cn } from "@/src/shared/ui/cn";

/**
 * 단과 코스 카드. /courses + /courses/[slug] + 우산 랜딩 미리보기.
 *
 * Server Component. 가격은 원 단위 (formatKrw).
 * 카테고리 태그 = brand-pink accent.
 *
 * Luna B0083 wireframe 페이지 4 기반.
 */
export function CourseCard({
  course,
  instructor,
}: {
  course: Course;
  instructor?: CourseInstructor;
}) {
  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl bg-surface border border-border",
        "transition-colors hover:bg-surface-elevated hover:border-border-strong",
      )}
    >
      <a
        href={course.detailHref}
        className="flex h-full flex-col gap-4 p-6 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-xl"
        aria-label={`${course.name} 코스 상세 보기`}
      >
        {course.category && (
          <p
            className="text-xs uppercase text-brand-pink"
            style={{ letterSpacing: "0.25em" }}
          >
            {course.category}
          </p>
        )}

        <h3
          className="text-xl font-bold text-fg"
          style={{ letterSpacing: "-0.02em" }}
        >
          {course.name}
        </h3>

        {course.description && (
          <p className="text-sm text-fg-muted line-clamp-3">
            {course.description}
          </p>
        )}

        {instructor && (
          <div className="flex items-center gap-3">
            <InstructorAvatar instructor={instructor} />
            <p className="text-sm text-fg">{instructor.name}</p>
          </div>
        )}

        <dl className="flex flex-wrap gap-x-6 gap-y-1 mt-auto pt-2 text-sm">
          {course.durationLabel && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-fg-subtle">기간</dt>
              <dd className="text-fg-muted">{course.durationLabel}</dd>
            </div>
          )}
          {course.sessionCount !== null && course.sessionCount !== undefined && (
            <div className="flex items-baseline gap-1.5">
              <dt className="text-fg-subtle">세션</dt>
              <dd className="text-fg-muted">{course.sessionCount}회</dd>
            </div>
          )}
        </dl>

        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <p className="font-black text-fg text-lg" style={{ letterSpacing: "-0.02em" }}>
            {formatKrw(course.priceKrw)}
          </p>
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

function InstructorAvatar({ instructor }: { instructor: CourseInstructor }) {
  if (instructor.avatarSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={instructor.avatarSrc}
        alt={`${instructor.name} 프로필`}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full",
        "bg-brand-purple text-fg text-[10px] font-black",
      )}
      style={{ letterSpacing: "-0.04em" }}
    >
      {instructor.name.slice(0, 2)}
    </div>
  );
}
