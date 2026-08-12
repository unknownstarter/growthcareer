import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase } from "lucide-react";
import { BackButton } from "@/src/programs/fan-to-pro/interface/components/lms/admin/back-button";
import { StudentRealNameEdit } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-real-name-edit";
import { ResumeImportButton } from "@/src/programs/fan-to-pro/interface/components/lms/admin/resume-import-button";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { fetchStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import { fetchStudentResumeItems } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";
import { fetchStudentNotes } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";
import { fetchCareerDocuments } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchCertificatesByStudent } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/certificate-repository";
import { computeAttendanceRate } from "@/src/programs/fan-to-pro/application/certificate/build-certificate-data";
import { getStudentPhotoSignedUrlAction } from "@/src/programs/fan-to-pro/application/student-profile/get-photo-signed-url";
import { StudentProfileView } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-profile-view";
import { StudentNotesPanel } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-notes-panel";
import { CertificateStatusBadge } from "@/src/programs/fan-to-pro/interface/components/lms/admin/certificate-status-badge";
import { CertificatePreviewButton } from "@/src/programs/fan-to-pro/interface/components/lms/admin/certificate-preview-button";
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
 * /[locale]/fan-to-pro/admin/students/[id]. 학생 overview (B0044 Phase 2 Page 4).
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

  const [
    profile,
    target,
    resumeItems,
    notes,
    careerDocuments,
    photoResult,
    cohort,
    certificates,
    attendanceRate,
  ] = await Promise.all([
    fetchStudentProfile(id).catch(() => null),
    fetchStudentCareerTarget(id).catch(() => null),
    fetchStudentResumeItems(id).catch(() => []),
    fetchStudentNotes(id).catch(() => []),
    fetchCareerDocuments(id).catch(() => []),
    // B0057: photo signed URL. 5분 TTL. 페이지 로드마다 새로 발급.
    getStudentPhotoSignedUrlAction({ student_id: id }).catch(() => ({
      status: "error" as const,
      error: "fetchFailed",
    })),
    // B0081: 수료증 status badge 용. cohort / 발급 이력 / 출석률.
    fetchCohortById(student.cohort_id).catch(() => null),
    fetchCertificatesByStudent(id).catch(() => []),
    computeAttendanceRate(id, student.cohort_id).catch(() => null),
  ]);

  const photoUrl =
    photoResult.status === "ok" ? photoResult.url : null;

  const completionCert = certificates.find(
    (c) => c.cohort_id === student.cohort_id && c.kind === "completion",
  );

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
        description={[
          `학생 상태 ${student.status}`,
          profile?.nationality ? `국적 ${profile.nationality}` : null,
          profile?.visa_type ? `비자 ${profile.visa_type}` : null,
          profile?.gender
            ? `성별 ${profile.gender === "male" ? "남" : profile.gender === "female" ? "여" : profile.gender === "other" ? "기타" : "비공개"}`
            : null,
          profile?.birth_date ?? (profile?.birth_year ? `${profile.birth_year}년생` : null),
          profile?.months_in_korea != null
            ? `한국 거주 ${profile.months_in_korea}개월`
            : null,
          student.referral_code ? `추천 코드 ${student.referral_code}` : null,
        ]
          .filter(Boolean)
          .join(" / ")}
        action={
          <div className="flex items-center gap-2">
            <StudentRealNameEdit
              studentId={id}
              currentName={student.display_name}
            />
            <ResumeImportButton studentId={id} />
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

      {/* B0081: 수료증 status + preview */}
      <div className="mb-6 flex items-center justify-between rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--foreground)]">
            수료증
          </span>
          <CertificateStatusBadge
            issuedSerialNo={completionCert?.serial_no ?? null}
            cohortStatus={cohort?.status ?? "open"}
            studentStatus={student.status}
            attendanceRate={attendanceRate}
          />
        </div>
        <CertificatePreviewButton studentId={id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <StudentProfileView
            studentId={id}
            originalName={student.display_name}
            profile={profile}
            target={target}
            resumeItems={resumeItems}
            photoUrl={photoUrl}
            careerDocuments={careerDocuments}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <StudentNotesPanel studentId={id} initialNotes={notes} />
        </div>
      </div>
    </PageContainer>
  );
}
