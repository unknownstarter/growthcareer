import type { Route } from "next";
import { redirect } from "next/navigation";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student (bare) — 404 방지 index redirect.
 *
 * 학생 surface 는 dashboard 를 진입점으로 삼는다. bare /student 접근 시
 * dashboard 로 서버 redirect (auth + cohort 소속 가드는 상위 layout 이 이미 처리).
 *
 * NOTE: role 분기 없는 단순 index redirect (Sage 표면 아님).
 */
export default async function FanToProStudentIndexPage({
  params,
}: {
  params: Promise<{ locale: string; cohortSlug: string }>;
}) {
  const { locale, cohortSlug } = await params;
  redirect(`/${locale}/fan-to-pro/${cohortSlug}/student/dashboard` as Route);
}
