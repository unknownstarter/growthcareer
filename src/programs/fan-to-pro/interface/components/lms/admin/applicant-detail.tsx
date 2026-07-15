"use client";

/**
 * Applicant Detail (B0051) - LMS surface 운영자 단일 신청자 콘솔.
 *
 * Basic Auth `/admin/applicants` 의 inline modal 패턴 대신, dedicated 페이지에서
 * 모든 액션 (상태 변경 / 메시지 발송 / 영수증 / paid promote / PII 파기) 수행.
 *
 * 기존 server action 재사용:
 *   - admin-actions.ts : markAsNotified / markAsPaid / markAsCancelled /
 *     markAsRefunded / markAsOverdue / recordCashReceipt / logIndividualSend /
 *     toggleApplicantMilestone / listMessagesForApplicant / listCashReceipts
 *   - lms-cohort-actions.ts : promoteApplicantAction (단일 applicant + cohort)
 *
 * 디자인: 라이트 토스 톤, Card 5섹션. PII 파기는 footer 분리 + Dialog confirm.
 */
import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  Send,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/table";

import type {
  ApplicantRow,
  ApplicantStatus,
  CashReceiptRow,
  MessageLogRow,
} from "@/src/programs/fan-to-pro/application/dto/applicant-row";

import {
  markAsNotified,
  markAsPaid,
  markAsOverdue,
  markAsCancelled,
  markAsRefunded,
  recordCashReceipt,
  logIndividualSend,
  toggleApplicantMilestone,
  markPiiAnonymizeBatch,
} from "@/src/programs/fan-to-pro/application/admin-actions";
import { promoteApplicantAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-cohort-actions";
import {
  MESSAGE_KIND_LABELS,
  getSmsBody,
  getEmailSubject,
  getEmailBody,
  buildMailtoUrl,
  buildSmsUrl,
  hasEligibleVisa,
  guessLocaleFromPhone,
  type MessageKind,
} from "@/src/programs/fan-to-pro/messages/templates";

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

type CohortSummary = { id: string; name: string; slug: string | null };

type Props = {
  applicant: ApplicantRow;
  cohorts: CohortSummary[];
  receipts: CashReceiptRow[];
  messages: MessageLogRow[];
  alreadyPromoted: boolean;
  promotedStudentId: string | null;
  locale: string;
};

const STATUS_LABEL: Record<ApplicantStatus, string> = {
  pending: "대기",
  notified: "안내",
  paid: "입금",
  overdue: "연체",
  cancelled: "취소",
  enrolled: "등록",
  refunded: "환불",
  next_cohort_interest: "다음기수",
};

const STATUS_VARIANT: Record<
  ApplicantStatus,
  "default" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  pending: "outline",
  notified: "warning",
  paid: "success",
  overdue: "destructive",
  cancelled: "secondary",
  enrolled: "success",
  refunded: "secondary",
  next_cohort_interest: "default",
};

