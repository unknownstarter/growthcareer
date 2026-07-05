import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchApplicants } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCertificatesByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { fetchCohortOverview } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-overview";
import { CohortDetail } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-detail";
import { Award } from "lucide-react";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
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

  const [applicantsResult, students, overview, certificates] = await Promise.all([
    fetchApplicants({ cohortId: cohort.id }),
    fetchStudentsByCohort(cohort.id).catch(() => []),
    fetchCohortOverview(cohort.id).catch(() => null),
    fetchCertificatesByCohort(cohort.id).catch(() => []),
  ]);

  // B0081: 수료증 발급 진척. completion 만 count.
  const completionCertCount = certificates.filter(
    (c) => c.kind === "completion",
  ).length;
  const activeStudentCount = students.filter(
    (s) => s.status === "active" || s.status === "completed",
  ).length;

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
      <PageGuideBot {...PAGE_GUIDES["cohort-detail"]} />
      <CohortDetail
        cohort={cohort}
        applicants={applicantsResult.rows}
        studentCount={students.length}
        overview={overview}
      />

      {/* B0081: 수료증 발급 진척. cohort-detail 컴포넌트를 건드리지 않고 아래에 별도 섹션. */}
      <section className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="mb-3 flex items-center gap-2">
          <Award className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            수료증 발급 진척
          </h2>
        </div>
        <div className="flex items-baseline gap-4">
          <div className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {completionCertCount}
            <span className="text-base font-medium text-[var(--muted-foreground)]">
              {" / "}
              {activeStudentCount}명 발급됨
            </span>
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {cohort.status === "completed"
              ? "종강 후 대상자 기준"
              : "종강 후 자동 발급 대상. 현재 기수 진행 중이라 대부분 0."}
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
