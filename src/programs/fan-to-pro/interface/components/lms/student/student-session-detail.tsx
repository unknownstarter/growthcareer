"use client";

/**
 * Student Session Detail (B0060) — 회차 1개의 상세 view.
 *
 * /[locale]/fan-to-pro/[cohortSlug]/student/sessions/[sessionId].
 *
 * 섹션:
 *   1. 회차 메타 (idx + 날짜 + title + topic + 강사)
 *   2. 내 출결 (status badge + 마크 시각 + 메모)
 *   3. 강의 내용 (session.description = sessions.notes 컬럼)
 *   4. 강의 자료 (자료 list + 다운로드 버튼)
 *
 * 자료 다운로드:
 *   - `getMaterialDownloadUrlAction({ material_id })` 호출
 *   - 새 탭 (window.open(url, '_blank', 'noopener,noreferrer')) — Sage MED-2
 *
 * 빈 상태:
 *   - 출결 unmarked → "아직 출결이 기록되지 않았어요"
 *   - 자료 0 → "이 회차 자료는 아직 업로드되지 않았어요"
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Download,
  ExternalLink,
  Check,
  X as XIcon,
  Minus,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { getMaterialDownloadUrlAction } from "@/src/programs/fan-to-pro/application/lecture-material/get-material-download-url";
import type {
  StudentSessionDetail,
  StudentSessionDetailMaterial,
} from "@/src/programs/fan-to-pro/application/queries/student/fetch-student-session-detail";

type Props = {
  detail: StudentSessionDetail;
  cohortSlug: string;
  locale: string;
};

export function StudentSessionDetailView({ detail, cohortSlug, locale }: Props) {
  const isEn = locale === "en";
  const backHref = `/${locale}/fan-to-pro/${cohortSlug}/student/sessions` as Route;
  const { session, instructor, my_attendance, materials } = detail;

  // status enum 외에 실시간 시각 비교도 같이 — 운영자가 status 수동 변경 안 해도 자동 분기.
  const nowMs = Date.now();
  const startsMs = new Date(session.starts_at).getTime();
  const endsMs = new Date(session.ends_at).getTime();
  const isCancelled = session.status === "cancelled";
  const timeStarted = nowMs >= startsMs;
  const timeEnded = nowMs >= endsMs;
  const isFuture = !isCancelled && !timeStarted;
  const isInProgress = !isCancelled && timeStarted && !timeEnded;
  const isEnded = !isCancelled && timeEnded;

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md px-1 py-0.5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {isEn ? "Back to sessions" : "회차 목록으로"}
      </Link>

      {/* 1. 회차 메타 */}
      <Card>
        <CardHeader className="space-y-3">
          {/* 회차 + 날짜 + 상태 badge */}
          <div className="flex flex-wrap items-center gap-2">
            {session.idx != null ? (
              <Badge variant="outline" className="text-xs">
                {isEn ? `Session ${session.idx}` : `${session.idx}회차`}
              </Badge>
            ) : null}
            <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {formatFullDate(session.starts_at, isEn)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatTimeRange(session.starts_at, session.ends_at)}
            </span>
            {isInProgress ? (
              <Badge variant="success" className="text-[10px] uppercase">
                {isEn ? "Live" : "진행 중"}
              </Badge>
            ) : null}
            {isCancelled ? (
              <Badge variant="destructive" className="text-[10px] uppercase">
                {isEn ? "Cancelled" : "취소"}
              </Badge>
            ) : null}
            {isEnded ? (
              <Badge variant="secondary" className="text-[10px] uppercase">
                {isEn ? "Ended" : "종료"}
              </Badge>
            ) : null}
          </div>

          {/* title */}
          <CardTitle className="text-xl sm:text-2xl">{session.title}</CardTitle>

          {/* topic */}
          {session.topic ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              {session.topic}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm">
          {/* 강사 */}
          {instructor ? (
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                {isEn ? "Instructor" : "강사"}
              </span>
              <span className="font-semibold">{instructor.name}</span>
              {instructor.company_name ? (
                <span className="text-[var(--muted-foreground)]">
                  ({instructor.company_name})
                </span>
              ) : null}
            </div>
          ) : null}

          {/* 장소 */}
          {session.location ? (
            <div className="flex items-center gap-2 text-[var(--foreground)]">
              <MapPin
                className="h-4 w-4 text-[var(--muted-foreground)] shrink-0"
                aria-hidden
              />
              <span>{session.location}</span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 2. 내 출결 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isEn ? "My attendance" : "내 출결"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <AttendanceDisplay
            status={my_attendance.status}
            lateMinutes={my_attendance.late_minutes}
            markedAt={my_attendance.marked_at}
            notes={my_attendance.notes}
            isEn={isEn}
            sessionStatus={session.status}
            isFutureByTime={isFuture}
          />
        </CardContent>
      </Card>

      {/* 3. 강의 내용 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isEn ? "Session content" : "강의 내용"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {session.description && session.description.trim().length > 0 ? (
            <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
              {session.description}
            </p>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              {isEn
                ? "Session details will be added by your instructor."
                : "강사님이 강의 내용을 추가하면 이곳에 표시돼요."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. 강의 자료 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{isEn ? "Materials" : "강의 자료"}</span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              {isEn
                ? `${materials.length} ${materials.length === 1 ? "file" : "files"}`
                : `${materials.length}개`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MaterialsSection materials={materials} isEn={isEn} />
        </CardContent>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 출결 표시 — big badge + 부가 정보 (마크 시각 / 메모).
// -----------------------------------------------------------------------------

function AttendanceDisplay({
  status,
  lateMinutes,
  markedAt,
  notes,
  isEn,
  sessionStatus,
}: {
  status: StudentSessionDetail["my_attendance"]["status"];
  lateMinutes: number | null;
  markedAt: string | null;
  notes: string | null;
  isEn: boolean;
  sessionStatus: StudentSessionDetail["session"]["status"];
  /** 부모에서 시각 기반 (now < starts_at) 계산한 결과. status enum 보다 우선. */
  isFutureByTime?: boolean;
}) {
  const meta = ATTENDANCE_META[status];

  if (status === "unmarked") {
    // 시각 우선 + status enum 보조 (운영자가 in_progress/ended 박은 케이스).
    const isFuture =
      typeof isFutureByTime === "boolean"
        ? isFutureByTime
        : sessionStatus === "scheduled";
    return (
      <div className="rounded-[var(--radius)] bg-[var(--secondary)] p-4 flex items-start gap-3">
        <AlertCircle
          className="h-5 w-5 text-[var(--muted-foreground)] shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {isFuture
              ? isEn
                ? "Session has not started yet"
                : "아직 시작 전인 회차예요"
              : isEn
                ? "Attendance not recorded yet"
                : "아직 출결이 기록되지 않았어요"}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {isFuture
              ? isEn
                ? "Your attendance will appear here after the session."
                : "회차가 끝나면 강사님이 출결을 기록해주세요."
              : isEn
                ? "If you attended, please contact your instructor."
                : "출석하셨다면 강사님께 문의해주세요."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-base font-bold ${meta.badgeClass}`}
          aria-label={meta.aria(isEn)}
        >
          <meta.icon className="h-5 w-5" aria-hidden />
          {meta.label(isEn)}
          {status === "late" && lateMinutes != null ? (
            <span className="text-sm font-semibold">
              {" "}
              ({lateMinutes}
              {isEn ? "m" : "분"})
            </span>
          ) : null}
        </span>
      </div>

      {markedAt ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          {isEn ? "Recorded at " : "마크 시각 "}
          {formatFullDateTime(markedAt, isEn)}
        </p>
      ) : null}

      {notes && notes.trim().length > 0 ? (
        <div className="rounded-[var(--radius-sm)] bg-[var(--secondary)] px-3 py-2">
          <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">
            {isEn ? "Note" : "메모"}
          </p>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 자료 section + 카드 + 다운로드.
// -----------------------------------------------------------------------------

function MaterialsSection({
  materials,
  isEn,
}: {
  materials: StudentSessionDetailMaterial[];
  isEn: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function onDownload(materialId: string) {
    setError(null);
    setPendingId(materialId);
    startTransition(async () => {
      const result = await getMaterialDownloadUrlAction({
        material_id: materialId,
      });
      setPendingId(null);
      if (result.status === "error") {
        setError(
          isEn
            ? `Download failed. ${result.error}`
            : `다운로드 실패. ${result.error}`,
        );
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    });
  }

  if (materials.length === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <FileText
          className="h-9 w-9 mx-auto text-[var(--muted-foreground)]"
          aria-hidden
        />
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {isEn ? "No materials yet" : "이 회차 자료는 아직 업로드되지 않았어요"}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {isEn
            ? "Your instructor will upload session materials soon."
            : "강사님이 자료를 업로드하면 이곳에 표시돼요."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-[var(--radius-sm)] bg-[#fee4e2] px-4 py-3 text-sm text-[#b42318]">
          {error}
        </div>
      ) : null}
      <ul className="space-y-2" aria-label={isEn ? "Materials" : "강의 자료 목록"}>
        {materials.map((m) => (
          <li key={m.id}>
            <MaterialCard
              material={m}
              pending={pending && pendingId === m.id}
              isEn={isEn}
              onDownload={() => onDownload(m.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MaterialCard({
  material,
  pending,
  isEn,
  onDownload,
}: {
  material: StudentSessionDetailMaterial;
  pending: boolean;
  isEn: boolean;
  onDownload: () => void;
}) {
  const isExternal = material.storage_method === "external_url";
  const Icon = isExternal ? ExternalLink : FileText;
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center sm:gap-4">
      <Icon
        className="h-5 w-5 text-[var(--muted-foreground)] shrink-0"
        aria-hidden
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {material.title}
        </p>
        {material.description ? (
          <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
            {material.description}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          {isExternal ? (
            <Badge variant="outline">
              {isEn ? "External link" : "외부 링크"}
            </Badge>
          ) : (
            <>
              {material.file_name ? <span>{material.file_name}</span> : null}
              {material.file_size_bytes != null ? (
                <span>{formatBytes(material.file_size_bytes)}</span>
              ) : null}
            </>
          )}
        </div>
      </div>
      <Button
        onClick={onDownload}
        disabled={pending}
        className="h-11 px-5 w-full sm:w-auto shrink-0"
        aria-label={
          isExternal
            ? isEn
              ? `Open external link: ${material.title}`
              : `외부 링크 열기: ${material.title}`
            : isEn
              ? `Download file: ${material.title}`
              : `파일 다운로드: ${material.title}`
        }
      >
        <Download className="h-4 w-4" />
        {isExternal
          ? isEn
            ? "Open"
            : "열기"
          : isEn
            ? "Download"
            : "다운로드"}
      </Button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// status 메타 — attendance-matrix.tsx 와 동일 색깔 / short label 유지.
// -----------------------------------------------------------------------------

const ATTENDANCE_META: Record<
  StudentSessionDetail["my_attendance"]["status"],
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
// format helpers.
// -----------------------------------------------------------------------------

function formatFullDate(iso: string, isEn: boolean): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat(isEn ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return fmt.format(d);
}

function formatTimeRange(startsIso: string, endsIso: string): string {
  const s = new Date(startsIso);
  const e = new Date(endsIso);
  const fmt = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fmt.format(s)} ~ ${fmt.format(e)}`;
}

function formatFullDateTime(iso: string, isEn: boolean): string {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat(isEn ? "en-US" : "ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return fmt.format(d);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
