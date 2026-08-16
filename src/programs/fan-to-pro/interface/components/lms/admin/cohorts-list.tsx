"use client";

/**
 * LMS Cohorts List — 다중 기수 리스트 (Sophia LMS audit P2 대응).
 *
 * 왜: 기존 `/admin/cohorts` = fetchActiveCohorts() 만 호출 + activeCohorts[0] 자동 상세 표시
 *   → 1기 종강 (status=completed) 후 empty state 로 "활성 기수가 없습니다" 표시.
 *   운영자 관점에서는 완료된 기수 / 준비중인 기수 모두 열람 필요.
 *
 * 이제: 모든 status 를 리스트로 표시 + 상태별 필터 chip. 카드 클릭 = 상세 이동.
 *
 * 인터렉션 (CLAUDE.md §6.7):
 * - 페이지 fade-in (page 레벨)
 * - 카드 stagger fade-in (40ms delay)
 * - 카드 hover: bg + shadow transition 150ms
 * - motion-safe: prefix 로 prefers-reduced-motion 존중
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  STAGGER_ITEM_CLASS,
  staggerDelay,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/stagger";
import type { CohortStatus } from "@/src/programs/fan-to-pro/domain/entities/cohort";

export type CohortListRow = {
  id: string;
  slug: string | null;
  name: string;
  status: CohortStatus;
  starts_on: string;
  ends_on: string;
  ceremony_on: string | null;
  capacity: number;
  min_to_open: number;
  accepts_signup_now: boolean | null;
  studentCount: number;
  sessionCount: number;
};

type FilterKey = "all" | CohortStatus;

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "전체",
  in_progress: "강의 중",
  open: "모집 중",
  enrollment_closed: "모집 마감",
  draft: "준비",
  completed: "수료",
  cancelled: "폐강",
};

const FILTER_ORDER: FilterKey[] = [
  "all",
  "in_progress",
  "open",
  "enrollment_closed",
  "draft",
  "completed",
  "cancelled",
];

/**
 * 정렬 우선순위 — 낮을수록 위. 같은 rank 내에서는 starts_on DESC.
 * 진행 중이 최상단, 준비 계열이 다음, 완료는 최신순, 폐강은 맨 아래.
 */
const STATUS_RANK: Record<CohortStatus, number> = {
  in_progress: 0,
  enrollment_closed: 1,
  open: 2,
  draft: 3,
  completed: 4,
  cancelled: 5,
};

function sortRows(rows: CohortListRow[]): CohortListRow[] {
  return [...rows].sort((a, b) => {
    const ra = STATUS_RANK[a.status];
    const rb = STATUS_RANK[b.status];
    if (ra !== rb) return ra - rb;
    return b.starts_on.localeCompare(a.starts_on);
  });
}

export function CohortsList({ rows }: { rows: CohortListRow[] }) {
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [filter, setFilter] = React.useState<FilterKey>("all");

  // 필터별 카운트 (chip 옆 숫자).
  const counts = React.useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: rows.length,
      draft: 0,
      open: 0,
      enrollment_closed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const row of rows) acc[row.status] += 1;
    return acc;
  }, [rows]);

  const sorted = React.useMemo(() => sortRows(rows), [rows]);
  const visible = React.useMemo(
    () => (filter === "all" ? sorted : sorted.filter((r) => r.status === filter)),
    [sorted, filter],
  );

  return (
    <div className="space-y-6">
      {/* Status filter chips */}
      <div
        role="tablist"
        aria-label="기수 상태 필터"
        className="flex flex-wrap gap-2"
      >
        {FILTER_ORDER.map((key) => {
          const active = filter === key;
          const count = counts[key];
          const disabled = key !== "all" && count === 0;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              onClick={() => setFilter(key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 " +
                (active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : disabled
                    ? "cursor-not-allowed border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] opacity-50"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--secondary)]")
              }
            >
              <span>{FILTER_LABELS[key]}</span>
              <span
                className={
                  "rounded-full px-1.5 text-[10px] tabular-nums " +
                  (active
                    ? "bg-white/20 text-[var(--primary-foreground)]"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)]")
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cohort grid */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            해당 상태의 기수가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((row, index) => (
            <CohortCard
              key={row.id}
              row={row}
              locale={locale}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Card ─────────────────── */

function CohortCard({
  row,
  locale,
  index,
}: {
  row: CohortListRow;
  locale: string;
  index: number;
}) {
  const href = row.slug
    ? (`/${locale}/fan-to-pro/admin/cohorts/${row.slug}` as Route)
    : null;

  const inner = (
    <Card
      className={
        "h-full transition-all duration-150 hover:border-[var(--primary)] hover:shadow-md " +
        STAGGER_ITEM_CLASS
      }
      style={staggerDelay(index)}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-xl">{row.name}</CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <CohortStatusBadge status={row.status} />
            {row.accepts_signup_now ? (
              <Badge variant="success">신청 받는 중</Badge>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {fmtRange(row.starts_on, row.ends_on)}
          {row.ceremony_on ? ` / 수료식 ${fmtDate(row.ceremony_on)}` : ""}
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-4 gap-3">
          <Stat label="정원" value={`${row.capacity}명`} />
          <Stat label="최소" value={`${row.min_to_open}명`} />
          <Stat label="학생" value={`${row.studentCount}명`} highlight />
          <Stat label="회차" value={`${row.sessionCount}개`} />
        </dl>
        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="text-[var(--muted-foreground)]">
            {row.slug ? `slug: ${row.slug}` : "slug 없음"}
          </span>
          {href ? (
            <span
              className="font-semibold text-[var(--primary)] transition-colors group-hover:underline"
              aria-hidden
            >
              상세 보기 →
            </span>
          ) : (
            <span className="text-[var(--muted-foreground)]">상세 불가</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) {
    return <div className="group">{inner}</div>;
  }

  return (
    <Link
      href={href}
      className="group block rounded-xl transition-transform duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
      aria-label={`${row.name} 상세 보기`}
    >
      {inner}
    </Link>
  );
}

/* ─────────────────── UI atoms ─────────────────── */

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </dt>
      <dd
        className={
          "mt-0.5 text-base font-bold tabular-nums " +
          (highlight ? "text-[var(--primary)]" : "text-[var(--foreground)]")
        }
      >
        {value}
      </dd>
    </div>
  );
}

function CohortStatusBadge({ status }: { status: CohortStatus }) {
  const map: Record<
    CohortStatus,
    {
      variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive";
      label: string;
    }
  > = {
    draft: { variant: "outline", label: "준비" },
    open: { variant: "warning", label: "모집 중" },
    enrollment_closed: { variant: "secondary", label: "모집 마감" },
    in_progress: { variant: "success", label: "강의 중" },
    completed: { variant: "secondary", label: "수료" },
    cancelled: { variant: "destructive", label: "폐강" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00+09:00");
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "long",
    day: "numeric",
  }).format(d);
}

function fmtRange(startsOn: string, endsOn: string): string {
  return `${fmtDate(startsOn)} 부터 ${fmtDate(endsOn)} 까지`;
}
