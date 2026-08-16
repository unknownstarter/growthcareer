"use client";

/**
 * 학생 surface 에러 안전망 (라이트 톤).
 *
 * fetchStudentById 등 catch 없는 repository 호출이 예상 밖 throw 할 때
 * blank / Next 기본 에러 화면 대신 "다시 시도" CTA. layout 의 LmsShell 안에서 렌더.
 */
import { ErrorView } from "@/src/programs/fan-to-pro/interface/components/lms/ui/error-view";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      error={error}
      reset={reset}
      title="화면을 불러오지 못했어요"
      description="일시적인 오류일 수 있어요. 다시 시도해주세요. 계속되면 관리자에게 문의해주세요."
    />
  );
}
