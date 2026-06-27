"use client";

/**
 * /lms/admin/instructors — 강사 list + 일괄 invite + company 연결.
 *
 * 기존 /admin/instructors (다크 어드민) 의 강사 마스터 관리는 변경 X.
 * 본 페이지는 LMS 운영 (회사 단위 정산 + invite) 에 집중.
 */
import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { Route } from "next";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";
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
  inviteInstructorsBatchAction,
  inviteSingleUserAction,
} from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-invite-actions";
import { linkInstructorCompanyAction } from "@/src/programs/fan-to-pro/interface/server-actions/admin/lms-company-actions";
import type { InstructorWithProfile } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-instructors-with-profiles";

type Company = { id: string; name: string };
type Props = {
  instructors: InstructorWithProfile[];
  companies: Company[];
};

export function InstructorsDashboard({ instructors, companies }: Props) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "ko";
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const notInvited = instructors.filter((i) => !i.invited);

  function onBatchInvite() {
    if (notInvited.length === 0) {
      setFeedback("invite 보낼 강사가 없습니다.");
      return;
    }
    if (!confirm(`${notInvited.length}명에게 invite 메일을 발송합니다. 진행할까요?`))
      return;
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteInstructorsBatchAction();
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      let msg = `발송 ${result.invited}명. 이미 등록 ${result.already_existed}명.`;
      if (result.failures.length > 0) {
        msg += ` 실패 ${result.failures.length}명.`;
      }
      setFeedback(msg);
      router.refresh();
    });
  }

  function onSingleInvite(i: InstructorWithProfile) {
    if (!i.email) {
      setFeedback(`${i.name}: 이메일이 없습니다. 기존 어드민에서 이메일을 채우세요.`);
      return;
    }
    if (!confirm(`${i.name} (${i.email}) 에게 invite 메일을 발송할까요?`))
      return;
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteSingleUserAction({
        email: i.email!,
        display_name: i.name,
        role: "instructor",
        instructor_id: i.instructor_id,
        company_id: i.company_id,
        phone: i.phone,
      });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setFeedback(
        result.already_existed
          ? `${i.name}: 이미 가입된 사용자입니다. invite 재발송 완료.`
          : `${i.name}: invite 발송 완료.`,
      );
      router.refresh();
    });
  }

  function onLinkCompany(instructorId: string, companyId: string) {
    startTransition(async () => {
      const result = await linkInstructorCompanyAction({
        instructor_id: instructorId,
        company_id: companyId || null,
      });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>강사 ({instructors.length}명)</CardTitle>
            <CardDescription>
              회사 연결 + invite 발송. 강사 마스터 정보 수정은{" "}
              <a
                href="/admin/instructors"
                className="text-[var(--primary)] hover:underline"
              >
                기존 어드민
              </a>{" "}
              에서.
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

        {instructors.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
            등록된 강사가 없습니다.{" "}
            <a
              href="/admin/instructors"
              className="text-[var(--primary)] hover:underline"
            >
              기존 어드민
            </a>
            에서 먼저 강사를 등록하세요.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>회사</TableHead>
                <TableHead>세무</TableHead>
                <TableHead>초대</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.map((i) => (
                <TableRow key={i.instructor_id}>
                  <TableCell className="font-semibold">
                    <Link
                      href={
                        `/${locale}/fan-to-pro/admin/instructors/${i.instructor_id}` as Route
                      }
                      className="text-[var(--foreground)] hover:text-[var(--primary)] hover:underline"
                    >
                      {i.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-[var(--muted-foreground)]">
                    {i.email ?? "-"}
                  </TableCell>
                  <TableCell>
                    <select
                      defaultValue={i.company_id ?? ""}
                      disabled={pending}
                      onChange={(e) => onLinkCompany(i.instructor_id, e.target.value)}
                      className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                    >
                      <option value="">(미연결)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {i.tax_mode === "tax_invoice" ? "세금계산서" : "원천징수"}
                  </TableCell>
                  <TableCell>
                    {i.invited ? (
                      <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        됨
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        미초대
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || !i.email}
                      onClick={() => onSingleInvite(i)}
                    >
                      {i.invited ? "재초대" : "초대"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
