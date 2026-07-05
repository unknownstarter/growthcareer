"use client";

/**
 * Admin 수료증 미리보기 button (B0081). admin students/[id] 페이지에서 사용.
 *
 * previewCertificateForAdminAction 을 호출해 HTML 을 받고 새 창을 열어
 * document.write() 로 즉시 렌더. 인쇄 다이얼로그는 학생 페이지에서만 트리거.
 *
 * 권한: server action 자체가 assertCanReadStudentProfile 로 가드. 여기선
 * 클릭 트리거만.
 *
 * 새 창 사용 이유:
 *   - 부모 페이지 CSS 오염 방지 (수료증 template 이 자체 CSS 완비)
 *   - 새 창의 print 다이얼로그가 iframe 보다 안정적
 */
import { useTransition, useState } from "react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";
import { previewCertificateForAdminAction } from "@/src/programs/fan-to-pro/application/certificate/generate-certificate-pdf";
import { FileText } from "lucide-react";

type Props = {
  studentId: string;
};

export function CertificatePreviewButton({ studentId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await previewCertificateForAdminAction({
        student_id: studentId,
      });
      if (result.status === "error") {
        setError(`오류: ${result.error}`);
        return;
      }
      if (result.status === "not-eligible") {
        setError(`발급 대상 아님 (${humanizeReason(result.reason)})`);
        return;
      }
      // 새 창 렌더. 팝업 차단 대응 위해 사용자 클릭 안에서 window.open 호출.
      const win = window.open("", "_blank", "width=900,height=1200");
      if (!win) {
        setError("팝업 차단됨. 브라우저 팝업 허용 후 다시 시도해 주세요.");
        return;
      }
      win.document.open();
      win.document.write(result.html);
      win.document.close();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        className="h-9"
        onClick={onClick}
        disabled={pending}
      >
        <FileText className="h-4 w-4 mr-1.5" />
        {pending ? "불러오는 중..." : "수료증 미리보기"}
      </Button>
      {error ? (
        <span className="text-xs text-[#b42318]">{error}</span>
      ) : null}
    </div>
  );
}

function humanizeReason(
  reason:
    | "cohort_in_progress"
    | "cohort_cancelled"
    | "student_inactive"
    | "attendance_below_threshold",
): string {
  switch (reason) {
    case "cohort_in_progress":
      return "종강 전";
    case "cohort_cancelled":
      return "폐강";
    case "student_inactive":
      return "학생 상태 비활성";
    case "attendance_below_threshold":
      return "출석률 미달";
  }
}
