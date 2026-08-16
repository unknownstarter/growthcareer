import type { Metadata } from "next";
import { fetchApplicants } from "@/src/programs/fan-to-pro/admin/fetch-applicants";
import type { ApplicantView } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
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

const VALID_VIEWS: readonly ApplicantView[] = ["cohort2", "cohort1", "all"];

function parseView(raw: string | string[] | undefined): ApplicantView {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return VALID_VIEWS.includes(v as ApplicantView)
    ? (v as ApplicantView)
    : "cohort2"; // 기본 뷰 = 2기 (노아 확정 옵션 A).
}

export default async function AdminApplicantsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const role = await getAdminRole();
  const isViewer = role === "viewer";

  // 기수 필터 (옵션 A). 기본 = 2기. admin 은 ?view= 로 1기/전체 전환 가능.
  // viewer(코워크)는 서버에서 강제 cohort2 — URL 파라미터로도 1기/전체 못 봄
  // (파트너에게 1기 이력 노출 최소화). 클라 토글로 우회 불가 (server gate).
  const requestedView = parseView((await searchParams).view);
  const view: ApplicantView = isViewer ? "cohort2" : requestedView;

  // ADR 0017 Decision A / D1 (2026-07-29): viewer (코워크) 는 PII 마스킹.
  // name / email / phone / 입금자명 / university 를 repository 단에서 가림.
  // admin / super 는 mask:false 로 원문 불변. mutation 권한도 여전히 admin 만
  // (readOnly={isViewer}). 마스킹은 server 단이라 원문이 클라로 안 감.
  const { rows, eligibility, error, supabaseAvailable } = await fetchApplicants(
    { mask: isViewer, view },
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
        view={view}
        canSwitchView={!isViewer}
        serverNow={Date.now()}
      />
    </>
  );
}
