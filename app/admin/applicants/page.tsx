import type { Metadata } from "next";
import { fetchApplicants } from "@/src/programs/fan-to-pro/admin/fetch-applicants";
import { ApplicantsDashboard } from "@/src/programs/fan-to-pro/admin/components/applicants-dashboard";

export const metadata: Metadata = {
  title: "신청자 - Growth Career Admin",
  robots: { index: false, follow: false, nocache: true },
};

// 운영자 페이지는 항상 최신 데이터 - 캐시 회피 + PII 디바이스 캐시 차단.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminApplicantsPage() {
  const { rows, error, supabaseAvailable } = await fetchApplicants();

  return (
    <ApplicantsDashboard
      initialRows={rows}
      fetchError={error}
      supabaseAvailable={supabaseAvailable}
    />
  );
}
