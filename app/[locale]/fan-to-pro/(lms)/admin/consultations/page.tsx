import type { Metadata } from "next";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchConsultationsWithStudent } from "@/src/programs/fan-to-pro/application/queries/lms/fetch-consultations-with-student";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
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
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "컨설팅 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  resume: "이력서",
  cover_letter: "자기소개서",
  portfolio: "포트폴리오",
};

const STATUS_LABEL: Record<string, string> = {
  drafted: "임시저장",
  submitted: "제출완료",
  reviewed: "리뷰완료",
  closed: "종료",
};

export default async function FanToProAdminConsultationsPage() {
  await assertProgramAdmin("fan-to-pro");

  const result = await fetchConsultationsWithStudent();

  if (result.status === "error") {
    return (
      <PageContainer>
        <PageHeader title="컨설팅" />
        <EmptyState
          title="데이터를 불러올 수 없습니다"
          description={result.error}
        />
      </PageContainer>
    );
  }

  const rows = result.data;
  const counts = {
    submitted: rows.filter((r) => r.status === "submitted").length,
    reviewed: rows.filter((r) => r.status === "reviewed").length,
    closed: rows.filter((r) => r.status === "closed").length,
  };

  return (
    <PageContainer>
      <PageHeader
        title="컨설팅 진행 현황"
        description="이력서, 자소서, 포트폴리오 컨설팅 진행 추적"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label="제출 대기" value={counts.submitted} />
        <KpiCard label="리뷰 완료" value={counts.reviewed} />
        <KpiCard label="종료" value={counts.closed} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>컨설팅 ({rows.length}건)</CardTitle>
          <CardDescription>
            제출, 리뷰, 종료 흐름. 강사 리뷰는 강사 surface 에서 작성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              아직 제출된 컨설팅이 없습니다.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생</TableHead>
                  <TableHead>종류</TableHead>
                  <TableHead>버전</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>제출일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">
                      {r.student_name}
                    </TableCell>
                    <TableCell>{KIND_LABEL[r.kind] ?? r.kind}</TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      v{r.version}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-[var(--muted-foreground)]">
                      {r.submitted_at
                        ? new Date(r.submitted_at).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "submitted")
    return (
      <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0">
        {STATUS_LABEL[status]}
      </Badge>
    );
  if (status === "reviewed") return <Badge>{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="outline">{STATUS_LABEL[status] ?? status}</Badge>;
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="text-xs font-medium text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="text-2xl font-bold text-[var(--foreground)] mt-1">
        {value}
      </p>
    </div>
  );
}
