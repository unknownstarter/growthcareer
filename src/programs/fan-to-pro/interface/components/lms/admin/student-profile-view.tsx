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
import type { StudentProfile } from "@/src/programs/fan-to-pro/domain/entities/student-profile";
import type { StudentCareerTarget } from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import type { StudentResumeItem } from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

type Props = {
  studentId: string;
  profile: StudentProfile | null;
  target: StudentCareerTarget | null;
  resumeItems: StudentResumeItem[];
};

export function StudentProfileView({
  studentId,
  profile,
  target,
  resumeItems,
}: Props) {
  // admin 은 항상 KO locale (admin surface 라이트 토스 톤, 한국어 운영).
  const locale = "ko";
  return (
    <div className="space-y-6">
      <StudentProfileForm
        studentId={studentId}
        initialProfile={profile}
        locale={locale}
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
    </div>
  );
}
