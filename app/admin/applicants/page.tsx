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
  // ADR 0017 Decision A / D1 (2026-07-29): viewer (코워크) 는 PII 마스킹.
  // name / email / phone / 입금자명 / university 를 repository 단에서 가림.
  // admin / super 는 mask:false 로 원문 불변. mutation 권한도 여전히 admin 만
  // (readOnly={isViewer}). 마스킹은 server 단이라 원문이 클라로 안 감.
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
