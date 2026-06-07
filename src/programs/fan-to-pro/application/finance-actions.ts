"use server";

/**
 * Finance actions - B0018 Wave 2 T6.
 *
 * /admin/finance 운영자 페이지의 server actions 2종.
 *   1) fetchFinanceKpi   - KPI 카드 4장 (매출/환불/강사료/마진).
 *   2) exportFinanceCsv  - 회계사 공유용 단일 ledger CSV.
 *
 * 집계 정의 (spec §4.2):
 *   revenue            : sum(applicants.paid_amount_krw) WHERE status ∈ ('paid','enrolled').
 *   refunds            : sum(applicants.paid_amount_krw) WHERE status = 'refunded'.
 *   instructorPayouts  : sum(instructor_payouts.net_krw) WHERE paid_at IS NOT NULL.
 *   margin             : revenue - refunds - instructorPayouts.
 *
 * 회계 무결성:
 *   - 환불 (refunded) 은 입금 후 → paid_amount_krw 가 입금 시점 금액 보존
 *     (markAsRefunded 가 paid_amount_krw 를 0 으로 덮어쓰지 않음, admin-actions
 *     T3 확인).
 *   - 따라서 매출 SUM 에 refunded 미포함, 환불 SUM 은 별도 집계 → 중복 0.
 */

import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type {
  FinanceCsvResult,
  FinanceKpiResult,
  FinanceLedgerRow,
} from "@/src/programs/fan-to-pro/domain/finance";

const APPLICANTS_TABLE = "applicants";
const PAYOUTS_TABLE = "instructor_payouts";

function requireSupabase() {
  const supabase = getSupabaseServer();
  return supabase ?? null;
}

/* ---------------------------------------------------------------------------
 * 1. fetchFinanceKpi
 *
 * Supabase JS 는 RPC 없이 SUM 직접 불가 (count() 만 head 지원).
 * 3개 쿼리 병렬 + 클라이언트 측 합산:
 *   - applicants WHERE status IN ('paid','enrolled')   → paid_amount_krw 배열
 *   - applicants WHERE status = 'refunded'             → paid_amount_krw 배열
 *   - instructor_payouts WHERE paid_at IS NOT NULL     → net_krw 배열
 *
 * 30명 규모는 row 수 < 100 → 페이로드 무시 가능 (수 KB).
 * 성능 issue 발생 시 후속 Postgres RPC 함수로 SUM 위임 (sum_finance_kpi()).
 *
 * 예상 p50/p95:
 *   - 30 row Supabase Seoul → p50 ~80ms, p95 ~250ms (병렬 3 쿼리 단일 RTT).
 *   - 캐시 X (force-dynamic 페이지에서 호출).
 * ------------------------------------------------------------------------- */
export async function fetchFinanceKpi(): Promise<FinanceKpiResult> {
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const [revenueRes, refundsRes, payoutsRes] = await Promise.all([
    supabase
      .from(APPLICANTS_TABLE)
      .select("paid_amount_krw")
      .in("status", ["paid", "enrolled"]),
    supabase
      .from(APPLICANTS_TABLE)
      .select("paid_amount_krw")
      .eq("status", "refunded"),
    supabase
      .from(PAYOUTS_TABLE)
      .select("net_krw")
      .not("paid_at", "is", null),
  ]);

  if (revenueRes.error) {
    return { status: "error", error: revenueRes.error.message };
  }
  if (refundsRes.error) {
    return { status: "error", error: refundsRes.error.message };
  }
  if (payoutsRes.error) {
    return { status: "error", error: payoutsRes.error.message };
  }

  const revenueRows = (revenueRes.data ?? []) as Array<{
    paid_amount_krw: number | null;
  }>;
  const refundRows = (refundsRes.data ?? []) as Array<{
    paid_amount_krw: number | null;
  }>;
  const payoutRows = (payoutsRes.data ?? []) as Array<{
    net_krw: number | null;
  }>;

  const revenueTotal = revenueRows.reduce(
    (acc, r) => acc + (typeof r.paid_amount_krw === "number" ? r.paid_amount_krw : 0),
    0,
  );
  const refundTotal = refundRows.reduce(
    (acc, r) => acc + (typeof r.paid_amount_krw === "number" ? r.paid_amount_krw : 0),
    0,
  );
  const payoutTotal = payoutRows.reduce(
    (acc, r) => acc + (typeof r.net_krw === "number" ? r.net_krw : 0),
    0,
  );

  const marginKrw = revenueTotal - refundTotal - payoutTotal;
  const marginPercent =
    revenueTotal > 0
      ? Math.round((marginKrw / revenueTotal) * 1000) / 10
      : 0;

  return {
    status: "ok",
    kpi: {
      revenue: { count: revenueRows.length, totalKrw: revenueTotal },
      refunds: { count: refundRows.length, totalKrw: refundTotal },
      instructorPayouts: { count: payoutRows.length, totalKrw: payoutTotal },
      margin: { krw: marginKrw, percent: marginPercent },
    },
  };
}

