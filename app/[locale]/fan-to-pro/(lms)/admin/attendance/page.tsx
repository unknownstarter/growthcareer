import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

export const metadata: Metadata = {
  title: "출결 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /admin/attendance — legacy route.
 *
 * 다중 cohort 대응 (2026-07-19): 출결은 /admin/cohorts/[slug]/attendance
 * 안으로 이동. 종료된 기수도 접근 가능하도록. 여기 진입 시 기수 리스트로 유도.
 */
export default async function LegacyAttendanceRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { locale } = await params;
  redirect(`/${locale}/fan-to-pro/admin/cohorts` as Route);
}
