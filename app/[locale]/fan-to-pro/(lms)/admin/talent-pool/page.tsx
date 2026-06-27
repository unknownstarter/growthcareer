import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchApplicants } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { fetchAllCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { TalentPoolView } from "@/src/programs/fan-to-pro/interface/components/lms/admin/talent-pool-view";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "인재풀 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * 인재풀 (talent pool) — 모든 기수의 applicants 통합 view.
 *
 * 비즈니스 모델:
 *   - 모든 기수에 신청한 사람 = 우리의 인재 자산.
 *   - 다음 기수 모집 시 notified/cancelled 이전 cohort applicants = 우선 outreach 대상.
 *   - 같은 이메일이 여러 기수 row 면 = 반복 신청자 (강한 의향) — 우선 컨택.
 *
 * Wave 1 hotfix 범위:
 *   - 단순 list view (검색 + cohort filter)
 *   - 본격 outreach / 동일인 history merge 는 Wave 4.
 */
export default async function FanToProAdminTalentPoolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { locale } = await params;

  const [applicantsResult, cohorts] = await Promise.all([
    fetchApplicants({}),
    fetchAllCohorts().catch(() => []),
  ]);

  if (applicantsResult.error) {
    return (
      <PageContainer>
        <PageHeader title="인재풀" description="모든 기수 신청자 통합" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={applicantsResult.error}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES["talent-pool"]} />
      <PageHeader
        title="인재풀"
        description={`모든 기수 신청자 ${applicantsResult.rows.length}명. 다음 기수 outreach 자산.`}
      />
      <TalentPoolView
        applicants={applicantsResult.rows}
        cohorts={cohorts.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug ?? null,
        }))}
        locale={locale}
      />
    </PageContainer>
  );
}
