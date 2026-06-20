"use client";

/**
 * LMS Cohorts Dashboard — Wave 0 미니멀 운영자 UI.
 *
 * 구성:
 * - 상단: 현재 cohort 카드 (이름 / 일정 / capacity / 등록 학생 수)
 * - paid 신청자 backfill 버튼 (한 번 누르면 paid 신청자 → student 자동 promote)
 * - 본문: sessions list (8개) — 각 row 의 [출결 mark] 버튼
 * - 출결 mark drawer (간단 inline panel): student list + status dropdown + 저장
 *
 * 라이트 톤 + 토스 스타일. <div data-theme="light"> wrapper 안에서 동작.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
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
import {
  backfillPaidApplicantsAction,
  markAttendanceAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-cohort-actions";
import type {
  CohortRoster,
  CohortRosterStudentRow,
} from "@/src/programs/fan-to-pro/application/queries/cohort/fetch-cohort-roster";
import type { Session } from "@/src/programs/fan-to-pro/domain/entities/session";
import type { AttendanceStatus } from "@/src/programs/fan-to-pro/domain/entities/attendance";
import { formatSessionTimeKst } from "@/src/programs/fan-to-pro/domain/entities/session";

const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "출석" },
  { value: "late", label: "지각" },
  { value: "absent", label: "결석" },
  { value: "excused", label: "공석" },
];

type Props = {
  roster: CohortRoster;
};

export function CohortsDashboard({ roster }: Props) {
  const router = useRouter();
  const { cohort, sessions, students } = roster;

  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(
    null,
  );
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);

  function onBackfill() {
    setFeedback(null);
    startTransition(async () => {
      const result = await backfillPaidApplicantsAction({ cohort_id: cohort.id });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setFeedback(
        `${result.inserted}명 등록 완료. 이미 등록된 신청자 ${result.skipped}명 건너뜀.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-6">
      {/* 헤더 */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          기수 관리
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          강의 회차 + 수강생 + 출결.
        </p>
      </header>

      {/* 현재 cohort 카드 */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              {cohort.name}
              <CohortStatusBadge status={cohort.status} />
            </CardTitle>
            <CardDescription className="mt-1.5">
              강의 {fmtDate(cohort.starts_on)} ~ {fmtDate(cohort.ends_on)}
              {cohort.ceremony_on ? ` / 수료식 ${fmtDate(cohort.ceremony_on)}` : ""}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="정원" value={`${cohort.capacity}명`} />
            <Stat label="최소 개강" value={`${cohort.min_to_open}명`} />
            <Stat label="등록 학생" value={`${students.length}명`} />
            <Stat label="회차" value={`${sessions.length}개`} />
          </dl>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onBackfill} disabled={pending} size="sm">
              {pending ? "처리 중..." : "결제 완료 신청자 일괄 등록"}
            </Button>
            {feedback ? (
              <span className="text-xs text-[var(--muted-foreground)]">{feedback}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* sessions list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">강의 회차</CardTitle>
          <CardDescription>회차별 출결을 기록합니다.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회차</TableHead>
                <TableHead>일시</TableHead>
                <TableHead>강의</TableHead>
                <TableHead>출결</TableHead>
                <TableHead className="text-right">동작</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const marked = students.filter(
                  (s) => s.attendanceMap[session.id] !== "unmarked",
                ).length;
                const total = students.length;
                return (
                  <TableRow key={session.id}>
                    <TableCell className="font-semibold">
                      {session.idx ? `${session.idx}회차` : "-"}
                    </TableCell>
                    <TableCell>{formatSessionTimeKst(session.starts_at)}</TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">
                      {session.title}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {marked} / {total}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={
                          selectedSessionId === session.id ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setSelectedSessionId(
                            selectedSessionId === session.id ? null : session.id,
                          )
                        }
                      >
                        {selectedSessionId === session.id ? "닫기" : "출결"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-[var(--muted-foreground)]"
                  >
                    회차가 없습니다.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 출결 mark panel */}
      {selectedSession ? (
        <AttendancePanel
          session={selectedSession}
          students={students}
          onClose={() => setSelectedSessionId(null)}
          onSaved={(msg) => {
            setFeedback(msg);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CohortStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive"; label: string }
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-[var(--foreground)]">{value}</dd>
    </div>
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

/* ─────────────────── Attendance panel ─────────────────── */

type PanelProps = {
  session: Session;
  students: CohortRosterStudentRow[];
  onClose: () => void;
  onSaved: (msg: string) => void;
};

function AttendancePanel({ session, students, onClose, onSaved }: PanelProps) {
  const [entries, setEntries] = React.useState<
    Record<string, { status: AttendanceStatus; late_minutes: number | null }>
  >(() =>
    Object.fromEntries(
      students.map((s) => {
        const current = s.attendanceMap[session.id];
        return [
          s.student.id,
          {
            status: (current !== "unmarked" ? current : "present") as AttendanceStatus,
            late_minutes: null,
          },
        ];
      }),
    ),
  );
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  }

  function updateLateMinutes(studentId: string, value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(180, Number(value) || 0));
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], late_minutes: num },
    }));
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const payload = {
        session_id: session.id,
        entries: students.map((s) => ({
          student_id: s.student.id,
          status: entries[s.student.id]?.status ?? "present",
          late_minutes: entries[s.student.id]?.late_minutes ?? null,
        })),
      };
      const result = await markAttendanceAction(payload);
      if (result.status === "error") {
        setError(`저장 실패: ${result.error}`);
        return;
      }
      const msg =
        result.normalizedCount > 0
          ? `저장 완료 (${result.normalizedCount}명은 30분 이상 지각 → 결석으로 자동 격하).`
          : "저장 완료.";
      onSaved(msg);
      onClose();
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            {session.idx ? `${session.idx}회차` : ""} 출결
          </CardTitle>
          <CardDescription>
            {formatSessionTimeKst(session.starts_at)} / {session.title}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
            등록된 수강생이 없습니다. 먼저 [결제 완료 신청자 일괄 등록] 버튼을
            눌러 학생을 등록하세요.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>수강생</TableHead>
                  <TableHead>출결</TableHead>
                  <TableHead>지각 (분)</TableHead>
                  <TableHead>전체 출석률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((row) => {
                  const entry = entries[row.student.id];
                  return (
                    <TableRow key={row.student.id}>
                      <TableCell className="font-semibold">
                        {row.student.display_name}
                      </TableCell>
                      <TableCell>
                        <select
                          aria-label={`${row.student.display_name} 출결`}
                          className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          value={entry?.status ?? "present"}
                          onChange={(e) =>
                            updateStatus(
                              row.student.id,
                              e.target.value as AttendanceStatus,
                            )
                          }
                          disabled={pending}
                        >
                          {ATTENDANCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          aria-label={`${row.student.display_name} 지각 분`}
                          className="h-9 w-20 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                          min={0}
                          max={180}
                          step={5}
                          placeholder="-"
                          value={entry?.late_minutes ?? ""}
                          onChange={(e) =>
                            updateLateMinutes(row.student.id, e.target.value)
                          }
                          disabled={pending || entry?.status !== "late"}
                        />
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)]">
                        {Math.round(row.attendanceRate * 100)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={onSave} disabled={pending} size="sm">
                {pending ? "저장 중..." : "출결 저장"}
              </Button>
              {error ? (
                <span className="text-xs text-[var(--destructive)]">{error}</span>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              30분 이상 지각은 자동으로 결석 처리됩니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
