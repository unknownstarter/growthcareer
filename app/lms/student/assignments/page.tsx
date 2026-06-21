import type { Metadata } from "next";
import Link from "next/link";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import {
  fetchAssignmentsByCohort,
  fetchSubmissionsByStudent,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";
import { Badge } from "@/src/programs/fan-to-pro/interface/components/lms/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "과제 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <PageHeader title="과제" />
        <EmptyState title="학생 정보가 없습니다" />
      </PageContainer>
    );
  }

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="과제" />
        <EmptyState title="학생 정보를 찾을 수 없습니다" />
      </PageContainer>
    );
  }

  const [assignments, submissions] = await Promise.all([
    fetchAssignmentsByCohort(student.cohort_id),
    fetchSubmissionsByStudent(student.id),
  ]);

  const subMap = new Map(submissions.map((s) => [s.assignment_id, s]));

  return (
    <PageContainer>
      <PageHeader title="과제" description={`${assignments.length}개 과제`} />

      {assignments.length === 0 ? (
        <EmptyState title="과제가 없습니다" />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => {
            const sub = subMap.get(a.id);
            const overdue = new Date(a.due_at) < new Date() && !sub;
            return (
              <Link
                key={a.id}
                href={`/lms/student/assignments/${a.id}` as never}
              >
                <Card className="transition-colors hover:border-[var(--primary)]/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          마감{" "}
                          {new Date(a.due_at).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {sub ? (
                        <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border-0">
                          제출 v{sub.version}
                        </Badge>
                      ) : overdue ? (
                        <Badge variant="outline" className="text-[var(--destructive)] border-[var(--destructive)]">
                          마감 초과
                        </Badge>
                      ) : (
                        <Badge variant="outline">미제출</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
