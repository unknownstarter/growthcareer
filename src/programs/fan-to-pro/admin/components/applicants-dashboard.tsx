"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/src/shared/ui/cn";
import {
  logBroadcastSend,
  logIndividualSend,
  markAsCancelled,
  markAsConfirmationNotice,
  setApplicantStatus,
  markAsEnrolledBatch,
  markAsNotified,
  markAsOverdue,
  markAsPaid,
  markAsRefunded,
  markPiiAnonymizeBatch,
  recordCashReceipt,
  sendReminder,
  toggleApplicantMilestone,
} from "@/src/programs/fan-to-pro/application/admin-actions";
import type { BatchEnrollResult } from "@/src/programs/fan-to-pro/domain/application";
import { pollApplicants } from "@/src/programs/fan-to-pro/application/polling-actions";
import type { ApplicantView } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/applicant-repository";
import { resolveReferrersForCodes } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-referral-actions";
import type { Referrer } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/referral-repository";
import {
  APPLICANT_STATUSES,
  computeStats,
  getReminderUrgency,
  needsConfirmation,
  type AnonymizeEligibility,
  type ApplicantRow,
  type ApplicantStatus,
} from "../types";
import {
  FUNNEL_STEPS,
  funnelStepIndex,
} from "@/src/programs/fan-to-pro/application/dto/applicant-row";
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
  view = "cohort2",
  canSwitchView = false,
  serverNow,
}: {
  initialRows: ApplicantRow[];
  anonymizeEligibility: AnonymizeEligibility;
  supabaseAvailable: boolean;
  fetchError: string | null;
  readOnly?: boolean;
  // 기수 필터 (옵션 A). server 가 결정한 현재 뷰 + 토글 허용 여부.
  view?: ApplicantView;
  canSwitchView?: boolean;
  // 서버 렌더 시각 (ms). 시각 기반 정렬/집계/tint 의 첫 페인트를 SSR·클라
  // 동일하게 맞춰 하이드레이션 mismatch 를 없애는 앵커. 마운트 후엔 라이브 tick.
  serverNow: number;
}) {
  return (
    <ToastProvider>
      <DashboardInner
        initialRows={initialRows}
        anonymizeEligibility={anonymizeEligibility}
        supabaseAvailable={supabaseAvailable}
        fetchError={fetchError}
        readOnly={readOnly}
        view={view}
        canSwitchView={canSwitchView}
        serverNow={serverNow}
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
  view,
  canSwitchView,
  serverNow,
}: {
  initialRows: ApplicantRow[];
  anonymizeEligibility: AnonymizeEligibility;
  supabaseAvailable: boolean;
  fetchError: string | null;
  readOnly: boolean;
  view: ApplicantView;
  canSwitchView: boolean;
  serverNow: number;
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
  // serverNow 로 seed → SSR·클라 첫 렌더 동일. 마운트 후 effect 가 라이브로 tick.
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(serverNow);
  const [nowTick, setNowTick] = useState<number>(serverNow);

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
        // 폴링도 현재 뷰 스코프로 (전체 스냅샷 오염 방지, viewer 는 서버 강제 cohort2).
        const result = await pollApplicants(view);
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
  }, [supabaseAvailable, view]);

  // "갱신 12s ago" chip 의 1 초 카운터. 별도 effect 라 폴링 사이클과 무관.
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  // 레퍼럴 추천인 map. referred_by_code -> 추천인 (실명 + kind). 실명은 준-PII 라
  // admin 전용 server action (assertAdmin 첫 줄) 으로 조회. distinct 코드만 배치
  // 조회해 N+1 회피. rows 변경 시 새로 입력된 코드가 있으면 다시 조회.
  const [referrers, setReferrers] = useState<Record<string, Referrer>>({});
  const referralCodesKey = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) {
      if (row.referredByCode) set.add(row.referredByCode.trim().toUpperCase());
    }
    return Array.from(set).sort().join(",");
  }, [rows]);
  useEffect(() => {
    if (referralCodesKey.length === 0) {
      setReferrers({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await resolveReferrersForCodes(referralCodesKey.split(","));
      if (cancelled) return;
      if (result.status === "ok") setReferrers(result.referrers);
    })();
    return () => {
      cancelled = true;
    };
  }, [referralCodesKey]);

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
  const [enrollBatchResult, setEnrollBatchResult] = useState<
    Extract<BatchEnrollResult, { status: "ok" }> | null
  >(null);
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

  // 라이브 자동 반영 (노아 요청) — 폴링 결과(pendingRows)가 도착하면 "N건 변경" 칩
  // 클릭 없이 자동으로 목록에 commit 한다. 단 "작업 중"엔 미뤄 화면이 안 흔들리게:
  //  - isPending: 방금 만든 수동 변경을 in-flight stale 폴링이 덮어쓰는 클로버 방지.
  //  - selectedIds: 일괄 발송/확정 대상을 고르는 중 목록이 바뀌면 선택이 꼬임.
  //  - broadcastOpen / historyApplicant: 발송 모달·이력 드로어 열린 동안 뒤 목록 고정.
  // 미룬 경우 pendingRows 는 유지 → 기존 칩이 폴백으로 뜨고, busy 가 풀리면 이 effect
  // 가 다시 돌아 자동 반영한다. (칩 수동 클릭 경로도 그대로 살아있음)
  useEffect(() => {
    if (!pendingRows || !pendingEligibility || pendingFetchedAt === null) return;
    if (isPending || selectedIds.size > 0 || broadcastOpen || historyApplicant)
      return;
    setRows(pendingRows);
    setEligibility(pendingEligibility);
    setLastFetchedAt(pendingFetchedAt);
    setPendingRows(null);
    setPendingEligibility(null);
    setPendingFetchedAt(null);
  }, [
    pendingRows,
    pendingEligibility,
    pendingFetchedAt,
    isPending,
    selectedIds,
    broadcastOpen,
    historyApplicant,
  ]);

  // 집계 + 정렬의 시각 기준 = serverNow (페이지 로드 앵커). 초 단위 재계산/재정렬
  // 없이 첫 페인트가 SSR 과 일치. 개별 row tint 만 nowTick 으로 라이브.
  const stats = useMemo(
    () => computeStats(rows, new Date(serverNow)),
    [rows, serverNow],
  );

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
      confirmation_notice: 1,
      notified: 2,
      overdue: 3,
      paid: 4,
      enrolled: 5,
      refunded: 6,
      cancelled: 7,
      next_cohort_interest: 8,
    };
    const now = new Date(serverNow);
    return [...items].sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 99;
      const sb = STATUS_ORDER[b.status] ?? 99;
      if (sa !== sb) return sa - sb;
      const ua = getReminderUrgency(a, now).rank;
      const ub = getReminderUrgency(b, now).rank;
      if (ua !== ub) return ub - ua;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [rows, query, statusFilter, serverNow]);

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

  function runConfirmationNotice(row: ApplicantRow) {
    startTransition(async () => {
      const result = await markAsConfirmationNotice({ id: row.id });
      handleResult(result, "확인 안내 단계로 표시했어요.");
    });
  }

  // 운영자 수동 상태 변경 (any -> any). viewer(readOnly) 는 UI 미노출 + 서버
  // assertAdmin 로 2중 차단.
  function runSetStatus(row: ApplicantRow, status: ApplicantStatus) {
    if (status === row.status) return;
    startTransition(async () => {
      const result = await setApplicantStatus({ id: row.id, status });
      handleResult(result, `상태를 "${STATUS_LABEL_KO[status]}"로 바꿨어요.`);
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
        setEnrollBatchResult(result);
        // 과정별 개강/미달 요약 (제네릭 — courseTitles 로 표시, slug fallback).
        const courseSummary = Object.entries(result.runs)
          .map(([slug, open]) => {
            const label = result.courseTitles?.[slug] ?? slug;
            return `${label} ${open ? "개강" : "미달"}`;
          })
          .join(" / ");
        const summary = courseSummary || "판정 대상 과정 없음";
        show(
          `${summary} / enrolled ${result.enrolledCount} / cancelled ${result.cancelledCount}`,
          "success",
        );
        refresh();
        return;
      }
      show(friendlyError(result.error), "error");
    });
  }

  function runToggleMilestone(
    applicantId: string,
    milestoneType: "guide_sent" | "feedback_done",
    currentValue: string | null,
  ) {
    startTransition(async () => {
      const result = await toggleApplicantMilestone({
        applicantId,
        milestoneType,
        action: currentValue ? "unmark" : "mark",
      });
      if (result.status === "ok") {
        const label =
          milestoneType === "guide_sent" ? "가이드 안내" : "첨삭";
        show(
          currentValue
            ? `${label} 표시 해제했어요.`
            : `${label} 완료 표시했어요.`,
          "success",
        );
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
    // messages_log audit — drawerApplicant 가 현재 열린 신청자. background fire-and-forget.
    // cohortKickoff 인 경우 milestone guide_sent 도 자동 mark.
    if (drawerApplicant) {
      const applicantId = drawerApplicant.id;
      void (async () => {
        const result = await logIndividualSend({
          applicantId,
          channel: channel === "email" ? "email" : "sms",
          templateId: kind,
        });
        if (result.status === "ok" && kind === "cohortKickoff") {
          await toggleApplicantMilestone({
            applicantId,
            milestoneType: "guide_sent",
            action: "mark",
          });
        }
        if (result.status === "ok") {
          refresh();
        }
      })();
    }
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
            <CohortViewToggle
              view={view}
              canSwitch={canSwitchView}
              onSwitch={(next) => {
                router.push(
                  next === "cohort2"
                    ? "/admin/applicants"
                    : `/admin/applicants?view=${next}`,
                );
              }}
            />
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
          {/* ADR 0017 Decision B / D5: 코워크 커미션 정산 요약. admin 도 확인용
              으로 노출. §6.6 원 단위 필수 (M/K 축약 금지). */}
          {stats.commissionBaseKrw > 0 ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border border-brand-pink/40 bg-brand-pink/[0.06] px-2.5 py-1.5 text-[11px] text-fg">
              <span
                className="font-black uppercase text-brand-pink"
                style={{ letterSpacing: "0.12em" }}
              >
                커미션 12%
              </span>
              <span className="font-black text-fg">
                {stats.commissionKrw.toLocaleString()}원
              </span>
              <span className="text-fg/60">
                결제 확정 {stats.commissionCount}명 (
                {stats.commissionBaseKrw.toLocaleString()}원) 기준
              </span>
              {stats.commissionCount > 0 ? (
                <span className="text-fg/60">
                  1명당{" "}
                  {Math.round(
                    stats.commissionKrw / stats.commissionCount,
                  ).toLocaleString()}
                  원
                </span>
              ) : null}
            </div>
          ) : null}
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
            {/* ADR 0017 Decision A: viewer(코워크) 는 CSV 반출 차단 (오프라인
                PII 반출 벡터 제거). 마스킹된 화면과 별개로 raw 다운로드 방지. */}
            {!readOnly && (
              <button
                type="button"
                onClick={() => downloadCsv(filtered)}
                className={compactBtn}
                style={compactStyle}
                disabled={filtered.length === 0}
              >
                CSV 내려받기 ({filtered.length})
              </button>
            )}
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

        {/* Table (desktop). overflow-x-auto = 넓은 컬럼 잘림(튀어나감) 방지 가로
            스크롤. 행 액션 메뉴는 portal+fixed 라 스크롤 컨테이너에 안 잘림. */}
        <div className="hidden overflow-x-auto border border-border md:block">
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
                <th className="px-3 py-2 font-black">과정</th>
                <th className="px-3 py-2 font-black">이력</th>
                <th className="px-3 py-2 font-black">추천</th>
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
                    colSpan={readOnly ? 13 : 15}
                    className="px-3 py-12 text-center text-xs text-fg/80"
                  >
                    표시할 신청자가 없어요.
                  </td>
                </tr>
              ) : null}
              {filtered.map((row) => {
                const checked = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-t border-border text-xs hover:bg-surface-elevated/40",
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
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {formatCourseLabel(row)}
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <HistoryBadge row={row} />
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      <ReferralNote
                        code={row.referredByCode}
                        referrers={referrers}
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {formatPhoneForDisplay(row.phone, row.nationality)}
                    </td>
                    <td className="px-3 py-2 align-top text-fg">
                      <span
                        className="block max-w-[220px] truncate"
                        title={row.email}
                      >
                        {row.email}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.nationality ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.visa ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap items-center gap-1">
                        {readOnly ? (
                          <StatusProgress status={row.status} />
                        ) : (
                          <StatusEditMenu
                            row={row}
                            busy={isPending}
                            onSetStatus={(s) => runSetStatus(row, s)}
                          >
                            <StatusProgress status={row.status} />
                          </StatusEditMenu>
                        )}
                        {row.redactedAt ? <RedactedChip /> : null}
                        {row.status === "next_cohort_interest" &&
                        row.messageLastSentByKind.nextCohortOpen ? (
                          <span
                            className="inline-flex items-center gap-1 border border-sky-500/60 bg-sky-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-sky-200 whitespace-nowrap"
                            style={{ letterSpacing: "0.18em" }}
                            title={`다음 기수 오픈 안내 발송 ${formatDate(row.messageLastSentByKind.nextCohortOpen)}`}
                          >
                            안내 보냄 ✓
                          </span>
                        ) : null}
                        {row.messageLastSentByKind.cohortKickoff ? (
                          <span
                            className="inline-flex items-center gap-1 border border-emerald-500/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200 whitespace-nowrap"
                            style={{ letterSpacing: "0.18em" }}
                            title={`가이드 메일 발송 ${formatDate(row.messageLastSentByKind.cohortKickoff)}`}
                          >
                            가이드 ✓
                          </span>
                        ) : null}
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
                          onConfirmationNotice={() =>
                            runConfirmationNotice(row)
                          }
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
                          onToggleMilestone={(type, current) =>
                            runToggleMilestone(row.id, type, current)
                          }
                          onEnrollBatch={() => setEnrollBatchOpen(true)}
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
            const checked = selectedIds.has(row.id);
            return (
              <article
                key={row.id}
                className={cn(
                  "border border-border bg-surface/60 p-3 text-xs",
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
                        {row.previousApplicantId ? <HistoryBadge row={row} /> : null}
                      </div>
                      <div className="mt-0.5 break-all text-fg/90">{row.email}</div>
                      <div className="text-fg/90">
                        {formatPhoneForDisplay(row.phone, row.nationality)}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {readOnly ? (
                      <StatusChip status={row.status} />
                    ) : (
                      <StatusEditMenu
                        row={row}
                        busy={isPending}
                        onSetStatus={(s) => runSetStatus(row, s)}
                      >
                        <StatusChip status={row.status} />
                      </StatusEditMenu>
                    )}
                    {row.redactedAt ? <RedactedChip /> : null}
                    {row.status === "next_cohort_interest" &&
                    row.messageLastSentByKind.nextCohortOpen ? (
                      <span
                        className="inline-flex items-center gap-1 border border-sky-500/60 bg-sky-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-sky-200 whitespace-nowrap"
                        style={{ letterSpacing: "0.18em" }}
                        title={`다음 기수 오픈 안내 발송 ${formatDate(row.messageLastSentByKind.nextCohortOpen)}`}
                      >
                        안내 보냄 ✓
                      </span>
                    ) : null}
                    {row.messageLastSentByKind.cohortKickoff ? (
                      <span
                        className="inline-flex items-center gap-1 border border-emerald-500/60 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-200 whitespace-nowrap"
                        style={{ letterSpacing: "0.18em" }}
                        title={`가이드 메일 발송 ${formatDate(row.messageLastSentByKind.cohortKickoff)}`}
                      >
                        가이드 ✓
                      </span>
                    ) : null}
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
                  {row.referredByCode ? (
                    <>
                      <dt>추천</dt>
                      <dd className="text-fg">
                        <ReferralNote
                          code={row.referredByCode}
                          referrers={referrers}
                        />
                      </dd>
                    </>
                  ) : null}
                </dl>
                {!readOnly && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                    <RowActions
                      row={row}
                      busy={isPending}
                      onMessage={() => setDrawerApplicant(row)}
                      onNotify={() => runNotify(row)}
                      onConfirmationNotice={() => runConfirmationNotice(row)}
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
                      onToggleMilestone={(type, current) =>
                        runToggleMilestone(row.id, type, current)
                      }
                      onEnrollBatch={() => setEnrollBatchOpen(true)}
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
        result={enrollBatchResult}
        onClose={() => {
          setEnrollBatchOpen(false);
          setEnrollBatchResult(null);
        }}
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

type MenuAction = {
  label: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  title?: string;
  active?: boolean;
};

// funnel 전진 액션 (다음 단계 primary) 버튼 스타일 — 메시지(핑크)·부가(중립) 와 구분.
const forwardBtn =
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-fg-subtle/50 bg-fg/[0.06] px-2.5 py-1.5 text-[10px] font-black uppercase text-fg hover:bg-fg/[0.12] disabled:opacity-40 whitespace-nowrap";

/**
 * 고정 위치 팝오버 훅. 테이블이 가로 스크롤(overflow-x-auto)이라 메뉴를 셀 안에
 * 두면 잘린다 → portal + position:fixed 로 body 에 띄워 clipping 회피.
 * 바깥 클릭 / Esc / 스크롤 시 닫힘.
 */
function useFixedPopover() {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const openAt = () => {
    const el = anchorRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        anchorRef.current &&
        !anchorRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return { open, setOpen, openAt, coords, anchorRef, panelRef };
}

function renderMenuItems(
  items: MenuAction[],
  busy: boolean,
  close: () => void,
) {
  return items.map((it, i) => (
    <button
      // eslint-disable-next-line react/no-array-index-key
      key={i}
      type="button"
      role="menuitem"
      onClick={() => {
        close();
        it.onClick();
      }}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2 text-left text-[11px] font-black uppercase text-fg hover:bg-surface disabled:opacity-40",
        it.tone === "danger" && "text-red-300 hover:text-red-200",
      )}
      style={compactStyle}
      disabled={busy}
      title={it.title}
    >
      <span>{it.label}</span>
      {it.active ? (
        <span aria-hidden className="text-emerald-300">
          ✓
        </span>
      ) : null}
    </button>
  ));
}

/** 부가 액션 메뉴 (⋯). */
function ActionMenu({
  trigger,
  items,
  busy,
  ariaLabel,
}: {
  trigger: ReactNode;
  items: MenuAction[];
  busy: boolean;
  ariaLabel: string;
}) {
  const { open, setOpen, openAt, coords, anchorRef, panelRef } =
    useFixedPopover();
  return (
    <div className="inline-flex" ref={anchorRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openAt())}
        className={compactBtn}
        style={compactStyle}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {trigger}
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="fixed z-[60] flex min-w-[160px] flex-col border border-border bg-bg py-1 shadow-lg"
              style={{ top: coords.top, right: coords.right }}
            >
              {renderMenuItems(items, busy, () => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * 스플릿 버튼 - 좌: 다음 단계 primary (1클릭 실행), 우: ▾ 로 다른 전이(마감·취소·환불).
 * 상태값이 곧 다음 단계를 결정 (funnel). primary 라벨 = 전진할 다음 노드 이름.
 */
function SplitActionButton({
  primaryLabel,
  onPrimary,
  secondary,
  busy,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  secondary: MenuAction[];
  busy: boolean;
}) {
  const { open, setOpen, openAt, coords, anchorRef, panelRef } =
    useFixedPopover();
  return (
    <div className="inline-flex" ref={anchorRef}>
      <button
        type="button"
        onClick={onPrimary}
        disabled={busy}
        className={cn(forwardBtn, secondary.length > 0 && "border-r-0")}
        style={compactStyle}
        title={`다음 단계: ${primaryLabel}`}
      >
        <span aria-hidden className="mr-1 opacity-60">
          →
        </span>
        {primaryLabel}
      </button>
      {secondary.length > 0 ? (
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openAt())}
          disabled={busy}
          className={cn(forwardBtn, "px-1.5")}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="다른 처리"
        >
          ▾
        </button>
      ) : null}
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="fixed z-[60] flex min-w-[150px] flex-col border border-border bg-bg py-1 shadow-lg"
              style={{ top: coords.top, right: coords.right }}
            >
              {renderMenuItems(secondary, busy, () => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * 상태 진행 스텝퍼 - funnel 전진 상태(신청·안내·입금·확정) 는 4단계 중 현재 위치를
 * 시각화 ("어디까지 왔는지"). off-funnel(마감·취소·환불·다음기수) 은 기존 뱃지.
 */
function StatusProgress({ status }: { status: ApplicantStatus }) {
  const idx = funnelStepIndex(status);
  if (idx < 0) return <StatusChip status={status} />;
  const title = `${FUNNEL_STEPS.map((s) => s.short).join(" / ")} 중 ${
    FUNNEL_STEPS[idx].short
  } 단계 (${idx + 1}/${FUNNEL_STEPS.length})`;
  return (
    <div
      className="inline-flex items-center"
      title={title}
      aria-label={title}
    >
      {FUNNEL_STEPS.map((s, i) => {
        const done = i < idx;
        const cur = i === idx;
        return (
          <div key={s.status} className="inline-flex items-center">
            <span
              className={cn(
                "border px-1.5 py-0.5 text-[9px] font-black uppercase whitespace-nowrap",
                cur && "border-brand-pink bg-brand-pink/20 text-brand-pink",
                done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-300/90",
                !cur && !done && "border-border bg-transparent text-fg/30",
              )}
              style={{ letterSpacing: "0.06em" }}
            >
              {s.short}
            </span>
            {i < FUNNEL_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px w-1.5",
                  i < idx ? "bg-emerald-500/40" : "bg-border",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 운영자 수동 상태 변경 - StatusProgress 를 클릭하면 전 상태 목록 메뉴. any -> any.
 * readOnly(viewer) 는 이 컴포넌트를 렌더하지 않음 (호출부 분기) + 서버 assertAdmin.
 */
function StatusEditMenu({
  row,
  onSetStatus,
  busy,
  children,
}: {
  row: ApplicantRow;
  onSetStatus: (status: ApplicantStatus) => void;
  busy: boolean;
  children: ReactNode;
}) {
  const { open, setOpen, openAt, coords, anchorRef, panelRef } =
    useFixedPopover();
  return (
    <div className="inline-flex" ref={anchorRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openAt())}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-sm hover:bg-surface disabled:opacity-40"
        title="클릭해서 상태 변경"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="상태 변경"
      >
        {children}
        <span aria-hidden className="text-[9px] text-fg-subtle">
          ▾
        </span>
      </button>
      {open && coords
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="fixed z-[60] flex min-w-[160px] flex-col border border-border bg-bg py-1 shadow-lg"
              style={{ top: coords.top, right: coords.right }}
            >
              {APPLICANT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setOpen(false);
                    onSetStatus(s);
                  }}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2 text-left text-[11px] font-black uppercase text-fg hover:bg-surface disabled:opacity-40",
                    s === row.status && "text-brand-pink",
                  )}
                  style={compactStyle}
                >
                  <span>{STATUS_LABEL_KO[s]}</span>
                  {s === row.status ? (
                    <span aria-hidden className="text-brand-pink">
                      ●
                    </span>
                  ) : null}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function RowActions({
  row,
  busy,
  onMessage,
  onNotify,
  onConfirmationNotice,
  onReminder,
  onOverdue,
  onPaid,
  onCancel,
  onRefund,
  onReceipt,
  onHistory,
  onToggleMilestone,
  onEnrollBatch,
}: {
  row: ApplicantRow;
  busy: boolean;
  onMessage: () => void;
  onNotify: () => void;
  onConfirmationNotice: () => void;
  onReminder: () => void;
  onOverdue: () => void;
  onPaid: () => void;
  onCancel: () => void;
  onRefund: () => void;
  onReceipt: () => void;
  onHistory: () => void;
  onToggleMilestone: (
    milestoneType: "guide_sent" | "feedback_done",
    currentValue: string | null,
  ) => void;
  onEnrollBatch: () => void;
}) {
  // PII 파기된 row 는 발송/연락 액션이 무의미 → 메시지 버튼 숨김.
  // 거래 처리 액션 (취소/환불/현금영수증 기록) 은 회계 무결성 위해 유지.
  const redacted = row.redactedAt !== null;
  const receiptEligible =
    !redacted &&
    (row.status === "paid" ||
      row.status === "enrolled" ||
      row.status === "refunded");
  const milestoneEligible =
    !redacted && (row.status === "paid" || row.status === "enrolled");

  // 다음 단계 (funnel 전진) = 좌측 상태값이 결정. primary = 전진할 다음 노드 이름
  // (1클릭), secondary(▾) = 다른 전이(마감·취소·환불). paid → 수강 확정 은 정원
  // 판정 때문에 일괄 다이얼로그로 라우팅 (per-row 불가).
  let primary: { label: string; onClick: () => void } | null = null;
  const secondary: MenuAction[] = [];
  if (row.status === "pending") {
    // 비자 미보유 / 외국 전화번호 = payment guide 전 사전 확인 안내가 먼저.
    if (needsConfirmation(row)) {
      primary = { label: "확인 안내", onClick: onConfirmationNotice };
      secondary.push({ label: "안내 발송", onClick: onNotify });
    } else {
      primary = { label: "안내 발송", onClick: onNotify };
    }
    secondary.push({ label: "취소", onClick: onCancel, tone: "danger" });
  } else if (row.status === "confirmation_notice") {
    primary = { label: "안내 발송", onClick: onNotify };
    secondary.push({ label: "취소", onClick: onCancel, tone: "danger" });
  } else if (row.status === "notified") {
    primary = { label: "입금 확인", onClick: onPaid };
    secondary.push({ label: "마감 초과", onClick: onOverdue });
    secondary.push({ label: "취소", onClick: onCancel, tone: "danger" });
  } else if (row.status === "paid") {
    primary = { label: "수강 확정", onClick: onEnrollBatch };
    secondary.push({ label: "환불 완료", onClick: onRefund });
    secondary.push({ label: "취소", onClick: onCancel, tone: "danger" });
  }

  // 부가 액션 (⋯) = 상태를 바꾸지 않는 반복/기록 + off-funnel 이탈 상태의 처리.
  const aux: MenuAction[] = [];
  if (row.status === "overdue") {
    aux.push({ label: "취소", onClick: onCancel, tone: "danger" });
  }
  if (row.status === "cancelled") {
    aux.push({ label: "환불 완료", onClick: onRefund });
  }
  if (row.status === "notified") {
    aux.push({ label: "리마인드 +1", onClick: onReminder });
  }
  if (receiptEligible) {
    aux.push({
      label:
        row.cashReceiptCount > 0
          ? `현금영수증 (${row.cashReceiptCount})`
          : "현금영수증",
      onClick: onReceipt,
      title:
        row.cashReceiptCount > 0
          ? `현금영수증 발급 ${row.cashReceiptCount}건`
          : "현금영수증 발급 기록",
    });
  }
  if (milestoneEligible) {
    aux.push({
      label: "가이드",
      active: row.milestones.guideSentAt !== null,
      onClick: () =>
        onToggleMilestone("guide_sent", row.milestones.guideSentAt),
      title: row.milestones.guideSentAt
        ? `가이드 보냄 ${formatDate(row.milestones.guideSentAt)} (클릭으로 해제)`
        : "첫 수업 안내 메일 발송 완료 표시",
    });
    aux.push({
      label: "첨삭",
      active: row.milestones.feedbackDoneAt !== null,
      onClick: () =>
        onToggleMilestone("feedback_done", row.milestones.feedbackDoneAt),
      title: row.milestones.feedbackDoneAt
        ? `첨삭 완료 ${formatDate(row.milestones.feedbackDoneAt)} (클릭으로 해제)`
        : "이력서/자소서/포폴 첨삭 완료 표시",
    });
  }
  if (row.messageCount > 0) {
    aux.push({
      label: `발송 이력 (${row.messageCount})`,
      onClick: onHistory,
      title: `발송 이력 ${row.messageCount}건`,
    });
  }

  return (
    <div className="flex items-center gap-1">
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
      {primary ? (
        <SplitActionButton
          busy={busy}
          primaryLabel={primary.label}
          onPrimary={primary.onClick}
          secondary={secondary}
        />
      ) : null}
      {aux.length > 0 ? (
        <ActionMenu busy={busy} ariaLabel="부가 액션" trigger="⋯" items={aux} />
      ) : null}
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
  // toLocaleTimeString 은 서버(Node ICU, UTC)와 클라(브라우저 ICU, 뷰어 tz)가
  // 달라 hydration mismatch 를 낸다. 애초에 뷰어 tz 로만 의미 있는 값이라 마운트
  // 후에만 title 을 렌더 (hover 툴팁이라 시각 변화 없음).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        stale
          ? "border-amber-500/60 bg-amber-500/10 text-amber-200"
          : "border-border bg-bg text-fg/80",
      )}
      style={{ letterSpacing: "0.15em" }}
      title={
        mounted
          ? `마지막 갱신: ${new Date(lastFetchedAt).toLocaleTimeString("ko-KR")}`
          : undefined
      }
      aria-live="polite"
    >
      <span>갱신</span>
      <span className="text-fg">{label}</span>
    </span>
  );
}

/**
 * 기수 필터 세그먼트 토글 (옵션 A, 노아 확정).
 *   admin (canSwitch=true): 2기 / 1기 / 전체 세그먼트. 클릭 시 ?view= 로 navigate.
 *   viewer (canSwitch=false): "2기" 고정 라벨만. 토글 미표시 — 서버가 이미
 *     cohort2 강제라 UI 도 스위치 안 노출 (파트너 1기 이력 노출 최소화).
 * additive — 기존 컬럼/액션/폴링 무변경 (§7.4).
 */
const COHORT_VIEW_OPTIONS: { value: ApplicantView; label: string }[] = [
  { value: "cohort2", label: "2기" },
  { value: "cohort1", label: "1기" },
  { value: "all", label: "전체" },
];

function CohortViewToggle({
  view,
  canSwitch,
  onSwitch,
}: {
  view: ApplicantView;
  canSwitch: boolean;
  onSwitch: (next: ApplicantView) => void;
}) {
  if (!canSwitch) {
    // viewer 고정 라벨 — 스위치 없음.
    return (
      <span
        className="inline-flex items-center border border-border bg-bg px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap text-fg/80"
        style={{ letterSpacing: "0.15em" }}
      >
        2기
      </span>
    );
  }
  return (
    <div
      className="inline-flex items-center border border-border"
      role="group"
      aria-label="기수 필터"
    >
      {COHORT_VIEW_OPTIONS.map((opt) => {
        const active = opt.value === view;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (!active) onSwitch(opt.value);
            }}
            aria-pressed={active}
            className={cn(
              "px-2.5 py-1 text-[11px] font-black whitespace-nowrap transition-colors duration-150",
              active
                ? "bg-brand-pink text-black"
                : "bg-bg text-fg/70 hover:text-fg hover:bg-fg/5",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

const REFERRER_KIND_LABEL: Record<Referrer["kind"], string> = {
  student: "수강생",
  instructor: "강사",
  user_profile: "운영",
};

/**
 * 레퍼럴 표시 — 신청자가 입력한 추천 코드 + 추천인 실명/kind.
 * referredByCode 없으면 아무것도 렌더 안 함 (additive, 코드 없으면 표시 X).
 * 추천인 resolve 전(로딩) 또는 매칭 없는 코드면 코드만 노출.
 */
function ReferralNote({
  code,
  referrers,
}: {
  code: string | null;
  referrers: Record<string, Referrer>;
}) {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const referrer = referrers[normalized];
  return (
    <div
      className="mt-1 inline-flex flex-wrap items-center gap-1 text-[10px] font-normal text-fg/70"
      title={
        referrer
          ? `추천 코드 ${normalized} (추천인 ${referrer.name} / ${REFERRER_KIND_LABEL[referrer.kind]})`
          : `추천 코드 ${normalized}`
      }
    >
      <span
        className="inline-flex items-center border border-violet-400/50 bg-violet-500/10 px-1.5 py-0.5 font-black uppercase text-violet-200"
        style={{ letterSpacing: "0.12em" }}
      >
        추천 {normalized}
      </span>
      {referrer ? (
        <span className="text-fg/80">
          {referrer.name || "이름 미상"} / {REFERRER_KIND_LABEL[referrer.kind]}
        </span>
      ) : null}
    </div>
  );
}

/**
 * B0069 "이력" badge — 재지원자 인식 표시.
 */
function HistoryBadge({ row }: { row: ApplicantRow }) {
  const tone = historyBadgeTone(row);
  if (tone === null) {
    return <span className="text-fg/60">신규</span>;
  }
  const classes =
    tone === "completed"
      ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
      : "border-amber-500/60 bg-amber-500/15 text-amber-200";
  const label = tone === "completed" ? "1기 수료생" : "1기 신청";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-1.5 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        classes,
      )}
      style={{ letterSpacing: "0.15em" }}
      title={
        tone === "completed"
          ? "1기에서 결제까지 완료한 이력이 있어요"
          : "1기에 신청은 했지만 결제 전 상태였어요"
      }
    >
      {label}
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

/**
 * B0068 신청자 row 의 "과정" 컬럼 표시.
 *   bundleTitleKo 있음 → "올인원 · <title>"  (올인원 신청)
 *   courseTitleKo 있음 → "단과 · <title>"    (단과 신청, Slice 2c-A)
 *   둘 다 null → "-"                          (1기 legacy 신청자)
 * bundle 우선 (한 row 에 둘 다 있는 케이스는 없지만 방어).
 */
// ADR 0019 2기 단과 slug → 읽기 쉬운 이름 (course_id 미해결이라 slug 로 저장됨).
const COURSE_SLUG_LABEL: Record<string, string> = {
  "a-r": "A&R",
  sound: "음향 감독",
};

function formatCourseLabel(row: ApplicantRow): string {
  if (row.bundleTitleKo) return `올인원 / ${row.bundleTitleKo}`;
  if (row.courseTitleKo) return `단과 / ${row.courseTitleKo}`;
  // ADR 0019 2기 멀티 단과 (간이 정책 B) — selection_mode + slug 배열로 저장.
  if (row.selectionMode && row.selectedCourseSlugs?.length) {
    const kind = row.selectionMode === "all_in_one" ? "올인원" : "단과";
    const names = row.selectedCourseSlugs
      .map((s) => COURSE_SLUG_LABEL[s] ?? s)
      .join(", ");
    return `${kind} / ${names}`;
  }
  return "-";
}

/**
 * B0069 신청자 row 의 "이력" 컬럼 badge.
 *   previousApplicantId 있음 + previousStatus in (paid/enrolled/refunded) → "1기 수료생" (green)
 *   previousApplicantId 있음 + 그 외 status → "1기 신청" (yellow)
 *   previousApplicantId 없음 → null (컬럼에 "신규" 텍스트만)
 *
 * 노아 스펙 매핑:
 *   - "1기 수료생" = 실제 결제 완료 (paid) 또는 강좌 확정 (enrolled) 또는 환불 (refunded, 결제까진 갔음)
 *   - "1기 신청" = 결제 전 status (pending / notified / overdue / cancelled)
 */
function historyBadgeTone(row: ApplicantRow): "completed" | "applied" | null {
  if (!row.previousApplicantId) return null;
  if (
    row.previousStatus === "paid" ||
    row.previousStatus === "enrolled" ||
    row.previousStatus === "refunded"
  ) {
    return "completed";
  }
  return "applied";
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
