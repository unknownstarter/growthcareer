import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentsWithProfiles } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-students-with-profiles";
import { StudentsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/students-dashboard";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { CohortTabsNav } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-tabs-nav";

export const metadata: Metadata = {
  title: "학생 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/cohorts/[cohortSlug]/students
 *
 * 다중 cohort 대응 근본 fix. 종료된 기수 학생 명단도 접근 가능.
 * 기존 /admin/students 는 /admin/cohorts 로 redirect.
 * 학생 상세는 /admin/students/[id] (그대로 유지).
 */
export default async function FanToProAdminCohortStudentsPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { cohortSlug } = await params;

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) notFound();

  const result = await fetchStudentsWithProfiles({ cohort_id: cohort.id });

  if (result.status === "error") {
    return (
      <PageContainer>
        <CohortTabsNav cohortSlug={cohortSlug} />
        <PageHeader title="학생 관리" description={cohort.name} />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={result.error}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CohortTabsNav cohortSlug={cohortSlug} />
      <PageGuideBot {...PAGE_GUIDES.students} />
      <PageHeader
        title="학생 관리"
        description={`${cohort.name} 학생 ${result.data.length}명. invite 발송과 진행 현황을 관리합니다.`}
      />
      {result.data.length === 0 ? (
        <EmptyState
          title="등록된 학생이 없어요"
          description="개요에서 [입금 완료 일괄 등록] 으로 학생을 등록하세요."
        />
      ) : (
        <StudentsDashboard
          cohort_id={cohort.id}
          cohort_name={cohort.name}
          students={result.data}
        />
      )}
    </PageContainer>
  );
}
