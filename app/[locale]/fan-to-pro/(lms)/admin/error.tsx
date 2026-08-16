"use client";

/**
 * LMS admin surface 에러 안전망 (라이트 톤).
 *
 * 페이지 인라인 try/catch (finance / consultations 등) 로 못 잡은 예상 밖 throw
 * (raw repository 호출 timeout / Supabase 5xx 등) 를 여기서 받는다.
 * layout 이 LmsShell 을 감싸므로 이 error 도 shell 안에서 렌더된다.
 */
import { ErrorView } from "@/src/programs/fan-to-pro/interface/components/lms/ui/error-view";

export default function AdminError({
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
      title="데이터를 불러오지 못했어요"
      description="일시적인 오류일 수 있어요. 다시 시도하거나 새로고침해주세요. 계속되면 개발팀에 문의해주세요."
    />
  );
}
