"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/shared/ui/cn";
import {
  createInstructor,
  deleteInstructor,
  markInstructorPayoutPaid,
  recordInstructorPayouts,
  updateInstructor,
} from "@/src/programs/fan-to-pro/application/instructor-actions";
import type {
  InstructorPayoutRow,
  InstructorRow,
} from "@/src/programs/fan-to-pro/domain/instructor";
import { ToastProvider, useToast } from "./toast";
import {
  InstructorFormDialog,
  type InstructorFormPayload,
} from "./instructor-form-dialog";
import { InstructorPayoutConfirmDialog } from "./instructor-payout-confirm-dialog";
import { InstructorDeleteConfirmDialog } from "./instructor-delete-confirm-dialog";

const compactBtn =
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-border bg-bg px-2.5 py-1.5 text-[10px] font-black uppercase text-fg hover:text-fg hover:border-fg-subtle disabled:opacity-40 whitespace-nowrap";

const accentBtn =
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-brand-pink/60 bg-brand-pink/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-brand-pink hover:bg-brand-pink/20 disabled:opacity-40 whitespace-nowrap";

const dangerBtn =
  "inline-flex min-h-[32px] shrink-0 items-center justify-center border border-red-500/60 bg-red-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase text-red-200 hover:bg-red-500/20 disabled:opacity-40 whitespace-nowrap";

const compactStyle = { letterSpacing: "0.12em" } as const;

const COHORT_LABEL = "1기";

export function InstructorsDashboard({
  initialInstructors,
  initialPayouts,
  enrolledCount,
  supabaseAvailable,
  fetchError,
}: {
  initialInstructors: InstructorRow[];
  initialPayouts: InstructorPayoutRow[];
  enrolledCount: number;
  supabaseAvailable: boolean;
  fetchError: string | null;
}) {
  return (
    <ToastProvider>
      <DashboardInner
        initialInstructors={initialInstructors}
        initialPayouts={initialPayouts}
        enrolledCount={enrolledCount}
        supabaseAvailable={supabaseAvailable}
        fetchError={fetchError}
      />
    </ToastProvider>
  );
}