const MESSAGE_KINDS: MessageKind[] = [
  "paymentGuide",
  "paymentConfirmed",
  "reminderT1",
  "reminderD3",
  "reminderD1",
  "referralInvite",
  "cohortKickoff",
  "week1Materials",
  "stageOpsGuide",
];

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function ApplicantDetail({
  applicant,
  cohorts,
  receipts: initialReceipts,
  messages: initialMessages,
  alreadyPromoted,
  promotedStudentId,
  locale,
}: Props) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [receipts] = React.useState(initialReceipts);
  const [messages] = React.useState(initialMessages);

  // 모달 토글
  const [messageModalOpen, setMessageModalOpen] = React.useState(false);
  const [paidModalOpen, setPaidModalOpen] = React.useState(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [refundModalOpen, setRefundModalOpen] = React.useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = React.useState(false);
  const [anonymizeModalOpen, setAnonymizeModalOpen] = React.useState(false);

  const cohort = applicant.cohortId
    ? cohorts.find((c) => c.id === applicant.cohortId)
    : null;

  const isRedacted = Boolean(applicant.redactedAt);

  // 액션 후 페이지 reload (server fetch refresh).
  function reload() {
    window.location.reload();
  }

  async function runAction(
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
    onSuccess?: () => void,
  ) {
    setBusy(label);
    setFeedback(null);
    try {
      const result = await fn();
      const r = result as { status?: string; error?: string };
      if (r.status === "ok") {
        setFeedback({ kind: "ok", text: `${label} 완료` });
        onSuccess?.();
      } else if (r.status === "stale") {
        setFeedback({
          kind: "error",
          text: `${label} 실패 - 상태가 이미 바뀌었어요. 새로고침 부탁드려요.`,
        });
      } else {
        setFeedback({
          kind: "error",
          text: `${label} 실패 - ${r.error ?? "unknown"}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setFeedback({ kind: "error", text: `${label} 오류 - ${msg}` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.kind === "ok"
              ? "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]"
              : "border-[var(--destructive)] bg-[var(--card)] text-[var(--destructive)]"
          }`}
        >
          {feedback.kind === "ok" ? (
            <CheckCircle2 className="mr-2 inline h-4 w-4" />
          ) : (
            <AlertTriangle className="mr-2 inline h-4 w-4" />
          )}
          {feedback.text}
        </div>
      ) : null}

      {isRedacted ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
          이 신청자는 PII 파기되었어요. 이름 / 이메일 / 전화 / 주소가 모두 익명
          처리된 상태입니다. 액션 대부분 비활성.
        </div>
      ) : null}

      {/* 1. 기본 정보 + 결제 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">기본 정보</CardTitle>
              <CardDescription>
                신청자가 신청서에 제출한 PII + 결제 정보.
              </CardDescription>
            </div>
            <Badge variant={STATUS_VARIANT[applicant.status]}>
              {STATUS_LABEL[applicant.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="이름" value={applicant.name} />
            <Field label="이메일" value={applicant.email} />
            <Field label="전화" value={applicant.phone} />
            <Field label="국적" value={applicant.nationality ?? "-"} />
            <Field label="비자" value={applicant.visa ?? "-"} />
            <Field
              label="생년월일"
              value={applicant.birthdate ?? "-"}
            />
            <Field label="소속/학교" value={applicant.university ?? "-"} />
            <Field label="주소" value={applicant.address ?? "-"} />
            <Field
              label="신청 기수"
              value={cohort ? cohort.name : applicant.cohortId ? "미지정 cohort" : "-"}
            />
            <Field
              label="신청일"
              value={formatKst(applicant.createdAt)}
            />
          </dl>
          <div className="mt-6 border-t border-[var(--border)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              결제
            </h3>
            <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="입금자명"
                value={applicant.depositorNameObserved ?? "-"}
              />
              <Field
                label="입금액"
                value={
                  applicant.paidAmountKrw !== null
                    ? `${applicant.paidAmountKrw.toLocaleString("ko-KR")}원`
                    : "-"
                }
              />
              <Field
                label="입금 확인일"
                value={formatKst(applicant.paymentConfirmedAt)}
              />
              <Field
                label="입금 마감"
                value={formatKst(applicant.paymentDueAt)}
              />
              <Field
                label="안내 발송일"
                value={formatKst(applicant.notifiedAt)}
              />
              <Field
                label="리마인드 횟수"
                value={`${applicant.reminderCount}회`}
              />
              {applicant.cancelledAt ? (
                <Field
                  label="취소 사유"
                  value={`${formatKst(applicant.cancelledAt)} / ${applicant.cancelReason ?? "-"}`}
                />
              ) : null}
              {applicant.refundedAt ? (
                <Field
                  label="환불 처리"
                  value={`${formatKst(applicant.refundedAt)} / ${applicant.refundTxnId ?? "-"}`}
                />
              ) : null}
            </dl>
          </div>
        </CardContent>
      </Card>

      {/* 2. 상태 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">상태 변경</CardTitle>
          <CardDescription>
            현재 {STATUS_LABEL[applicant.status]} - 가능한 전이만 노출돼요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {applicant.status === "pending" ? (
              <Button
                variant="outline"
                disabled={isRedacted || busy !== null}
                onClick={() =>
                  runAction("안내", async () => {
                    const r = await markAsNotified({ id: applicant.id });
                    if (r.status === "ok") reload();
                    return r;
                  })
                }
              >
                {busy === "안내" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                안내 발송 처리 (notified)
              </Button>
            ) : null}

            {applicant.status === "notified" ? (
              <>
                <Button
                  variant="outline"
                  disabled={isRedacted || busy !== null}
                  onClick={() => setPaidModalOpen(true)}
                >
                  입금 확인 (paid)
                </Button>
                <Button
                  variant="outline"
                  disabled={isRedacted || busy !== null}
                  onClick={() =>
                    runAction("연체", async () => {
                      const r = await markAsOverdue({ id: applicant.id });
                      if (r.status === "ok") reload();
                      return r;
                    })
                  }
                >
                  연체 처리 (overdue)
                </Button>
              </>
            ) : null}

            {["pending", "notified", "paid", "overdue"].includes(
              applicant.status,
            ) ? (
              <Button
                variant="outline"
                disabled={isRedacted || busy !== null}
                onClick={() => setCancelModalOpen(true)}
              >
                취소 처리 (cancelled)
              </Button>
            ) : null}

            {["paid", "cancelled"].includes(applicant.status) ? (
              <Button
                variant="outline"
                disabled={isRedacted || busy !== null}
                onClick={() => setRefundModalOpen(true)}
              >
                환불 처리 (refunded)
              </Button>
            ) : null}

            {applicant.status === "pending" && !isRedacted ? null : null}
          </div>

          {applicant.status === "paid" || applicant.status === "enrolled" ? (
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                {alreadyPromoted ? (
                  <>
                    이미 학생으로 등록되어 있어요.
                    {promotedStudentId ? (
                      <>
                        {" "}
                        <Link
                          href={
                            `/${locale}/fan-to-pro/admin/students/${promotedStudentId}` as Route
                          }
                          className="font-semibold text-[var(--primary)] underline-offset-2 hover:underline"
                        >
                          학생 상세로 이동
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    paid 상태예요. 기수 cohort 에 학생으로 등록할 수 있어요.
                  </>
                )}
              </p>
              {!alreadyPromoted ? (
                <Button
                  className="mt-3"
                  disabled={isRedacted || busy !== null || cohorts.length === 0}
                  onClick={() => setPromoteModalOpen(true)}
                >
                  학생으로 등록
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* 3. 메시지 history + 발송 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">메시지 ({messages.length}건)</CardTitle>
              <CardDescription>
                과거 발송 이력 + 새 메시지 발송. 발송은 OS 기본 메일/SMS 앱으로
                열려요.
              </CardDescription>
            </div>
            <Button
              size="sm"
              disabled={isRedacted || busy !== null}
              onClick={() => setMessageModalOpen(true)}
            >
              <Send className="h-4 w-4" />새 메시지 발송
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {messages.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              발송 이력이 없어요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>채널</TableHead>
                    <TableHead>종류</TableHead>
                    <TableHead>구분</TableHead>
                    <TableHead>발송일</TableHead>
                    <TableHead>발송자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.channel}</TableCell>
                      <TableCell>
                        {m.templateId
                          ? MESSAGE_KIND_LABELS[m.templateId as MessageKind] ??
                            m.templateId
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {m.direction === "broadcast" ? "단체" : "개별"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums text-[var(--muted-foreground)]">
                        {formatKst(m.sentAt)}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {m.sentBy ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. 운영 milestone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">운영 milestone</CardTitle>
          <CardDescription>
            가이드 발송 여부 / 피드백 완료 여부 같은 운영자 체크 항목.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MilestoneRow
              label="가이드 발송"
              markedAt={applicant.milestones.guideSentAt}
              busy={busy}
              disabled={isRedacted}
              onToggle={(mark) =>
                runAction(
                  mark ? "가이드 발송 표시" : "가이드 발송 해제",
                  async () => {
                    const r = await toggleApplicantMilestone({
                      applicantId: applicant.id,
                      milestoneType: "guide_sent",
                      action: mark ? "mark" : "unmark",
                    });
                    if (r.status === "ok") reload();
                    return r;
                  },
                )
              }
            />
            <MilestoneRow
              label="피드백 완료"
              markedAt={applicant.milestones.feedbackDoneAt}
              busy={busy}
              disabled={isRedacted}
              onToggle={(mark) =>
                runAction(
                  mark ? "피드백 완료 표시" : "피드백 완료 해제",
                  async () => {
                    const r = await toggleApplicantMilestone({
                      applicantId: applicant.id,
                      milestoneType: "feedback_done",
                      action: mark ? "mark" : "unmark",
                    });
                    if (r.status === "ok") reload();
                    return r;
                  },
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. 영수증 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                현금영수증 ({receipts.length}건)
              </CardTitle>
              <CardDescription>
                홈택스에서 발급 후 audit row INSERT. 발급은 운영자가 수동.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={
                isRedacted ||
                busy !== null ||
                !["paid", "enrolled", "refunded"].includes(applicant.status)
              }
              onClick={() => setReceiptModalOpen(true)}
            >
              <Receipt className="h-4 w-4" />
              영수증 발급 기록
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {receipts.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              발급 이력이 없어요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발급일</TableHead>
                    <TableHead>금액</TableHead>
                    <TableHead>홈택스 번호</TableHead>
                    <TableHead>비고</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs tabular-nums">
                        {formatKst(r.issuedAt)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {r.amountKrw.toLocaleString("ko-KR")}원
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.hometaxReceiptNo ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {r.notes ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6. PII 파기 (위험 액션 - 빨강 footer 분리) */}
      <Card className="border-[var(--destructive)]/40">
        <CardHeader>
          <CardTitle className="text-base text-[var(--destructive)]">
            위험 작업
          </CardTitle>
          <CardDescription>
            PII 파기는 종강 +6개월 경과 + 종료 상태 (enrolled / cancelled /
            refunded) 신청자에게만 적용되는 일괄 작업이에요. 단일 신청자만 즉시
            파기하는 기능은 제공하지 않아요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            disabled={busy !== null}
            onClick={() => setAnonymizeModalOpen(true)}
          >
            <AlertTriangle className="h-4 w-4" />
            일괄 PII 파기 (전체)
          </Button>
        </CardContent>
      </Card>

      {/* --------- Modals --------- */}

      <MessageSendModal
        open={messageModalOpen}
        onOpenChange={setMessageModalOpen}
        applicant={applicant}
        onSent={reload}
        setBusy={setBusy}
        setFeedback={setFeedback}
      />

      <PaidConfirmModal
        open={paidModalOpen}
        onOpenChange={setPaidModalOpen}
        applicant={applicant}
        runAction={runAction}
        reload={reload}
      />

      <CancelConfirmModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        applicant={applicant}
        runAction={runAction}
        reload={reload}
      />

      <RefundConfirmModal
        open={refundModalOpen}
        onOpenChange={setRefundModalOpen}
        applicant={applicant}
        runAction={runAction}
        reload={reload}
      />

      <ReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        applicant={applicant}
        runAction={runAction}
        reload={reload}
      />

      <PromoteModal
        open={promoteModalOpen}
        onOpenChange={setPromoteModalOpen}
        applicant={applicant}
        cohorts={cohorts}
        runAction={runAction}
        reload={reload}
      />

      <AnonymizeModal
        open={anonymizeModalOpen}
        onOpenChange={setAnonymizeModalOpen}
        runAction={runAction}
        reload={reload}
      />
    </div>
  );
}

