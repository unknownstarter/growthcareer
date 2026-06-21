import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Megaphone,
  ArrowRight,
} from "lucide-react";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchCohortById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchPublishedAnnouncementsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import { fetchAssignmentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";
import { fetchSubmissionsByStudent } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import {
  PageContainer,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "내 학습 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <EmptyState
          title="학생 정보가 연결되지 않았습니다"
          description="운영자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <EmptyState
          title="학생 정보를 찾을 수 없습니다"
          description="운영자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  const cohort = await fetchCohortById(student.cohort_id);
  if (!cohort) {
    return (
      <PageContainer>
        <EmptyState
          title="기수 정보를 찾을 수 없습니다"
          description="운영자에게 문의해주세요."
        />
      </PageContainer>
    );
  }

  const [sessions, announcements, assignments, submissions] = await Promise.all([
    fetchSessionsByCohort(cohort.id),
    fetchPublishedAnnouncementsByCohort(cohort.id),
    fetchAssignmentsByCohort(cohort.id),
    fetchSubmissionsByStudent(student.id),
  ]);

  const now = new Date();
  const upcomingSession = sessions
    .filter((s) => new Date(s.starts_at) > now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    )[0];

  const submittedIds = new Set(submissions.map((s) => s.assignment_id));
  const pendingAssignments = assignments
    .filter((a) => a.status === "open" && !submittedIds.has(a.id))
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <PageContainer>
      <header className="space-y-1 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          안녕하세요, {student.display_name} 님
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {today} · {cohort.name}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard
          icon={Calendar}
          label="다음 강의"
          value={
            upcomingSession
              ? new Date(upcomingSession.starts_at).toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                })
              : "없음"
          }
          hint={
            upcomingSession
              ? `${upcomingSession.idx ?? ""}회차 ${upcomingSession.title}`
              : "강의 일정 종료"
          }
        />
        <KpiCard
          icon={AlertCircle}
          label="미제출 과제"
          value={`${pendingAssignments.length}건`}
          hint={
            pendingAssignments[0]
              ? `다음 마감: ${new Date(pendingAssignments[0].due_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}`
              : "모두 제출 완료"
          }
        />
        <KpiCard
          icon={CheckCircle2}
          label="제출 완료"
          value={`${submissions.length}건`}
          hint="피드백 대기"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[var(--primary)]" />
              최근 공지
            </CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                공지가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {announcements.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={"/lms/student/announcements" as Route}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 hover:bg-[var(--secondary)] transition-colors"
                    >
                      <p className="text-sm font-semibold truncate">
                        {a.pinned ? "📌 " : ""}
                        {a.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {a.body}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={"/lms/student/announcements" as Route}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              모든 공지 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              과제
            </CardTitle>
            <CardDescription>마감일 임박순</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                미제출 과제가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingAssignments.slice(0, 3).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/lms/student/assignments/${a.id}` as never}
                      className="block rounded-[var(--radius-sm)] px-3 py-2 hover:bg-[var(--secondary)] transition-colors"
                    >
                      <p className="text-sm font-semibold truncate">{a.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        마감{" "}
                        {new Date(a.due_at).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={"/lms/student/assignments" as Route}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              모든 과제 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      {hint ? (
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
