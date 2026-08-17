"use client";

/**
 * Attendance Matrix — /[locale]/fan-to-pro/admin/attendance
 *
 * 강의장 운영 시나리오 (오늘 1주차 14:00):
 *   1) 모바일/태블릿 으로 매트릭스 열기
 *   2) 학생 이름 행 × 회차 열 의 cell 을 1탭으로 cycle (unmarked → present → late → absent → excused → unmarked)
 *   3) 회차 시작 후 모두 출석이면 헤더의 [전원 출석] 1탭으로 일괄
 *   4) 잘못 mark 한 cell 은 다시 탭해서 cycle 로 복원
 *   5) late_minutes 또는 notes 가 필요하면 cell 우클릭 (또는 길게 누르기) → Dialog
 *
 * 디자인 시스템: shadcn/ui (Button, Badge, Card, Dialog), lucide-react
 * 라이트 토스 톤 / Pretendard / 12px radius
 *
 * Optimistic UI: cell click → 즉시 local state 갱신 + spinner overlay → server action
 *   → 실패 시 rollback + toast.
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Check,
  Clock,
  X as XIcon,
  Minus,
  Users,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/popover";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";
import {
  markAttendanceLmsAction,
  markAttendanceBulkLmsAction,
  markAttendanceClearLmsAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-attendance-actions";
import type { AttendanceStatus } from "@/src/programs/fan-to-pro/domain/entities/attendance";
import {
  COMPLETION_ATTENDANCE_THRESHOLD,
  calculateAttendanceRate,
} from "@/src/programs/fan-to-pro/domain/entities/attendance";

/**
 * server action 의 error code → 운영자가 알아보는 KO 카피.
 * Sage 보안 강화 — internal error.message 노출 X. whitelist 만.
 */
const ERROR_LABEL: Record<string, string> = {
  invalidInput: "입력값이 올바르지 않아요.",
  sessionNotFound: "회차를 찾을 수 없어요.",
  studentNotFound: "학생을 찾을 수 없어요.",
  cohortMismatch: "이 학생은 이 회차의 기수가 아니에요.",
  forbidden: "권한이 없어요. 다시 로그인해 주세요.",
  internal: "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
};

function errorMessage(code: string): string {
  return ERROR_LABEL[code] ?? ERROR_LABEL.internal;
}
import type { Session } from "@/src/programs/fan-to-pro/domain/entities/session";
import type { CohortRosterStudentRow } from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import { groupSessionsByCourse } from "@/src/programs/fan-to-pro/domain/services/session-course-grouping";

type CellStatus = AttendanceStatus | "unmarked";

const CYCLE_ORDER: CellStatus[] = [
  "unmarked",
  "present",
  "late",
  "absent",
  "excused",
];

function nextStatus(current: CellStatus): CellStatus {
  const idx = CYCLE_ORDER.indexOf(current);
  return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
}

const STATUS_META: Record<
  CellStatus,
  {
    label: string;
    short: string;
    icon: React.ComponentType<{ className?: string }>;
    cellClass: string;
    legendClass: string;
  }
> = {
  unmarked: {
    label: "미체크",
    short: "-",
    icon: Minus,
    cellClass:
      "bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]",
    legendClass: "bg-[var(--card)] border border-[var(--border)]",
  },
  present: {
    label: "출석",
    short: "출",
    icon: Check,
    cellClass:
      "bg-[#dcfae6] text-[#067647] hover:bg-[#bbf2ce]",
    legendClass: "bg-[#dcfae6] text-[#067647]",
  },
  late: {
    label: "지각",
    short: "지",
    icon: Clock,
    cellClass:
      "bg-[#fef0c7] text-[#b54708] hover:bg-[#fde398]",
    legendClass: "bg-[#fef0c7] text-[#b54708]",
  },
  absent: {
    label: "결석",
    short: "결",
    icon: XIcon,
    cellClass:
      "bg-[#fee4e2] text-[#b42318] hover:bg-[#fbcdc8]",
    legendClass: "bg-[#fee4e2] text-[#b42318]",
  },
  excused: {
    label: "공결",
    short: "공",
    icon: Minus,
    cellClass:
      "bg-[#e0f2fe] text-[#026aa2] hover:bg-[#bae6fd]",
    legendClass: "bg-[#e0f2fe] text-[#026aa2]",
  },
};

