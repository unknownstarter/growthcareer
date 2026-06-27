import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FileText as FileIcon,
  Briefcase,
} from "lucide-react";
import { BackButton } from "@/src/programs/fan-to-pro/interface/components/lms/admin/back-button";
import { StudentRealNameEdit } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-real-name-edit";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { fetchStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import { fetchStudentResumeItems } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";
import { fetchStudentNotes } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";
import { StudentProfileView } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-profile-view";
import { StudentNotesPanel } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-notes-panel";
import {
  PageContainer,
  PageHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";

export const metadata: Metadata = {
  title: "학생 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/students/[id] — 학생 overview (B0044 Phase 2 Page 4).
 *
 * 한 페이지에서:
 *   - 기본 정보 (student row)
 *   - profile / career target / resume items (read+edit)
 *   - 운영 코멘트 (student_notes)
 *   - 커리어 문서 (/admin/students/[id]/career B0037) 로 가는 link
 *
 * 권한: assertProgramAdmin('fan-to-pro').
 */
export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  await assertProgramAdmin("fan-to-pro");

  const student = await fetchStudentById(id);
  if (!student) notFound();

  const [profile, target, resumeItems, notes] = await Promise.all([
    fetchStudentProfile(id).catch(() => null),
    fetchStudentCareerTarget(id).catch(() => null),
    fetchStudentResumeItems(id).catch(() => []),
    fetchStudentNotes(id).catch(() => []),
  ]);

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES["student-detail"]} />
      <div className="mb-2">
        <BackButton
          fallbackHref={`/${locale}/fan-to-pro/admin/students` as Route}
          label="뒤로"
        />
      </div>
      <PageHeader
        title={
          profile?.name_ko
            ? `${student.display_name} (${profile.name_ko})`
            : student.display_name
        }
        description={`학생 상태 ${student.status}. 한국 이름, 진로, 이력서, 운영 코멘트를 관리합니다.`}
        action={
          <div className="flex items-center gap-2">
            <StudentRealNameEdit
              studentId={id}
              currentName={student.display_name}
            />
            <Button asChild variant="outline" className="h-12">
              <Link
                href={
                  `/${locale}/fan-to-pro/admin/students/${id}/career` as Route
                }
              >
                <Briefcase className="h-4 w-4 mr-2" />
                커리어 문서
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <StudentProfileView
            studentId={id}
            originalName={student.display_name}
            profile={profile}
            target={target}
            resumeItems={resumeItems}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <StudentNotesPanel studentId={id} initialNotes={notes} />
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <FileIcon className="h-4 w-4 text-[var(--muted-foreground)]" />
              관련 자료
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)] leading-relaxed">
              학생의 이력서 / 자기소개서 / 포트폴리오 파일은 [커리어 문서]
              페이지에서 별도로 관리합니다.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
