"use client";

/**
 * Admin 수료증 일괄 발급 button + 결과 dialog (B0081 Slice 1).
 *
 * cohort 상세 페이지 "수료증 발급 진척" 섹션에 배치.
 *
 * UX:
 *   1. 클릭 → confirm dialog (대상 인원 안내)
 *   2. 확인 → server action 호출 (pending state, disabled + spinner)
 *   3. 결과 dialog: 카운트 요약 + 학생별 테이블 (status badge, serial, reason)
 *   4. 닫기 → 페이지 refresh 로 진척 카드 재계산
 *
 * 권한: server action 이 assertSuperAdmin 가드. UI 는 클릭 트리거만.
 */
import * as React from "react";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Loader2 } from "lucide-react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";
import {
  batchIssueCertificatesForCohortAction,
  type BatchIssueResult,
  type BatchIssueEntry,
} from "@/src/programs/fan-to-pro/application/certificate/batch-issue-certificates";

type Props = {
  cohortId: string;
  eligibleCount: number;
};

type DialogState = "closed" | "confirm" | "result";

export function BatchIssueCertificatesButton({
  cohortId,
  eligibleCount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dialogState, setDialogState] = useState<DialogState>("closed");
  const [result, setResult] = useState<BatchIssueResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onOpenConfirm() {
    setError(null);
    setResult(null);
    setDialogState("confirm");
  }

  function onCancel() {
    setDialogState("closed");
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await batchIssueCertificatesForCohortAction({
        cohort_id: cohortId,
      });
      setResult(res);
      if (res.status === "error") {
        setError(res.error);
        setDialogState("confirm");
        return;
      }
      setDialogState("result");
    });
  }

  function onCloseResult() {
    setDialogState("closed");
    // 진척 카드 재계산 반영
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="default"
        onClick={onOpenConfirm}
        disabled={pending}
      >
        <Award className="h-4 w-4 mr-1.5" />
        수료증 일괄 발급
      </Button>

      <Dialog
        open={dialogState === "confirm"}
        onOpenChange={(open) => {
          if (!open && !pending) setDialogState("closed");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수료증 일괄 발급</DialogTitle>
            <DialogDescription>
              이 기수의 활성 학생 {eligibleCount}명을 대상으로 수료증을
              발급합니다. 신청 등록순으로 발급번호가 부여됩니다. 이미 발급된
              학생은 기존 발급번호를 재사용하고, 자격이 부족한 학생은 건너뜁니다.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <div className="rounded-md bg-[#fee4e2] px-3 py-2 text-sm text-[#b42318]">
              오류: {error}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={pending}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={onSubmit}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  발급 중...
                </>
              ) : (
                "발급 진행"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialogState === "result"}
        onOpenChange={(open) => {
          if (!open) onCloseResult();
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>수료증 일괄 발급 결과</DialogTitle>
            <DialogDescription>
              총 {result && result.status === "ok" ? result.counts.total : 0}명 처리 완료.
            </DialogDescription>
          </DialogHeader>

          {result && result.status === "ok" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <SummaryPill label="신규 발급" value={result.counts.issued} tone="success" />
                <SummaryPill label="기존 재사용" value={result.counts.already} tone="secondary" />
                <SummaryPill label="자격 미달" value={result.counts.not_eligible} tone="warning" />
                <SummaryPill label="오류" value={result.counts.error} tone="destructive" />
              </div>

              <div className="max-h-[50vh] overflow-y-auto rounded-md border border-[var(--border)]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>발급번호</TableHead>
                      <TableHead>사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.entries.map((entry) => (
                      <EntryRow key={entry.student_id} entry={entry} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="default" onClick={onCloseResult}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "secondary" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "bg-[#dcfae6] text-[#067647]"
      : tone === "warning"
        ? "bg-[#fef0c7] text-[#b54708]"
        : tone === "destructive"
          ? "bg-[#fee4e2] text-[#b42318]"
          : "bg-[var(--secondary)] text-[var(--secondary-foreground)]";
  return (
    <div className={`rounded-md px-3 py-2 text-sm ${toneClass}`}>
      <span className="font-medium">{label}</span>
      <span className="ml-2 font-bold tabular-nums">{value}</span>
    </div>
  );
}

function EntryRow({ entry }: { entry: BatchIssueEntry }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{entry.name}</TableCell>
      <TableCell>
        <StatusBadge status={entry.status} />
      </TableCell>
      <TableCell className="tabular-nums">
        {entry.serial_no ?? "-"}
      </TableCell>
      <TableCell className="text-[var(--muted-foreground)]">
        {formatReason(entry)}
      </TableCell>
    </TableRow>
  );
}

function StatusBadge({ status }: { status: BatchIssueEntry["status"] }) {
  switch (status) {
    case "issued":
      return <Badge variant="success">신규 발급</Badge>;
    case "already":
      return <Badge variant="secondary">기존 재사용</Badge>;
    case "not-eligible":
      return <Badge variant="warning">자격 미달</Badge>;
    case "error":
      return <Badge variant="destructive">오류</Badge>;
  }
}

function formatReason(entry: BatchIssueEntry): string {
  if (entry.status === "not-eligible") {
    switch (entry.reason) {
      case "cohort_in_progress":
        return "종강 전";
      case "cohort_cancelled":
        return "폐강";
      case "student_inactive":
        return "학생 상태 비활성";
      case "attendance_below_threshold":
        return `출석률 미달 (${entry.attendance_rate !== null ? Math.round(entry.attendance_rate * 100) : "-"}%)`;
      default:
        return entry.reason ?? "-";
    }
  }
  if (entry.status === "error") {
    return entry.reason ?? "알 수 없는 오류";
  }
  if (entry.status === "already" || entry.status === "issued") {
    if (entry.attendance_rate !== null) {
      return `출석률 ${Math.round(entry.attendance_rate * 100)}%`;
    }
  }
  return "-";
}
