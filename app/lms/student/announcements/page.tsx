import type { Metadata } from "next";
import { Megaphone, Pin } from "lucide-react";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchPublishedAnnouncementsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "공지 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StudentAnnouncementsPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <PageHeader title="공지" />
        <EmptyState title="학생 정보가 없습니다" />
      </PageContainer>
    );
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

  const announcements = await fetchPublishedAnnouncementsByCohort(student.cohort_id);

  return (
    <PageContainer>
      <PageHeader title="공지" description={`${announcements.length}개`} />

      {announcements.length === 0 ? (
        <EmptyState title="공지가 없습니다" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <article
              key={a.id}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <header className="flex items-center gap-2 mb-3">
                {a.pinned ? (
                  <Pin className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <Megaphone className="h-4 w-4 text-[var(--muted-foreground)]" />
                )}
                <h2 className="text-base font-bold flex-1">{a.title}</h2>
                <time className="text-xs text-[var(--muted-foreground)]">
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString("ko-KR")
                    : ""}
                </time>
              </header>
              <p className="text-sm whitespace-pre-wrap text-[var(--foreground)] leading-6">
                {a.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
