/**
 * cohortSlug 자체 loading (학생/강사 surface 진입 직전).
 *
 * 학생 surface 와 동일 skeleton 재사용.
 */
import StudentLoading from "@/app/[locale]/fan-to-pro/[cohortSlug]/student/loading";

export default function CohortLoading() {
  return <StudentLoading />;
}
