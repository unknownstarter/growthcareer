"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import {
  markAsCancelled,
  markAsEnrolledBatch,
  markAsNotified,
  markAsOverdue,
  markAsPaid,
  markAsRefunded,
  sendReminder,
} from "@/src/programs/fan-to-pro/application/admin-actions";
import {
  APPLICANT_STATUSES,
  computeStats,
  getReminderUrgency,
  type ApplicantRow,
  type ApplicantStatus,
} from "../types";
import { StatusChip, STATUS_LABEL_KO } from "./status-chip";
import { ToastProvider, useToast } from "./toast";
import { MessageDrawer } from "./message-drawer";
import {
  CancelDialog,
  EnrollBatchDialog,
  MarkPaidDialog,
  RefundDialog,
} from "./action-dialogs";
import { downloadCsv } from "./csv";
import {
  MESSAGE_KIND_LABELS,
  type MessageChannel,
  type MessageKind,
} from "@/src/programs/fan-to-pro/messages/templates";

const URGENCY_TINT: Record<
  "none" | "t1" | "d3" | "d1",
  { border: string; bg: string; label?: string }
> = {
  none: { border: "border-l-transparent", bg: "" },
  t1: {
    border: "border-l-amber-400",
    bg: "bg-amber-500/[0.04]",
    label: "T+1",
  },
  d3: {
    border: "border-l-orange-500",
    bg: "bg-orange-500/[0.06]",
    label: "D-3",
  },
  d1: {
    border: "border-l-red-500",
    bg: "bg-red-500/[0.08]",
    label: "D-1",
  },
};

const compactBtn =
  "inline-flex items-center justify-center border border-border bg-bg px-2.5 py-1.5 text-[10px] font-black uppercase text-fg-muted hover:text-fg hover:border-fg-subtle disabled:opacity-40 whitespace-nowrap";

const compactStyle = { letterSpacing: "0.12em" } as const;

const accentBtn =
  "inline-flex items-center justify-center border border-brand-pink/60 bg-brand-pink/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-brand-pink hover:bg-brand-pink/20 disabled:opacity-40 whitespace-nowrap";

export function ApplicantsDashboard({
  initialRows,
  supabaseAvailable,
  fetchError,
}: {
  initialRows: ApplicantRow[];
  supabaseAvailable: boolean;
  fetchError: string | null;
}) {
  return (
    <ToastProvider>
      <DashboardInner
        initialRows={initialRows}
        supabaseAvailable={supabaseAvailable}
        fetchError={fetchError}
      />
    </ToastProvider>
  );
}

