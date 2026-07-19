import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

export const metadata: Metadata = {
  title: "학생 관리 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /admin/students — legacy route.
 *
 * 다중 cohort 대응 (2026-07-19): 학생 리스트는 /admin/cohorts/[slug]/students
 * 안으로 이동. 종료된 기수 학생 명단도 접근 가능. 학생 상세 (/admin/students/[id])
 * 는 그대로 유지 (route 는 이 파일 형제로 계속 존재).
 */
export default async function LegacyStudentsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await assertProgramAdmin("fan-to-pro");
  const { locale } = await params;
  redirect(`/${locale}/fan-to-pro/admin/cohorts` as Route);
}
