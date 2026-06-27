import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchCohortRoster } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import { AttendanceMatrix } from "@/src/programs/fan-to-pro/interface/components/lms/admin/attendance-matrix";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "출결 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * CLAUDE.md §7 — 시각 기반 분기 (회차별 미시작 disabled / 강의 시작 시각 비교) 가
 * 있으므로 force-dynamic. 출석 데이터 자체도 운영자가 강의장에서 실시간 mark.
 */
export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/attendance
 *
 * 1기 운영 중 단일 cohort 가정. 다중 cohort 시 cohort selector 추가 (다음 sprint).
 *
 * - 가드: assertProgramAdmin("fan-to-pro") 첫 줄 (CLAUDE.md §7.4)
 * - 데이터: 첫 active cohort 의 roster (students × sessions × attendanceMap)
 * - UI: AttendanceMatrix — cell click cycle, 회차 헤더 일괄, sticky row/col
 */
export default async function FanToProAdminAttendancePage() {
  await assertProgramAdmin("fan-to-pro");

  const cohorts = await fetchActiveCohorts();
  if (cohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader
          title="출결"
          description="active cohort 가 없습니다."
        />
        <EmptyState
          title="진행 중인 기수가 없어요"
          description="기수를 먼저 active 상태로 만들어주세요."
        />
      </PageContainer>
    );
  }

  // TODO: 다음 sprint — 다중 cohort 시 selector. 지금은 1기만이라 첫 번째 사용.
  const cohort = cohorts[0];
  const rosterResult = await fetchCohortRoster(cohort.id);

  if (rosterResult.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="출결" description={cohort.name} />
        <EmptyState
          title="출결 데이터를 불러오지 못했어요"
          description={rosterResult.error}
        />
      </PageContainer>
    );
  }

  const { sessions, students } = rosterResult.data;

  if (students.length === 0 || sessions.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="출결" description={cohort.name} />
        <EmptyState
          title={
            students.length === 0
              ? "등록된 학생이 없어요"
              : "등록된 회차가 없어요"
          }
          description={
            students.length === 0
              ? "먼저 기수 상세에서 [입금 완료 일괄 등록] 으로 학생을 등록하세요."
              : "기수에 강의 회차가 아직 등록되지 않았습니다."
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES.attendance} />
      <PageHeader
        title="출결"
        description={`${cohort.name} / 학생 ${students.length}명 / 회차 ${sessions.length}회`}
      />
      <AttendanceMatrix
        cohortName={cohort.name}
        sessions={sessions}
        students={students}
      />
    </PageContainer>
  );
}
