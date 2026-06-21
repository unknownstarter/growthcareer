import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchAllCompanies } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { fetchInstructorsLms } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/instructor-lms-repository";
import { fetchActiveCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchExpensesByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-expense-repository";
import { fetchAllTaxFilings } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/tax-filing-repository";
import { fetchCohortRevenue } from "@/src/programs/fan-to-pro/application/queries/cohort/cohort-revenue";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import { FinanceDashboard } from "@/src/programs/fan-to-pro/interface/components/lms/admin/finance-dashboard";

export const metadata: Metadata = {
  title: "재무 / 회계 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/finance.
 *
 * B0032 LMS Wave 1 hotfix #3 - 일반 과세 사업자 (학원 미등록) 재무 / 회계 / 세무 통합 dashboard.
 *
 * 섹션:
 *   1) 손익 KPI (자동 계산) - 매출 / 비용 / 부가세 / 순익
 *   2) 비용 entry CRUD - cohort_expenses CRUD
 *   3) 세무 신고 일정 + 상태 - tax_filings CRUD (5종)
 *   4) 회계 / 세무 가이드 - read-only accordion
 *   5) 회사 단위 강사 정산 - 기존 wire (Wave 3 본격 정산 전 임시)
 *
 * 기존 /admin/finance (다크) 의 강사 개인 정산은 변경 X.
 */
export default async function FanToProAdminFinancePage() {
  await assertProgramAdmin("fan-to-pro");

  let bootError: string | null = null;
  let activeCohorts: Awaited<ReturnType<typeof fetchActiveCohorts>> = [];
  let companies: Awaited<ReturnType<typeof fetchAllCompanies>> = [];
  let instructors: Awaited<ReturnType<typeof fetchInstructorsLms>> = [];
  let expenses: Awaited<ReturnType<typeof fetchExpensesByCohort>> = [];
  let filings: Awaited<ReturnType<typeof fetchAllTaxFilings>> = [];
  let revenue: Awaited<ReturnType<typeof fetchCohortRevenue>> | null = null;

  try {
    activeCohorts = await fetchActiveCohorts();
    if (activeCohorts.length > 0) {
      const primary = activeCohorts[0];
      const [exp, fil, rev, co, ins] = await Promise.all([
        fetchExpensesByCohort(primary.id),
        fetchAllTaxFilings(),
        fetchCohortRevenue(primary.id),
        fetchAllCompanies(),
        fetchInstructorsLms(),
      ]);
      expenses = exp;
      filings = fil;
      revenue = rev;
      companies = co;
      instructors = ins;
    } else {
      filings = await fetchAllTaxFilings();
      companies = await fetchAllCompanies();
      instructors = await fetchInstructorsLms();
    }
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError) {
    return (
      <PageContainer>
        <PageHeader title="재무 / 회계 / 세무" />
        <EmptyState title="데이터를 불러올 수 없습니다" description={bootError} />
      </PageContainer>
    );
  }

  const primaryCohort = activeCohorts[0] ?? null;

  return (
    <PageContainer>
      <PageHeader
        title="재무 / 회계 / 세무"
        description="cohort 단위 손익, 비용 entry, 세무 신고 일정, 회계 가이드. 일반 과세 사업자 (학원 미등록) 기준."
      />

      {primaryCohort && revenue ? (
        <FinanceDashboard
          cohort={primaryCohort}
          revenue={revenue}
          expenses={expenses}
          filings={filings}
        />
      ) : (
        <EmptyState
          title="활성 cohort 가 없습니다"
          description="cohort 가 open / enrollment_closed / in_progress 상태일 때 손익 / 비용 / 세무 dashboard 가 표시됩니다."
        />
      )}

      {/* 회사 단위 강사 정산 (기존 wire) */}
      <div className="mt-10">
        <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)] mb-3">
          회사 단위 강사 정산
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          강사 개인 단위 정산은 기존 다크 어드민 (/admin/finance) 에서. 본 섹션은 회사 그룹 합계와 회사 메타 확인용. 본격 정산 (settlements / VAT / CSV) 은 Wave 3.
        </p>
        <CompanyGroups companies={companies} instructors={instructors} />
      </div>
    </PageContainer>
  );
}

function CompanyGroups({
  companies,
  instructors,
}: {
  companies: Awaited<ReturnType<typeof fetchAllCompanies>>;
  instructors: Awaited<ReturnType<typeof fetchInstructorsLms>>;
}) {
  type Group = {
    company_id: string | null;
    company_name: string;
    vat_issuer: boolean;
    instructors: typeof instructors;
  };
  const groups = new Map<string, Group>();
  for (const c of companies) {
    groups.set(c.id, {
      company_id: c.id,
      company_name: c.name,
      vat_issuer: c.vat_issuer,
      instructors: [],
    });
  }
  groups.set("__none__", {
    company_id: null,
    company_name: "(회사 미연결)",
    vat_issuer: false,
    instructors: [],
  });
  for (const i of instructors) {
    const key = i.company_id ?? "__none__";
    if (!groups.has(key)) continue;
    groups.get(key)!.instructors.push(i);
  }
  const groupList = Array.from(groups.values()).filter(
    (g) => g.instructors.length > 0 || g.company_id !== null,
  );

  return (
    <div className="space-y-4">
      {groupList.map((g) => (
        <Card key={g.company_id ?? "none"}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">{g.company_name}</CardTitle>
                <CardDescription>
                  소속 강사 {g.instructors.length}명
                </CardDescription>
              </div>
              {g.vat_issuer ? (
                <Badge>세금계산서 (VAT 10%)</Badge>
              ) : g.company_id ? (
                <Badge variant="outline">원천징수 3.3%</Badge>
              ) : (
                <Badge variant="outline">회사 미연결</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {g.instructors.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                소속 강사가 없습니다.
              </p>
            ) : (
              <ul className="space-y-1">
                {g.instructors.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{i.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {i.tax_mode === "tax_invoice" ? "세금계산서" : "원천징수 3.3%"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
