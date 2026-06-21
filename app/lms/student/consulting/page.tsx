import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { FileText, ArrowRight } from "lucide-react";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchConsultationsByStudent } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/consultation-repository";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "컨설팅 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const KINDS = [
  { key: "resume", label: "이력서", desc: "Resume" },
  { key: "cover_letter", label: "자기소개서", desc: "Cover Letter" },
  { key: "portfolio", label: "포트폴리오", desc: "Portfolio" },
] as const;

export default async function StudentConsultingPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <PageHeader title="컨설팅" />
        <EmptyState title="학생 정보가 없습니다" />
      </PageContainer>
    );
  }

  const all = await fetchConsultationsByStudent(user.studentId);

  return (
    <PageContainer>
      <PageHeader
        title="컨설팅"
        description="이력서 / 자기소개서 / 포트폴리오 — 강사 리뷰를 받으세요"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {KINDS.map((k) => {
          const items = all.filter((c) => c.kind === k.key);
          const latest = items[0];
          return (
            <Link
              key={k.key}
              href={`/lms/student/consulting/${k.key}` as Route}
            >
              <Card className="transition-colors hover:border-[var(--primary)]/40 h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <FileText className="h-5 w-5 text-[var(--primary)]" />
                    <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </div>
                  <CardTitle className="text-base mt-3">{k.label}</CardTitle>
                  <CardDescription>{k.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  {latest ? (
                    <div className="space-y-2">
                      <Badge variant="outline">
                        v{latest.version} ·{" "}
                        {latest.status === "reviewed" ? "리뷰완료" : "검토중"}
                      </Badge>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        제출 {items.length}회
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      아직 제출 X
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
