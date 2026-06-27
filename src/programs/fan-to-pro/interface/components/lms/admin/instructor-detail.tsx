"use client";

/**
 * /lms/admin/instructors/[id] — 강사 detail 페이지 client component (B0050).
 *
 * 책임:
 *   1) 4 섹션 카드 — 기본 정보 / 회사 / cohort 배정 / 정산
 *   2) 회사 변경 (linkInstructorCompanyAction)
 *   3) 정산 송금 완료 mark (markInstructorPayoutPaid)
 *   4) invite 재발송 (inviteSingleUserAction)
 *
 * 기존 다크 어드민 (/admin/instructors) 의 instructor-actions.ts 를 그대로 호출.
 * 신규 server action 추가 X.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  User,
  BookOpen,
  ClipboardCheck,
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
import { markInstructorPayoutPaid } from "@/src/programs/fan-to-pro/application/instructor-actions";
import { linkInstructorCompanyAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-company-actions";
import { inviteSingleUserAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-invite-actions";
import type { InstructorDetail } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-instructor-detail";

type Props = {
  detail: InstructorDetail;
  companies: Array<{ id: string; name: string }>;
};

export function InstructorDetailView({ detail, companies }: Props) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  function showFeedback(type: "success" | "error" | "info", message: string) {
    setFeedback({ type, message });
    if (type !== "error") {
      window.setTimeout(() => setFeedback(null), 4000);
    }
  }

  function onChangeCompany(newCompanyId: string) {
    if (newCompanyId === (detail.company_id ?? "")) return;
    startTransition(async () => {
      const result = await linkInstructorCompanyAction({
        instructor_id: detail.instructor_id,
        company_id: newCompanyId || null,
      });
      if (result.status === "error") {
        showFeedback("error", `회사 변경 실패: ${result.error}`);
        return;
      }
      showFeedback("success", "회사를 변경했습니다.");
      router.refresh();
    });
  }

  function onMarkPaid(payoutId: string) {
    if (!confirm("송금 완료로 표시할까요? 이 변경은 되돌릴 수 없습니다.")) {
      return;
    }
    startTransition(async () => {
      const result = await markInstructorPayoutPaid({ id: payoutId });
      if (result.status === "ok") {
        showFeedback("success", "송금 완료로 표시했습니다.");
        router.refresh();
        return;
      }
      if (result.status === "stale") {
        showFeedback("info", "이미 처리됐습니다. 새로고침합니다.");
        router.refresh();
        return;
      }
      showFeedback("error", `오류: ${result.error}`);
    });
  }

  function onResendInvite() {
    if (!detail.email) {
      showFeedback("error", "이메일이 없습니다. 강사 마스터에 이메일을 먼저 등록하세요.");
      return;
    }
    if (!confirm(`${detail.name} (${detail.email}) 에게 invite 메일을 다시 발송할까요?`)) {
      return;
    }
    startTransition(async () => {
      const result = await inviteSingleUserAction({
        email: detail.email!,
        display_name: detail.name,
        role: "instructor",
        instructor_id: detail.instructor_id,
        company_id: detail.company_id,
        phone: detail.phone,
      });
      if (result.status === "error") {
        showFeedback("error", `초대 실패: ${result.error}`);
        return;
      }
      showFeedback(
        "success",
        result.already_existed
          ? "이미 가입된 사용자입니다. 초대를 재발송했습니다."
          : "초대 메일을 발송했습니다.",
      );
      router.refresh();
    });
  }

  const totalAssigned = detail.cohort_assignments.length;
  const totalPaid = detail.payouts.filter((p) => p.paid_at !== null).length;
  const totalUnpaid = detail.payouts.filter((p) => p.paid_at === null).length;

  return (
    <div className="space-y-6">
      {feedback ? (
        <div
          role="status"
          className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-[#067647]/30 bg-[#dcfae6] text-[#067647]"
              : feedback.type === "error"
                ? "border-[#b42318]/30 bg-[#fee4e2] text-[#b42318]"
                : "border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {/* Top summary chips */}
      <div className="flex flex-wrap items-center gap-3">
        {detail.invited ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            LMS 초대됨
          </Badge>
        ) : (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            미초대
          </Badge>
        )}
        <Badge variant="outline">
          {detail.day === "saturday" ? "토요반" : "일요반"}
        </Badge>
        <Badge variant="outline">
          {detail.tax_mode === "tax_invoice" ? "세금계산서" : "원천징수 3.3%"}
        </Badge>
        <div className="text-sm text-[var(--muted-foreground)]">
          배정 cohort {totalAssigned}개 / 정산 송금 {totalPaid}건 / 미송금{" "}
          {totalUnpaid}건
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. 기본 정보 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--muted-foreground)]" />
              기본 정보
            </CardTitle>
            <CardDescription>
              연락처와 LMS 초대 상태. 강사 마스터 (이름 / 세무 / 강사료 / 계좌)
              수정은{" "}
              <a
                href="/admin/instructors"
                className="text-[var(--primary)] hover:underline"
              >
                기존 어드민
              </a>
              에서.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--muted-foreground)]">이름</dt>
              <dd className="font-semibold text-[var(--foreground)]">
                {detail.name}
              </dd>
              <dt className="text-[var(--muted-foreground)]">이메일</dt>
              <dd className="text-[var(--foreground)] break-all">
                {detail.email ?? "(미등록)"}
              </dd>
              <dt className="text-[var(--muted-foreground)]">전화</dt>
              <dd className="text-[var(--foreground)]">
                {detail.phone ?? "(미등록)"}
              </dd>
              <dt className="text-[var(--muted-foreground)]">기본 강사료</dt>
              <dd className="text-[var(--foreground)] tabular-nums">
                {detail.base_fee_krw.toLocaleString("ko-KR")}원
              </dd>
              <dt className="text-[var(--muted-foreground)]">최근 로그인</dt>
              <dd className="text-[var(--foreground)] text-xs">
                {detail.last_login_at
                  ? new Date(detail.last_login_at).toLocaleString("ko-KR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "(없음)"}
              </dd>
              {detail.must_change_password ? (
                <>
                  <dt className="text-[var(--muted-foreground)]">PW 변경</dt>
                  <dd>
                    <Badge variant="warning">필요</Badge>
                  </dd>
                </>
              ) : null}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
              <Button
                variant="outline"
                onClick={onResendInvite}
                disabled={pending || !detail.email}
                className="h-10"
              >
                <Mail className="h-4 w-4 mr-2" />
                {detail.invited ? "초대 재발송" : "초대 발송"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 2. 회사 (계약서 발급 주체) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              소속 회사
            </CardTitle>
            <CardDescription>
              정산 계약서 + 입금 정보가 회사 단위로 관리됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-[var(--muted-foreground)]">현재 회사</dt>
              <dd className="text-[var(--foreground)] font-semibold">
                {detail.company_name ?? "(미연결)"}
              </dd>
              <dt className="text-[var(--muted-foreground)]">사업자번호</dt>
              <dd className="text-[var(--foreground)]">
                {detail.business_no ?? "-"}
              </dd>
              <dt className="text-[var(--muted-foreground)]">계좌</dt>
              <dd className="text-[var(--foreground)] text-xs">
                {detail.bank_name && detail.bank_account
                  ? `${detail.bank_name} ${detail.bank_account}${
                      detail.bank_holder ? ` (${detail.bank_holder})` : ""
                    }`
                  : "(미등록)"}
              </dd>
            </dl>
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <label
                htmlFor="company-select"
                className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5"
              >
                회사 변경
              </label>
              <select
                id="company-select"
                defaultValue={detail.company_id ?? ""}
                disabled={pending}
                onChange={(e) => onChangeCompany(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">(미연결)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. cohort 배정 + 회차 진척 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
            배정된 기수 ({totalAssigned}개)
          </CardTitle>
          <CardDescription>
            cohort 단위 강의 진척과 출결 입력 현황. 빈 cohort 는 LMS 초대 대기
            중일 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.cohort_assignments.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              {detail.invited
                ? "아직 cohort 배정이 없습니다. 기수 페이지에서 강사를 배정하세요."
                : "LMS 초대 후 cohort 에 배정할 수 있습니다."}
            </p>
          ) : (
            <div className="space-y-6">
              {detail.cohort_assignments.map((a) => {
                const cohortSessions = detail.sessions.filter(
                  (s) => s.cohort_id === a.cohort_id,
                );
                return (
                  <section
                    key={a.cohort_id}
                    aria-labelledby={`cohort-heading-${a.cohort_id}`}
                    className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] p-4"
                  >
                    <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3
                          id={`cohort-heading-${a.cohort_id}`}
                          className="text-base font-semibold text-[var(--foreground)]"
                        >
                          {a.cohort_name}
                        </h3>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {a.starts_on} ~ {a.ends_on} / 상태 {a.cohort_status}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          전체 {a.total_sessions}회차
                        </Badge>
                        <Badge variant="outline">
                          본인 배정 {a.assigned_sessions}회차
                        </Badge>
                        <Badge variant="outline">
                          출결 입력 {a.marked_attendance_count}건
                        </Badge>
                      </div>
                    </header>
                    {cohortSessions.length === 0 ? (
                      <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">
                        등록된 회차가 없습니다.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">회차</TableHead>
                              <TableHead>제목</TableHead>
                              <TableHead className="w-32">일시</TableHead>
                              <TableHead className="w-20">상태</TableHead>
                              <TableHead className="w-20">배정</TableHead>
                              <TableHead className="w-16 text-right">자료</TableHead>
                              <TableHead className="w-16 text-right">출결</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cohortSessions.map((s) => (
                              <TableRow key={s.session_id}>
                                <TableCell className="text-xs tabular-nums text-[var(--muted-foreground)]">
                                  {s.idx ?? "-"}
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  {s.title}
                                </TableCell>
                                <TableCell className="text-xs text-[var(--muted-foreground)]">
                                  {new Date(s.starts_at).toLocaleDateString(
                                    "ko-KR",
                                    { month: "short", day: "numeric" },
                                  )}
                                </TableCell>
                                <TableCell>
                                  <SessionStatusBadge status={s.status} />
                                </TableCell>
                                <TableCell>
                                  {s.assigned ? (
                                    <Badge variant="success">본인</Badge>
                                  ) : (
                                    <span className="text-xs text-[var(--muted-foreground)]">
                                      -
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-right tabular-nums">
                                  {s.material_count > 0 ? (
                                    <span className="text-[var(--foreground)] font-medium">
                                      {s.material_count}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--muted-foreground)]">
                                      0
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-right tabular-nums">
                                  {s.marked_count > 0 ? (
                                    <span className="text-[var(--foreground)] font-medium">
                                      {s.marked_count}
                                    </span>
                                  ) : (
                                    <span className="text-[var(--muted-foreground)]">
                                      0
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. 정산 진척 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
            정산 내역 ({detail.payouts.length}건)
          </CardTitle>
          <CardDescription>
            기수별 강사료 기록. 송금 완료 후 [송금 완료] 버튼을 눌러 표시하세요.
            정산 추가는{" "}
            <a
              href="/admin/instructors"
              className="text-[var(--primary)] hover:underline"
            >
              기존 어드민
            </a>
            의 [정산 기록] 으로.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {detail.payouts.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              아직 정산 기록이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>기수</TableHead>
                    <TableHead>정원 snap</TableHead>
                    <TableHead>세무</TableHead>
                    <TableHead className="text-right">기본료</TableHead>
                    <TableHead className="text-right">세금</TableHead>
                    <TableHead className="text-right">실지급</TableHead>
                    <TableHead>송금</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-sm">
                        {p.cohort_label}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.enrolled_count_snapshot}명
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.tax_mode_snapshot === "tax_invoice"
                          ? "세금계산서"
                          : "원천 3.3%"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {p.base_fee_krw.toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-[var(--muted-foreground)]">
                        {p.tax_krw.toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold text-[var(--primary)]">
                        {p.net_krw.toLocaleString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        {p.paid_at ? (
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {new Date(p.paid_at).toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                            })}
                          </Badge>
                        ) : (
                          <Badge variant="warning">미송금</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.paid_at ? null : (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => onMarkPaid(p.id)}
                          >
                            <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                            송금 완료
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {detail.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
              운영 메모
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {detail.notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { variant: "default" | "secondary" | "outline" | "success" | "warning"; label: string }
  > = {
    scheduled: { variant: "outline", label: "예정" },
    in_progress: { variant: "warning", label: "진행" },
    ended: { variant: "success", label: "종료" },
    cancelled: { variant: "secondary", label: "취소" },
  };
  const cfg = map[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
