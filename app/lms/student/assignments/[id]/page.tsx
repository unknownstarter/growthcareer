import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchAssignmentById,
  fetchSubmissionsByStudent,
  fetchFeedbackBySubmission,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
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
import { SubmissionForm } from "@/src/programs/fan-to-pro/interface/components/lms/student/submission-form";

export const metadata: Metadata = {
  title: "과제 상세 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <EmptyState title="학생 정보가 없습니다" />
      </PageContainer>
    );
  }

  const [student, assignment, allSubs] = await Promise.all([
    fetchStudentById(user.studentId),
    fetchAssignmentById(id),
    fetchSubmissionsByStudent(user.studentId),
  ]);

  if (!assignment || !student) notFound();

  // 본인 cohort 의 과제인지 확인.
  if (assignment.cohort_id !== student.cohort_id) {
    return (
      <PageContainer>
        <EmptyState
          title="권한 없음"
          description="다른 기수의 과제입니다."
        />
      </PageContainer>
    );
  }

  const submissions = allSubs.filter((s) => s.assignment_id === assignment.id);

  // 가장 최근 제출의 피드백.
  const latestSub = submissions[0];
  const feedbacks = latestSub
    ? await fetchFeedbackBySubmission(latestSub.id)
    : [];

  return (
    <PageContainer>
      <Link
        href="/lms/student/assignments"
        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        ← 과제 목록
      </Link>
      <PageHeader
        title={assignment.title}
        description={`마감 ${new Date(assignment.due_at).toLocaleString("ko-KR")}`}
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">과제 설명</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-[var(--foreground)]">
            {assignment.description}
          </p>
        </CardContent>
      </Card>

      {submissions.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                내 제출물 ({submissions.length}건)
              </CardTitle>
            </div>
            <CardDescription>최신 버전 + 강사 피드백</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.map((s) => (
                <div
                  key={s.id}
                  className="rounded-[var(--radius)] border border-[var(--border)] p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">v{s.version}</Badge>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(s.submitted_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  {s.body ? (
                    <p className="text-sm whitespace-pre-wrap text-[var(--foreground)]">
                      {s.body}
                    </p>
                  ) : null}
                  {s.file_path ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      파일: <code>{s.file_path}</code>
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {feedbacks.length > 0 ? (
              <div className="mt-6 border-t border-[var(--border)] pt-4">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-3">
                  강사 피드백
                </p>
                <div className="space-y-2">
                  {feedbacks.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-[var(--radius)] bg-[var(--secondary)] p-4"
                    >
                      <p className="text-sm whitespace-pre-wrap">{f.body}</p>
                      {f.score !== null ? (
                        <p className="text-xs text-[var(--muted-foreground)] mt-2">
                          점수: {f.score}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {submissions.length > 0 ? "재제출" : "제출"}
          </CardTitle>
          <CardDescription>
            재제출 시 새 버전으로 저장됩니다 (기존 버전 보존).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionForm assignmentId={assignment.id} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
