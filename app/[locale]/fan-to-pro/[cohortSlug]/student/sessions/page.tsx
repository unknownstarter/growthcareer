import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentSessionsView } from "@/src/programs/fan-to-pro/application/queries/student/fetch-student-sessions-view";
import { StudentSessionsList } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-sessions-list";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "수업 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/sessions (B0060).
 *
 * 학생 본인의 회차별 list — 출결 + 자료 indicator + detail link.
 *
 * 권한:
 *   - layout: cohort_memberships role=student (or super_admin)
 *   - fetchStudentSessionsView 첫 줄: assertCanReadStudentProfile(student_id)
 */
export default async function StudentSessionsPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  const isEn = locale === "en";

  // super_admin 본인 student_id 없으면 admin 으로.
  if (!user.studentId) {
    if (user.isSuperAdmin) {
      redirect(`/${locale}/fan-to-pro/admin/cohorts/${cohortSlug}` as Route);
    }
    return (
      <PageContainer>
        <PageHeader title={isEn ? "Sessions" : "수업"} />
        <EmptyState
          title={
            isEn
              ? "Student profile not linked"
              : "학생 정보를 확인할 수 없습니다"
          }
          description={
            isEn
              ? "Please contact your administrator."
              : "관리자에게 문의해주세요."
          }
        />
      </PageContainer>
    );
  }

  const result = await fetchStudentSessionsView(user.studentId);

  if (result.status === "error") {
    return (
      <PageContainer>
        <PageHeader title={isEn ? "Sessions" : "수업"} />
        <EmptyState
          title={
            isEn ? "Unable to load sessions" : "회차 정보를 불러오지 못했습니다"
          }
          description={
            isEn
              ? "Please refresh the page or contact your administrator."
              : "페이지를 새로고침하거나 관리자에게 문의해주세요."
          }
        />
      </PageContainer>
    );
  }

  const view = result.data;

  return (
    <PageContainer>
      <PageHeader
        title={isEn ? "Sessions" : "수업"}
        description={
          isEn
            ? "Your cohort schedule, attendance, and materials."
            : "회차별 일정, 출결, 강의 자료를 한 곳에서 확인해요."
        }
      />
      <StudentSessionsList
        cohortName={view.cohort_name}
        cohortSlug={cohortSlug}
        cohortStartsOn={view.cohort_starts_on}
        cohortEndsOn={view.cohort_ends_on}
        totalSessions={view.total_sessions}
        attendedCount={view.attended_count}
        attendanceRate={view.attendance_rate}
        rows={view.rows}
        locale={locale}
      />
    </PageContainer>
  );
}
