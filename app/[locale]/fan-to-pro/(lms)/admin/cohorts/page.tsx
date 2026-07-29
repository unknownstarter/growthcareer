/**
 * /admin/cohorts — 기수 리스트 페이지 (Sophia LMS audit P2 대응).
 *
 * 왜: 예전 페이지 = fetchActiveCohorts()[0] 자동 상세 표시.
 *   → 1기 종강 (status=completed) 후 "활성 기수가 없습니다" empty state 로 무너짐.
 *   → 2기 (draft/preparing) 있어도 안 보임. 다중 cohort 리스트 필요.
 *
 * 이제: 모든 status 를 리스트로. 상태별 필터 chip. 카드 클릭 = /admin/cohorts/[slug].
 */
import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchAllCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import {
  CohortsList,
  type CohortListRow,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohorts-list";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "기수 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminCohortsPage() {
  await assertProgramAdmin("fan-to-pro");

  let cohorts: Awaited<ReturnType<typeof fetchAllCohorts>> = [];
  let bootstrapError: string | null = null;
  try {
    cohorts = await fetchAllCohorts();
  } catch (err) {
    bootstrapError = err instanceof Error ? err.message : "unknown";
  }

  if (bootstrapError) {
    return (
      <PageContainer>
        <PageHeader title="기수 관리" description="cohort 단위 운영" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={bootstrapError}
        />
      </PageContainer>
    );
  }

  if (cohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="기수 관리" description="cohort 단위 운영" />
        <EmptyState
          title="아직 기수가 없습니다"
          description="첫 기수를 생성하려면 LMS Wave 0 마이그레이션을 먼저 적용하고, 운영 스크립트 또는 SQL 로 cohorts 테이블에 row 를 추가하세요."
        />
      </PageContainer>
    );
  }

  // 각 cohort 의 학생 수 + 회차 수 병렬 조회.
  // 실패는 무시 (0 으로 대체) — 리스트 자체는 항상 렌더.
  const rows: CohortListRow[] = await Promise.all(
    cohorts.map(async (c) => {
      const [students, sessions] = await Promise.all([
        fetchStudentsByCohort(c.id).catch(() => []),
        fetchSessionsByCohort(c.id).catch(() => []),
      ]);
      return {
        id: c.id,
        slug: c.slug ?? null,
        name: c.name,
        status: c.status,
        starts_on: c.starts_on,
        ends_on: c.ends_on,
        ceremony_on: c.ceremony_on,
        capacity: c.capacity,
        min_to_open: c.min_to_open,
        accepts_signup_now: c.accepts_signup_now ?? null,
        studentCount: students.length,
        sessionCount: sessions.length,
      };
    }),
  );

  const totalStudents = rows.reduce((acc, r) => acc + r.studentCount, 0);
  const inProgress = rows.filter((r) => r.status === "in_progress").length;
  const description =
    inProgress > 0
      ? `총 ${rows.length}개 기수 / 강의 중 ${inProgress}개 / 등록 학생 ${totalStudents}명`
      : `총 ${rows.length}개 기수 / 등록 학생 ${totalStudents}명`;

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES.cohorts} />
      <PageHeader title="기수 관리" description={description} />
      <CohortsList rows={rows} />
    </PageContainer>
  );
}
