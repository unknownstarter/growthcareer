import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "자료 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /admin/materials — active cohort 의 강의 자료 페이지로 redirect.
 *
 * 노아 요구 (2026-06-28): "자료 탭은 1기 때부터 해야지". B0044 lecture_materials
 * 이 cohort detail 안에 있어서 sidebar [자료] 메뉴가 directly 접근 못 함.
 * → active cohort 의 /admin/cohorts/[slug]/materials 로 단순 redirect.
 *
 * 이전 (Wave 2 placeholder, materials 테이블) 페이지는 폐기. lecture_materials
 * (B0044) 가 신규 실구현.
 *
 * 다중 cohort 시 첫 active cohort 선택. 추후 cohort selector 페이지 검토.
 */
export default async function FanToProAdminMaterialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await assertProgramAdmin("fan-to-pro");

  const cohorts = await fetchActiveCohorts().catch(() => []);
  if (cohorts.length === 0) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" />
        <EmptyState
          title="활성 기수가 없습니다"
          description="기수를 먼저 생성해주세요."
        />
      </PageContainer>
    );
  }

  redirect(
    `/${locale}/fan-to-pro/admin/cohorts/${cohorts[0].slug}/materials` as Route,
  );
}
