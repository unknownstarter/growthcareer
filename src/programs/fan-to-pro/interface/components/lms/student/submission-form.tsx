"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { Textarea } from "@/src/programs/fan-to-pro/interface/components/lms/ui/textarea";
import { Input } from "@/src/programs/fan-to-pro/interface/components/lms/ui/input";
import { Label } from "@/src/programs/fan-to-pro/interface/components/lms/ui/label";
import { submitAssignmentAction } from "@/src/programs/fan-to-pro/interface/server-actions/student/lms-student-actions";

/**
 * 과제 제출 form (학생).
 *
 * 텍스트 body 또는 file_path (Storage 에 업로드된 path) 중 하나 필수.
 * Wave 2 lite — file 업로드는 운영자에게 카톡으로 전달 (Wave 4 풀 업로드).
 */
export function SubmissionForm({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    const file_path = String(formData.get("file_path") ?? "").trim();
    if (!body && !file_path) {
      setFeedback("텍스트 또는 파일 path 중 하나를 입력하세요.");
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await submitAssignmentAction({
        assignment_id: assignmentId,
        body: body || null,
        file_path: file_path || null,
      });
      if (result.status === "error") {
        setFeedback(`오류: ${result.error}`);
        return;
      }
      setFeedback(`v${result.version} 제출 완료.`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="body" className="text-xs">텍스트 답변</Label>
        <Textarea id="body" name="body" rows={8} placeholder="답안을 작성하세요." />
      </div>
      <div className="space-y-1">
        <Label htmlFor="file_path" className="text-xs">파일 path (선택)</Label>
        <Input
          id="file_path"
          name="file_path"
          placeholder="cohort-1/assignment-1/student-name.pdf"
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          Storage 업로드 흐름은 Wave 4 에서 추가됩니다. 현재는 운영자에게
          카톡으로 파일 전달 후 path 입력.
        </p>
      </div>
      {feedback ? (
        <div className="rounded-[var(--radius-sm)] bg-[var(--secondary)] px-4 py-3 text-sm">
          {feedback}
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="h-12 px-6">
        {pending ? "제출 중..." : "제출"}
      </Button>
    </form>
  );
}
