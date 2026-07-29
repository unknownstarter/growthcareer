import type { Route } from "next";
import { redirect } from "next/navigation";

/**
 * /[locale]/fan-to-pro/admin (bare) — 404 방지 index redirect.
 *
 * admin surface 는 dashboard 를 진입점으로 삼는다. bare /admin 접근 시
 * dashboard 로 서버 redirect (auth 는 상위 layout 이 이미 가드).
 *
 * NOTE: role 분기 없는 단순 index redirect (Sage 표면 아님).
 */
export default async function FanToProAdminIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/fan-to-pro/admin/dashboard` as Route);
}
