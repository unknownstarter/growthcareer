import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchCohortBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchLectureMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import { CohortMaterialsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/cohort-materials-dashboard";
import { PageGuideBot } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guide-bot";
import { PAGE_GUIDES } from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-guides";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "강의 자료 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/cohorts/[cohortSlug]/materials — 운영자 강의 자료
 * 업로드 + list + 삭제 (B0044 Phase 2 Page 1).
 *
 * 권한: super_admin 또는 program admin (fan-to-pro).
 *       cohort 가 fan-to-pro 인지는 cohortSlug 로 fetch.
 *
 * Wave 1 materials_dashboard 와는 별도 — 신규 lecture_materials 테이블 사용.
 * 회차별 grouping + storage_method 분기 (file_upload / external_url).
 */
export default async function FanToProAdminCohortMaterialsPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;

  // 권한 가드 — program admin.
  await assertProgramAdmin("fan-to-pro");

  const cohort = await fetchCohortBySlug(cohortSlug);
  if (!cohort) notFound();

  const materials = await fetchLectureMaterialsByCohort(cohort.id).catch(
    () => [],
  );

  return (
    <PageContainer>
      <PageGuideBot {...PAGE_GUIDES["cohort-materials"]} />
      <div className="mb-2">
        <Link
          href={
            `/${locale}/fan-to-pro/admin/cohorts/${cohortSlug}` as Route
          }
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-4 w-4" />
          기수 상세로
        </Link>
      </div>
      <PageHeader
        title={`${cohort.name} / 강의 자료`}
        description="회차별 자료를 등록합니다. 파일 업로드는 100MB 까지, 외부 링크는 https 만 허용됩니다."
      />

      {materials.length === 0 ? (
        <CohortMaterialsDashboard
          cohortId={cohort.id}
          cohortName={cohort.name}
          initialMaterials={[]}
        />
      ) : (
        <CohortMaterialsDashboard
          cohortId={cohort.id}
          cohortName={cohort.name}
          initialMaterials={materials}
        />
      )}

      {materials.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="자료 등록 안내"
            description="공개로 등록한 자료는 학생 surface 의 [수업 자료] 탭에 즉시 노출됩니다. 비공개로 두면 운영자에게만 보입니다."
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
