"use client";

/**
 * Cohort Detail — /admin/cohorts/[cohortSlug]
 *
 * 구성:
 * - 상단: 헤더 + cohort 메타 (일정 / 정원 / 상태)
 * - Funnel KPI — 신청 / 입금 안내 / 입금 완료 / 연체 / 취소 / 환불 / 학생 등록
 * - Action bar — [paid 일괄 등록] / [CSV 내보내기]
 * - Applicants DataTable — status filter + 검색 + 정렬
 *
 * 비즈니스 모델:
 *   applicants = 모든 기수의 인재풀. 다음 기수 모집 시 notified/cancelled 가 우선 outreach 대상.
 *   paid 만 student promote → 그 기수의 실 학생.
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Users,
  GraduationCap,
  CalendarCheck,
  BookOpen,
  Wallet,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";
import { backfillPaidApplicantsAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-cohort-actions";
import type { ApplicantRow, ApplicantStatus } from "@/src/programs/fan-to-pro/application/dto/applicant-row";
import { STATUS_LABEL_KO } from "@/src/programs/fan-to-pro/application/dto/applicant-row";
import type { Cohort } from "@/src/programs/fan-to-pro/domain/entities/cohort";
import type { CohortOverview } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-overview";

type SortKey = "createdAt" | "name" | "status" | "paidAmount";
type SortDir = "asc" | "desc";

type Props = {
  cohort: Cohort;
  applicants: ApplicantRow[];
  studentCount: number;
  /** B0049 — 6 KPI 카드용 통합 aggregate. null = query 실패 (카드 미표시). */
  overview: CohortOverview | null;
};

// 라벨은 canonical 단일 소스 (application/dto/applicant-row).
const STATUS_LABEL = STATUS_LABEL_KO;

const STATUS_ORDER: ApplicantStatus[] = [
  "pending",
  "notified",
  "paid",
  "overdue",
  "cancelled",
  "enrolled",
  "refunded",
];

