import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchStudentsWithProfiles } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-students-with-profiles";
import { StudentsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/students-dashboard";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "학생 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminStudentsPage() {
  await assertProgramAdmin("fan-to-pro");

  let cohorts: Awaited<ReturnType<typeof fetchActiveCohorts>> = [];
  let bootError: string | null = null;
  try {
    cohorts = await fetchActiveCohorts();
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError) {
    return (
      <PageContainer>
        <PageHeader title="학생 관리" />
        <EmptyState title="데이터를 불러올 수 없습니다" description={bootError} />
      </PageContainer>
    );
  }

  if (cohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="학생 관리" />
        <EmptyState
          title="활성 기수가 없습니다"
          description="기수 페이지에서 1기를 먼저 생성해주세요."
        />
      </PageContainer>
    );
  }

  const cohort = cohorts[0];
  const result = await fetchStudentsWithProfiles({ cohort_id: cohort.id });

  if (result.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="학생 관리" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={result.error}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="학생 관리"
        description={`${cohort.name} 학생 ${result.data.length}명. invite 발송과 진행 현황을 관리합니다.`}
      />
      <StudentsDashboard
        cohort_id={cohort.id}
        cohort_name={cohort.name}
        students={result.data}
      />
    </PageContainer>
  );
}
