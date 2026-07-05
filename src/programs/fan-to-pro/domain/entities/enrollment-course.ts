/**
 * EnrollmentCourse (enrollment × course M:N join entity) — B0068 ADR 0013.
 *
 * 결제 안 어떤 course 가 포함됐는지 + 학생별 course 수료 시각.
 * 단과 결제 = 1개 row. 번들 결제 = bundle_courses unpack.
 *
 * domain layer 룰: 외부 의존성 0.
 */
import { z } from "zod";

export const EnrollmentCourseSchema = z.object({
  enrollment_id: z.string().uuid(),
  course_id: z.string().uuid(),
  completed_at: z.string().nullish(),
});

export type EnrollmentCourse = z.infer<typeof EnrollmentCourseSchema>;

/** 해당 course 수료 완료 여부. */
export function isEnrollmentCourseCompleted(row: EnrollmentCourse): boolean {
  return row.completed_at != null;
}
