import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/material-repository";
import { MaterialsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/materials-dashboard";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "자료 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminMaterialsPage() {
  await assertProgramAdmin("fan-to-pro");

  let cohorts: Awaited<ReturnType<typeof fetchActiveCohorts>> = [];
  let bootError: string | null = null;
  try {
    cohorts = await fetchActiveCohorts();
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError || cohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" />
        <EmptyState
          title={
            bootError ? "데이터를 불러올 수 없습니다" : "활성 기수가 없습니다"
          }
          description={bootError ?? "기수를 먼저 생성해주세요."}
        />
      </PageContainer>
    );
  }

  const cohort = cohorts[0];
  const materials = await fetchMaterialsByCohort(cohort.id);
  const sessions = await fetchSessionsByCohort(cohort.id);

  return (
    <PageContainer>
      <PageHeader
        title="강의 자료"
        description={`${cohort.name} / ${materials.length}개`}
      />
      <MaterialsDashboard
        cohort_id={cohort.id}
        materials={materials}
        sessions={sessions.map((s) => ({
          id: s.id,
          idx: s.idx ?? null,
          title: s.title,
          starts_at: s.starts_at,
        }))}
      />
    </PageContainer>
  );
}
