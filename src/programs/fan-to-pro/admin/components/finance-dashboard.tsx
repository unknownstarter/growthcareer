"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import { exportFinanceCsv } from "@/src/programs/fan-to-pro/application/finance-actions";
import type { FinanceKpi } from "@/src/programs/fan-to-pro/domain/finance";
import { ToastProvider, useToast } from "./toast";

const compactBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-2.5 py-1.5 text-[10px] font-black uppercase text-fg hover:text-fg hover:border-fg-subtle disabled:opacity-40 whitespace-nowrap";
const accentBtn =
  "inline-flex items-center justify-center border border-brand-pink/60 bg-brand-pink/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-brand-pink hover:bg-brand-pink/20 disabled:opacity-40 whitespace-nowrap";
const compactStyle = { letterSpacing: "0.12em" } as const;

export function FinanceDashboard({
  kpi,
  kpiError,
  supabaseAvailable,
}: {
  kpi: FinanceKpi | null;
  kpiError: string | null;
  supabaseAvailable: boolean;
}) {
  return (
    <ToastProvider>
      <DashboardInner
        kpi={kpi}
        kpiError={kpiError}
        supabaseAvailable={supabaseAvailable}
      />
    </ToastProvider>
  );
}

function DashboardInner({
  kpi,
  kpiError,
  supabaseAvailable,
}: {
  kpi: FinanceKpi | null;
  kpiError: string | null;
  supabaseAvailable: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isPending, startTransition] = useTransition();

  function runExportCsv() {
    startTransition(async () => {
      const result = await exportFinanceCsv();
      if (result.status === "error") {
        show(`CSV 생성 실패: ${result.error}`, "error");
        return;
      }
      // Blob 변환 + 다운로드. server 가 BOM 포함 raw text 반환.
      const blob = new Blob([result.csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      show(
        `${result.filename} 다운로드 (${result.rowCount}행).`,
        "success",
      );
    });
  }

  function runRefresh() {
    startTransition(async () => {
      router.refresh();
      show("최신 데이터로 갱신했어요.", "info");
    });
  }

  const marginPositive = (kpi?.margin.krw ?? 0) >= 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-[44px] z-20 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center gap-3">
            <span
              className="border border-brand-pink bg-brand-pink/10 px-2 py-0.5 text-[10px] font-black uppercase text-brand-pink"
              style={{ letterSpacing: "0.2em" }}
            >
              ADMIN
            </span>
            <h1
              className="text-base font-black text-fg sm:text-lg"
              style={{ letterSpacing: "-0.02em" }}
            >
              Fan to Pro 재무
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runRefresh}
              className={compactBtn}
              style={compactStyle}
              disabled={isPending}
            >
              새로고침
            </button>
            <button
              type="button"
              onClick={runExportCsv}
              className={accentBtn}
              style={compactStyle}
              disabled={isPending || !supabaseAvailable}
              title="회계사 공유용 단일 ledger CSV (UTF-8 BOM)"
            >
              CSV 내려받기
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4">
        {!supabaseAvailable ? (
          <div className="border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Supabase 자격이 환경에 없어 mock 모드.
          </div>
        ) : null}
        {kpiError ? (
          <div className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
            KPI 로드 오류: {kpiError}
          </div>
        ) : null}

        {/* KPI grid */}
        <section
          aria-labelledby="kpi-heading"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <h2 id="kpi-heading" className="sr-only">
            재무 KPI 4종
          </h2>

          <KpiCard
            label="매출"
            sublabel="paid + enrolled"
            valueKrw={kpi?.revenue.totalKrw ?? 0}
            count={kpi?.revenue.count ?? 0}
            tone="default"
          />
          <KpiCard
            label="환불"
            sublabel="refunded"
            valueKrw={kpi?.refunds.totalKrw ?? 0}
            count={kpi?.refunds.count ?? 0}
            tone="refund"
            signed
          />
          <KpiCard
            label="강사료"
            sublabel="송금 완료"
            valueKrw={kpi?.instructorPayouts.totalKrw ?? 0}
            count={kpi?.instructorPayouts.count ?? 0}
            tone="payout"
            signed
          />
          <KpiCard
            label="마진"
            sublabel={
              kpi
                ? `${marginPositive ? "+" : ""}${kpi.margin.percent}%`
                : "-"
            }
            valueKrw={kpi?.margin.krw ?? 0}
            tone={marginPositive ? "marginPos" : "marginNeg"}
            emphasis
          />
        </section>

        {/* Explainer */}
        <section
          aria-labelledby="finance-formula-heading"
          className="border border-border bg-surface/60 p-3 text-xs text-fg/80"
        >
          <h2
            id="finance-formula-heading"
            className="mb-2 text-[10px] font-black uppercase text-fg"
            style={{ letterSpacing: "0.2em" }}
          >
            집계 정의
          </h2>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <li>
              <span className="text-fg/60">매출</span> = applicants.paid_amount_krw
              SUM where status ∈ paid|enrolled.
            </li>
            <li>
              <span className="text-fg/60">환불</span> = applicants.paid_amount_krw
              SUM where status = refunded.
            </li>
            <li>
              <span className="text-fg/60">강사료</span> = instructor_payouts.net_krw
              SUM where paid_at IS NOT NULL.
            </li>
            <li>
              <span className="text-fg/60">마진</span> = 매출 - 환불 - 강사료.
              백분율은 매출 대비.
            </li>
          </ul>
          <p className="mt-2 text-[11px] text-fg/60">
            CSV 컬럼: 일자 / 분류 / 식별자 / 이름 / 금액 / 메모. 매출 +, 환불/강사료 -.
            Excel 한글 호환 BOM 포함.
          </p>
        </section>
      </main>
    </div>
  );
}

function KpiCard({
  label,
  sublabel,
  valueKrw,
  count,
  tone,
  signed = false,
  emphasis = false,
}: {
  label: string;
  sublabel: string;
  valueKrw: number;
  count?: number;
  tone: "default" | "refund" | "payout" | "marginPos" | "marginNeg";
  signed?: boolean;
  emphasis?: boolean;
}) {
  const containerTone = {
    default: "border-border bg-surface/60",
    refund: "border-border bg-surface/60",
    payout: "border-border bg-surface/60",
    marginPos: "border-brand-pink/60 bg-brand-pink/10",
    marginNeg: "border-red-500/60 bg-red-500/10",
  }[tone];

  const valueTone = {
    default: "text-fg",
    refund: "text-fg",
    payout: "text-fg",
    marginPos: "text-brand-pink",
    marginNeg: "text-red-300",
  }[tone];

  const sign = signed && valueKrw > 0 ? "-" : "";
  const display = `${sign}${valueKrw.toLocaleString()}`;

  return (
    <article className={cn("border p-4", containerTone)}>
      <div className="flex items-baseline justify-between">
        <h3
          className="text-[10px] font-black uppercase text-fg/80"
          style={{ letterSpacing: "0.2em" }}
        >
          {label}
        </h3>
        <span className="text-[10px] text-fg/50">{sublabel}</span>
      </div>
      <div
        className={cn(
          "mt-2 font-black tabular-nums",
          emphasis ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
          valueTone,
        )}
        style={{ letterSpacing: "-0.02em" }}
      >
        {display}
        <span className="ml-1 text-sm text-fg/60">원</span>
      </div>
      {typeof count === "number" ? (
        <div className="mt-1 text-[11px] text-fg/60">{count}건</div>
      ) : null}
    </article>
  );
}