/* ---------------------------------------------------------------------------
 * 2. exportFinanceCsv
 *
 * 회계사 공유용 단일 ledger CSV. 컬럼:
 *   일자, 분류, 식별자, 이름, 금액(KRW), 메모
 *
 * 부호 규칙: 매출 +, 환불 -, 강사료 - (회계사 손익 합계 자연 계산).
 *
 * row 순서: 일자 ASC. 일자 동률 시 매출 > 환불 > 강사료.
 *
 * BOM + CRLF + 한글 안전 escape 는 기존 csv.ts 패턴 재사용 (UI 측).
 * 본 함수는 raw text 만 반환 - Blob 변환은 클라이언트가 처리.
 * ------------------------------------------------------------------------- */
export async function exportFinanceCsv(): Promise<FinanceCsvResult> {
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const [applicantRes, payoutsRes] = await Promise.all([
    supabase
      .from(APPLICANTS_TABLE)
      .select(
        "id, name, paid_amount_krw, status, payment_confirmed_at, refunded_at, redacted_at",
      )
      .in("status", ["paid", "enrolled", "refunded"]),
    supabase
      .from(PAYOUTS_TABLE)
      .select(
        "id, instructor_id, cohort_label, base_fee_krw, tax_krw, net_krw, paid_at, tax_mode_snapshot, instructors(name)",
      )
      .not("paid_at", "is", null),
  ]);

  if (applicantRes.error) {
    return { status: "error", error: applicantRes.error.message };
  }
  if (payoutsRes.error) {
    return { status: "error", error: payoutsRes.error.message };
  }

  const ledger: FinanceLedgerRow[] = [];

  type ApplicantRowRaw = {
    id: string;
    name: string | null;
    paid_amount_krw: number | null;
    status: string;
    payment_confirmed_at: string | null;
    refunded_at: string | null;
    redacted_at: string | null;
  };
  for (const r of (applicantRes.data ?? []) as ApplicantRowRaw[]) {
    const amount = typeof r.paid_amount_krw === "number" ? r.paid_amount_krw : 0;
    if (amount === 0) continue; // 입금 미발생 row 는 ledger 제외.

    const label = r.redacted_at ? "[redacted]" : (r.name ?? "");

    if (r.status === "refunded") {
      const dateIso = r.refunded_at ?? r.payment_confirmed_at ?? "";
      ledger.push({
        date: toKstDate(dateIso),
        kind: "refund",
        refId: r.id,
        refLabel: label,
        amountKrw: -amount,
        notes: "환불",
      });
    } else {
      // paid 또는 enrolled.
      ledger.push({
        date: toKstDate(r.payment_confirmed_at ?? ""),
        kind: "revenue",
        refId: r.id,
        refLabel: label,
        amountKrw: amount,
        notes: r.status === "enrolled" ? "수강 확정" : "입금 확인",
      });
    }
  }

  type PayoutRowRaw = {
    id: string;
    instructor_id: string;
    cohort_label: string;
    net_krw: number;
    paid_at: string | null;
    tax_mode_snapshot: string;
    instructors: { name: string } | { name: string }[] | null;
  };
  for (const r of (payoutsRes.data ?? []) as PayoutRowRaw[]) {
    const instructorName = Array.isArray(r.instructors)
      ? (r.instructors[0]?.name ?? "")
      : (r.instructors?.name ?? "");
    ledger.push({
      date: toKstDate(r.paid_at ?? ""),
      kind: "instructor_payout",
      refId: r.instructor_id,
      refLabel: instructorName,
      amountKrw: -r.net_krw,
      notes: `${r.cohort_label} 강사료 (${
        r.tax_mode_snapshot === "withholding_3_3" ? "원천징수 3.3%" : "부가세 10%"
      })`,
    });
  }

  // 정렬: 일자 ASC → 분류 우선순위 (revenue < refund < instructor_payout).
  const kindOrder = { revenue: 0, refund: 1, instructor_payout: 2 } as const;
  ledger.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return kindOrder[a.kind] - kindOrder[b.kind];
  });

  const csv = ledgerToCsv(ledger);
  const filename = financeCsvFilename();

  return { status: "ok", csv, filename, rowCount: ledger.length };
}

/* ---------------------------------------------------------------------------
 * helpers
 * ------------------------------------------------------------------------- */

/** ISO timestamp → KST 'YYYY-MM-DD'. 빈 입력은 빈 문자열. */
function toKstDate(iso: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  // KST offset = UTC+9. 단순 +9h shift 후 ISO date 부분 추출.
  const shifted = new Date(ms + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

/** CSV escape - " 와 , 와 줄바꿈 포함 시 quote. */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

const LEDGER_COLUMNS: ReadonlyArray<{
  key: keyof FinanceLedgerRow;
  label: string;
}> = [
  { key: "date", label: "일자" },
  { key: "kind", label: "분류" },
  { key: "refId", label: "식별자" },
  { key: "refLabel", label: "이름" },
  { key: "amountKrw", label: "금액(KRW)" },
  { key: "notes", label: "메모" },
];

function ledgerToCsv(rows: FinanceLedgerRow[]): string {
  const header = LEDGER_COLUMNS.map((c) => csvEscape(c.label)).join(",");
  const body = rows
    .map((row) =>
      LEDGER_COLUMNS.map((c) => csvEscape(row[c.key] as unknown)).join(","),
    )
    .join("\r\n");
  // BOM (FEFF) - Excel 한글 깨짐 방지. body 가 비어도 헤더 + 줄바꿈.
  return `﻿${header}\r\n${body}${body ? "\r\n" : ""}`;
}

function financeCsvFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `finance-${y}${m}${d}-${hh}${mm}.csv`;
}
