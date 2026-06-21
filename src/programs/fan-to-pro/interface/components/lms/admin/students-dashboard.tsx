"use client";

/**
 * /lms/admin/students — 학생 list + 일괄 invite.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { Route } from "next";
import { Mail, CheckCircle2, AlertCircle, FileText } from "lucide-react";
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
  inviteStudentsBatchAction,
  inviteSingleUserAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-invite-actions";
import type { StudentWithProfile } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-students-with-profiles";

type Props = {
  cohort_id: string;
  cohort_name: string;
  students: StudentWithProfile[];
};

export function StudentsDashboard({ cohort_id, cohort_name, students }: Props) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const notInvited = students.filter((s) => !s.invited);

  function onBatchInvite() {
    if (notInvited.length === 0) {
      setFeedback("invite 보낼 학생이 없습니다.");
      return;
    }
    if (!confirm(`${notInvited.length}명에게 invite 메일을 발송합니다. 진행할까요?`)) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteStudentsBatchAction({ cohort_id });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      let msg = `발송 ${result.invited}명. 이미 등록 ${result.already_existed}명.`;
      if (result.failures.length > 0) {
        msg += ` 실패 ${result.failures.length}명 (${result.failures
          .map((f) => `${f.email}: ${f.error}`)
          .join(", ")})`;
      }
      setFeedback(msg);
      router.refresh();
    });
  }

  function onSingleInvite(s: StudentWithProfile) {
    if (!s.email) {
      setFeedback(`${s.display_name}: 이메일이 없습니다.`);
      return;
    }
    if (!confirm(`${s.display_name} (${s.email}) 에게 invite 메일을 발송할까요?`))
      return;
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteSingleUserAction({
        email: s.email!,
        display_name: s.display_name,
        role: "student",
        student_id: s.student_id,
        phone: s.phone,
      });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setFeedback(
        result.already_existed
          ? `${s.display_name}: 이미 가입된 사용자입니다. invite 재발송 완료.`
          : `${s.display_name}: invite 발송 완료.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <CardTitle>학생 ({students.length}명)</CardTitle>
              <CardDescription>
                {cohort_name} · invite 미발송 {notInvited.length}명
              </CardDescription>
            </div>
            <Button
              onClick={onBatchInvite}
              disabled={pending || notInvited.length === 0}
              className="h-12 px-6"
            >
              <Mail className="h-4 w-4 mr-2" />
              {pending ? "발송 중..." : `미발송 ${notInvited.length}명 일괄 초대`}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feedback ? (
            <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm text-[var(--foreground)]">
              {feedback}
            </div>
          ) : null}

          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              아직 등록된 학생이 없습니다. 기수 페이지에서 paid 신청자 일괄
              등록을 먼저 진행해주세요.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>전화</TableHead>
                    <TableHead>입금자명</TableHead>
                    <TableHead className="text-right">결제액</TableHead>
                    <TableHead>입금일</TableHead>
                    <TableHead>결제 상태</TableHead>
                    <TableHead>초대 상태</TableHead>
                    <TableHead>로그인</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell className="font-semibold">
                        {s.display_name}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)] text-xs">
                        {s.email ?? "-"}
                      </TableCell>
                      <TableCell className="text-[var(--muted-foreground)] text-xs">
                        {s.phone ?? "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.depositor_name_observed ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {s.paid_amount_krw != null
                          ? `${s.paid_amount_krw.toLocaleString("ko-KR")}원`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {s.payment_confirmed_at
                          ? new Date(s.payment_confirmed_at).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={s.payment_status} refundedAt={s.refunded_at} />
                      </TableCell>
                      <TableCell>
                        {s.invited ? (
                          <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            초대됨
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            미초대
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-[var(--muted-foreground)]">
                        {s.last_login_at
                          ? new Date(s.last_login_at).toLocaleString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            disabled={pending}
                          >
                            <Link
                              href={
                                `/${locale}/fan-to-pro/admin/students/${s.student_id}/career` as Route
                              }
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              문서
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending || !s.email}
                            onClick={() => onSingleInvite(s)}
                          >
                            {s.invited ? "재초대" : "초대"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentStatusBadge({
  status,
  refundedAt,
}: {
  status: string | null;
  refundedAt: string | null;
}) {
  if (refundedAt) return <Badge variant="secondary">환불</Badge>;
  if (!status) return <span className="text-xs text-[var(--muted-foreground)]">-</span>;
  const map: Record<string, { variant: "default" | "secondary" | "outline" | "success" | "warning" | "destructive"; label: string }> = {
    pending: { variant: "outline", label: "대기" },
    notified: { variant: "warning", label: "안내" },
    paid: { variant: "success", label: "입금" },
    overdue: { variant: "destructive", label: "연체" },
    cancelled: { variant: "secondary", label: "취소" },
    enrolled: { variant: "success", label: "등록" },
    refunded: { variant: "secondary", label: "환불" },
  };
  const cfg = map[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
