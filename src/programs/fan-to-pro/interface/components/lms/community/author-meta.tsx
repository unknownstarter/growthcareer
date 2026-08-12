/**
 * 커뮤니티 작성자 메타 — 역할 배지 (강사/학생) + 프로그램·기수 칩.
 *
 * 목록 / 상세 / 댓글 3곳에서 재사용 (일회성 스타일 금지).
 * - 강사(instructor) = solid pink 배지 (눈에 띄게).
 * - 학생(student)   = secondary 배지 (차분하게).
 * - null            = 배지 없음.
 * - authorCohorts   = programName 1회 + 기수 공백 나열 (예: "Fan to Pro 1기 2기", §6.5 중점 금지).
 *
 * §6.8: 배지/칩 = solid 단색 or outline. 그라데이션·글로우 없음.
 */
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import type {
  AuthorRole,
  AuthorCohortLabel,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/community-repository";

/** authorCohorts 를 "programName 1회 + 기수 공백 나열" 문자열로. 빈 배열이면 null. */
function cohortChipLabel(cohorts: AuthorCohortLabel[]): string | null {
  if (cohorts.length === 0) return null;
  const programName = cohorts[0].programName;
  const labels = cohorts.map((c) => c.label).filter((l) => l.length > 0);
  if (labels.length === 0) return programName;
  return `${programName} ${labels.join(" ")}`;
}

export function AuthorRoleBadge({ role }: { role: AuthorRole }) {
  if (role === "instructor") {
    return <Badge variant="default">강사</Badge>;
  }
  if (role === "student") {
    return <Badge variant="secondary">학생</Badge>;
  }
  return null;
}

export function AuthorCohortChip({
  cohorts,
}: {
  cohorts: AuthorCohortLabel[];
}) {
  const label = cohortChipLabel(cohorts);
  if (!label) return null;
  return <Badge variant="outline">{label}</Badge>;
}

/** 작성자명 옆 역할 배지 + 기수 칩 묶음. 작성자명은 호출부에서 렌더. */
export function AuthorBadges({
  role,
  cohorts,
}: {
  role: AuthorRole;
  cohorts: AuthorCohortLabel[];
}) {
  const hasCohort = cohorts.length > 0;
  if (role === null && !hasCohort) return null;
  return (
    <>
      <AuthorRoleBadge role={role} />
      <AuthorCohortChip cohorts={cohorts} />
    </>
  );
}
