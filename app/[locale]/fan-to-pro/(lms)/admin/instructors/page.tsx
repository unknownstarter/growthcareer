import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchInstructorsWithProfiles } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-instructors-with-profiles";
import { fetchAllCompanies } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { InstructorsDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/instructors-dashboard";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "강사 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function FanToProAdminInstructorsPage() {
  await assertProgramAdmin("fan-to-pro");

  let instructors: Awaited<ReturnType<typeof fetchInstructorsWithProfiles>> = {
    status: "ok",
    data: [],
  };
  let companies: Awaited<ReturnType<typeof fetchAllCompanies>> = [];
  let bootError: string | null = null;
  try {
    instructors = await fetchInstructorsWithProfiles();
    companies = await fetchAllCompanies();
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError || instructors.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="강사 관리" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={
            bootError ?? (instructors.status === "error" ? instructors.error : "")
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="강사 관리"
        description="회사 연결과 LMS invite. 강사 마스터는 기존 어드민에서."
      />
      <InstructorsDashboard
        instructors={instructors.data}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      />
    </PageContainer>
  );
}
