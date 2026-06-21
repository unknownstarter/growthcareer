import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchAllCompanies } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { fetchInstructorsLms } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/instructor-lms-repository";
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

export const metadata: Metadata = {
  title: "정산 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/admin/finance — 회사 단위 정산 lite 버전.
 *
 * 본격 정산 (settlements 테이블, VAT 계산, CSV export) 은 Wave 3 (B0034).
 * 본 페이지는 회사 단위 강사 그룹화 + 회사별 합계 placeholder.
 *
 * 기존 /admin/finance (다크) 의 강사 개인 정산은 변경 X.
 */
export default async function FanToProAdminFinancePage() {
  await assertProgramAdmin("fan-to-pro");

  let companies: Awaited<ReturnType<typeof fetchAllCompanies>> = [];
  let instructors: Awaited<ReturnType<typeof fetchInstructorsLms>> = [];
  let bootError: string | null = null;
  try {
    companies = await fetchAllCompanies();
    instructors = await fetchInstructorsLms();
  } catch (err) {
    bootError = err instanceof Error ? err.message : "unknown";
  }

  if (bootError) {
    return (
      <PageContainer>
        <PageHeader title="정산 (회사 단위)" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={bootError}
        />
      </PageContainer>
    );
  }

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
    <PageContainer>
      <PageHeader
        title="정산 (회사 단위)"
        description="회사별 강사 그룹화와 합계. 본격 정산 (settlements / VAT / CSV) 은 Wave 3 에서."
      />

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--secondary)] p-4 mb-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          강사 개인 단위 정산은 기존 다크 어드민 (/admin/finance) 에서 진행합니다.
          본 페이지는 회사 단위 합계와 회사 정보 확인용.
        </p>
      </div>

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
                    <li
                      key={i.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium">{i.name}</span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {i.tax_mode === "tax_invoice"
                          ? "세금계산서"
                          : "원천징수 3.3%"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
