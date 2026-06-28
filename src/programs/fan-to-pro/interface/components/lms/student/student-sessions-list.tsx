"use client";

/**
 * Student Sessions List (B0060) — 학생 본인 [수업] 메뉴 list view.
 *
 * /[locale]/fan-to-pro/[cohortSlug]/student/sessions.
 *
 * 회차별 카드 list — 각 카드 클릭 시 detail 페이지로 이동. 각 row:
 *   - 회차 번호 + 날짜 (요일) + 시간
 *   - title (큰 글씨) + topic (한 줄 요약)
 *   - 강사 이름 + 회사
 *   - 우측: 본인 출결 status badge + 자료 N개 indicator
 *
 * 디자인:
 *   - 모바일 first — 카드 1열 stack, 정보 세로 적층
 *   - 데스크탑 (sm+) — 좌측 메타 / 우측 status + 자료 가로 정렬
 *   - 미시작/취소 회차는 회색 처리
 *   - 출결 status 색깔 = attendance-matrix 와 동일 (출=green / 지=yellow /
 *     결=red / 공=blue / 미=gray)
 *
 * 접근성:
 *   - 카드 전체가 <Link> — 키보드 Tab 접근 가능
 *   - status badge aria-label 로 명시 ("출석" 등)
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  Clock,
  FileText,
  ChevronRight,
  Check,
  X as XIcon,
  Minus,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import type {
  StudentSessionRow,
  StudentSessionAttendanceStatus,
} from "@/src/programs/fan-to-pro/application/queries/student/fetch-student-sessions-view";

type Props = {
  cohortName: string;
  cohortSlug: string;
  cohortStartsOn: string;
  cohortEndsOn: string;
  totalSessions: number;
  attendedCount: number;
  attendanceRate: number;
  rows: StudentSessionRow[];
  locale: string;
};

export function StudentSessionsList({
  cohortName,
  cohortSlug,
  cohortStartsOn,
  cohortEndsOn,
  totalSessions,
  attendedCount,
  attendanceRate,
  rows,
  locale,
}: Props) {
  const isEn = locale === "en";

  return (
    <div className="space-y-6">
      {/* 요약 카드 — 기수 + 출석률 */}
      <Card className="p-5 space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
            {isEn ? "Cohort" : "기수"}
          </p>
          <p className="text-base font-bold text-[var(--foreground)]">
            {cohortName}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {formatDateRange(cohortStartsOn, cohortEndsOn, isEn)}
          </p>
        </div>
        <div className="flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <Stat
            label={isEn ? "Attended" : "출석"}
            value={`${attendedCount}/${totalSessions}`}
          />
          <Stat
            label={isEn ? "Rate" : "출석률"}
            value={`${Math.round(attendanceRate * 100)}%`}
            highlight={attendanceRate >= 0.75}
          />
        </div>
      </Card>

      {/* 회차 list */}
      {rows.length === 0 ? (
        <Card className="p-10 text-center space-y-2">
          <Calendar
            className="h-10 w-10 mx-auto text-[var(--muted-foreground)]"
            aria-hidden
          />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {isEn ? "No sessions yet" : "아직 등록된 회차가 없습니다"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isEn
              ? "Your cohort schedule will appear here once sessions are created."
              : "기수 일정이 등록되면 이 페이지에서 확인할 수 있어요."}
          </p>
        </Card>
      ) : (
        <ul className="space-y-3" aria-label={isEn ? "Sessions" : "회차 목록"}>
          {rows.map((row) => (
            <li key={row.session_id}>
              <SessionCard
                row={row}
                cohortSlug={cohortSlug}
                locale={locale}
                isEn={isEn}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
    <div className="flex-1">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p
        className={
          highlight
            ? "text-lg font-bold text-[#067647]"
            : "text-lg font-bold text-[var(--foreground)]"
        }
      >
        {value}
      </p>
    </div>
  );
}

function SessionCard({
  row,
  cohortSlug,
  locale,
  isEn,
}: {
  row: StudentSessionRow;
  cohortSlug: string;
  locale: string;
  isEn: boolean;
}) {
  const href =
    `/${locale}/fan-to-pro/${cohortSlug}/student/sessions/${row.session_id}` as Route;
  const isCancelled = row.session_status === "cancelled";
  const isEnded = row.session_status === "ended";
  const isInProgress = row.session_status === "in_progress";
  const isScheduled = row.session_status === "scheduled";

  const statusMeta = ATTENDANCE_META[row.my_attendance_status];

  return (
    <Link
      href={href}
      className={[
        "group block rounded-xl border bg-[var(--card)] shadow-sm transition-all",
        "hover:shadow-md hover:border-[var(--primary)]/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2",
        isCancelled ? "opacity-60 border-[var(--border)]" : "border-[var(--border)]",
      ].join(" ")}
    >
      <div className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        {/* 좌측 — 회차 메타 */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 회차 번호 + 날짜 */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted-foreground)]">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--secondary)] text-[var(--secondary-foreground)]">
              {row.idx != null
                ? isEn
                  ? `Session ${row.idx}`
                  : `${row.idx}회차`
                : isEn
                  ? "Session"
                  : "회차"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {formatSessionDate(row.starts_at, isEn)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatSessionTime(row.starts_at)}
            </span>
            {isInProgress ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#dcfae6] text-[#067647] text-[10px] font-bold uppercase">
                {isEn ? "Live" : "진행 중"}
              </span>
            ) : null}
            {isCancelled ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fee4e2] text-[#b42318] text-[10px] font-bold uppercase">
                {isEn ? "Cancelled" : "취소"}
              </span>
            ) : null}
          </div>

          {/* title */}
          <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] leading-tight">
            {row.title}
          </h3>

          {/* topic */}
          {row.topic ? (
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-1">
              {row.topic}
            </p>
          ) : null}

          {/* 강사 */}
          {row.instructor_name ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              {isEn ? "Instructor" : "강사"}: {row.instructor_name}
              {row.instructor_company ? ` (${row.instructor_company})` : ""}
            </p>
          ) : null}
        </div>

        {/* 우측 — 출결 + 자료 */}
        <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-2 shrink-0">
          {/* 출결 status */}
          {isScheduled ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--secondary)] text-[var(--muted-foreground)] text-xs font-semibold"
              aria-label={isEn ? "Upcoming session" : "예정된 회차"}
            >
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {isEn ? "Upcoming" : "예정"}
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${statusMeta.badgeClass}`}
              aria-label={statusMeta.aria(isEn)}
            >
              <statusMeta.icon className="h-3.5 w-3.5" aria-hidden />
              {statusMeta.label(isEn)}
              {row.my_attendance_status === "late" && row.late_minutes != null
                ? ` ${row.late_minutes}${isEn ? "m" : "분"}`
                : ""}
            </span>
          )}

          {/* 자료 indicator */}
          <span
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]"
            aria-label={
              isEn
                ? `${row.materials_count} materials`
                : `자료 ${row.materials_count}개`
            }
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {isEn
              ? `${row.materials_count} ${row.materials_count === 1 ? "file" : "files"}`
              : `자료 ${row.materials_count}`}
          </span>

          <ChevronRight
            className="hidden sm:block h-4 w-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors"
            aria-hidden
          />
        </div>
      </div>

      {/* 미체크 + ended 안내 — 강조 */}
      {isEnded && row.my_attendance_status === "unmarked" ? (
        <div className="px-5 pb-4 -mt-1">
          <p className="inline-flex items-center gap-1.5 text-xs text-[#b54708]">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            {isEn
              ? "Attendance not recorded yet"
              : "출결이 아직 기록되지 않았어요"}
          </p>
        </div>
      ) : null}
    </Link>
  );
}

// -----------------------------------------------------------------------------
// status 메타 — attendance-matrix.tsx 와 동일 색깔 / short label 유지.
// -----------------------------------------------------------------------------

const ATTENDANCE_META: Record<
  StudentSessionAttendanceStatus,
  {
    label: (isEn: boolean) => string;
    aria: (isEn: boolean) => string;
    icon: React.ComponentType<{ className?: string }>;
    badgeClass: string;
  }
> = {
  present: {
    label: (isEn) => (isEn ? "Present" : "출석"),
    aria: (isEn) => (isEn ? "Present" : "출석 완료"),
    icon: Check,
    badgeClass: "bg-[#dcfae6] text-[#067647]",
  },
  late: {
    label: (isEn) => (isEn ? "Late" : "지각"),
    aria: (isEn) => (isEn ? "Late" : "지각"),
    icon: Clock,
    badgeClass: "bg-[#fef0c7] text-[#b54708]",
  },
  absent: {
    label: (isEn) => (isEn ? "Absent" : "결석"),
    aria: (isEn) => (isEn ? "Absent" : "결석"),
    icon: XIcon,
    badgeClass: "bg-[#fee4e2] text-[#b42318]",
  },
  excused: {
    label: (isEn) => (isEn ? "Excused" : "공결"),
    aria: (isEn) => (isEn ? "Excused absence" : "공결"),
    icon: Minus,
    badgeClass: "bg-[#e0f2fe] text-[#026aa2]",
  },
  unmarked: {
    label: (isEn) => (isEn ? "Not marked" : "미체크"),
    aria: (isEn) => (isEn ? "Attendance not marked" : "미체크"),
    icon: Minus,
    badgeClass: "bg-[var(--secondary)] text-[var(--muted-foreground)]",
  },
};

// -----------------------------------------------------------------------------
// date / time format — KST 기준.
// -----------------------------------------------------------------------------

function formatSessionDate(iso: string, isEn: boolean): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat(isEn ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  return fmt.format(d);
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(d);
}

function formatDateRange(
  startsOn: string,
  endsOn: string,
  isEn: boolean,
): string {
  const s = new Date(startsOn);
  const e = new Date(endsOn);
  const fmt = new Intl.DateTimeFormat(isEn ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${fmt.format(s)} ~ ${fmt.format(e)}`;
}
