import type { Metadata } from "next";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Megaphone, Pin } from "lucide-react";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchAnnouncementsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";

export const metadata: Metadata = {
  title: "공지 - Fan to Pro",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * /[locale]/fan-to-pro/[cohortSlug]/student/announcements (B0061).
 *
 * 학생 본인 cohort 의 published 공지 list. RLS 가 자동 차단 — published 만 노출.
 */
export default async function StudentAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getLmsUser();
  if (!user) redirect(`/${locale}/auth/login` as Route);
  if (!user.studentId) {
    if (user.isSuperAdmin) {
      redirect(`/${locale}/fan-to-pro/admin/announcements` as Route);
    }
    redirect(`/${locale}/auth/login?error=no_student` as Route);
  }

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="공지" />
        <EmptyState title="학생 정보를 찾을 수 없습니다" />
      </PageContainer>
    );
  }

  const announcements = await fetchAnnouncementsByCohort(student.cohort_id).catch(() => []);
  // RLS 가 published 만 반환하지만 client side fallback 으로 한 번 더 filter
  const published = announcements
    .filter((a) => a.status === "published" && a.published_at)
    .sort((a, b) => {
      // pinned 우선, 그 다음 published_at desc
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    });

  return (
    <PageContainer>
      <PageHeader
        title="공지"
        description="기수 운영진이 게시한 공지사항. 중요 공지는 상단 고정."
      />

      {published.length === 0 ? (
        <EmptyState
          title="아직 공지가 없어요"
          description="운영진이 새 공지를 등록하면 이 페이지에서 바로 확인할 수 있어요."
        />
      ) : (
        <div className="space-y-3">
          {published.map((ann) => (
            <Card key={ann.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.pinned ? (
                        <Badge
                          variant="secondary"
                          className="bg-[#fef0c7] text-[#b54708]"
                        >
                          <Pin className="h-3 w-3 mr-0.5" />
                          상단 고정
                        </Badge>
                      ) : null}
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {ann.published_at
                          ? new Date(ann.published_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <CardTitle className="mt-1.5 text-base">
                      {ann.title}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                {ann.body}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
