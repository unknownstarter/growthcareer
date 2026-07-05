/**
 * BundleCourse (bundle × course M:N join entity) — B0068 ADR 0013.
 *
 * bundle 이 어떤 course 를 포함하는지 + 표시 순서 (order_idx).
 * domain layer 룰: 외부 의존성 0.
 */
import { z } from "zod";

export const BundleCourseSchema = z.object({
  bundle_id: z.string().uuid(),
  course_id: z.string().uuid(),
  order_idx: z.number().int(),
});

export type BundleCourse = z.infer<typeof BundleCourseSchema>;
