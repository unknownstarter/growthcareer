import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/material-repository";
import { isMissingTableError } from "@/src/programs/fan-to-pro/infrastructure/supabase/error-utils";
import { MaterialsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/materials-dashboard";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
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

  // Wave 2 entity (materials) 마이그레이션이 아직 적용 안 됐을 수 있음 — graceful fallback.
  let materials: Awaited<ReturnType<typeof fetchMaterialsByCohort>> = [];
  let sessions: Awaited<ReturnType<typeof fetchSessionsByCohort>> = [];
  let entityMissing = false;
  let unexpectedError: string | null = null;
  try {
    [materials, sessions] = await Promise.all([
      fetchMaterialsByCohort(cohort.id),
      fetchSessionsByCohort(cohort.id),
    ]);
  } catch (err) {
    if (isMissingTableError(err)) {
      entityMissing = true;
    } else {
      unexpectedError = err instanceof Error ? err.message : "unknown";
    }
  }

  if (entityMissing) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" description={cohort.name} />
        <EmptyState
          title="Wave 2 마이그레이션 적용 대기"
          description="강의 자료 (materials) 테이블이 아직 DB 에 없습니다. Wave 2 entity 마이그레이션 적용 후 사용 가능합니다. (예정: 강의 시작 후 ~7/19)"
        />
      </PageContainer>
    );
  }

  if (unexpectedError) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" description={cohort.name} />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={unexpectedError}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES.materials} />
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
