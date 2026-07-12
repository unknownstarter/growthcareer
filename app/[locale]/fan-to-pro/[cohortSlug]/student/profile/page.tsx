import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getLmsUser,
  assertCanReadStudentProfile,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { fetchStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import { fetchStudentResumeItems } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";
import { getStudentPhotoSignedUrlAction } from "@/src/programs/fan-to-pro/application/student-profile/get-photo-signed-url";
import { StudentProfileForm } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-profile-form";
import { StudentRealNameEdit } from "@/src/programs/fan-to-pro/interface/components/lms/admin/student-real-name-edit";
import Link from "next/link";
import { FileText } from "lucide-react";
import { StudentCareerTargetForm } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-career-target-form";
import { StudentResumeItemsEditor } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-resume-items-editor";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "내 프로필 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/profile — 학생 본인의 career
 * profile 입력 / 수정 페이지 (B0044 Phase 2 Page 3).
 *
 * 3 영역:
 *   1) 기본 정보 (student_profile)
 *   2) 희망 진로 (student_career_target)
 *   3) 이력서 항목 (student_resume_item × N)
 *
 * 권한 가드:
 *   1) layout: cohort_memberships role=student (or super_admin)
 *   2) page: assertCanReadStudentProfile(student.id) — 본인 또는 admin
 *
 * 첫 진입 시 환영 안내 (모든 영역 비어있으면).
 */
export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  if (!user.studentId) {
    if (user.isSuperAdmin) {
      redirect(`/${locale}/fan-to-pro/admin/students` as Route);
    }
    return (
      <PageContainer>
        <PageHeader title={locale === "en" ? "My profile" : "내 프로필"} />
        <EmptyState
          title={
            locale === "en"
              ? "Student record not found"
              : "학생 정보를 확인할 수 없습니다"
          }
          description={
            locale === "en"
              ? "Please contact your administrator."
              : "관리자에게 문의해주세요."
          }
        />
      </PageContainer>
    );
  }

  // 2차 권한 가드.
  await assertCanReadStudentProfile(user.studentId);

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title={locale === "en" ? "My profile" : "내 프로필"} />
        <EmptyState
          title={
            locale === "en"
              ? "Student record not found"
              : "학생 정보를 찾을 수 없습니다"
          }
        />
      </PageContainer>
    );
  }

  const [profile, target, items, photoResult] = await Promise.all([
    fetchStudentProfile(student.id).catch(() => null),
    fetchStudentCareerTarget(student.id).catch(() => null),
    fetchStudentResumeItems(student.id).catch(() => []),
    // B0057: photo signed URL — 5분 TTL.
    getStudentPhotoSignedUrlAction({ student_id: student.id }).catch(() => ({
      status: "error" as const,
      error: "fetchFailed",
    })),
  ]);

  const photoUrl = photoResult.status === "ok" ? photoResult.url : null;

  // 모든 영역 비어있는지 체크 → 첫 진입 환영 안내.
  // 커리어 문서 (이력서/포트폴리오) 는 별도 페이지 `/student/career` 에서 관리.
  const isFirstVisit = !profile && !target && items.length === 0;

  const isEn = locale === "en";

  return (
    <PageContainer>
      <PageHeader
        title={isEn ? "My profile" : "내 프로필"}
        description={
          isEn
            ? "Fill in your career profile so we can match opportunities and review your documents."
            : "프로필을 채우면 운영진이 취업 매칭 / 문서 첨삭 시 활용해요."
        }
        action={
          <div className="flex items-center gap-2">
            <Link
              href={
                `/${locale}/fan-to-pro/${cohortSlug}/student/profile/print` as Route
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
            >
              <FileText className="h-4 w-4" />
              {isEn ? "Print / PDF" : "이력서 인쇄 / PDF"}
            </Link>
            <StudentRealNameEdit
              studentId={student.id}
              currentName={student.display_name}
            />
          </div>
        }
      />

      {isFirstVisit ? (
        <div className="mb-6 rounded-[var(--radius)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5">
          <h3 className="text-sm font-bold text-[var(--primary)]">
            {isEn ? "Welcome" : "환영합니다"}
          </h3>
          <p className="mt-1.5 text-sm text-[var(--foreground)] leading-relaxed">
            {isEn
              ? "This is your career profile. Fill in each section as you go through the program. Instructors and operators will use it when recommending companies and reviewing your documents."
              : "이곳은 본인의 커리어 프로필이에요. 강의를 들으면서 영역별로 채워주세요. 운영진과 강사님이 회사 추천 / 문서 첨삭 시 참고합니다."}
          </p>
        </div>
      ) : null}

      <div className="space-y-6">
        <StudentProfileForm
          studentId={student.id}
          initialProfile={profile}
          originalName={student.display_name}
          locale={locale}
          initialPhotoUrl={photoUrl}
          photoMode="self"
        />
        <StudentCareerTargetForm
          studentId={student.id}
          initialTarget={target}
          locale={locale}
        />
        <StudentResumeItemsEditor
          studentId={student.id}
          initialItems={items}
          locale={locale}
        />
      </div>
    </PageContainer>
  );
}
