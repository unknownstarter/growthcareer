import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  assertCanAccessStudentCareer,
  getLmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCareerDocuments } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { CareerDocumentsPanel } from "@/src/programs/fan-to-pro/interface/components/lms/career/career-documents-panel";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "내 커리어 문서 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/career — 학생이 본인의 이력서/
 * 자기소개서/포트폴리오를 직접 등록/수정/삭제하는 페이지.
 *
 * 권한: layout 이 1차 (cohort_memberships role=student). 본 페이지에서 본인
 * student_id 확인 + assertCanAccessStudentCareer 로 2차 가드 (CLAUDE.md §7.4).
 */
export default async function StudentCareerPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  // super_admin 도 본인 student_id 가 없을 수 있음 — 그런 케이스는 admin path 로.
  if (!user.studentId) {
    if (user.isSuperAdmin) {
      // super_admin 이 학생 surface 직접 진입하면 admin/students 로.
      redirect(`/${locale}/fan-to-pro/admin/students` as Route);
    }
    // 일반 user 인데 student_id 가 없음 — 데이터 inconsistency.
    return (
      <PageContainer>
        <PageHeader title="내 커리어 문서" />
        <EmptyState
          title="학생 정보를 확인할 수 없습니다"
          description="관리자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  // 2차 권한 가드 — student-self path.
  await assertCanAccessStudentCareer(user.studentId);

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="내 커리어 문서" />
        <EmptyState
          title="학생 정보를 찾을 수 없습니다"
          description="관리자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  const documents = await fetchCareerDocuments(student.id).catch(() => []);

  return (
    <PageContainer>
      <PageHeader
        title="내 커리어 문서"
        description="이력서, 자기소개서, 포트폴리오를 외부 링크 또는 파일로 등록해주세요. 단일 최신본만 저장되며, 수정하면 이전 내용은 덮어쓰여집니다."
      />
      <CareerDocumentsPanel
        studentId={student.id}
        studentName={student.display_name}
        initialDocuments={documents}
        mode="self"
      />
    </PageContainer>
  );
}
