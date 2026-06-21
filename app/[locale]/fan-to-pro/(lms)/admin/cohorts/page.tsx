import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchCohortRoster } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import { CohortsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohorts-dashboard";
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

  let activeCohorts: Awaited<ReturnType<typeof fetchActiveCohorts>> = [];
  let bootstrapError: string | null = null;
  try {
    activeCohorts = await fetchActiveCohorts();
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

  if (activeCohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="기수 관리" description="cohort 단위 운영" />
        <EmptyState
          title="활성 기수가 없습니다"
          description="LMS Wave 0 마이그레이션을 먼저 적용해주세요."
        />
      </PageContainer>
    );
  }

  const cohort = activeCohorts[0];
  const rosterResult = await fetchCohortRoster(cohort.id);
  if (rosterResult.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="기수 관리" description="cohort 단위 운영" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={rosterResult.error}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="기수 관리"
        description={`현재 활성: ${cohort.name} (${cohort.starts_on} 부터 ${cohort.ends_on} 까지)`}
      />
      <CohortsDashboard roster={rosterResult.data} />
    </PageContainer>
  );
}
