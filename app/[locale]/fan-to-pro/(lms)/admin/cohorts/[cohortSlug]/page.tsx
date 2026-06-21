import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchApplicants } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { CohortDetail } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-detail";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "기수 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminCohortDetailPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { cohortSlug } = await params;

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) notFound();

  const [applicantsResult, students] = await Promise.all([
    fetchApplicants({ cohortId: cohort.id }),
    fetchStudentsByCohort(cohort.id).catch(() => []),
  ]);

  if (applicantsResult.error) {
    return (
      <PageContainer>
        <PageHeader title={cohort.name} description="기수 상세" />
        <EmptyState
          title="신청자 데이터를 불러올 수 없습니다"
          description={applicantsResult.error}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CohortDetail
        cohort={cohort}
        applicants={applicantsResult.rows}
        studentCount={students.length}
      />
    </PageContainer>
  );
}
