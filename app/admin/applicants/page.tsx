import type { Metadata } from "next";
import { fetchApplicants } from "@/src/programs/fan-to-pro/admin/fetch-applicants";
import { ApplicantsDashboard } from "@/src/programs/fan-to-pro/admin/components/applicants-dashboard";
import { AdminNav } from "@/src/programs/fan-to-pro/admin/components/admin-nav";
import { getAdminRole } from "@/src/programs/fan-to-pro/admin/role";

export const metadata: Metadata = {
  title: "신청자 - Growth Career Admin",
  robots: { index: false, follow: false, nocache: true },
};

// 운영자 페이지는 항상 최신 데이터 - 캐시 회피 + PII 디바이스 캐시 차단.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminApplicantsPage() {
  const role = await getAdminRole();
  const isViewer = role === "viewer";
  const { rows, eligibility, error, supabaseAvailable } = await fetchApplicants(
    { mask: isViewer },
  );

  return (
    <>
      <AdminNav current="applicants" role={role} />
      <ApplicantsDashboard
        initialRows={rows}
        anonymizeEligibility={eligibility}
        fetchError={error}
        supabaseAvailable={supabaseAvailable}
        readOnly={isViewer}
      />
    </>
  );
}