export function CohortDetail({ cohort, applicants, studentCount, overview }: Props) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";

  // funnel 계산
  const byStatus = React.useMemo(() => {
    const counts = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, 0]),
    ) as Record<ApplicantStatus, number>;
    for (const a of applicants) counts[a.status] = (counts[a.status] ?? 0) + 1;
    return counts;
  }, [applicants]);

  const paidLikeCount = byStatus.paid + byStatus.enrolled;
  const conversionPct =
    applicants.length > 0
      ? Math.round((paidLikeCount / applicants.length) * 100)
      : 0;
  const minToOpenPct =
    cohort.min_to_open > 0
      ? Math.round((paidLikeCount / cohort.min_to_open) * 100)
      : 0;

  // filter / search / sort state
  const [statusFilter, setStatusFilter] = React.useState<Set<ApplicantStatus>>(
    new Set(),
  );
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const filtered = React.useMemo(() => {
    let rows = applicants;
    if (statusFilter.size > 0) {
      rows = rows.filter((r) => statusFilter.has(r.status));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const fields = [
          r.name,
          r.email,
          r.phone,
          r.nationality ?? "",
          r.visa ?? "",
          r.depositorNameObserved ?? "",
        ];
        return fields.some((f) => f.toLowerCase().includes(q));
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "ko-KR") * dir;
        case "status":
          return (
            (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) *
            dir
          );
        case "paidAmount":
          return ((a.paidAmountKrw ?? 0) - (b.paidAmountKrw ?? 0)) * dir;
        default:
          return (
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()) *
            dir
          );
      }
    });
    return rows;
  }, [applicants, statusFilter, query, sortKey, sortDir]);

  function toggleStatus(s: ApplicantStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  // 일괄 등록 ────────────────────────────────────────────────────────────
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  function onBackfill() {
    setFeedback(null);
    startTransition(async () => {
      const result = await backfillPaidApplicantsAction({
        cohort_id: cohort.id,
      });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setFeedback(
        result.inserted > 0
          ? `${result.inserted}명 신규 등록 완료. (기존 등록 ${result.skipped}명 건너뜀)`
          : `신규 등록 없음. (모두 이미 학생으로 등록됨, ${result.skipped}명)`,
      );
      router.refresh();
    });
  }

  // CSV 내보내기 ──────────────────────────────────────────────────────────
  function onExportCsv() {
    const headers = [
      "신청일",
      "이름",
      "이메일",
      "전화",
      "국적",
      "비자",
      "상태",
      "입금자명",
      "입금액",
      "입금일",
    ];
    const lines = [
      headers.join(","),
      ...filtered.map((r) =>
        [
          r.createdAt,
          csvCell(r.name),
          csvCell(r.email),
          csvCell(r.phone),
          csvCell(r.nationality),
          csvCell(r.visa),
          STATUS_LABEL[r.status],
          csvCell(r.depositorNameObserved),
          r.paidAmountKrw ?? "",
          r.paymentConfirmedAt ?? "",
        ].join(","),
      ),
    ];
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cohort.name}-applicants-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <header className="flex flex-col gap-2 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {cohort.name}
            </h1>
            <CohortStatusBadge status={cohort.status} />
            {cohort.accepts_signup_now ? (
              <Badge variant="success">신청 받는 중</Badge>
            ) : null}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            {fmtDate(cohort.starts_on)} ~ {fmtDate(cohort.ends_on)}
            {cohort.ceremony_on
              ? ` / 수료식 ${fmtDate(cohort.ceremony_on)}`
              : ""}
            {" / 정원 "}
            {cohort.capacity}명 / 최소 개강 {cohort.min_to_open}명
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* 출결 / 강의 자료 진입은 상단 탭 (CohortTabsNav) 에서. 여기는 slug 만 표시. */}
          <div className="text-right text-xs text-[var(--muted-foreground)]">
            slug: <code className="font-mono">{cohort.slug}</code>
          </div>
        </div>
      </header>

      {/* B0049 — 6 KPI 카드 grid */}
      {overview ? (
        <OverviewKpiGrid
          locale={locale}
          cohort={cohort}
          overview={overview}
          applicantsTotal={applicants.length}
          paidLikeCount={paidLikeCount}
          studentCount={studentCount}
          minToOpen={cohort.min_to_open}
        />
      ) : null}

      {/* Funnel KPI */}
      <Card id="funnel-section">
        <CardHeader>
          <CardTitle className="text-base">신청 퍼널</CardTitle>
          <CardDescription>
            전체 {applicants.length}명 / 입금 전환 {conversionPct}% / 개강 기준{" "}
            {paidLikeCount}/{cohort.min_to_open} ({minToOpenPct}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {STATUS_ORDER.map((s) => (
              <FunnelChip
                key={s}
                label={STATUS_LABEL[s]}
                value={byStatus[s]}
                status={s}
                active={statusFilter.has(s)}
                onClick={() => toggleStatus(s)}
              />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-md bg-[var(--muted)] px-4 py-2.5 text-sm">
            <span className="text-[var(--muted-foreground)]">
              학생 등록 완료
            </span>
            <span className="font-semibold tabular-nums">
              {studentCount} / {paidLikeCount}명
            </span>
          </div>
          {studentCount < paidLikeCount ? (
            <p className="mt-2 text-xs text-[var(--destructive)]">
              {paidLikeCount - studentCount}명이 아직 학생으로 등록 안 됨. [입금
              완료 일괄 등록] 버튼을 눌러 등록하세요.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Action bar */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Button onClick={onBackfill} disabled={pending} size="sm">
            {pending ? "처리 중..." : "입금 완료 일괄 등록"}
          </Button>
          <Button
            onClick={onExportCsv}
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
          >
            CSV 내보내기 ({filtered.length}건)
          </Button>
          {feedback ? (
            <span className="text-xs text-[var(--muted-foreground)]">
              {feedback}
            </span>
          ) : null}
        </CardContent>
      </Card>

      {/* Applicants DataTable */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between space-y-0">
          <div>
            <CardTitle className="text-base">
              신청자 명단 ({filtered.length}/{applicants.length}명)
            </CardTitle>
            <CardDescription>
              상단 칩을 눌러 상태별 필터. 다시 누르면 해제.
            </CardDescription>
          </div>
          <input
            type="search"
            aria-label="신청자 검색"
            placeholder="이름 / 이메일 / 전화 / 입금자명"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] sm:w-72"
          />
        </CardHeader>
        <CardContent className="px-0">
          {applicants.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              이 기수에 신청자가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTh
                      label="신청일"
                      sortKey="createdAt"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <SortableTh
                      label="이름"
                      sortKey="name"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <TableHead>이메일</TableHead>
                    <TableHead>전화</TableHead>
                    <TableHead>국적</TableHead>
                    <TableHead>비자</TableHead>
                    <SortableTh
                      label="상태"
                      sortKey="status"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                    />
                    <TableHead>입금자명</TableHead>
                    <SortableTh
                      label="입금액"
                      sortKey="paidAmount"
                      active={sortKey}
                      dir={sortDir}
                      onClick={toggleSort}
                      align="right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs tabular-nums text-[var(--muted-foreground)]">
                        {fmtDateTime(r.createdAt)}
                      </TableCell>
                      <TableCell className="font-semibold text-[var(--foreground)]">
                        {r.name}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {r.email}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {r.phone}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.nationality ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.visa ?? "-"}
                      </TableCell>
                      <TableCell>
                        <ApplicantStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.depositorNameObserved ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {r.paidAmountKrw != null
                          ? `${r.paidAmountKrw.toLocaleString("ko-KR")}원`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-8 text-center text-sm text-[var(--muted-foreground)]"
                      >
                        조건에 맞는 신청자가 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─────────────────── B0049 — KPI 카드 ─────────────────── */

function OverviewKpiGrid({
  locale,
  cohort,
  overview,
  applicantsTotal,
  paidLikeCount,
  studentCount,
  minToOpen,
}: {
  locale: string;
  cohort: Cohort;
  overview: CohortOverview;
  applicantsTotal: number;
  paidLikeCount: number;
  studentCount: number;
  minToOpen: number;
}) {
  // 카드 6 데이터 ─────────────────────────────────────────
  const { students, instructors, attendance, materials, finance } = overview;

  const paidPct =
    applicantsTotal > 0
      ? Math.round((paidLikeCount / applicantsTotal) * 100)
      : 0;
  const minToOpenMet = paidLikeCount >= minToOpen;

  const invitedPct =
    students.paidApplicantCount > 0
      ? Math.round(
          (students.invitedCount / students.paidApplicantCount) * 100,
        )
      : 0;

  const sessionProgress =
    attendance.totalSessions > 0
      ? `${attendance.endedSessions}/${attendance.totalSessions}`
      : "0/0";
  const attendancePct = Math.round(attendance.averageRate * 100);

  const materialPct =
    materials.totalWeekCount > 0
      ? Math.round((materials.coveredWeekCount / materials.totalWeekCount) * 100)
      : 0;

  const netSign = finance.netKrw >= 0 ? "+" : "";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1. 신청 현황 */}
      <KpiCard
        href={`#funnel-section`}
        icon={<Users className="h-4 w-4" />}
        title="신청 현황"
        description={
          minToOpenMet
            ? "개강 기준 충족"
            : `개강 기준 ${minToOpen}명 ${minToOpen - paidLikeCount}명 부족`
        }
        primary={`${applicantsTotal}명 신청`}
        secondary={
          <>
            입금 {paidLikeCount}명 ({paidPct}%) / 개강 기준 {minToOpen}명
          </>
        }
        accent={
          minToOpenMet
            ? "text-emerald-600"
            : "text-amber-600"
        }
      />

      {/* 2. 학생 invite 진척 */}
      <KpiCard
        href={
          `/${locale}/fan-to-pro/admin/cohorts/${cohort.slug}/students` as Route
        }
        icon={<GraduationCap className="h-4 w-4" />}
        title="학생 등록 + 초대"
        description={
          students.paidApplicantCount === 0
            ? "아직 입금 완료 신청자 없음"
            : students.invitedCount === students.paidApplicantCount
              ? "전원 초대 완료"
              : `${students.paidApplicantCount - students.invitedCount}명 초대 미발송`
        }
        primary={
          students.paidApplicantCount === 0
            ? "0명"
            : `${students.invitedCount} / ${students.paidApplicantCount}명`
        }
        secondary={
          <>
            paid {students.paidApplicantCount} → student {studentCount} →
            Auth {students.invitedCount} ({invitedPct}%)
          </>
        }
        accent={
          students.invitedCount === students.paidApplicantCount &&
          students.paidApplicantCount > 0
            ? "text-emerald-600"
            : "text-[var(--foreground)]"
        }
      />

      {/* 3. 강사 배정 */}
      <KpiCard
        href={`/${locale}/fan-to-pro/admin/instructors` as Route}
        icon={<Users className="h-4 w-4" />}
        title="강사 배정"
        description={
          instructors.assignedCount === 0
            ? "아직 강사 미배정"
            : instructors.unassignedSessionCount === 0
              ? "전 회차 배정 완료"
              : `${instructors.unassignedSessionCount}회 미배정`
        }
        primary={
          instructors.assignedCount === 0
            ? "0명"
            : `${instructors.assignedCount}명`
        }
        secondary={
          instructors.assignedCount === 0
            ? "회차에 강사를 배정하면 표시됩니다"
            : `${instructors.companyCount}개 회사 / 미배정 회차 ${instructors.unassignedSessionCount}회`
        }
        accent={
          instructors.unassignedSessionCount === 0 &&
          instructors.assignedCount > 0
            ? "text-emerald-600"
            : instructors.assignedCount === 0
              ? "text-[var(--muted-foreground)]"
              : "text-amber-600"
        }
      />

      {/* 4. 회차 / 출결 */}
      <KpiCard
        href={
          `/${locale}/fan-to-pro/admin/cohorts/${cohort.slug}/attendance` as Route
        }
        icon={<CalendarCheck className="h-4 w-4" />}
        title="회차 / 출결"
        description={
          attendance.totalSessions === 0
            ? "회차가 아직 생성되지 않음"
            : attendance.endedSessions === 0
              ? "강의 시작 전"
              : `진행률 ${Math.round(
                  (attendance.endedSessions / attendance.totalSessions) * 100,
                )}%`
        }
        primary={`${sessionProgress}회`}
        secondary={
          attendance.endedSessions === 0
            ? "출석률은 1회차 종료 후 표시됩니다"
            : `평균 출석률 ${attendancePct}%`
        }
        accent={
          attendance.endedSessions === 0
            ? "text-[var(--muted-foreground)]"
            : attendancePct >= 75
              ? "text-emerald-600"
              : "text-amber-600"
        }
      />

      {/* 5. 강의 자료 */}
      <KpiCard
        href={
          `/${locale}/fan-to-pro/admin/cohorts/${cohort.slug}/materials` as Route
        }
        icon={<BookOpen className="h-4 w-4" />}
        title="강의 자료"
        description={
          materials.totalCount === 0
            ? "아직 업로드된 자료 없음"
            : materials.coveredWeekCount === materials.totalWeekCount
              ? "전 회차 자료 등록"
              : `${materials.totalWeekCount - materials.coveredWeekCount}회 자료 미등록`
        }
        primary={`${materials.totalCount}개`}
        secondary={
          <>
            회차 cover {materials.coveredWeekCount} / {materials.totalWeekCount}
            회 ({materialPct}%)
          </>
        }
        accent={
          materials.totalCount === 0
            ? "text-[var(--muted-foreground)]"
            : materials.coveredWeekCount === materials.totalWeekCount
              ? "text-emerald-600"
              : "text-[var(--foreground)]"
        }
      />

      {/* 6. 재무 */}
      <KpiCard
        href={`/${locale}/fan-to-pro/admin/finance` as Route}
        icon={<Wallet className="h-4 w-4" />}
        title="재무 (VAT 별도)"
        description={
          finance.revenue.paid_count === 0
            ? "아직 매출 없음"
            : `매출 ${finance.revenue.paid_count}건 / 비용 ${formatKrw(finance.expenseTotalKrw)}`
        }
        primary={
          <span className="inline-flex items-center gap-1">
            <TrendingUp
              className={`h-4 w-4 ${
                finance.netKrw >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            />
            {netSign}
            {formatKrw(finance.netKrw)}
          </span>
        }
        secondary={
          finance.revenue.paid_count === 0 ? (
            "매출이 발생하면 손익을 표시합니다"
          ) : (
            <>
              매출 {formatKrw(finance.revenue.revenue_exclusive_krw)} / 강사료{" "}
              {formatKrw(finance.instructorFeeKrw)} / Cowork{" "}
              {formatKrw(finance.coworkCommissionKrw)}
            </>
          )
        }
        accent={
          finance.revenue.paid_count === 0
            ? "text-[var(--muted-foreground)]"
            : finance.netKrw >= 0
              ? "text-emerald-600"
              : "text-red-600"
        }
      />
    </div>
  );
}

function KpiCard({
  href,
  icon,
  title,
  description,
  primary,
  secondary,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  primary: React.ReactNode;
  secondary: React.ReactNode;
  accent: string;
}) {
  return (
    <Link
      href={href as Route}
      className="group block rounded-[var(--radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <Card className="h-full transition group-hover:border-[var(--ring)] group-hover:shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
              {icon}
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 text-[var(--muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]"
            />
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <div
            className={`text-2xl font-bold tabular-nums ${accent}`}
          >
            {primary}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {secondary}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatKrw(value: number): string {
  if (value === 0) return "0원";
  return `${value.toLocaleString("ko-KR")}원`;
}

/* ─────────────────── helpers ─────────────────── */

function FunnelChip({
  label,
  value,
  status,
  active,
  onClick,
}: {
  label: string;
  value: number;
  status: ApplicantStatus;
  active: boolean;
  onClick: () => void;
}) {
  const colorClass = STATUS_COLOR[status] ?? "";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-start rounded-md border px-3 py-2.5 text-left transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)]/5"
          : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--ring)]"
      }`}
    >
      <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
      <span className="mt-1 text-xl font-bold tabular-nums text-[var(--foreground)]">
        {value}
      </span>
    </button>
  );
}

const STATUS_COLOR: Record<ApplicantStatus, string> = {
  pending: "text-[var(--muted-foreground)]",
  notified: "text-amber-700",
  paid: "text-emerald-700",
  overdue: "text-red-700",
  cancelled: "text-[var(--muted-foreground)]",
  enrolled: "text-emerald-700",
  refunded: "text-[var(--muted-foreground)]",
  next_cohort_interest: "text-sky-700",
};

function ApplicantStatusBadge({ status }: { status: ApplicantStatus }) {
  const map: Record<
    ApplicantStatus,
    {
      variant:
        | "default"
        | "secondary"
        | "outline"
        | "success"
        | "warning"
        | "destructive";
    }
  > = {
    pending: { variant: "outline" },
    notified: { variant: "warning" },
    paid: { variant: "success" },
    overdue: { variant: "destructive" },
    cancelled: { variant: "secondary" },
    enrolled: { variant: "success" },
    refunded: { variant: "secondary" },
    next_cohort_interest: { variant: "default" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{STATUS_LABEL_KO[status]}</Badge>;
}

function CohortStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    {
      variant:
        | "default"
        | "secondary"
        | "outline"
        | "success"
        | "warning"
        | "destructive";
      label: string;
    }
  > = {
    draft: { variant: "outline", label: "준비" },
    open: { variant: "default", label: "모집 중" },
    enrollment_closed: { variant: "secondary", label: "모집 마감" },
    in_progress: { variant: "success", label: "강의 중" },
    completed: { variant: "secondary", label: "수료" },
    cancelled: { variant: "destructive", label: "폐강" },
  };
  const cfg = map[status] ?? { variant: "outline", label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function SortableTh({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = active === sortKey;
  const arrow = isActive ? (dir === "asc" ? "↑" : "↓") : "";
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-semibold hover:text-[var(--foreground)] ${
          isActive
            ? "text-[var(--foreground)]"
            : "text-[var(--muted-foreground)]"
        }`}
      >
        {label}
        {arrow ? <span className="text-[10px]">{arrow}</span> : null}
      </button>
    </TableHead>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00+09:00");
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(d);
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function csvCell(value: string | null | undefined): string {
  if (!value) return "";
  // 쉼표 / 따옴표 / 개행 escape
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
