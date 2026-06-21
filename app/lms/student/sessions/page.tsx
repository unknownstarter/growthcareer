import type { Metadata } from "next";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
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
import { formatSessionTimeKst } from "@/src/programs/fan-to-pro/domain/entities/session";

export const metadata: Metadata = {
  title: "수업 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const ATT_LABEL: Record<string, string> = {
  present: "출석",
  late: "지각",
  absent: "결석",
  excused: "공석",
};

export default async function StudentSessionsPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <PageHeader title="수업" />
        <EmptyState title="학생 정보가 연결되지 않았습니다" />
      </PageContainer>
    );
  }

  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="수업" />
        <EmptyState title="학생 정보를 찾을 수 없습니다" />
      </PageContainer>
    );
  }

  const sessions = await fetchSessionsByCohort(student.cohort_id);

  // 본인 attendance 조회.
  const supabase = getSupabaseServer();
  let attendanceMap = new Map<string, string>();
  if (supabase) {
    const { data } = await supabase
      .from("attendance")
      .select("session_id, status")
      .eq("student_id", student.id);
    attendanceMap = new Map(
      (data ?? []).map((r) => {
        const raw = r as Record<string, unknown>;
        return [String(raw.session_id ?? ""), String(raw.status ?? "")];
      }),
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="수업"
        description={`${sessions.length}회차 — 출결은 강사가 mark 합니다`}
      />

      {sessions.length === 0 ? (
        <EmptyState title="수업이 없습니다" />
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const att = attendanceMap.get(s.id);
            const past = new Date(s.starts_at) < new Date();
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {s.idx ? `${s.idx}회차 · ` : ""}
                        {s.title}
                      </CardTitle>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {formatSessionTimeKst(s.starts_at, s.ends_at)}
                        {s.location ? ` · ${s.location}` : ""}
                      </p>
                    </div>
                    {att ? (
                      <Badge
                        className={
                          att === "present"
                            ? "bg-[var(--primary)]/10 text-[var(--primary)] border-0"
                            : ""
                        }
                        variant={att === "present" ? "default" : "outline"}
                      >
                        {ATT_LABEL[att] ?? att}
                      </Badge>
                    ) : past ? (
                      <Badge variant="outline">출결 미입력</Badge>
                    ) : (
                      <Badge variant="outline">예정</Badge>
                    )}
                  </div>
                </CardHeader>
                {s.topic ? (
                  <CardContent className="pt-0">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      주제: {s.topic}
                    </p>
                  </CardContent>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
