import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getLmsUser,
  assertCohortRole,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getCohortBySlugCached } from "@/src/programs/fan-to-pro/application/queries/cache/cached-cohort-meta";
import { getVisibleLectureMaterialsByCohortCached } from "@/src/programs/fan-to-pro/application/queries/cache/cached-materials";
import { StudentMaterialsPanel } from "@/src/programs/fan-to-pro/interface/components/lms/student/student-materials-panel";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "수업 자료 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/materials — 학생 본인의 cohort
 * 강의 자료 list + 다운로드 (B0044 Phase 2 Page 2).
 *
 * 권한 가드:
 *   1) layout: cohort_memberships role=student (or super_admin)
 *   2) page: assertCohortRole(cohort.id, 'student') — 본인 cohort 인지 검증
 *
 * 자료는 visibility='published' OR scheduled-due 만 노출.
 */
export default async function StudentMaterialsPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);

  const cohort = await getCohortBySlugCached(cohortSlug);
  if (!cohort) {
    return (
      <PageContainer>
        <PageHeader title="수업 자료" />
        <EmptyState
          title="기수를 찾을 수 없습니다"
          description="관리자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  // 2차 권한 가드 — student 본인 또는 super_admin (assertCohortRole 안에서 처리).
  // super_admin 도 통과 — 학생 surface 진입 시 자료 확인 OK.
  try {
    await assertCohortRole(cohort.id, "student");
  } catch {
    return (
      <PageContainer>
        <PageHeader title="수업 자료" />
        <EmptyState
          title="접근 권한이 없습니다"
          description="본인 기수의 수업 자료만 열람할 수 있습니다."
        />
      </PageContainer>
    );
  }

  const materials = await getVisibleLectureMaterialsByCohortCached(
    cohort.id,
  ).catch(() => []);

  const titleText = locale === "en" ? "Materials" : "수업 자료";
  const descriptionText =
    locale === "en"
      ? `${cohort.name}. Materials released by your instructors.`
      : `${cohort.name}. 강사님이 공개한 강의 자료입니다.`;

  return (
    <PageContainer>
      <PageHeader title={titleText} description={descriptionText} />
      <StudentMaterialsPanel
        initialMaterials={materials}
        locale={locale}
      />
    </PageContainer>
  );
}
