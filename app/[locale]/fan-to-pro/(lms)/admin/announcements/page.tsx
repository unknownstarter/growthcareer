import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

export const metadata: Metadata = {
  title: "공지 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /admin/announcements — legacy route.
 *
 * 다중 cohort 대응 (2026-07-19): 공지는 /admin/cohorts/[slug]/announcements
 * 안으로 이동. 종료된 기수 공지도 조회 가능.
 */
export default async function LegacyAnnouncementsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { locale } = await params;
  redirect(`/${locale}/fan-to-pro/admin/cohorts` as Route);
}
