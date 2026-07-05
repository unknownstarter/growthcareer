import type { Course, CourseInstructor } from "./types";
import { CourseCard } from "./CourseCard";

/**
 * 단과 코스 grid. /courses + 우산 랜딩 미리보기.
 *
 * Server Component. 우산 랜딩 = maxItems=3 옵션 전달.
 */
export function CourseGrid({
  courses,
  instructorsBySlug = {},
  maxItems,
}: {
  courses: Course[];
  instructorsBySlug?: Record<string, CourseInstructor>;
  maxItems?: number;
}) {
  const shown = typeof maxItems === "number" ? courses.slice(0, maxItems) : courses;

  if (shown.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-fg-muted">단과 코스 준비 중입니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((course) => (
        <CourseCard
          key={course.slug}
          course={course}
          instructor={instructorsBySlug[course.slug]}
        />
      ))}
    </div>
  );
}
