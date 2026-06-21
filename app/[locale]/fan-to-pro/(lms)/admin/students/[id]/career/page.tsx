import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCareerDocuments } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { CareerDocumentsPanel } from "@/src/programs/fan-to-pro/interface/components/lms/career/career-documents-panel";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "학생 커리어 문서 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/students/[id]/career — 운영자가 특정 학생의
 * 이력서/자기소개서/포트폴리오를 직접 등록/수정/삭제하는 페이지.
 *
 * 권한: assertCanAccessStudentCareer — super_admin / program admin / (학생 본인은
 *       이 admin path 안 들어옴) 통과.
 */
export default async function AdminStudentCareerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  // 권한 가드 + 존재 확인.
  try {
    await assertCanAccessStudentCareer(id);
  } catch {
    notFound();
  }

  const student = await fetchStudentById(id);
  if (!student) notFound();

  const documents = await fetchCareerDocuments(id).catch(() => []);

  return (
    <PageContainer>
      <div className="mb-2">
        <Link
          href={`/${locale}/fan-to-pro/admin/students` as Route}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-4 w-4" />
          학생 목록으로
        </Link>
      </div>
      <PageHeader
        title={`${student.display_name} 학생 커리어 문서`}
        description="이력서, 자기소개서, 포트폴리오를 외부 링크 또는 파일로 등록/관리합니다. 학생 본인도 본인 페이지에서 같은 항목을 관리할 수 있습니다."
      />

      {student.status !== "active" ? (
        <EmptyState
          title="활동 중인 학생이 아닙니다"
          description={`현재 상태. ${student.status}. 종료된 학생의 문서는 read-only 로만 표시합니다.`}
        />
      ) : null}

      <CareerDocumentsPanel
        studentId={student.id}
        studentName={student.display_name}
        initialDocuments={documents}
        mode="admin"
      />
    </PageContainer>
  );
}