function DashboardInner({
  initialInstructors,
  initialPayouts,
  enrolledCount,
  supabaseAvailable,
  fetchError,
}: {
  initialInstructors: InstructorRow[];
  initialPayouts: InstructorPayoutRow[];
  enrolledCount: number;
  supabaseAvailable: boolean;
  fetchError: string | null;
}) {
  const router = useRouter();
  const { show } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstructorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorRow | null>(null);
  const [payoutConfirmOpen, setPayoutConfirmOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

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
    show(friendlyError(result.error), "error");
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(row: InstructorRow) {
    setEditTarget(row);
    setFormOpen(true);
  }

  function runSubmit(input: InstructorFormPayload) {
    startTransition(async () => {
      if (editTarget) {
        const result = await updateInstructor({
          id: editTarget.id,
          ...input,
        });
        if (result.status === "ok") {
          show("강사 정보를 수정했어요.", "success");
          setFormOpen(false);
          setEditTarget(null);
          refresh();
          return;
        }
        handleResult(result, "");
      } else {
        const result = await createInstructor(input);
        if (result.status === "ok") {
          show("강사를 추가했어요.", "success");
          setFormOpen(false);
          refresh();
          return;
        }
        show(friendlyError(result.error), "error");
      }
    });
  }

  function runDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteInstructor({ id: deleteTarget.id });
      if (result.status === "ok") {
        show("강사를 삭제했어요.", "success");
        setDeleteTarget(null);
        refresh();
        return;
      }
      if (result.status === "stale") {
        show("이미 삭제된 강사예요.", "info");
        setDeleteTarget(null);
        refresh();
        return;
      }
      if (result.error === "instructorReferenced") {
        show(
          "정산/세션이 연결돼 있어 삭제할 수 없어요. 메모에 비활성 표시를 남겨주세요.",
          "error",
        );
        return;
      }
      show(friendlyError(result.error), "error");
    });
  }

  function runRecordPayouts() {
    startTransition(async () => {
      const result = await recordInstructorPayouts({
        cohortLabel: COHORT_LABEL,
      });
      if (result.status === "error") {
        show(friendlyError(result.error), "error");
        return;
      }
      const inserted = result.records.filter((r) => !r.skipped).length;
      const below = result.records.filter(
        (r) => r.skipped && r.skipReason === "below_minimum",
      ).length;
      const already = result.records.filter(
        (r) => r.skipped && r.skipReason === "already_recorded",
      ).length;
      const parts: string[] = [];
      if (inserted > 0) parts.push(`${inserted}건 기록`);
      if (below > 0) parts.push(`${below}건 정원 미달 skip`);
      if (already > 0) parts.push(`${already}건 중복 skip`);
      show(
        parts.length > 0
          ? `${COHORT_LABEL} 정산: ${parts.join(" / ")}.`
          : "처리할 대상이 없어요.",
        inserted > 0 ? "success" : "info",
      );
      setPayoutConfirmOpen(false);
      refresh();
    });
  }

  function runMarkPaid(row: InstructorPayoutRow) {
    startTransition(async () => {
      const result = await markInstructorPayoutPaid({ id: row.id });
      handleResult(result, "송금 완료로 표시했어요.");
    });
  }

  // 강사별 정산 row 매핑.
  const payoutsByInstructor = useMemo(() => {
    const map = new Map<string, InstructorPayoutRow[]>();
    for (const p of initialPayouts) {
      const list = map.get(p.instructorId) ?? [];
      list.push(p);
      map.set(p.instructorId, list);
    }
    return map;
  }, [initialPayouts]);

  // 강사 정렬: 토 → 일, 이름 ASC (fetch 가 이미 정렬했지만 보강).
  const sortedInstructors = useMemo(() => {
    return [...initialInstructors].sort((a, b) => {
      if (a.day !== b.day) return a.day === "saturday" ? -1 : 1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [initialInstructors]);

  const totalInstructors = sortedInstructors.length;
  const cohortPayouts = initialPayouts.filter(
    (p) => p.cohortLabel === COHORT_LABEL,
  );
  const totalRecorded = cohortPayouts.length;
  const totalPaid = cohortPayouts.filter((p) => p.paidAt !== null).length;

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
              Fan to Pro 강사
            </h1>
          </div>
          {/* 모바일: 가로 스크롤 stats + 액션. 데스크탑: wrap. */}
          <div className="-mx-3 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 text-[11px] text-fg sm:mx-0 sm:px-0 sm:pb-0 lg:flex-wrap lg:gap-2">
            <StatPill label="강사" value={totalInstructors} />
            <StatPill
              label={`${COHORT_LABEL} 기록`}
              value={totalRecorded}
              tone="notified"
            />
            <StatPill
              label={`${COHORT_LABEL} 송금`}
              value={totalPaid}
              tone="paid"
            />
            <StatPill label="정원" value={enrolledCount} tone="enrolled" />
            <button
              type="button"
              onClick={openCreate}
              className={accentBtn}
              style={compactStyle}
              disabled={isPending}
            >
              + 새 강사
            </button>
            <button
              type="button"
              onClick={() => setPayoutConfirmOpen(true)}
              className={accentBtn}
              style={compactStyle}
              disabled={isPending || totalInstructors === 0}
              title={`${COHORT_LABEL} 정산 기록 (운영자 수동)`}
            >
              {COHORT_LABEL} 정산 기록
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4">
        {!supabaseAvailable ? (
          <div className="border border-amber-500/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Supabase 자격이 환경에 없어 mock 모드. 실제 강사 데이터는 표시되지
            않아요.
          </div>
        ) : null}
        {fetchError ? (
          <div className="border border-brand-pink bg-brand-pink/10 px-3 py-2 text-xs text-brand-pink">
            데이터 로드 오류: {fetchError}
          </div>
        ) : null}

        {/* Instructor table (desktop) */}
        <section
          aria-labelledby="instructor-list-heading"
          className="hidden border border-border md:block"
        >
          <h2 id="instructor-list-heading" className="sr-only">
            강사 목록
          </h2>
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface text-[10px] uppercase text-fg">
              <tr style={{ letterSpacing: "0.2em" }}>
                <th className="px-3 py-2 font-black">이름</th>
                <th className="px-3 py-2 font-black">요일</th>
                <th className="px-3 py-2 font-black">연락처</th>
                <th className="px-3 py-2 font-black">이메일</th>
                <th className="px-3 py-2 font-black">정산 방식</th>
                <th className="px-3 py-2 font-black">기본 강사료</th>
                <th className="px-3 py-2 font-black">{COHORT_LABEL} 정산</th>
                <th className="px-3 py-2 font-black">액션</th>
              </tr>
            </thead>
            <tbody>
              {sortedInstructors.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-12 text-center text-xs text-fg/80"
                  >
                    등록된 강사가 없어요. [+ 새 강사] 로 추가해 주세요.
                  </td>
                </tr>
              ) : null}
              {sortedInstructors.map((row) => {
                const cohortRows = (payoutsByInstructor.get(row.id) ?? [])
                  .filter((p) => p.cohortLabel === COHORT_LABEL);
                const recorded = cohortRows.length;
                const paid = cohortRows.filter((p) => p.paidAt).length;
                return (
                  <tr
                    key={row.id}
                    className="border-t border-border text-xs hover:bg-surface-elevated/40"
                  >
                    <td className="px-3 py-2 align-top text-fg font-bold whitespace-nowrap">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <DayChip day={row.day} />
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.phone ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-fg break-all">
                      {row.email ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <TaxModeChip mode={row.taxMode} />
                    </td>
                    <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                      {row.baseFeeKrw.toLocaleString()}원
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] whitespace-nowrap">
                      <span className="text-fg">{recorded}건 기록</span>
                      <span className="mx-1 text-fg/40">/</span>
                      <span
                        className={
                          paid > 0 ? "text-emerald-300" : "text-fg/60"
                        }
                      >
                        {paid}건 송금
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className={compactBtn}
                          style={compactStyle}
                          disabled={isPending}
                        >
                          편집
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className={dangerBtn}
                          style={compactStyle}
                          disabled={isPending}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Instructor cards (mobile) */}
        <section
          aria-labelledby="instructor-list-mobile-heading"
          className="flex flex-col gap-2 md:hidden"
        >
          <h2 id="instructor-list-mobile-heading" className="sr-only">
            강사 목록
          </h2>
          {sortedInstructors.length === 0 ? (
            <div className="border border-border bg-surface/60 px-3 py-12 text-center text-xs text-fg/80">
              등록된 강사가 없어요.
            </div>
          ) : null}
          {sortedInstructors.map((row) => {
            const cohortRows = (payoutsByInstructor.get(row.id) ?? []).filter(
              (p) => p.cohortLabel === COHORT_LABEL,
            );
            const recorded = cohortRows.length;
            const paid = cohortRows.filter((p) => p.paidAt).length;
            return (
              <article
                key={row.id}
                className="border border-border bg-surface/60 p-3 text-xs"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-bold text-fg">{row.name}</span>
                      <DayChip day={row.day} />
                      <TaxModeChip mode={row.taxMode} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] text-fg/80">
                    {row.baseFeeKrw.toLocaleString()}원
                  </div>
                </header>
                <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] text-fg/70">
                  <dt>연락처</dt>
                  <dd className="text-fg">{row.phone ?? "-"}</dd>
                  <dt>이메일</dt>
                  <dd className="text-fg break-all">{row.email ?? "-"}</dd>
                  <dt>{COHORT_LABEL} 정산</dt>
                  <dd className="text-fg">
                    {recorded}건 기록 / {paid}건 송금
                  </dd>
                </dl>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className={compactBtn}
                    style={compactStyle}
                    disabled={isPending}
                  >
                    편집
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(row)}
                    className={dangerBtn}
                    style={compactStyle}
                    disabled={isPending}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {/* Payouts records section */}
        <section
          aria-labelledby="payouts-heading"
          className="flex flex-col gap-2 border border-border"
        >
          <header className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <h2
              id="payouts-heading"
              className="text-[11px] font-black uppercase text-fg"
              style={{ letterSpacing: "0.2em" }}
            >
              {COHORT_LABEL} 정산 기록
            </h2>
            <span className="text-[10px] text-fg/60">
              base / tax / net 단위: 원
            </span>
          </header>

          {cohortPayouts.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-fg/80">
              아직 정산 기록이 없어요. 헤더의 [{COHORT_LABEL} 정산 기록] 으로
              시작하세요.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full border-collapse text-left text-sm md:table">
                <thead className="bg-surface text-[10px] uppercase text-fg">
                  <tr style={{ letterSpacing: "0.2em" }}>
                    <th className="px-3 py-2 font-black">강사</th>
                    <th className="px-3 py-2 font-black">정원 snap</th>
                    <th className="px-3 py-2 font-black">세금 모드</th>
                    <th className="px-3 py-2 font-black text-right">기본료</th>
                    <th className="px-3 py-2 font-black text-right">세금</th>
                    <th className="px-3 py-2 font-black text-right">실지급</th>
                    <th className="px-3 py-2 font-black">송금</th>
                    <th className="px-3 py-2 font-black">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortPayouts.map((p) => {
                    const instructor = initialInstructors.find(
                      (i) => i.id === p.instructorId,
                    );
                    return (
                      <tr
                        key={p.id}
                        className="border-t border-border text-xs hover:bg-surface-elevated/40"
                      >
                        <td className="px-3 py-2 align-top text-fg font-bold whitespace-nowrap">
                          {instructor?.name ?? p.instructorId.slice(0, 8)}
                        </td>
                        <td className="px-3 py-2 align-top text-fg whitespace-nowrap">
                          {p.enrolledCountSnapshot}명
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TaxModeChip mode={p.taxModeSnapshot} />
                        </td>
                        <td className="px-3 py-2 align-top text-fg whitespace-nowrap text-right">
                          {p.baseFeeKrw.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top text-fg/80 whitespace-nowrap text-right">
                          {p.taxKrw.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap text-right font-bold text-brand-pink">
                          {p.netKrw.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] whitespace-nowrap">
                          {p.paidAt ? (
                            <span className="text-emerald-300">
                              {formatDate(p.paidAt)}
                            </span>
                          ) : (
                            <span className="text-fg/50">미완료</span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          {p.paidAt ? null : (
                            <button
                              type="button"
                              onClick={() => runMarkPaid(p)}
                              className={accentBtn}
                              style={compactStyle}
                              disabled={isPending}
                            >
                              송금 완료
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="flex flex-col gap-2 px-2 py-2 md:hidden">
                {cohortPayouts.map((p) => {
                  const instructor = initialInstructors.find(
                    (i) => i.id === p.instructorId,
                  );
                  return (
                    <article
                      key={p.id}
                      className="border border-border bg-bg p-3 text-xs"
                    >
                      <header className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-fg">
                            {instructor?.name ?? p.instructorId.slice(0, 8)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <TaxModeChip mode={p.taxModeSnapshot} />
                            <span
                              className="border border-border bg-bg px-1.5 py-0.5 text-[10px] text-fg/80"
                              style={{ letterSpacing: "0.15em" }}
                            >
                              {p.enrolledCountSnapshot}명
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-brand-pink">
                            {p.netKrw.toLocaleString()}원
                          </div>
                          <div className="text-[10px] text-fg/60">
                            기본 {p.baseFeeKrw.toLocaleString()} / 세금{" "}
                            {p.taxKrw.toLocaleString()}
                          </div>
                        </div>
                      </header>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px]">
                          {p.paidAt ? (
                            <span className="text-emerald-300">
                              송금 {formatDate(p.paidAt)}
                            </span>
                          ) : (
                            <span className="text-fg/50">송금 미완료</span>
                          )}
                        </span>
                        {p.paidAt ? null : (
                          <button
                            type="button"
                            onClick={() => runMarkPaid(p)}
                            className={accentBtn}
                            style={compactStyle}
                            disabled={isPending}
                          >
                            송금 완료
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Dialogs */}
      <InstructorFormDialog
        open={formOpen}
        busy={isPending}
        row={editTarget}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSubmit={runSubmit}
      />
      <InstructorPayoutConfirmDialog
        open={payoutConfirmOpen}
        busy={isPending}
        cohortLabel={COHORT_LABEL}
        enrolledCount={enrolledCount}
        instructorCount={totalInstructors}
        onClose={() => setPayoutConfirmOpen(false)}
        onConfirm={runRecordPayouts}
      />
      <InstructorDeleteConfirmDialog
        open={deleteTarget !== null}
        busy={isPending}
        row={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={runDelete}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Small UI bits
 * ----------------------------------------------------------------------- */

function DayChip({ day }: { day: "saturday" | "sunday" }) {
  const sat = day === "saturday";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        sat
          ? "border-brand-pink bg-brand-pink/15 text-brand-pink"
          : "border-violet-400/60 bg-violet-500/15 text-violet-200",
      )}
      style={{ letterSpacing: "0.18em" }}
    >
      {sat ? "SAT" : "SUN"}
    </span>
  );
}

function TaxModeChip({
  mode,
}: {
  mode: "withholding_3_3" | "tax_invoice";
}) {
  const wh = mode === "withholding_3_3";
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2 py-0.5 text-[10px] font-black uppercase whitespace-nowrap",
        wh
          ? "border-blue-400/60 bg-blue-500/15 text-blue-200"
          : "border-amber-400/60 bg-amber-500/15 text-amber-200",
      )}
      style={{ letterSpacing: "0.15em" }}
      title={wh ? "원천징수 3.3%" : "세금계산서 부가세 10%"}
    >
      {wh ? "WITHHOLDING 3.3%" : "TAX INVOICE"}
    </span>
  );
}

function StatPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "notified" | "paid" | "enrolled";
}) {
  const toneClass = {
    default: "border-border bg-bg text-fg",
    notified: "border-blue-400/60 bg-blue-500/15 text-blue-200",
    paid: "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
    enrolled: "border-brand-pink bg-brand-pink/20 text-brand-pink",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border px-2 py-1 text-[10px] font-black uppercase whitespace-nowrap",
        toneClass,
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
    case "instructorReferenced":
      return "정산/세션이 연결돼 있어 삭제할 수 없어요.";
    case "noIdReturned":
      return "DB 가 ID 를 반환하지 않았어요. 잠시 후 다시 시도해 주세요.";
    default:
      return `오류가 발생했어요: ${key}`;
  }
}
