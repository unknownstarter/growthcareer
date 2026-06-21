"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";
import {
  logBroadcastSend,
  markAsCancelled,
  markAsEnrolledBatch,
  markAsNotified,
  markAsOverdue,
  markAsPaid,
  markAsRefunded,
  markPiiAnonymizeBatch,
  recordCashReceipt,
  sendReminder,
} from "@/src/programs/fan-to-pro/application/admin-actions";
import { pollApplicants } from "@/src/programs/fan-to-pro/application/polling-actions";
import {
  APPLICANT_STATUSES,
  computeStats,
  getReminderUrgency,
  type AnonymizeEligibility,
  type ApplicantRow,
  type ApplicantStatus,
} from "../types";
import { StatusChip, STATUS_LABEL_KO, RedactedChip } from "./status-chip";
import { ToastProvider, useToast } from "./toast";
import { MessageDrawer } from "./message-drawer";
import {
  CancelDialog,
  EnrollBatchDialog,
  MarkPaidDialog,
  RefundDialog,
} from "./action-dialogs";
import { CashReceiptDrawer } from "./cash-receipt-drawer";
import { PiiAnonymizeDialog } from "./pii-anonymize-dialog";
import { BroadcastDialog } from "./broadcast-dialog";
import { MessagesHistoryDrawer } from "./messages-history-drawer";
import { downloadCsv } from "./csv";
import {
  formatPhoneForDisplay,
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
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-border bg-bg px-2.5 py-1.5 text-[10px] font-black uppercase text-fg hover:text-fg hover:border-fg-subtle disabled:opacity-40 whitespace-nowrap";

const compactStyle = { letterSpacing: "0.12em" } as const;

const accentBtn =
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-brand-pink/60 bg-brand-pink/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-brand-pink hover:bg-brand-pink/20 disabled:opacity-40 whitespace-nowrap";

export function ApplicantsDashboard({
  initialRows,
  anonymizeEligibility,
  supabaseAvailable,
  fetchError,
  readOnly = false,
}: {
  initialRows: ApplicantRow[];
  anonymizeEligibility: AnonymizeEligibility;
  supabaseAvailable: boolean;
  fetchError: string | null;
  readOnly?: boolean;
}) {
  return (
    <ToastProvider>
      <DashboardInner
        initialRows={initialRows}
        anonymizeEligibility={anonymizeEligibility}
        supabaseAvailable={supabaseAvailable}
        fetchError={fetchError}
        readOnly={readOnly}
      />
    </ToastProvider>
  );
}

function DashboardInner({
  initialRows,
  anonymizeEligibility,
  supabaseAvailable,
  fetchError,
  readOnly,
}: {
  initialRows: ApplicantRow[];
  anonymizeEligibility: AnonymizeEligibility;
  supabaseAvailable: boolean;
  fetchError: string | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();

  // 화면에 실제로 그려지는 라이브 상태. 사용자가 chip 을 명시적으로 클릭
  // (applyPending) 하거나 props 가 새로 내려올 때만 갱신. 30 초 폴링이
  // 도착해도 여기는 건드리지 않아서 다이얼로그 / 드로어 / 발송 모달이
  // 열려 있을 때 화면이 떨리지 않는다.
  const [rows, setRows] = useState<ApplicantRow[]>(initialRows);
  const [eligibility, setEligibility] = useState<AnonymizeEligibility>(
    anonymizeEligibility,
  );
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now());
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // 폴링 결과의 staging 영역. setRows 대신 여기에만 쓴다. diff 가 있으면
  // chip 으로 "N건 변경 / 새로고침" 알림. 사용자가 클릭 → rows 로 commit.
  // 다음 폴링에서도 계속 덮어쓰므로 항상 "최신" 스냅샷이 대기.
  const [pendingRows, setPendingRows] = useState<ApplicantRow[] | null>(null);
  const [pendingEligibility, setPendingEligibility] =
    useState<AnonymizeEligibility | null>(null);
  const [pendingFetchedAt, setPendingFetchedAt] = useState<number | null>(null);

  // server component 가 새 props 를 내려주면 (router.refresh / 첫 마운트 이후
  // navigation) 라이브 state 도 따라가야 함. mutation 직후엔 우리가 방금
  // 만든 변경이 최신이므로 pendingRows 도 함께 비워서 stale chip 방지.
  useEffect(() => {
    setRows(initialRows);
    setEligibility(anonymizeEligibility);
    setLastFetchedAt(Date.now());
    setPendingRows(null);
    setPendingEligibility(null);
    setPendingFetchedAt(null);
  }, [initialRows, anonymizeEligibility]);

  // 30 초 silent 폴링. 결과는 staging (pendingRows) 에만 저장하므로 화면은
  // 1px 도 흔들리지 않는다. cancel 패턴은 mount 해제 시 setState 차단.
  // mock 모드 / error / supabase 미가용 응답은 모두 silent 무시.
  useEffect(() => {
    if (!supabaseAvailable) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const result = await pollApplicants();
        if (cancelled) return;
        if (result.error || !result.supabaseAvailable) return;
        setPendingRows(result.rows);
        setPendingEligibility(result.eligibility);
        setPendingFetchedAt(Date.parse(result.fetchedAt));
      } catch {
        // network blip 등은 silent — 다음 tick 에 재시도.
      }
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [supabaseAvailable]);

  // "갱신 12s ago" chip 의 1 초 카운터. 별도 effect 라 폴링 사이클과 무관.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  // pendingRows ↔ rows diff. 4 종 변경 cnt 합산.
  // - 신규: pending 에는 있고 rows 에는 없는 id
  // - 상태 변경: id 일치 + status 다름
  // - PII 파기: id 일치 + 기존 redactedAt 없었는데 pending 에 새로 생김
  // - 정원 추적: eligibility.eligibleCount 변경
  const pendingDiff = useMemo(() => {
    if (!pendingRows || !pendingEligibility) {
      return { total: 0, added: 0, statusChanged: 0, redacted: 0, eligibilityChanged: false };
    }
    const currentById = new Map(rows.map((r) => [r.id, r]));
    let added = 0;
    let statusChanged = 0;
    let redacted = 0;
    for (const next of pendingRows) {
      const prev = currentById.get(next.id);
      if (!prev) {
        added += 1;
        continue;
      }
      if (prev.status !== next.status) statusChanged += 1;
      if (!prev.redactedAt && next.redactedAt) redacted += 1;
    }
    const eligibilityChanged =
      pendingEligibility.eligibleCount !== eligibility.eligibleCount;
    const total =
      added + statusChanged + redacted + (eligibilityChanged ? 1 : 0);
    return { total, added, statusChanged, redacted, eligibilityChanged };
  }, [rows, eligibility, pendingRows, pendingEligibility]);

  const hasPending = pendingDiff.total > 0;

  function applyPending() {
    if (!pendingRows || !pendingEligibility || pendingFetchedAt === null) return;
    setRows(pendingRows);
    setEligibility(pendingEligibility);
    setLastFetchedAt(pendingFetchedAt);
    setPendingRows(null);
    setPendingEligibility(null);
    setPendingFetchedAt(null);
  }

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
  // B0018 Wave 1 T2 / T3
  const [receiptTarget, setReceiptTarget] = useState<ApplicantRow | null>(null);
  const [receiptRefreshKey, setReceiptRefreshKey] = useState(0);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);

  // B0018 Wave 1 T4 - 다중 발송 + 발송 이력.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [historyApplicant, setHistoryApplicant] = useState<ApplicantRow | null>(
    null,
  );

  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => computeStats(rows), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = rows.filter((row) => {
      if (statusFilter.size > 0 && !statusFilter.has(row.status)) return false;
      if (q.length === 0) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        (row.nationality ?? "").toLowerCase().includes(q) ||
        (row.depositorNameObserved ?? "").toLowerCase().includes(q)
      );
    });
    // 정렬 우선순위:
    //  1) status 운영 우선순위 (pending 최상 → cancelled 최하)
    //  2) 같은 status 안에서는 시급도 (T+1 / D-3 / D-1 reminderUrgency) desc
    //  3) 그 다음 created_at desc
    //
    // status 순서는 운영자가 "다음에 무엇을 할지" 기준:
    //  pending (즉시 안내 발송 필요) → notified (catch-up) → overdue →
    //  paid (입금 확인) → enrolled (정원 확정) → refunded (환불 완료) →
    //  cancelled (취소, 시야에서 가장 멀리).
    const STATUS_ORDER: Record<ApplicantStatus, number> = {
      pending: 0,
      notified: 1,
      overdue: 2,
      paid: 3,
      enrolled: 4,
      refunded: 5,
      cancelled: 6,
      next_cohort_interest: 7,
    };
    const now = new Date();
    return [...items].sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 99;
      const sb = STATUS_ORDER[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      const ua = getReminderUrgency(a, now).rank;
      const ub = getReminderUrgency(b, now).rank;
      if (ua !== ub) return ub - ua;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [rows, query, statusFilter]);

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

  // B0018 Wave 1 T2 - 현금영수증 발급 기록.
  function runRecordCashReceipt(input: {
    amountKrw: number;
    hometaxReceiptNo?: string;
    issuedAt?: string;
    notes?: string;
  }) {
    if (!receiptTarget) return;
    startTransition(async () => {
      const result = await recordCashReceipt({
        id: receiptTarget.id,
        ...input,
      });
      if (result.status === "ok") {
        show("현금영수증 발급 기록을 저장했어요.", "success");
        setReceiptRefreshKey((k) => k + 1);
        refresh();
        return;
      }
      if (result.status === "stale") {
        show("이 신청자는 발급 대상이 아니에요 (입금 미확인 / 파기).", "info");
        return;
      }
      show(friendlyError(result.error), "error");
    });
  }

  // B0018 Wave 1 T3 - PII 일괄 anonymize.
  function runPiiAnonymize() {
    startTransition(async () => {
      const result = await markPiiAnonymizeBatch();
      if (result.status === "ok") {
        if (result.anonymizedCount > 0) {
          show(
            `${result.anonymizedCount}명의 개인정보를 파기했어요.`,
            "success",
          );
        } else {
          show(
            "처리할 대상이 없어요 (이미 모두 파기됐거나 미만료).",
            "info",
          );
        }
        setAnonymizeOpen(false);
        refresh();
        return;
      }
      show(friendlyError(result.error), "error");
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

  // B0018 Wave 1 T4 - 선택 helpers.
  // redacted_at IS NOT NULL row 는 체크 불가 (이메일 [redacted] = 발송 불가).
  const selectableFiltered = useMemo(
    () => filtered.filter((row) => !row.redactedAt),
    [filtered],
  );
  const masterChecked =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((row) => selectedIds.has(row.id));
  const masterIndeterminate =
    !masterChecked && selectableFiltered.some((row) => selectedIds.has(row.id));
  const selectedCount = selectedIds.size;

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMasterSelected() {
    if (masterChecked) {
      // 현재 필터된 row 만 해제 (다른 필터에서 선택된 id 는 보존).
      const filteredIds = new Set(selectableFiltered.map((r) => r.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of filteredIds) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const row of selectableFiltered) next.add(row.id);
        return next;
      });
    }
  }

  // B0018 Wave 1 T4 - 다중 발송 실행.
  // 메일 앱 열기 + server action 동시 호출. mailto: navigation 은 동기 트리거.
  function runBroadcast(input: {
    applicantIds: string[];
    subject: string;
    body: string;
    mailtoUrl: string;
  }) {
    startTransition(async () => {
      // 1) 메일 앱 즉시 실행. window.location.href 가 mailto: navigation 트리거.
      //    (a 태그 click 도 가능하지만 모달 안에서는 location 이 더 안정적.)
      try {
        window.location.href = input.mailtoUrl;
      } catch {
        // 일부 브라우저는 mailto: 지원 없으면 throw → 무시하고 audit row 는 기록.
      }

      // 2) 같은 transition 안에서 messages_log INSERT.
      const result = await logBroadcastSend({
        applicantIds: input.applicantIds,
        channel: "email",
        subject: input.subject,
        body: input.body,
      });

      if (result.status === "ok") {
        const skipNote =
          result.skippedCount > 0
            ? ` (제외 ${result.skippedCount}명: 파기된 PII)`
            : "";
        show(
          `${result.insertedCount}명에게 발송 준비 완료${skipNote}. 메일 앱에서 보내주세요.`,
          "success",
        );
        setBroadcastOpen(false);
        setSelectedIds(new Set());
        refresh();
        return;
      }
      show(friendlyError(result.error), "error");
    });
  }

  // 선택된 applicant 객체 배열 (broadcast 모달에 전달).
  const selectedApplicants = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-[44px] z-20 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className="border border-brand-pink bg-brand-pink/10 px-2 py-0.5 text-[10px] font-black uppercase text-brand-pink"
              style={{ letterSpacing: "0.2em" }}
            >
              ADMIN
            </span>
            <h1
              className="text-sm font-black text-fg sm:text-base lg:text-lg"
              style={{ letterSpacing: "-0.02em" }}
            >
              Fan to Pro 신청자
            </h1>
            {hasPending ? (
              <PendingChangesChip
                count={pendingDiff.total}
                added={pendingDiff.added}
                statusChanged={pendingDiff.statusChanged}
                redacted={pendingDiff.redacted}
                eligibilityChanged={pendingDiff.eligibilityChanged}
                onApply={applyPending}
              />
            ) : (
              <LastFetchedChip lastFetchedAt={lastFetchedAt} now={nowTick} />
            )}
          </div>
          {/* 모바일: 가로 스크롤 stats. 데스크탑: wrap. */}
          <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 text-[11px] text-fg sm:mx-0 sm:px-0 sm:pb-0 lg:flex-wrap lg:gap-2">
            <StatPill label="총" value={stats.total} tone="default" />
            <StatPill label="PENDING" value={stats.byStatus.pending} tone="pending" />
            <StatPill label="NOTIFIED" value={stats.byStatus.notified} tone="notified" />
            <StatPill label="PAID" value={stats.byStatus.paid} tone="paid" />
            <StatPill label="OVERDUE" value={stats.byStatus.overdue} tone="overdue" />
            <StatPill label="ENROLLED" value={stats.byStatus.enrolled} tone="enrolled" />
            <StatPill label="CANCELLED" value={stats.byStatus.cancelled} tone="cancelled" />
            <StatPill label="REFUNDED" value={stats.byStatus.refunded} tone="refunded" />
            {stats.reminderD1 > 0 ? (
              <StatPill label="D-1 리마인드" value={stats.reminderD1} tone="d1" pulse />
            ) : null}
            {stats.reminderD3 > 0 ? (
              <StatPill label="D-3 리마인드" value={stats.reminderD3} tone="d3" />
            ) : null}
            {stats.reminderT1 > 0 ? (
              <StatPill label="T+1 리마인드" value={stats.reminderT1} tone="t1" />
            ) : null}
            {/* B0018 T3 - 종강 6개월 경과 PII 파기 버튼 */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setAnonymizeOpen(true)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-black uppercase whitespace-nowrap",
                  eligibility.eligibleCount > 0
                    ? "border-red-500/60 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                    : "border-border bg-bg text-fg/80 hover:text-fg",
                )}
                style={{ letterSpacing: "0.15em" }}
                title="PIPA §21 - 종강 +6개월 경과 신청자의 개인정보 파기"
                disabled={isPending}
              >
                <span>PII 파기</span>
                <span className="text-fg">
                  {eligibility.eligibleCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
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
        <div className="flex flex-col gap-3 border border-border bg-surface/60 p-2.5 sm:p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <input
              type="search"
              placeholder="이름 / 이메일 / 연락처 / 입금자명"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-brand-pink lg:max-w-sm"
              aria-label="신청자 검색"
            />
            {/* 모바일: 가로 스크롤. 데스크탑 lg 이상: wrap. */}
            <div
              className="-mx-2.5 flex gap-1 overflow-x-auto px-2.5 pb-0.5 sm:-mx-3 sm:px-3 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0"
              role="group"
              aria-label="상태 필터"
            >
              {APPLICANT_STATUSES.map((s) => {
                const active = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleStatusFilter(s)}
                    className={cn(
                      "shrink-0 border px-2 py-1 text-[10px] font-black uppercase whitespace-nowrap transition-colors",
                      active
                        ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
                        : "border-border bg-bg text-fg hover:text-fg",
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
                  className="shrink-0 border border-border bg-bg px-2 py-1 text-[10px] font-black uppercase whitespace-nowrap text-fg/80 hover:text-fg"
                  style={{ letterSpacing: "0.15em" }}
                >
                  reset
                </button>
              ) : null}
            </div>
          </div>
          {/* 모바일: 가로 스크롤 액션 bar. */}
          <div className="-mx-2.5 flex items-center gap-2 overflow-x-auto px-2.5 pb-0.5 sm:-mx-3 sm:px-3 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0">
            {!readOnly && selectedCount > 0 ? (
              <>
                <span
                  className="inline-flex items-center gap-1.5 border border-brand-pink/60 bg-brand-pink/10 px-2 py-1 text-[10px] font-black uppercase text-brand-pink"
                  style={{ letterSpacing: "0.15em" }}
                  role="status"
                  aria-live="polite"
                >
                  <span>선택</span>
                  <span className="text-fg">{selectedCount}명</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className={compactBtn}
                  style={compactStyle}
                >
                  선택 해제
                </button>
              </>
            ) : null}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setBroadcastOpen(true)}
                className={accentBtn}
                style={compactStyle}
                disabled={selectedCount === 0 || isPending}
                title="이메일 BCC 일괄 발송"
              >
                다중 발송 ({selectedCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className={compactBtn}
              style={compactStyle}
              disabled={filtered.length === 0}
            >
              CSV 내려받기 ({filtered.length})
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setEnrollBatchOpen(true)}
                className={accentBtn}
                style={compactStyle}
                disabled={stats.byStatus.paid === 0}
              >
                강좌 확정 일괄
              </button>
            )}
          </div>
        </div>

        {/* Table (desktop) */}
        <div className="hidden border border-border md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-[10px] uppercase text-fg">
              <tr style={{ letterSpacing: "0.2em" }}>
                {!readOnly && (
                  <th className="px-2 py-2 font-black w-8">
                    <input
                      type="checkbox"
                      aria-label={
                        masterChecked
                          ? "전체 선택 해제"
                          : "현재 필터의 신청자 전체 선택"
                      }
                      checked={masterChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = masterIndeterminate;
                      }}
                      onChange={toggleMasterSelected}
                      disabled={selectableFiltered.length === 0}
                      className="h-4 w-4 cursor-pointer accent-brand-pink"
                    />
                  </th>
                )}
                <th className="px-3 py-2 font-black">신청일</th>
                <th className="px-3 py-2 font-black">이름</th>
                <th className="px-3 py-2 font-black">연락처</th>
                <th className="px-3 py-2 font-black">이메일</th>
                <th className="px-3 py-2 font-black">국적</th>
                <th className="px-3 py-2 font-black">비자</th>
                <th className="px-3 py-2 font-black">상태</th>
                <th className="px-3 py-2 font-black">발송</th>
                <th className="px-3 py-2 font-black">리마인드</th>
                <th className="px-3 py-2 font-black">입금</th>
                {!readOnly && <th className="px-3 py-2 font-black">액션</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={readOnly ? 10 : 12}
                    className="px-3 py-12 text-center text-xs text-fg/80"
                  >
                    표시할 신청자가 없어요.
                  </td>
                </tr>
              ) : null}
              {filtered.map((row) => {
                const urgency = getReminderUrgency(row);
                const tint = URGENCY_TINT[urgency.level];
                const checked = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border border-l-4 text-xs hover:bg-surface-elevated/40",
                      tint.border,
                      tint.bg,
                      checked && "bg-brand-pink/[0.05]",
                    )}
                  >
                    {!readOnly && (
                      <td className="px-2 py-2 align-top">
                        <input
                          type="checkbox"
                          aria-label={
                            row.redactedAt
                              ? `${row.name} 선택 불가 (PII 파기)`
                              : `${row.name} 선택`
                          }
                          checked={checked}
                          onChange={() => toggleRowSelected(row.id)}
                          disabled={row.redactedAt !== null}
                          className="h-4 w-4 cursor-pointer accent-brand-pink disabled:cursor-not-allowed disabled:opacity-30"
                        />
                      </td>
                    )}
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
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
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {formatPhoneForDisplay(row.phone, row.nationality)}
                    </td>
                    <td className="px-3 py-2 align-top text-fg break-all">
                      {row.email}
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.nationality ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.visa ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        <StatusChip status={row.status} />
                        {row.redactedAt ? <RedactedChip /> : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.notifiedAt ? formatDate(row.notifiedAt) : "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.reminderCount > 0
                        ? `${row.reminderCount}회${row.lastReminderAt ? ` (${formatDate(row.lastReminderAt)})` : ""}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.paymentConfirmedAt
                        ? `${formatDate(row.paymentConfirmedAt)}${row.paidAmountKrw ? ` / ${row.paidAmountKrw.toLocaleString()}원` : ""}`
                        : "-"}
                    </td>
                    {!readOnly && (
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
                          onReceipt={() => {
                            setReceiptRefreshKey((k) => k + 1);
                            setReceiptTarget(row);
                          }}
                          onHistory={() => setHistoryApplicant(row)}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="flex flex-col gap-2 md:hidden">
          {filtered.length === 0 ? (
            <div className="border border-border bg-surface/60 px-3 py-12 text-center text-xs text-fg/80">
              표시할 신청자가 없어요.
            </div>
          ) : null}
          {filtered.map((row) => {
            const urgency = getReminderUrgency(row);
            const tint = URGENCY_TINT[urgency.level];
            const checked = selectedIds.has(row.id);
            return (
              <article
                key={row.id}
                className={cn(
                  "border border-border border-l-4 bg-surface/60 p-3 text-xs",
                  tint.border,
                  tint.bg,
                  checked && "bg-brand-pink/[0.05]",
                )}
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    {!readOnly && (
                      <input
                        type="checkbox"
                        aria-label={
                          row.redactedAt
                            ? `${row.name} 선택 불가 (PII 파기)`
                            : `${row.name} 선택`
                        }
                        checked={checked}
                        onChange={() => toggleRowSelected(row.id)}
                        disabled={row.redactedAt !== null}
                        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-brand-pink disabled:cursor-not-allowed disabled:opacity-30"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-fg">{row.name}</span>
                        {tint.label ? (
                          <span
                            className={cn(
                              "border border-current px-1 py-0.5 text-[9px] font-black",
                              urgency.level === "d1" && "text-red-300",
                              urgency.level === "d3" && "text-orange-300",
                              urgency.level === "t1" && "text-amber-300",
                            )}
                            style={{ letterSpacing: "0.15em" }}
                          >
                            {tint.label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 break-all text-fg/90">{row.email}</div>
                      <div className="text-fg/90">
                        {formatPhoneForDisplay(row.phone, row.nationality)}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusChip status={row.status} />
                    {row.redactedAt ? <RedactedChip /> : null}
                  </div>
                </header>
                <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-fg/70">
                  <dt>신청일</dt>
                  <dd className="text-fg">{formatDate(row.createdAt)}</dd>
                  <dt>국적 / 비자</dt>
                  <dd className="text-fg">
                    {row.nationality ?? "-"}
                    {row.visa ? ` / ${row.visa}` : ""}
                  </dd>
                  <dt>발송 / 리마인드</dt>
                  <dd className="text-fg">
                    {row.notifiedAt ? formatDate(row.notifiedAt) : "-"}
                    {row.reminderCount > 0 ? ` / ${row.reminderCount}회` : ""}
                  </dd>
                  <dt>입금</dt>
                  <dd className="text-fg">
                    {row.paymentConfirmedAt
                      ? `${formatDate(row.paymentConfirmedAt)}${row.paidAmountKrw ? ` / ${row.paidAmountKrw.toLocaleString()}원` : ""}`
                      : "-"}
                  </dd>
                </dl>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
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
                      onReceipt={() => {
                        setReceiptRefreshKey((k) => k + 1);
                        setReceiptTarget(row);
                      }}
                      onHistory={() => setHistoryApplicant(row)}
                    />
                  </div>
                )}
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
      {receiptTarget ? (
        <CashReceiptDrawer
          open
          busy={isPending}
          applicant={receiptTarget}
          refreshKey={receiptRefreshKey}
          onClose={() => setReceiptTarget(null)}
          onSubmit={runRecordCashReceipt}
        />
      ) : null}
      <PiiAnonymizeDialog
        open={anonymizeOpen}
        busy={isPending}
        eligibleCount={eligibility.eligibleCount}
        onClose={() => setAnonymizeOpen(false)}
        onConfirm={runPiiAnonymize}
      />
      {/* B0018 Wave 1 T4 - 다중 발송 + 발송 이력 */}
      <BroadcastDialog
        open={broadcastOpen}
        busy={isPending}
        applicants={selectedApplicants}
        onClose={() => setBroadcastOpen(false)}
        onSend={runBroadcast}
      />
      <MessagesHistoryDrawer
        open={historyApplicant !== null}
        applicant={historyApplicant}
        onClose={() => setHistoryApplicant(null)}
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
  onReceipt,
  onHistory,
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
  onReceipt: () => void;
  onHistory: () => void;
}) {
  // PII 파기된 row 는 발송/연락 액션이 무의미 → 메시지 버튼 숨김.
  // 거래 처리 액션 (취소/환불/현금영수증 기록) 은 회계 무결성 위해 유지.
  const redacted = row.redactedAt !== null;
  const receiptEligible =
    !redacted &&
    (row.status === "paid" ||
      row.status === "enrolled" ||
      row.status === "refunded");

  return (
    <div className="flex flex-wrap gap-1">
      {redacted ? null : (
        <button
          type="button"
          onClick={onMessage}
          className={accentBtn}
          style={compactStyle}
          disabled={busy}
        >
          메시지
        </button>
      )}
      {row.messageCount > 0 ? (
        <button
          type="button"
          onClick={onHistory}
          className={compactBtn}
          style={compactStyle}
          disabled={busy}
          title={`발송 이력 ${row.messageCount}건`}
        >
          발송
          <span className="ml-1 text-fg">{row.messageCount}</span>
        </button>
      ) : null}
      {receiptEligible ? (
        <button
          type="button"
          onClick={onReceipt}
          className={compactBtn}
          style={compactStyle}
          disabled={busy}
          title={
            row.cashReceiptCount > 0
              ? `현금영수증 발급 ${row.cashReceiptCount}건`
              : "현금영수증 발급 기록"
          }
        >
          현금영수증
          {row.cashReceiptCount > 0 ? (
            <span className="ml-1 text-fg">{row.cashReceiptCount}</span>
          ) : null}
        </button>
      ) : null}
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

function PendingChangesChip({
  count,
  added,
  statusChanged,
  redacted,
  eligibilityChanged,
  onApply,
}: {
  count: number;
  added: number;
  statusChanged: number;
  redacted: number;
  eligibilityChanged: boolean;
  onApply: () => void;
}) {
  // hover / 접근성 — 변경 종류별 breakdown 을 title 에 노출.
  // 카피: "새 변경 N건 / 새로고침". 핑크 + pulse 로 주목.
  const parts: string[] = [];
  if (added > 0) parts.push(`신규 ${added}`);
  if (statusChanged > 0) parts.push(`상태 ${statusChanged}`);
  if (redacted > 0) parts.push(`파기 ${redacted}`);
  if (eligibilityChanged) parts.push(`PII 파기 대상 변경`);
  const title = parts.length > 0 ? parts.join(" / ") : "변경 사항";
  return (
    <button
      type="button"
      onClick={onApply}
      className="inline-flex items-center gap-1.5 border border-brand-pink bg-brand-pink/15 px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap text-brand-pink hover:bg-brand-pink/25 animate-pulse"
      style={{ letterSpacing: "0.15em" }}
      title={title}
      aria-live="polite"
    >
      <span>새 변경</span>
      <span className="text-fg">{count}건</span>
      <span className="opacity-70">/ 새로고침</span>
    </button>
  );
}

function LastFetchedChip({
  lastFetchedAt,
  now,
}: {
  lastFetchedAt: number;
  now: number;
}) {
  // "갱신 12s" / "갱신 1m 23s" 식. 30 s 폴링이라 보통 30 s 이내 머무름.
  // 60 s 넘어가면 폴링 실패 의심 → tone 변경으로 시각화.
  const elapsedSec = Math.max(0, Math.floor((now - lastFetchedAt) / 1000));
  const stale = elapsedSec >= 60;
  const label =
    elapsedSec < 60
      ? `${elapsedSec}s`
      : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        stale
          ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
          : "border-border bg-bg text-fg/80",
      )}
      style={{ letterSpacing: "0.15em" }}
      title={`마지막 갱신: ${new Date(lastFetchedAt).toLocaleTimeString("ko-KR")}`}
      aria-live="polite"
    >
      <span>갱신</span>
      <span className="text-fg">{label}</span>
    </span>
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
    | "overdue"
    | "enrolled"
    | "cancelled"
    | "refunded"
    | "t1"
    | "d3"
    | "d1";
  pulse?: boolean;
}) {
  const toneClass = {
    default: "border-border bg-bg text-fg",
    pending: "border-fg-subtle/40 bg-fg-subtle/10 text-fg",
    notified: "border-blue-400/60 bg-blue-500/15 text-blue-200",
    paid: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
    overdue: "border-amber-500/60 bg-amber-500/15 text-amber-200",
    enrolled: "border-brand-pink bg-brand-pink/20 text-brand-pink",
    cancelled: "border-zinc-600/60 bg-zinc-700/30 text-zinc-300",
    refunded: "border-violet-400/60 bg-violet-500/15 text-violet-200",
    t1: "border-amber-400/60 bg-amber-500/15 text-amber-200",
    d3: "border-orange-500/60 bg-orange-500/15 text-orange-200",
    d1: "border-red-500/70 bg-red-500/20 text-red-200",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-black uppercase whitespace-nowrap",
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
    case "applicantRedacted":
      return "이미 PII 가 파기된 신청자에게는 이 액션을 실행할 수 없어요.";
    default:
      return `오류가 발생했어요: ${key}`;
  }
}