type MatrixCellKey = `${string}__${string}`;

function cellKey(studentId: string, sessionId: string): MatrixCellKey {
  return `${studentId}__${sessionId}` as MatrixCellKey;
}

type Props = {
  cohortName: string;
  sessions: Session[];
  students: CohortRosterStudentRow[];
  /**
   * course_id → title_ko (태스크 #24 Phase 4). 1기 = 단일 course → 그룹 헤더
   * 생략 (기존 렌더 불변). 2기부터 A&R / 음향 등 course 별 회차 구획.
   * 미전달 시 빈 배열 = 단일 취급.
   */
  courseTitles?: Array<{ courseId: string; title: string }>;
};

/**
 * course 그룹 헤더 배지 색 — solid 블록 (§6.8 그라데이션/글로우 금지).
 * course 순서대로 순환. accent = solid 단색.
 */
const COURSE_TAG_CLASSES = [
  "bg-[#eef2ff] text-[#3538cd] border-[#c7d2fe]",
  "bg-[#f0fdf9] text-[#0f766e] border-[#99f6e4]",
  "bg-[#fef6ee] text-[#b93815] border-[#f9dbaf]",
  "bg-[#fdf2fa] text-[#c11574] border-[#fccee8]",
];

export function AttendanceMatrix({ sessions, students, courseTitles }: Props) {
  const courseTitleById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courseTitles ?? []) m.set(c.courseId, c.title);
    return m;
  }, [courseTitles]);

  const grouping = React.useMemo(
    () => groupSessionsByCourse(sessions, courseTitleById),
    [sessions, courseTitleById],
  );

  // course_id → 순환 tag class (멀티 course 일 때만 사용).
  const courseTagClassById = React.useMemo(() => {
    const m = new Map<string, string>();
    let i = 0;
    for (const g of grouping.groups) {
      if (g.courseId != null) {
        m.set(g.courseId, COURSE_TAG_CLASSES[i % COURSE_TAG_CLASSES.length]);
        i += 1;
      }
    }
    return m;
  }, [grouping]);

  // 컬럼 렌더 순서 = course 그룹 순서로 flatten (그룹 헤더 colSpan 과 정렬 일치).
  // 단일 course (1기) 면 결과가 입력 sessions 와 동일 순서 → 무회귀.
  const orderedSessions = React.useMemo(
    () => grouping.groups.flatMap((g) => g.sessions),
    [grouping],
  );
  // local state — student × session → CellStatus
  // server roundtrip 동안 optimistic update.
  const [matrix, setMatrix] = React.useState<Record<MatrixCellKey, CellStatus>>(
    () => {
      const initial: Record<MatrixCellKey, CellStatus> = {};
      for (const row of students) {
        for (const session of sessions) {
          initial[cellKey(row.student.id, session.id)] =
            row.attendanceMap[session.id] ?? "unmarked";
        }
      }
      return initial;
    },
  );

  // pending cells — server action 진행 중인 cell 표시.
  const [pendingCells, setPendingCells] = React.useState<Set<MatrixCellKey>>(
    new Set(),
  );

  // 사용자 피드백 — toast 대용 (sonner 도입 전).
  const [feedback, setFeedback] = React.useState<{
    kind: "ok" | "error";
    message: string;
  } | null>(null);

  // 회차별 일괄 confirm Dialog.
  const [bulkConfirm, setBulkConfirm] = React.useState<{
    session: Session;
  } | null>(null);

  // 우클릭 / 길게 누르기 시 옵션 Dialog (late_minutes / notes).
  const [optionsDialog, setOptionsDialog] = React.useState<{
    student: CohortRosterStudentRow;
    session: Session;
    currentStatus: CellStatus;
  } | null>(null);

  // 현재 시각 — 회차 disabled 판정. force-dynamic page 라 페이지 진입 시 fresh.
  // (cell 클릭 시점이 정확할 필요는 없음 — 분 단위 정확도면 충분.)
  const nowMs = React.useMemo(() => Date.now(), []);

  function isSessionStarted(session: Session): boolean {
    return new Date(session.starts_at).getTime() <= nowMs;
  }

  const startKey = (k: MatrixCellKey) =>
    setPendingCells((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  const endKey = (k: MatrixCellKey) =>
    setPendingCells((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });

  // cell popover open state — 1개만 동시 열림.
  const [openCellKey, setOpenCellKey] = React.useState<string | null>(null);

  // popover 안의 빠른 상태 선택 (출/지/결/공/미체크).
  async function onPopoverPick(
    student: CohortRosterStudentRow,
    session: Session,
    pick: AttendanceStatus | "clear",
  ) {
    const k = cellKey(student.student.id, session.id);
    setOpenCellKey(null);
    const current = matrix[k] ?? "unmarked";
    const nextStatus: CellStatus = pick === "clear" ? "unmarked" : pick;

    setMatrix((prev) => ({ ...prev, [k]: nextStatus }));
    startKey(k);
    setFeedback(null);

    try {
      if (pick === "clear") {
        const r = await markAttendanceClearLmsAction({
          session_id: session.id,
          student_id: student.student.id,
        });
        if (r.status === "error") {
          setMatrix((prev) => ({ ...prev, [k]: current }));
          setFeedback({ kind: "error", message: `취소 실패: ${errorMessage(r.error)}` });
        } else {
          setFeedback({
            kind: "ok",
            message: `${student.student.display_name} ${session.idx ?? "?"}회차 미체크`,
          });
        }
      } else {
        const r = await markAttendanceLmsAction({
          session_id: session.id,
          student_id: student.student.id,
          status: pick,
        });
        if (r.status === "error") {
          setMatrix((prev) => ({ ...prev, [k]: current }));
          setFeedback({ kind: "error", message: `저장 실패: ${errorMessage(r.error)}` });
        } else {
          const normalized = (r.normalizedStatus ?? pick) as CellStatus;
          setMatrix((prev) => ({ ...prev, [k]: normalized }));
          setFeedback({
            kind: "ok",
            message: `${student.student.display_name} ${session.idx ?? "?"}회차 ${STATUS_META[normalized].label} 저장`,
          });
        }
      }
    } finally {
      endKey(k);
    }
  }

  // (legacy) cycle 동작은 OptionsDialog 안의 빠른 status 버튼으로 흡수됨.
  // 본 함수는 더 이상 호출 안 함 — 향후 keyboard shortcut 또는 bulk action 에서 재사용 가능.
  async function _cycleStatusAt(
    student: CohortRosterStudentRow,
    session: Session,
  ) {
    const k = cellKey(student.student.id, session.id);
    const current = matrix[k] ?? "unmarked";
    const next = nextStatus(current);

    // optimistic update
    setMatrix((prev) => ({ ...prev, [k]: next }));
    startKey(k);
    setFeedback(null);

    try {
      if (next === "unmarked") {
        const result = await markAttendanceClearLmsAction({
          session_id: session.id,
          student_id: student.student.id,
        });
        if (result.status === "error") {
          // rollback
          setMatrix((prev) => ({ ...prev, [k]: current }));
          setFeedback({
            kind: "error",
            message: `취소 실패: ${errorMessage(result.error)}`,
          });
        } else {
          setFeedback({
            kind: "ok",
            message: `${student.student.display_name} ${session.idx ?? "?"}회차 미체크로 변경`,
          });
        }
      } else {
        const result = await markAttendanceLmsAction({
          session_id: session.id,
          student_id: student.student.id,
          status: next,
        });
        if (result.status === "error") {
          setMatrix((prev) => ({ ...prev, [k]: current }));
          setFeedback({
            kind: "error",
            message: `저장 실패: ${errorMessage(result.error)}`,
          });
        } else {
          // normalizeAttendanceStatus 가 late → absent 격하 가능. UI 도 반영.
          // server 가 normalizedStatus 반환 — 그대로 매트릭스에 적용 (단일 source of truth).
          if (result.normalizedStatus !== next) {
            setMatrix((prev) => ({ ...prev, [k]: result.normalizedStatus }));
            setFeedback({
              kind: "ok",
              message: `${student.student.display_name} 30분 이상 지각 → 결석 자동 격하`,
            });
          } else {
            setFeedback({
              kind: "ok",
              message: `${student.student.display_name} ${session.idx ?? "?"}회차 ${STATUS_META[next].label} 저장`,
            });
          }
        }
      }
    } finally {
      endKey(k);
    }
  }

  function onCellContextMenu(
    e: React.MouseEvent,
    student: CohortRosterStudentRow,
    session: Session,
  ) {
    e.preventDefault();
    const k = cellKey(student.student.id, session.id);
    setOptionsDialog({
      student,
      session,
      currentStatus: matrix[k] ?? "unmarked",
    });
  }

  async function onHeaderClick(session: Session) {
    setBulkConfirm({ session });
  }

  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";

  async function confirmBulkPresent() {
    if (!bulkConfirm) return;
    const session = bulkConfirm.session;
    setBulkConfirm(null);
    setFeedback(null);

    // optimistic — 전 학생 present.
    const prevSnapshot: Record<MatrixCellKey, CellStatus> = {};
    setMatrix((prev) => {
      const next = { ...prev };
      for (const row of students) {
        const k = cellKey(row.student.id, session.id);
        prevSnapshot[k] = prev[k] ?? "unmarked";
        next[k] = "present";
        startKey(k);
      }
      return next;
    });

    try {
      const result = await markAttendanceBulkLmsAction({
        session_id: session.id,
        marks: students.map((row) => ({
          student_id: row.student.id,
          status: "present" as const,
        })),
      });

      if (result.status === "error") {
        // rollback
        setMatrix((prev) => ({ ...prev, ...prevSnapshot }));
        setFeedback({
          kind: "error",
          message: `일괄 출석 실패: ${errorMessage(result.error)}`,
        });
      } else {
        setFeedback({
          kind: "ok",
          message: `${session.idx ?? "?"}회차 전원 출석 (${result.marked}명) 저장 완료`,
        });
      }
    } finally {
      // 모든 cell pending 해제.
      setPendingCells((prev) => {
        const next = new Set(prev);
        for (const row of students) {
          next.delete(cellKey(row.student.id, session.id));
        }
        return next;
      });
    }
  }

  // ─────────── 통계 계산 ───────────
  const totalSessions = sessions.length;

  function studentRate(studentId: string): number {
    const statuses: { status: AttendanceStatus }[] = [];
    for (const session of sessions) {
      const s = matrix[cellKey(studentId, session.id)];
      if (s && s !== "unmarked") statuses.push({ status: s });
    }
    return calculateAttendanceRate(statuses, totalSessions);
  }

  function sessionRate(sessionId: string): {
    present: number;
    total: number;
    rate: number;
  } {
    let present = 0;
    let total = 0;
    for (const row of students) {
      const s = matrix[cellKey(row.student.id, sessionId)] ?? "unmarked";
      if (s !== "unmarked") {
        total += 1;
        if (s === "present" || s === "late") present += 1;
      }
    }
    return {
      present,
      total,
      rate: total > 0 ? present / total : 0,
    };
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">사용 가이드</CardTitle>
          <CardDescription className="text-xs">
            셀을 탭하면 상태 선택 창이 열려요 (출석 / 지각 / 결석 / 공결 / 미체크).
            지각 분, 메모도 같은 창에서 입력 가능해요.
            회차 헤더의 [전원 출석] 버튼은 그 회차 모든 학생을 한 번에 출석으로 기록해요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-4">
          {(["present", "late", "absent", "excused", "unmarked"] as CellStatus[]).map(
            (s) => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              return (
                <div
                  key={s}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                    meta.legendClass,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </div>
              );
            },
          )}
        </CardContent>
      </Card>

      {/* Feedback bar */}
      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-md border px-4 py-2.5 text-sm",
            feedback.kind === "ok"
              ? "border-[#dcfae6] bg-[#f0fdf4] text-[#067647]"
              : "border-[#fee4e2] bg-[#fef2f2] text-[#b42318]",
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Matrix */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-[var(--card)]">
                {/* course 그룹 헤더 — 멀티 course (2기+) 일 때만. 1기 단일 course 는 미표시 (무회귀). */}
                {grouping.isMultiCourse ? (
                  <tr className="border-b border-[var(--border)]">
                    <th
                      scope="col"
                      className="sticky left-0 z-30 min-w-[160px] bg-[var(--card)] px-4 py-2 text-left text-[11px] font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]"
                    >
                      과정
                    </th>
                    {grouping.groups.map((group) => {
                      const tagClass = group.courseId
                        ? courseTagClassById.get(group.courseId)
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]";
                      return (
                        <th
                          key={group.key}
                          scope="colgroup"
                          colSpan={group.sessions.length}
                          className="px-2 py-2 text-center border-r border-[var(--border)] last:border-r-0"
                        >
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                              tagClass,
                            )}
                          >
                            {group.title ?? "과정 미지정"}
                          </span>
                        </th>
                      );
                    })}
                    <th
                      scope="col"
                      aria-hidden="true"
                      className="min-w-[100px] bg-[var(--card)] border-l border-[var(--border)]"
                    />
                  </tr>
                ) : null}
                <tr className="border-b border-[var(--border)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 min-w-[160px] bg-[var(--card)] px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]"
                  >
                    학생
                  </th>
                  {orderedSessions.map((session) => {
                    const started = isSessionStarted(session);
                    const { present, total, rate } = sessionRate(session.id);
                    return (
                      <th
                        key={session.id}
                        scope="col"
                        className={cn(
                          "min-w-[88px] px-2 py-2 text-center text-xs font-semibold border-r border-[var(--border)] last:border-r-0",
                          started
                            ? "bg-[var(--card)] text-[var(--foreground)]"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            {fmtSessionDate(session.starts_at)}
                          </span>
                          <span className="text-sm font-bold">
                            {session.idx ?? "?"}회차
                          </span>
                          <button
                            type="button"
                            onClick={() => onHeaderClick(session)}
                            className={cn(
                              "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                              "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20",
                            )}
                            aria-label={`${session.idx ?? "?"}회차 전원 출석`}
                            title="이 회차 전원 출석으로 일괄 기록"
                          >
                            <Users className="h-3 w-3" />
                            전원 출석
                          </button>
                          <span
                            className={cn(
                              "text-[10px] tabular-nums",
                              rate >= 0.75
                                ? "text-[#067647]"
                                : "text-[var(--muted-foreground)]",
                            )}
                          >
                            {total > 0
                              ? `${present}/${total} (${Math.round(rate * 100)}%)`
                              : started
                                ? "0/0"
                                : "대기"}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th
                    scope="col"
                    className="min-w-[100px] bg-[var(--card)] px-3 py-3 text-center text-xs font-semibold text-[var(--muted-foreground)] border-l border-[var(--border)]"
                  >
                    출석률
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((row, rowIdx) => {
                  const rate = studentRate(row.student.id);
                  const ratePct = Math.round(rate * 100);
                  const passingCompletion = rate >= COMPLETION_ATTENDANCE_THRESHOLD;
                  return (
                    <tr
                      key={row.student.id}
                      className={cn(
                        "border-b border-[var(--border)] last:border-b-0",
                        rowIdx % 2 === 1 ? "bg-[var(--card)]" : "bg-[var(--background)]",
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          "sticky left-0 z-10 px-4 py-2 text-left font-semibold text-[var(--foreground)] border-r border-[var(--border)]",
                          rowIdx % 2 === 1 ? "bg-[var(--card)]" : "bg-[var(--background)]",
                        )}
                      >
                        <Link
                          href={
                            `/${locale}/fan-to-pro/admin/students/${row.student.id}` as Route
                          }
                          className="flex flex-col text-[var(--primary)] underline-offset-4 hover:underline"
                        >
                          <span className="text-sm">
                            {row.student.display_name}
                          </span>
                          {row.nameKo ? (
                            <span className="text-[11px] font-semibold text-[var(--foreground)] no-underline">
                              {row.nameKo}
                            </span>
                          ) : null}
                          {(row.profile?.nationality ?? row.applicant?.nationality) ? (
                            <span className="text-[10px] font-normal text-[var(--muted-foreground)] no-underline">
                              {row.profile?.nationality ?? row.applicant?.nationality}
                              {row.applicant?.visa
                                ? ` / ${row.applicant.visa}`
                                : ""}
                            </span>
                          ) : null}
                        </Link>
                      </th>
                      {orderedSessions.map((session) => {
                        const k = cellKey(row.student.id, session.id);
                        const status = matrix[k] ?? "unmarked";
                        const pending = pendingCells.has(k);
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;

                        return (
                          <td
                            key={session.id}
                            className="border-r border-[var(--border)] p-1 last:border-r-0"
                          >
                            <Popover
                              open={openCellKey === k}
                              onOpenChange={(o) => setOpenCellKey(o ? k : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  onContextMenu={(e) =>
                                    onCellContextMenu(e, row, session)
                                  }
                                  disabled={pending}
                                  aria-label={`${row.student.display_name} ${session.idx ?? "?"}회차 ${meta.label}. 탭하면 상태 선택.`}
                                  title={`${meta.label} / 탭 = 상태 선택`}
                                  className={cn(
                                    "relative flex h-12 w-full items-center justify-center gap-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1",
                                    meta.cellClass,
                                  )}
                                >
                                  {pending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Icon className="h-3.5 w-3.5" />
                                      <span>{meta.label}</span>
                                    </>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="center" sideOffset={4} className="w-56 p-2">
                                <div className="grid grid-cols-1 gap-1">
                                  {(["present", "late", "absent", "excused", "unmarked"] as CellStatus[]).map((s) => {
                                    const m = STATUS_META[s];
                                    const I = m.icon;
                                    const isCurrent = s === status;
                                    return (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={async () => {
                                          // close popover via radix Escape pattern — re-render handles it
                                          if (s === "unmarked") {
                                            await onPopoverPick(row, session, "clear");
                                          } else {
                                            await onPopoverPick(row, session, s);
                                          }
                                        }}
                                        className={cn(
                                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors text-left",
                                          m.legendClass,
                                          isCurrent && "ring-2 ring-[var(--ring)] ring-offset-1",
                                        )}
                                      >
                                        <I className="h-4 w-4" />
                                        <span>{m.label}</span>
                                        {isCurrent ? (
                                          <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">현재</span>
                                        ) : null}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="mt-2 border-t border-[var(--border)] pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOptionsDialog({
                                        student: row,
                                        session,
                                        currentStatus: status,
                                      });
                                    }}
                                    className="w-full rounded-md px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] text-left"
                                  >
                                    옵션 더 보기 (지각 분 / 메모)
                                  </button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center border-l border-[var(--border)]">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              passingCompletion
                                ? "text-[#067647]"
                                : "text-[#b54708]",
                            )}
                          >
                            {ratePct}%
                          </span>
                          <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--muted)]">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                passingCompletion
                                  ? "bg-[#067647]"
                                  : "bg-[#b54708]",
                              )}
                              style={{ width: `${Math.min(100, ratePct)}%` }}
                            />
                          </div>
                          {passingCompletion ? (
                            <span className="text-[9px] text-[#067647]">
                              수료 가능
                            </span>
                          ) : (
                            <span className="text-[9px] text-[var(--muted-foreground)]">
                              기준 75%
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 일괄 confirm Dialog */}
      <Dialog
        open={bulkConfirm !== null}
        onOpenChange={(open) => !open && setBulkConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkConfirm?.session.idx ?? "?"}회차 전원 출석으로 기록할까요?
            </DialogTitle>
            <DialogDescription>
              현재 학생 {students.length}명 모두 출석으로 일괄 기록합니다.
              이후 개별 셀에서 정정할 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkConfirm(null)}
              size="sm"
            >
              취소
            </Button>
            <Button onClick={confirmBulkPresent} size="sm">
              전원 출석 기록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 옵션 Dialog — late_minutes / notes */}
      <OptionsDialog
        state={optionsDialog}
        onClose={() => setOptionsDialog(null)}
        onApply={async (payload) => {
          if (!optionsDialog) return;
          const { student, session } = optionsDialog;
          const k = cellKey(student.student.id, session.id);
          const previous = matrix[k] ?? "unmarked";

          setOptionsDialog(null);
          setMatrix((prev) => ({ ...prev, [k]: payload.status }));
          startKey(k);
          setFeedback(null);

          try {
            const result = await markAttendanceLmsAction({
              session_id: session.id,
              student_id: student.student.id,
              status: payload.status,
              late_minutes: payload.late_minutes,
              notes: payload.notes,
            });
            if (result.status === "error") {
              setMatrix((prev) => ({ ...prev, [k]: previous }));
              setFeedback({
                kind: "error",
                message: `저장 실패: ${errorMessage(result.error)}`,
              });
            } else {
              if (result.normalizedStatus !== payload.status) {
                setMatrix((prev) => ({
                  ...prev,
                  [k]: result.normalizedStatus,
                }));
                setFeedback({
                  kind: "ok",
                  message: `${student.student.display_name} 30분 이상 지각 → 결석 자동 격하`,
                });
              } else {
                setFeedback({
                  kind: "ok",
                  message: `${student.student.display_name} ${session.idx ?? "?"}회차 ${STATUS_META[payload.status].label} 저장`,
                });
              }
            }
          } finally {
            endKey(k);
          }
        }}
        onClear={async () => {
          if (!optionsDialog) return;
          const { student, session } = optionsDialog;
          const k = cellKey(student.student.id, session.id);
          const previous = matrix[k] ?? "unmarked";

          setOptionsDialog(null);
          setMatrix((prev) => ({ ...prev, [k]: "unmarked" }));
          startKey(k);
          setFeedback(null);

          try {
            const result = await markAttendanceClearLmsAction({
              session_id: session.id,
              student_id: student.student.id,
            });
            if (result.status === "error") {
              setMatrix((prev) => ({ ...prev, [k]: previous }));
              setFeedback({
                kind: "error",
                message: `취소 실패: ${errorMessage(result.error)}`,
              });
            } else {
              setFeedback({
                kind: "ok",
                message: `${student.student.display_name} ${session.idx ?? "?"}회차 미체크로 변경`,
              });
            }
          } finally {
            endKey(k);
          }
        }}
      />
    </div>
  );
}

/* ────────── helpers ────────── */

function fmtSessionDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  }).format(d);
}

/* ────────── OptionsDialog ────────── */

function OptionsDialog({
  state,
  onClose,
  onApply,
  onClear,
}: {
  state: {
    student: CohortRosterStudentRow;
    session: Session;
    currentStatus: CellStatus;
  } | null;
  onClose: () => void;
  onApply: (payload: {
    status: AttendanceStatus;
    late_minutes: number | null;
    notes: string | null;
  }) => void | Promise<void>;
  onClear: () => void | Promise<void>;
}) {
  const open = state !== null;

  const initialStatus: AttendanceStatus =
    state && state.currentStatus !== "unmarked"
      ? (state.currentStatus as AttendanceStatus)
      : "present";

  const [status, setStatus] = React.useState<AttendanceStatus>(initialStatus);
  const [lateMinutes, setLateMinutes] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  // dialog 열릴 때 state 동기화.
  React.useEffect(() => {
    if (state) {
      setStatus(
        state.currentStatus !== "unmarked"
          ? (state.currentStatus as AttendanceStatus)
          : "present",
      );
      setLateMinutes("");
      setNotes("");
    }
  }, [state]);

  function handleApply() {
    const lm =
      lateMinutes === "" ? null : Math.max(0, Math.min(180, Number(lateMinutes) || 0));
    onApply({
      status,
      late_minutes: status === "late" ? lm : null,
      notes: notes.trim() || null,
    });
  }

  if (!state) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.student.student.display_name} /{" "}
            {state.session.idx ?? "?"}회차 출결
          </DialogTitle>
          <DialogDescription>
            상태를 고르고 필요하면 지각 분 / 메모를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>상태</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map(
                (s) => {
                  const meta = STATUS_META[s];
                  const Icon = meta.icon;
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={cn(
                        "inline-flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs font-semibold transition-colors",
                        active
                          ? `${meta.legendClass} border-current`
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--ring)]",
                      )}
                      aria-pressed={active}
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {status === "late" ? (
            <div className="space-y-2">
              <Label htmlFor="late-minutes">
                지각 분 (선택)
              </Label>
              <Input
                id="late-minutes"
                type="number"
                min={0}
                max={180}
                value={lateMinutes}
                onChange={(e) => setLateMinutes(e.target.value)}
                placeholder="예: 15"
              />
              <p className="text-[11px] text-[var(--muted-foreground)]">
                30분 이상 입력 시 결석으로 자동 격하됩니다.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 사전 양해, 병가 등"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClear}>
            미체크로 되돌리기
          </Button>
          <Button size="sm" onClick={handleApply}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
