import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchCohortRoster } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import { AttendanceMatrix } from "@/src/programs/fan-to-pro/interface/components/lms/admin/attendance-matrix";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { CohortTabsNav } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-tabs-nav";

export const metadata: Metadata = {
  title: "출결 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * CLAUDE.md §7 시각 기반 분기 (회차별 미시작 disabled) 가 있으므로 force-dynamic.
 * 출석 데이터도 강의장에서 실시간 mark.
 */
export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/cohorts/[cohortSlug]/attendance
 *
 * 다중 cohort 대응 근본 fix. 종료된 기수도 접근 가능 (status 필터 없음).
 * 기존 /admin/attendance 는 /admin/cohorts 리스트로 redirect.
 */
export default async function FanToProAdminCohortAttendancePage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { cohortSlug } = await params;

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) notFound();

  const rosterResult = await fetchCohortRoster(cohort.id);

  if (rosterResult.status === "error") {
    return (
      <PageContainer>
        <CohortTabsNav cohortSlug={cohortSlug} />
        <PageHeader title="출결" description={cohort.name} />
        <EmptyState
          title="출결 데이터를 불러오지 못했어요"
          description={rosterResult.error}
        />
      </PageContainer>
    );
  }

  const { sessions, students, courseTitles } = rosterResult.data;

  if (students.length === 0 || sessions.length === 0) {
    return (
      <PageContainer>
        <CohortTabsNav cohortSlug={cohortSlug} />
        <PageHeader title="출결" description={cohort.name} />
        <EmptyState
          title={
            students.length === 0
              ? "등록된 학생이 없어요"
              : "등록된 회차가 없어요"
          }
          description={
            students.length === 0
              ? "먼저 기수 개요에서 [입금 완료 일괄 등록] 으로 학생을 등록하세요."
              : "기수에 강의 회차가 아직 등록되지 않았습니다."
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <CohortTabsNav cohortSlug={cohortSlug} />
      <PageGuideBot {...PAGE_GUIDES.attendance} />
      <PageHeader
        title="출결"
        description={`${cohort.name} / 학생 ${students.length}명 / 회차 ${sessions.length}회`}
      />
      <AttendanceMatrix
        cohortName={cohort.name}
        sessions={sessions}
        students={students}
        courseTitles={courseTitles}
      />
    </PageContainer>
  );
}
