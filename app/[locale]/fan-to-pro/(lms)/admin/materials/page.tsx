import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

export const metadata: Metadata = {
  title: "강의 자료 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /admin/materials — legacy route.
 *
 * 다중 cohort 대응 (2026-07-19): 강의 자료는 /admin/cohorts/[slug]/materials
 * 안으로 이동 (이미 존재). 종료된 기수 자료도 조회 가능하게 하려고 active cohort
 * auto-select 대신 기수 리스트로 유도.
 */
export default async function LegacyMaterialsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { locale } = await params;
  redirect(`/${locale}/fan-to-pro/admin/cohorts` as Route);
}
