import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentSessionDetail } from "@/src/programs/fan-to-pro/application/queries/student/fetch-student-session-detail";
import { StudentSessionDetailView } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-session-detail";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "회차 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/sessions/[sessionId] (B0060).
 *
 * 학생 본인 회차 상세 — 출결 + 강의 내용 + 자료 다운로드.
 *
 * 권한:
 *   - layout: cohort_memberships role=student (or super_admin)
 *   - fetchStudentSessionDetail 첫 줄: assertCanReadStudentProfile(student_id)
 *   - IDOR: query 내부에서 student.cohort_id === session.cohort_id 검증
 *     (다른 cohort 의 session_id 진입 차단)
 */
export default async function StudentSessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string; sessionId: string }>;
}) {
  const { locale, cohortSlug, sessionId } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  const isEn = locale === "en";

  if (!user.studentId) {
    if (user.isSuperAdmin) {
      redirect(`/${locale}/fan-to-pro/admin/cohorts/${cohortSlug}` as Route);
    }
    return (
      <PageContainer>
        <PageHeader title={isEn ? "Session" : "회차"} />
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

  const result = await fetchStudentSessionDetail({
    student_id: user.studentId,
    session_id: sessionId,
  });

  if (result.status === "error") {
    // IDOR / 권한 / not found 통합 — 학생에게는 동일 메시지 (정보 비노출).
    return (
      <PageContainer>
        <PageHeader title={isEn ? "Session" : "회차"} />
        <EmptyState
          title={
            isEn
              ? "Session not found"
              : "회차 정보를 찾을 수 없습니다"
          }
          description={
            isEn
              ? "This session may not exist or you may not have access."
              : "존재하지 않는 회차이거나, 접근 권한이 없습니다."
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <StudentSessionDetailView
        detail={result.data}
        cohortSlug={cohortSlug}
        locale={locale}
      />
    </PageContainer>
  );
}