// -------------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------------

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="mt-1 text-sm text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function MilestoneRow({
  label,
  markedAt,
  busy,
  disabled,
  onToggle,
}: {
  label: string;
  markedAt: string | null;
  busy: string | null;
  disabled: boolean;
  onToggle: (mark: boolean) => void;
}) {
  const marked = markedAt !== null;
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {label}
        </p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {marked ? `완료 ${formatKst(markedAt)}` : "미체크"}
        </p>
      </div>
      <Button
        size="sm"
        variant={marked ? "secondary" : "outline"}
        disabled={disabled || busy !== null}
        onClick={() => onToggle(!marked)}
      >
        {marked ? "해제" : "체크"}
      </Button>
    </div>
  );
}

// -------------------------------------------------------------------------
// Message Send Modal
// -------------------------------------------------------------------------

function MessageSendModal({
  open,
  onOpenChange,
  applicant,
  onSent,
  setBusy,
  setFeedback,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  onSent: () => void;
  setBusy: (label: string | null) => void;
  setFeedback: (f: { kind: "ok" | "error"; text: string } | null) => void;
}) {
  const [kind, setKind] = React.useState<MessageKind>("paymentGuide");
  const [channel, setChannel] = React.useState<"email" | "sms">("email");
  const guessedLocale = guessLocaleFromPhone(applicant.phone);
  const [locale, setLocale] = React.useState<"ko" | "en">(guessedLocale);

  const visaOk = hasEligibleVisa(applicant.visa);
  const options = { hasVisa: visaOk };

  const subject =
    channel === "email"
      ? getEmailSubject(kind, locale, applicant.name, options)
      : "";
  const body =
    channel === "email"
      ? getEmailBody(kind, locale, applicant.name, options)
      : getSmsBody(kind, locale, applicant.name, options);

  async function handleOpenApp() {
    setBusy("메시지 발송");
    setFeedback(null);
    try {
      // 1) 외부 앱 열기 (OS 기본 메일 / SMS)
      const url =
        channel === "email"
          ? buildMailtoUrl(applicant.email, subject, body)
          : buildSmsUrl(applicant.phone, body, applicant.nationality);
      window.open(url, "_blank");

      // 2) audit log INSERT
      const r = await logIndividualSend({
        applicantId: applicant.id,
        channel,
        templateId: kind,
      });
      if (r.status === "ok") {
        setFeedback({ kind: "ok", text: "외부 앱 열림 + audit 기록 완료" });
        onSent();
      } else {
        setFeedback({
          kind: "error",
          text: `audit 기록 실패 - ${r.error ?? "unknown"}`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      setFeedback({ kind: "error", text: `발송 오류 - ${msg}` });
    } finally {
      setBusy(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>메시지 발송</DialogTitle>
          <DialogDescription>
            템플릿 선택 후 OS 기본 앱 (메일 / 메시지) 으로 열려요. 발송 audit
            row 자동 기록.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="msg-kind">템플릿</Label>
              <select
                id="msg-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as MessageKind)}
                className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                {MESSAGE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {MESSAGE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="msg-channel">채널</Label>
              <select
                id="msg-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value as "email" | "sms")}
                className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                <option value="email">이메일</option>
                <option value="sms">문자</option>
              </select>
            </div>
            <div>
              <Label htmlFor="msg-locale">언어</Label>
              <select
                id="msg-locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value as "ko" | "en")}
                className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {channel === "email" ? (
            <div>
              <Label>제목</Label>
              <p className="mt-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm">
                {subject}
              </p>
            </div>
          ) : null}

          <div>
            <Label>본문 미리보기</Label>
            <Textarea
              readOnly
              value={body}
              className="mt-1 h-64 font-mono text-xs"
            />
          </div>

          {!visaOk && kind === "paymentGuide" ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              비자 미보유 신청자라 paymentGuide 가 "확인 부탁드려요" 분기로
              자동 적용됐어요.
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button onClick={handleOpenApp}>
            <ExternalLink className="h-4 w-4" />
            {channel === "email" ? "메일 앱 열기" : "문자 앱 열기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Paid Confirm Modal
// -------------------------------------------------------------------------

function PaidConfirmModal({
  open,
  onOpenChange,
  applicant,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const [amount, setAmount] = React.useState("880000");
  const [depositor, setDepositor] = React.useState(applicant.name);

  async function handleConfirm() {
    await runAction("입금 확인", async () => {
      const r = await markAsPaid({
        id: applicant.id,
        amountKrw: Number(amount),
        depositorName: depositor,
      });
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>입금 확인</DialogTitle>
          <DialogDescription>
            입금자명 + 금액 확인 후 paid 상태로 전환해요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="paid-amount">입금액 (원)</Label>
            <Input
              id="paid-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="paid-depositor">입금자명</Label>
            <Input
              id="paid-depositor"
              value={depositor}
              onChange={(e) => setDepositor(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm}>입금 확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Cancel Confirm Modal
// -------------------------------------------------------------------------

function CancelConfirmModal({
  open,
  onOpenChange,
  applicant,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const [reason, setReason] = React.useState("");

  async function handleConfirm() {
    await runAction("취소 처리", async () => {
      const r = await markAsCancelled({
        id: applicant.id,
        reason,
      });
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>취소 처리</DialogTitle>
          <DialogDescription>
            취소 사유를 기록해주세요. 회계 audit 에 남아요.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="cancel-reason">사유</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 본인 사정으로 수강 포기 / 정원 미달 / 기타"
            className="mt-1 h-24"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            돌아가기
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length === 0}
            onClick={handleConfirm}
          >
            취소 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Refund Confirm Modal
// -------------------------------------------------------------------------

function RefundConfirmModal({
  open,
  onOpenChange,
  applicant,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const [txnId, setTxnId] = React.useState("");

  async function handleConfirm() {
    await runAction("환불 처리", async () => {
      const r = await markAsRefunded({
        id: applicant.id,
        txnId,
      });
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>환불 처리</DialogTitle>
          <DialogDescription>
            토스/은행 환불 송금 후 거래번호를 기록해주세요.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="refund-txn">환불 거래번호</Label>
          <Input
            id="refund-txn"
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="예: TOSS-20260627-0001"
            className="mt-1"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            돌아가기
          </Button>
          <Button
            disabled={txnId.trim().length === 0}
            onClick={handleConfirm}
          >
            환불 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Receipt Modal
// -------------------------------------------------------------------------

function ReceiptModal({
  open,
  onOpenChange,
  applicant,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const [amount, setAmount] = React.useState(
    String(applicant.paidAmountKrw ?? 880000),
  );
  const [issuedAt, setIssuedAt] = React.useState(`${yyyy}-${mm}-${dd}`);
  const [hometaxNo, setHometaxNo] = React.useState("");
  const [notes, setNotes] = React.useState("");

  async function handleConfirm() {
    await runAction("영수증 기록", async () => {
      const r = await recordCashReceipt({
        id: applicant.id,
        amountKrw: Number(amount),
        issuedAt,
        hometaxReceiptNo: hometaxNo.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>현금영수증 발급 기록</DialogTitle>
          <DialogDescription>
            홈택스에서 발급 완료 후 audit row 작성. 발급 자체는 운영자가
            홈택스에서 수동 처리.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="receipt-amount">금액 (원)</Label>
              <Input
                id="receipt-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="receipt-date">발급일</Label>
              <Input
                id="receipt-date"
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="receipt-no">홈택스 승인번호 (선택)</Label>
            <Input
              id="receipt-no"
              value={hometaxNo}
              onChange={(e) => setHometaxNo(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="receipt-notes">비고 (선택)</Label>
            <Textarea
              id="receipt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm}>기록</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Promote (paid → student) Modal
// -------------------------------------------------------------------------

function PromoteModal({
  open,
  onOpenChange,
  applicant,
  cohorts,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: ApplicantRow;
  cohorts: CohortSummary[];
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const initialCohort = applicant.cohortId ?? cohorts[0]?.id ?? "";
  const [cohortId, setCohortId] = React.useState(initialCohort);

  async function handleConfirm() {
    await runAction("학생 등록", async () => {
      const r = await promoteApplicantAction({
        applicant_id: applicant.id,
        cohort_id: cohortId,
      });
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  const selectedCohort = cohorts.find((c) => c.id === cohortId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>학생으로 등록</DialogTitle>
          <DialogDescription>
            paid 신청자를 cohort 의 학생으로 등록해요. 멱등 - 이미 등록되어
            있으면 기존 student 반환.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="promote-cohort">등록할 기수</Label>
            <select
              id="promote-cohort"
              value={cohortId}
              onChange={(e) => setCohortId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            대상 신청자: <strong>{applicant.name}</strong>
            {selectedCohort ? (
              <>
                {" "}
                → 기수: <strong>{selectedCohort.name}</strong>
              </>
            ) : null}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!cohortId}>
            학생 등록
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Anonymize (PII batch) Modal
// -------------------------------------------------------------------------

function AnonymizeModal({
  open,
  onOpenChange,
  runAction,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runAction: (
    label: string,
    fn: () => Promise<{ status: string; error?: string } | unknown>,
  ) => Promise<void>;
  reload: () => void;
}) {
  const [confirmText, setConfirmText] = React.useState("");

  async function handleConfirm() {
    await runAction("PII 일괄 파기", async () => {
      const r = await markPiiAnonymizeBatch();
      if (r.status === "ok") {
        onOpenChange(false);
        reload();
      }
      return r;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[var(--destructive)]">
            PII 일괄 파기
          </DialogTitle>
          <DialogDescription>
            종강 +6개월 경과 + 종료 상태 (enrolled / cancelled / refunded) 신청자
            전원의 PII (이름 / 이메일 / 전화 / 주소 / 생년월일) 를 익명 처리해요.
            되돌릴 수 없어요.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="anonymize-confirm">
            계속하시려면 <strong>파기</strong> 라고 입력해주세요
          </Label>
          <Input
            id="anonymize-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            돌아가기
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText.trim() !== "파기"}
            onClick={handleConfirm}
          >
            파기 실행
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function formatKst(iso: string | null): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
