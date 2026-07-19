import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchAnnouncementsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import { isMissingTableError } from "@/src/programs/fan-to-pro/infrastructure/supabase/error-utils";
import { AnnouncementsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/announcements-dashboard";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { CohortTabsNav } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-tabs-nav";

export const metadata: Metadata = {
  title: "공지 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/cohorts/[cohortSlug]/announcements
 *
 * 다중 cohort 대응 근본 fix. 종료된 기수 공지도 조회 가능.
 * 기존 /admin/announcements 는 /admin/cohorts 로 redirect.
 */
export default async function FanToProAdminCohortAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { cohortSlug } = await params;

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) notFound();

  // Wave 2 entity (announcements) 마이그레이션 대기 가능. graceful fallback.
  let announcements: Awaited<ReturnType<typeof fetchAnnouncementsByCohort>> = [];
  let entityMissing = false;
  let unexpectedError: string | null = null;
  try {
    announcements = await fetchAnnouncementsByCohort(cohort.id);
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
        <CohortTabsNav cohortSlug={cohortSlug} />
        <PageHeader title="공지" description={cohort.name} />
        <EmptyState
          title="공지 테이블 마이그레이션 대기"
          description="announcements 테이블이 아직 DB 에 없습니다. 마이그레이션 적용 후 사용 가능합니다."
        />
      </PageContainer>
    );
  }

  if (unexpectedError) {
    return (
      <PageContainer>
        <CohortTabsNav cohortSlug={cohortSlug} />
        <PageHeader title="공지" description={cohort.name} />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={unexpectedError}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CohortTabsNav cohortSlug={cohortSlug} />
      <PageGuideBot {...PAGE_GUIDES.announcements} />
      <PageHeader
        title="공지"
        description={`${cohort.name} / ${announcements.length}개`}
      />
      <AnnouncementsDashboard
        cohort_id={cohort.id}
        announcements={announcements}
      />
    </PageContainer>
  );
}
