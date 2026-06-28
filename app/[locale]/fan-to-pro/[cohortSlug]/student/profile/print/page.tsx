import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getLmsUser,
  assertCanReadStudentProfile,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { buildResumeData } from "@/src/programs/fan-to-pro/application/student-resume/build-resume-data";
import { renderResumeHtml } from "@/src/programs/fan-to-pro/application/student-resume/resume-html-template";
import { ResumePrintButton } from "@/src/programs/fan-to-pro/interface/components/lms/student/resume-print-button";

export const metadata: Metadata = {
  title: "이력서 인쇄 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const IFRAME_ID = "resume-print-iframe";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/profile/print — 학생 본인 이력서
 * 인쇄용 미리보기 (B0062).
 *
 * 구현 전략:
 *   - server component 가 권한 가드 + 데이터 fetch + HTML 빌드.
 *   - iframe 의 srcDoc 으로 HTML 주입 — page 외부 CSS 와 격리 + print 시 iframe 단독 인쇄.
 *   - 상단에 [PDF 로 저장 / 인쇄] 버튼 (client component) → iframe.contentWindow.print().
 *
 * 권한:
 *   - layout 이 cohort_memberships role=student (또는 super_admin) 가드 통과.
 *   - 본 page 가 추가로 assertCanReadStudentProfile(user.studentId).
 *
 * 인쇄 절차 (사용자):
 *   1. 페이지 진입 → 이력서 미리보기 표시
 *   2. [PDF 로 저장 / 인쇄] 클릭
 *   3. 브라우저 인쇄 dialog 에서 "PDF 로 저장" 선택
 */
export default async function StudentResumePrintPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;

  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);
  if (!user.studentId) {
    redirect(`/${locale}/fan-to-pro/admin/students` as Route);
  }

  try {
    await assertCanReadStudentProfile(user.studentId);
  } catch {
    redirect(`/${locale}/fan-to-pro` as Route);
  }

  const data = await buildResumeData(user.studentId);
  const html = renderResumeHtml(data);

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-neutral-900">
            이력서 인쇄
          </h1>
          <span className="text-xs text-neutral-500">
            완성도 {data.completion.percent}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={
              `/${locale}/fan-to-pro/${cohortSlug}/student/profile` as Route
            }
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            돌아가기
          </a>
          <ResumePrintButton iframeId={IFRAME_ID} />
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] px-4 py-6">
        <iframe
          id={IFRAME_ID}
          title="이력서 미리보기"
          srcDoc={html}
          className="h-[297mm] w-full rounded-md border border-neutral-200 bg-white shadow-lg"
        />
      </div>
    </div>
  );
}
