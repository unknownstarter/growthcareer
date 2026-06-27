import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { BackButton } from "@/src/programs/fan-to-pro/interface/components/lms/admin/back-button";
import { fetchInstructorDetail } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-instructor-detail";
import { fetchAllCompanies } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { InstructorDetailView } from "@/src/programs/fan-to-pro/interface/components/lms/admin/instructor-detail";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "강사 상세 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/instructors/[id] — 강사 detail (B0050).
 *
 * 한 페이지에서:
 *   - 기본 정보 (instructor + user_profile)
 *   - 회사 (변경 가능)
 *   - cohort 배정 list (cohort_memberships role=instructor)
 *   - 회차/세션 진척 (sessions + 본인 mark attendance count)
 *   - 정산 진척 (instructor_payouts)
 *
 * 권한: assertProgramAdmin('fan-to-pro').
 *
 * 기존 다크 어드민 (/admin/instructors) 의 server action 재사용 - 신규 mutation 없음.
 */
export default async function AdminInstructorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  await assertProgramAdmin("fan-to-pro");

  let detailResult: Awaited<ReturnType<typeof fetchInstructorDetail>>;
  let companies: Awaited<ReturnType<typeof fetchAllCompanies>> = [];
  let bootError: string | null = null;

  try {
    [detailResult, companies] = await Promise.all([
      fetchInstructorDetail(id),
      fetchAllCompanies(),
    ]);
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
    detailResult = { status: "error", error: bootError };
  }

  if (detailResult.status === "not_found") {
    notFound();
  }

  if (bootError || detailResult.status === "error") {
    return (
      <PageContainer>
        <div className="mb-2">
          <BackButton
            fallbackHref={`/${locale}/fan-to-pro/admin/instructors` as Route}
          />
        </div>
        <PageHeader title="강사 상세" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={
            bootError ??
            (detailResult.status === "error" ? detailResult.error : "")
          }
        />
      </PageContainer>
    );
  }

  const detail = detailResult.data;

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES["instructor-detail"]} />
      <div className="mb-2">
        <BackButton
          fallbackHref={`/${locale}/fan-to-pro/admin/instructors` as Route}
        />
      </div>
      <PageHeader
        title={detail.name}
        description={`${detail.company_name ?? "회사 미연결"} / ${
          detail.day === "saturday" ? "토요반" : "일요반"
        } / 배정 cohort ${detail.cohort_assignments.length}개`}
      />
      <InstructorDetailView
        detail={detail}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      />
    </PageContainer>
  );
}
