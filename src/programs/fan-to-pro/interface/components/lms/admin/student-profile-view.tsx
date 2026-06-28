"use client";

/**
 * Student Profile View (B0044 LMS Launch Phase 2) — admin read+edit.
 *
 * 학생 detail 페이지 안에서 student_profile + career_target + resume_items 를
 * 운영자가 편집 가능. student-self 폼 컴포넌트 3종을 그대로 재사용.
 *
 * 권한: 호출 page 가 assertProgramAdmin 으로 진입 통과한 경우만.
 */
import {
  StudentProfileForm,
} from "@/src/programs/fan-to-pro/interface/components/lms/student/student-profile-form";
import {
  StudentCareerTargetForm,
} from "@/src/programs/fan-to-pro/interface/components/lms/student/student-career-target-form";
import {
  StudentResumeItemsEditor,
} from "@/src/programs/fan-to-pro/interface/components/lms/student/student-resume-items-editor";
import { StudentCareerDocsPanel } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-career-docs-panel";
import type { StudentProfile } from "@/src/programs/fan-to-pro/domain/entities/student-profile";
import type { StudentCareerTarget } from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import type { StudentResumeItem } from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";
import type { CareerDocument } from "@/src/programs/fan-to-pro/domain/entities/career-document";

type Props = {
  studentId: string;
  /** 신청서 원본 이름 — 폼의 영문 이름 자동 채움 (readonly). */
  originalName: string;
  profile: StudentProfile | null;
  target: StudentCareerTarget | null;
  resumeItems: StudentResumeItem[];
  /** B0057 사진 signed URL — admin 페이지에서 미리 발급. */
  photoUrl?: string | null;
  /** B0057 career documents — admin 페이지에서 미리 fetch. */
  careerDocuments?: CareerDocument[];
};

export function StudentProfileView({
  studentId,
  originalName,
  profile,
  target,
  resumeItems,
  photoUrl = null,
  careerDocuments = [],
}: Props) {
  // admin 은 항상 KO locale (admin surface 라이트 토스 톤, 한국어 운영).
  const locale = "ko";
  return (
    <div className="space-y-6">
      <StudentProfileForm
        studentId={studentId}
        initialProfile={profile}
        originalName={originalName}
        locale={locale}
        initialPhotoUrl={photoUrl}
        photoMode="admin"
      />
      <StudentCareerTargetForm
        studentId={studentId}
        initialTarget={target}
        locale={locale}
      />
      <StudentResumeItemsEditor
        studentId={studentId}
        initialItems={resumeItems}
        locale={locale}
      />
      <StudentCareerDocsPanel
        studentId={studentId}
        studentName={profile?.name_ko ?? profile?.name_en ?? originalName}
        initialDocuments={careerDocuments}
        mode="admin"
        locale={locale}
      />
    </div>
  );
}