function DashboardInner({
  initialRows,
  supabaseAvailable,
  fetchError,
}: {
  initialRows: ApplicantRow[];
  supabaseAvailable: boolean;
  fetchError: string | null;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<ApplicantStatus>>(
    new Set(),
  );

  const [drawerApplicant, setDrawerApplicant] = useState<ApplicantRow | null>(
    null,
  );
  const [paidTarget, setPaidTarget] = useState<ApplicantRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ApplicantRow | null>(null);
  const [refundTarget, setRefundTarget] = useState<ApplicantRow | null>(null);
  const [enrollBatchOpen, setEnrollBatchOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => computeStats(initialRows), [initialRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = initialRows.filter((row) => {
      if (statusFilter.size > 0 && !statusFilter.has(row.status)) return false;
      if (q.length === 0) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        (row.depositorNameObserved ?? "").toLowerCase().includes(q)
      );
    });
    // 시급도 우선 정렬 → 그 다음 created_at desc
    const now = new Date();
    return [...items].sort((a, b) => {
      const ua = getReminderUrgency(a, now).rank;
      const ub = getReminderUrgency(b, now).rank;
      if (ua !== ub) return ub - ua;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [initialRows, query, statusFilter]);

  function refresh() {
    router.refresh();
  }

  function handleResult(
    result: { status: "ok" } | { status: "stale"; error: string } | { status: "error"; error: string },
    onOk: string,
  ) {
    if (result.status === "ok") {
      show(onOk, "success");
      refresh();
      return;
    }
    if (result.status === "stale") {
      show("다른 곳에서 이미 변경됐어요. 새로고침할게요.", "info");
      refresh();
      return;
    }
    const msg = friendlyError(result.error);
    show(msg, "error");
  }

  function runNotify(row: ApplicantRow) {
    startTransition(async () => {
      const result = await markAsNotified({ id: row.id });
      handleResult(result, "발송 완료로 표시했어요.");
    });
  }

  function runReminder(row: ApplicantRow) {
    startTransition(async () => {
      const result = await sendReminder({ id: row.id });
      handleResult(result, "리마인드 발송 카운트를 올렸어요.");
    });
  }

  function runOverdue(row: ApplicantRow) {
    startTransition(async () => {
      const result = await markAsOverdue({ id: row.id });
      handleResult(result, "마감 초과로 표시했어요.");
    });
  }

  function runMarkPaid(input: { amountKrw: number; depositorName: string }) {
    if (!paidTarget) return;
    startTransition(async () => {
      const result = await markAsPaid({ id: paidTarget.id, ...input });
      handleResult(result, "입금 확인 처리했어요.");
      setPaidTarget(null);
    });
  }

  function runCancel(input: { reason: string }) {
    if (!cancelTarget) return;
    startTransition(async () => {
      const result = await markAsCancelled({
        id: cancelTarget.id,
        reason: input.reason,
      });
      handleResult(result, "취소 처리했어요.");
      setCancelTarget(null);
    });
  }

  function runRefund(input: { txnId: string }) {
    if (!refundTarget) return;
    startTransition(async () => {
      const result = await markAsRefunded({
        id: refundTarget.id,
        txnId: input.txnId,
      });
      handleResult(result, "환불 완료 처리했어요.");
      setRefundTarget(null);
    });
  }

  function runEnrollBatch() {
    startTransition(async () => {
      const result = await markAsEnrolledBatch();
      if (result.status === "ok") {
        const verb = result.outcome === "enrolled" ? "enrolled" : "cancelled";
        show(
          `${result.counts.affected}건이 ${verb} 로 전환됐어요 (정원 ${result.counts.threshold}).`,
          "success",
        );
        setEnrollBatchOpen(false);
        refresh();
        return;
      }
      show(friendlyError(result.error), "error");
    });
  }

  function handleCopied(kind: MessageKind, channel: MessageChannel) {
    show(
      `${MESSAGE_KIND_LABELS[kind]} (${channel === "email" ? "이메일" : "카톡/SMS"}) 복사했어요.`,
      "success",
    );
  }

  function toggleStatusFilter(status: ApplicantStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
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
              Fan to Pro 신청자
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-fg-muted">
            <StatPill label="총" value={stats.total} tone="default" />
            <StatPill label="PENDING" value={stats.byStatus.pending} tone="pending" />
            <StatPill label="NOTIFIED" value={stats.byStatus.notified} tone="notified" />
            <StatPill label="PAID" value={stats.byStatus.paid} tone="paid" />
            <StatPill label="ENROLLED" value={stats.byStatus.enrolled} tone="enrolled" />
            {stats.reminderD1 > 0 ? (
              <StatPill label="D-1 리마인드" value={stats.reminderD1} tone="d1" pulse />
            ) : null}
            {stats.reminderD3 > 0 ? (
              <StatPill label="D-3 리마인드" value={stats.reminderD3} tone="d3" />
            ) : null}
            {stats.reminderT1 > 0 ? (
              <StatPill label="T+1 리마인드" value={stats.reminderT1} tone="t1" />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-4 px-4 py-4">
        {/* Warning bar */}
        {!supabaseAvailable ? (
          <div className="border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Supabase 자격이 환경에 없어 mock 모드. 실제 신청자는 표시되지 않아요.
            ADMIN_BASIC_AUTH_* / NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 확인.
          </div>
        ) : null}
        {fetchError ? (
          <div className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
            데이터 로드 오류: {fetchError}
          </div>
        ) : null}

        {/* Filter + actions row */}
        <div className="flex flex-col gap-3 border border-border bg-surface/60 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="이름 / 이메일 / 연락처 / 입금자명 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink sm:max-w-sm"
              aria-label="신청자 검색"
            />
            <div className="flex flex-wrap gap-1" role="group" aria-label="상태 필터">
              {APPLICANT_STATUSES.map((s) => {
                const active = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStatusFilter(s)}
                    className={cn(
                      "border px-2 py-1 text-[10px] font-black uppercase transition-colors",
                      active
                        ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                        : "border-border bg-bg text-fg-muted hover:text-fg",
                    )}
                    style={{ letterSpacing: "0.15em" }}
                    title={STATUS_LABEL_KO[s]}
                  >
                    {s}
                  </button>
                );
              })}
              {statusFilter.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter(new Set())}
                  className="border border-border bg-bg px-2 py-1 text-[10px] font-black uppercase text-fg-subtle hover:text-fg"
                  style={{ letterSpacing: "0.15em" }}
                >
                  reset
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className={compactBtn}
              style={compactStyle}
              disabled={filtered.length === 0}
            >
              CSV 내려받기 ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setEnrollBatchOpen(true)}
              className={accentBtn}
              style={compactStyle}
              disabled={stats.byStatus.paid === 0}
            >
              강좌 확정 일괄
            </button>
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden border border-border md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-[10px] uppercase text-fg-subtle">
              <tr style={{ letterSpacing: "0.2em" }}>
                <th className="px-3 py-2 font-black">신청일</th>
                <th className="px-3 py-2 font-black">이름</th>
                <th className="px-3 py-2 font-black">연락처</th>
                <th className="px-3 py-2 font-black">이메일</th>
                <th className="px-3 py-2 font-black">비자</th>
                <th className="px-3 py-2 font-black">상태</th>
                <th className="px-3 py-2 font-black">발송</th>
                <th className="px-3 py-2 font-black">리마인드</th>
                <th className="px-3 py-2 font-black">입금</th>
                <th className="px-3 py-2 font-black">액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-12 text-center text-xs text-fg-subtle"
                  >
                    표시할 신청자가 없어요.
                  </td>
                </tr>
              ) : null}
              {filtered.map((row) => {
                const urgency = getReminderUrgency(row);
                const tint = URGENCY_TINT[urgency.level];
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border border-l-4 text-xs hover:bg-surface-elevated/40",
                      tint.border,
                      tint.bg,
                    )}
                  >
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top text-fg font-bold">
                      {row.name}
                      {tint.label ? (
                        <span
                          className="ml-1.5 inline-block border border-current px-1 py-0.5 text-[9px] font-black"
                          style={{ letterSpacing: "0.15em" }}
                        >
                          {tint.label}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {row.phone}
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted break-all">
                      {row.email}
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {row.visa ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusChip status={row.status} />
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {row.notifiedAt ? formatDate(row.notifiedAt) : "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {row.reminderCount > 0
                        ? `${row.reminderCount}회${row.lastReminderAt ? ` (${formatDate(row.lastReminderAt)})` : ""}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg-muted whitespace-nowrap">
                      {row.paymentConfirmedAt
                        ? `${formatDate(row.paymentConfirmedAt)}${row.paidAmountKrw ? ` / ${row.paidAmountKrw.toLocaleString()}원` : ""}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <RowActions
                        row={row}
                        busy={isPending}
                        onMessage={() => setDrawerApplicant(row)}
                        onNotify={() => runNotify(row)}
                        onReminder={() => runReminder(row)}
                        onOverdue={() => runOverdue(row)}
                        onPaid={() => setPaidTarget(row)}
                        onCancel={() => setCancelTarget(row)}
                        onRefund={() => setRefundTarget(row)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="flex flex-col gap-2 md:hidden">
          {filtered.length === 0 ? (
            <div className="border border-border bg-surface/60 px-3 py-12 text-center text-xs text-fg-subtle">
              표시할 신청자가 없어요.
            </div>
          ) : null}
          {filtered.map((row) => {
            const urgency = getReminderUrgency(row);
            const tint = URGENCY_TINT[urgency.level];
            return (
              <article
                key={row.id}
                className={cn(
                  "border border-border border-l-4 bg-surface/60 p-3 text-xs",
                  tint.border,
                  tint.bg,
                )}
              >
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-fg">{row.name}</div>
                    <div className="text-fg-muted">{row.email}</div>
                    <div className="text-fg-muted">{row.phone}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusChip status={row.status} />
                    {tint.label ? (
                      <span
                        className="border border-current px-1 py-0.5 text-[9px] font-black"
                        style={{ letterSpacing: "0.15em" }}
                      >
                        {tint.label}
                      </span>
                    ) : null}
                  </div>
                </header>
                <dl className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-fg-subtle">
                  <dt>신청일</dt>
                  <dd className="text-fg-muted">{formatDate(row.createdAt)}</dd>
                  <dt>비자</dt>
                  <dd className="text-fg-muted">{row.visa ?? "-"}</dd>
                  <dt>발송</dt>
                  <dd className="text-fg-muted">
                    {row.notifiedAt ? formatDate(row.notifiedAt) : "-"}
                  </dd>
                  <dt>리마인드</dt>
                  <dd className="text-fg-muted">{row.reminderCount}회</dd>
                  <dt>입금</dt>
                  <dd className="text-fg-muted">
                    {row.paymentConfirmedAt
                      ? `${formatDate(row.paymentConfirmedAt)}${row.paidAmountKrw ? ` / ${row.paidAmountKrw.toLocaleString()}원` : ""}`
                      : "-"}
                  </dd>
                </dl>
                <div className="mt-2 flex flex-wrap gap-1">
                  <RowActions
                    row={row}
                    busy={isPending}
                    onMessage={() => setDrawerApplicant(row)}
                    onNotify={() => runNotify(row)}
                    onReminder={() => runReminder(row)}
                    onOverdue={() => runOverdue(row)}
                    onPaid={() => setPaidTarget(row)}
                    onCancel={() => setCancelTarget(row)}
                    onRefund={() => setRefundTarget(row)}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </main>

      {/* Drawer + modals */}
      <MessageDrawer
        open={drawerApplicant !== null}
        applicant={drawerApplicant}
        onClose={() => setDrawerApplicant(null)}
        onCopied={handleCopied}
      />
      {paidTarget ? (
        <MarkPaidDialog
          open
          busy={isPending}
          applicant={paidTarget}
          onClose={() => setPaidTarget(null)}
          onSubmit={runMarkPaid}
        />
      ) : null}
      {cancelTarget ? (
        <CancelDialog
          open
          busy={isPending}
          applicant={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onSubmit={runCancel}
        />
      ) : null}
      {refundTarget ? (
        <RefundDialog
          open
          busy={isPending}
          applicant={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSubmit={runRefund}
        />
      ) : null}
      <EnrollBatchDialog
        open={enrollBatchOpen}
        busy={isPending}
        paidCount={stats.byStatus.paid}
        threshold={20}
        onClose={() => setEnrollBatchOpen(false)}
        onSubmit={runEnrollBatch}
      />
    </div>
  );
}

function RowActions({
  row,
  busy,
  onMessage,
  onNotify,
  onReminder,
  onOverdue,
  onPaid,
  onCancel,
  onRefund,
}: {
  row: ApplicantRow;
  busy: boolean;
  onMessage: () => void;
  onNotify: () => void;
  onReminder: () => void;
  onOverdue: () => void;
  onPaid: () => void;
  onCancel: () => void;
  onRefund: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        onClick={onMessage}
        className={accentBtn}
        style={compactStyle}
        disabled={busy}
      >
        메시지
      </button>
      {row.status === "pending" ? (
        <button
          type="button"
          onClick={onNotify}
          className={compactBtn}
          style={compactStyle}
          disabled={busy}
        >
          발송 완료
        </button>
      ) : null}
      {row.status === "notified" ? (
        <>
          <button
            type="button"
            onClick={onReminder}
            className={compactBtn}
            style={compactStyle}
            disabled={busy}
          >
            리마인드 +1
          </button>
          <button
            type="button"
            onClick={onPaid}
            className={compactBtn}
            style={compactStyle}
            disabled={busy}
          >
            입금 확인
          </button>
          <button
            type="button"
            onClick={onOverdue}
            className={compactBtn}
            style={compactStyle}
            disabled={busy}
          >
            마감 초과
          </button>
        </>
      ) : null}
      {(row.status === "pending" ||
        row.status === "notified" ||
        row.status === "paid" ||
        row.status === "overdue") && (
        <button
          type="button"
          onClick={onCancel}
          className={compactBtn}
          style={compactStyle}
          disabled={busy}
        >
          취소
        </button>
      )}
      {(row.status === "paid" || row.status === "cancelled") && (
        <button
          type="button"
          onClick={onRefund}
          className={compactBtn}
          style={compactStyle}
          disabled={busy}
        >
          환불 완료
        </button>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
  pulse = false,
}: {
  label: string;
  value: number;
  tone:
    | "default"
    | "pending"
    | "notified"
    | "paid"
    | "enrolled"
    | "t1"
    | "d3"
    | "d1";
  pulse?: boolean;
}) {
  const toneClass = {
    default: "border-border bg-bg text-fg-muted",
    pending: "border-fg-subtle/40 bg-fg-subtle/10 text-fg-muted",
    notified: "border-blue-400/60 bg-blue-500/15 text-blue-200",
    paid: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
    enrolled: "border-brand-pink bg-brand-pink/20 text-brand-pink",
    t1: "border-amber-400/60 bg-amber-500/15 text-amber-200",
    d3: "border-orange-500/60 bg-orange-500/15 text-orange-200",
    d1: "border-red-500/70 bg-red-500/20 text-red-200",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] font-black uppercase",
        toneClass,
        pulse && "animate-pulse",
      )}
      style={{ letterSpacing: "0.15em" }}
    >
      <span>{label}</span>
      <span className="text-fg">{value}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear() - 2000}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function friendlyError(key: string): string {
  switch (key) {
    case "supabaseUnavailable":
      return "DB 자격이 없어요. 환경 변수를 확인해 주세요.";
    case "invalidInput":
      return "입력 값이 올바르지 않아요.";
    case "staleStatus":
      return "다른 곳에서 이미 변경됐어요.";
    default:
      return `오류가 발생했어요: ${key}`;
  }
}
