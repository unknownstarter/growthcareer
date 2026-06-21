import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchAllCompanies } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { CompaniesDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/companies-dashboard";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "회사 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminCompaniesPage() {
  await assertProgramAdmin("fan-to-pro");

  let companies: Awaited<ReturnType<typeof fetchAllCompanies>> = [];
  let bootError: string | null = null;
  try {
    companies = await fetchAllCompanies();
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError) {
    return (
      <PageContainer>
        <PageHeader title="회사 관리" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={bootError}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="회사 관리"
        description="강사 정산 단위. 사업자번호, 계좌, VAT 여부 필수."
      />
      <CompaniesDashboard companies={companies} />
    </PageContainer>
  );
}
