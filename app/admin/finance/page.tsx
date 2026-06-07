import type { Metadata } from "next";
import { fetchFinanceKpi } from "@/src/programs/fan-to-pro/application/finance-actions";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { AdminNav } from "@/src/programs/fan-to-pro/admin/components/admin-nav";
import { FinanceDashboard } from "@/src/programs/fan-to-pro/admin/components/finance-dashboard";

export const metadata: Metadata = {
  title: "재무 - Growth Career Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminFinancePage() {
  const supabaseAvailable = getSupabaseServer() !== null;
  const kpiResult = await fetchFinanceKpi();

  const kpi = kpiResult.status === "ok" ? kpiResult.kpi : null;
  const kpiError = kpiResult.status === "error" ? kpiResult.error : null;

  return (
    <>
      <AdminNav current="finance" />
      <FinanceDashboard
        kpi={kpi}
        kpiError={kpiError}
        supabaseAvailable={supabaseAvailable}
      />
    </>
  );
}
