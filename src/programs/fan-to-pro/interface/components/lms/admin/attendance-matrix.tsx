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
};

export function AttendanceMatrix({ sessions, students }: Props) {
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

  async function onCellClick(
    student: CohortRosterStudentRow,
    session: Session,
  ) {
    if (!isSessionStarted(session)) {
      setFeedback({
        kind: "error",
        message: `${session.idx ?? "?"}회차는 강의 시작 전이에요.`,
      });
      return;
    }
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
    if (!isSessionStarted(session)) return;
    const k = cellKey(student.student.id, session.id);
    setOptionsDialog({
      student,
      session,
      currentStatus: matrix[k] ?? "unmarked",
    });
  }

  async function onHeaderClick(session: Session) {
    if (!isSessionStarted(session)) {
      setFeedback({
        kind: "error",
        message: `${session.idx ?? "?"}회차는 강의 시작 전이에요.`,
      });
      return;
    }
    setBulkConfirm({ session });
  }

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
            셀을 탭하면 미체크 → 출석 → 지각 → 결석 → 공결 → 미체크 순으로
            바뀌어요. 회차 헤더의 [전원 출석] 버튼은 그 회차 모든 학생을 한
            번에 출석으로 기록해요. 셀에서 우클릭(또는 길게 누르기)하면 지각
            분 / 메모 입력 창이 열려요.
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
                <tr className="border-b border-[var(--border)]">
                  <th
                    scope="col"
                    className="sticky left-0 z-30 min-w-[160px] bg-[var(--card)] px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] border-r border-[var(--border)]"
                  >
                    학생
                  </th>
                  {sessions.map((session) => {
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
                            disabled={!started}
                            className={cn(
                              "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                              started
                                ? "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
                                : "cursor-not-allowed bg-transparent text-[var(--muted-foreground)]",
                            )}
                            aria-label={`${session.idx ?? "?"}회차 전원 출석`}
                            title={
                              started
                                ? "이 회차 전원 출석으로 일괄 기록"
                                : "강의 시작 전이라 일괄 기록 불가"
                            }
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
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {row.student.display_name}
                          </span>
                          {row.applicant?.nationality ? (
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              {row.applicant.nationality}
                              {row.applicant.visa
                                ? ` / ${row.applicant.visa}`
                                : ""}
                            </span>
                          ) : null}
                        </div>
                      </th>
                      {sessions.map((session) => {
                        const k = cellKey(row.student.id, session.id);
                        const status = matrix[k] ?? "unmarked";
                        const pending = pendingCells.has(k);
                        const started = isSessionStarted(session);
                        const meta = STATUS_META[status];
                        const Icon = meta.icon;

                        return (
                          <td
                            key={session.id}
                            className="border-r border-[var(--border)] p-1 last:border-r-0"
                          >
                            <button
                              type="button"
                              onClick={() => onCellClick(row, session)}
                              onContextMenu={(e) =>
                                onCellContextMenu(e, row, session)
                              }
                              disabled={!started || pending}
                              aria-label={`${row.student.display_name} ${session.idx ?? "?"}회차 ${meta.label}. 탭하면 다음 상태로 변경.`}
                              title={
                                !started
                                  ? "강의 시작 전"
                                  : `${meta.label} / 탭=다음 상태 / 우클릭=메모`
                              }
                              className={cn(
                                "relative flex h-12 w-full items-center justify-center rounded-md text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1",
                                !started
                                  ? "cursor-not-allowed bg-[var(--muted)]/40 text-[var(--muted-foreground)]/40"
                                  : meta.cellClass,
                              )}
                            >
                              {pending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{meta.short}</span>
                                </span>
                              )}
                            </button>
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
