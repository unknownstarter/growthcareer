import { BookOpen } from "lucide-react";
import type { Course, CourseInstructor } from "@/src/programs/growth-career/application/dto/showcase-view";
import { CourseCard } from "./CourseCard";
import { ShowcaseEmptyState } from "./ShowcaseEmptyState";

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
      <ShowcaseEmptyState
        icon={BookOpen}
        title="단과 코스는 준비 중이에요"
        description="지금 열심히 커리큘럼을 다듬고 있어요. 곧 하나씩 열어드릴게요"
      />
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
