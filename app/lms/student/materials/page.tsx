import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentById } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchPublishedMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/material-repository";
import {
  PageContainer,
  PageHeader,
  EmptyState,
} from "@/src/programs/fan-to-pro/interface/components/lms/admin/page-header";

export const metadata: Metadata = {
  title: "자료 - Growth Career LMS",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StudentMaterialsPage() {
  const user = await assertLmsRole("student");
  if (!user.studentId) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" />
        <EmptyState title="학생 정보가 없습니다" />
      </PageContainer>
    );
  }
  const student = await fetchStudentById(user.studentId);
  if (!student) {
    return (
      <PageContainer>
        <PageHeader title="강의 자료" />
        <EmptyState title="학생 정보를 찾을 수 없습니다" />
      </PageContainer>
    );
  }

  const materials = await fetchPublishedMaterialsByCohort(student.cohort_id);

  return (
    <PageContainer>
      <PageHeader
        title="강의 자료"
        description={`${materials.length}개 — 다운로드 흐름은 Wave 4 에서 추가됩니다`}
      />

      {materials.length === 0 ? (
        <EmptyState title="자료가 없습니다" />
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <FileText className="h-5 w-5 text-[var(--muted-foreground)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.title}</p>
                {m.description ? (
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">
                    {m.description}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--muted-foreground)] truncate mt-1">
                  {m.file_path}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
