import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getLmsUser,
  assertCohortRole,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { generateStudentCertificatePdfAction } from "@/src/programs/fan-to-pro/application/certificate/generate-certificate-pdf";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { CertificatePreviewFrame } from "@/src/programs/fan-to-pro/interface/components/lms/student/certificate-preview-frame";
import { CertificatePrintButton } from "@/src/programs/fan-to-pro/interface/components/lms/student/certificate-print-button";
import { CertificateStatusCard } from "@/src/programs/fan-to-pro/interface/components/lms/student/certificate-status-card";
import {
  CertificateBlockedCard,
  type CertificateBlockedReason,
} from "@/src/programs/fan-to-pro/interface/components/lms/student/certificate-blocked-card";

export const metadata: Metadata = {
  title: "수료증 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

// 종강 cutoff 에 따라 UI 가 변해야 함 (§7 SSG 금지 룰).
export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/certificates. 학생 본인 수료증.
 *
 * 상태 3분기 (spec §7.2):
 *   1) cohort 진행 중  = CertificateStatusCard (coming-soon variant, opacity-50)
 *   2) 종강 후 자격 X  = CertificateBlockedCard (사유 표시)
 *   3) 종강 후 자격 O  = CertificateStatusCard (issued) + preview iframe + print button
 *
 * 권한:
 *   - getLmsUser + assertCohortRole(cohort, 'student'). 본인 cohort 만 열람
 *   - server action (generateStudentCertificatePdfAction) 은 assertCanReadStudentProfile
 *     로 별도 가드. self / super_admin / program admin / cohort instructor 통과.
 *
 * PDF 다운로드:
 *   - server action = HTML string 반환
 *   - iframe srcDoc 주입 + CertificatePrintButton 이 contentWindow.print() 호출
 */
export default async function StudentCertificatesPage({
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
    redirect(`/${locale}/auth/login?error=no_student` as Route);
  }

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) {
    return (
      <PageContainer>
        <PageHeader title="수료증" />
        <EmptyState
          title="기수를 찾을 수 없습니다"
          description="관리자에게 문의해 주세요."
        />
      </PageContainer>
    );
  }

  // 2차 권한 가드. 본인 cohort student 인지 검증.
  try {
    await assertCohortRole(cohort.id, "student");
  } catch {
    return (
      <PageContainer>
        <PageHeader title="수료증" />
        <EmptyState
          title="접근 권한이 없습니다"
          description="본인 기수의 수료증만 열람할 수 있습니다."
        />
      </PageContainer>
    );
  }

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="수료증" />
        <EmptyState
          title="학생 정보를 찾을 수 없습니다"
          description="관리자에게 문의해 주세요."
        />
      </PageContainer>
    );
  }

  const description =
    "4주 과정 수료증을 확인하고 PDF 로 저장할 수 있어요. 실물 수료증은 수료식 당일에 배포됩니다.";

  // 종강 전. coming-soon 카드만 표시.
  if (cohort.status !== "completed") {
    return (
      <PageContainer>
        <PageHeader title="수료증" description={description} />
        <div className="opacity-70">
          <CertificateStatusCard
            variant={{
              kind: "coming-soon",
              cohortEndsOnKo: formatKoreanDate(cohort.ends_on),
            }}
          />
        </div>
      </PageContainer>
    );
  }

  // 종강 후. server action 호출 (권한 + eligibility 재검증 안에서 실행).
  const result = await generateStudentCertificatePdfAction({
    student_id: student.id,
  });

  if (result.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="수료증" description={description} />
        <EmptyState
          title="수료증을 불러올 수 없습니다"
          description={`오류가 발생했어요. 잠시 후 다시 시도해 주세요. (${result.error})`}
        />
      </PageContainer>
    );
  }

  if (result.status === "not-eligible") {
    const reason = mapEligibilityReason(result.reason);
    const attendancePct =
      result.attendance_rate != null
        ? Math.round(result.attendance_rate * 100)
        : 0;
    return (
      <PageContainer>
        <PageHeader title="수료증" description={description} />
        {reason === "coming-soon" ? (
          <div className="opacity-70">
            <CertificateStatusCard
              variant={{
                kind: "coming-soon",
                cohortEndsOnKo: formatKoreanDate(cohort.ends_on),
              }}
            />
          </div>
        ) : (
          <CertificateBlockedCard
            reason={reason}
            attendancePercent={attendancePct}
          />
        )}
      </PageContainer>
    );
  }

  // 발급 가능. status card + preview iframe + print button.
  const issuedDateKo = deriveIssuedDateKo(cohort.ceremony_on);
  const iframeId = "certificate-preview-frame";

  return (
    <PageContainer>
      <PageHeader
        title="수료증"
        description={description}
        action={<CertificatePrintButton iframeId={iframeId} />}
      />
      <div className="space-y-4">
        <CertificateStatusCard
          variant={{
            kind: "issued",
            serialNo: result.serial_no,
            attendanceRate: result.attendance_rate,
            issuedDateKo,
          }}
        />
        <CertificatePreviewFrame iframeId={iframeId} html={result.html} />
      </div>
      {/* locale unused directly but reserved for future i18n copy. */}
      <span className="hidden" data-locale={locale} />
    </PageContainer>
  );
}

/**
 * eligibility 실패 reason → blocked-card variant / coming-soon.
 * cohort_in_progress 는 위쪽 status 분기에서 이미 잡히지만 방어적으로 처리.
 */
function mapEligibilityReason(
  reason:
    | "cohort_in_progress"
    | "cohort_cancelled"
    | "student_inactive"
    | "attendance_below_threshold",
): CertificateBlockedReason | "coming-soon" {
  switch (reason) {
    case "cohort_in_progress":
      return "coming-soon";
    case "cohort_cancelled":
      return "cohort-cancelled";
    case "student_inactive":
      return "student-inactive";
    case "attendance_below_threshold":
      return "attendance-below";
  }
}

/** ISO date → "YYYY년 M월 D일". */
function formatKoreanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

/**
 * 발급일 라벨: ceremony_on 이 있으면 그날, 없으면 오늘 (KST) 로 fallback.
 * build-certificate-data 의 resolveIssueDate 와 동일 로직. UI-only 표시라 재현.
 */
function deriveIssuedDateKo(ceremonyOn: string | null): string {
  if (ceremonyOn) return formatKoreanDate(ceremonyOn);
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return formatKoreanDate(kst.toISOString().slice(0, 10));
}
