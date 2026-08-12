import type { Route } from "next";
import { redirect } from "next/navigation";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/instructor (bare) — 404 방지 index redirect.
 *
 * 강사 surface 는 현재 커뮤니티만 구현 (B0070). bare /instructor 접근 시
 * community 로 서버 redirect (auth + cohort 소속 가드는 상위 layout 이 처리).
 * 대시보드 등 추가되면 진입점 재조정.
 */
export default async function FanToProInstructorIndexPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  redirect(`/${locale}/fan-to-pro/${cohortSlug}/instructor/community` as Route);
}
