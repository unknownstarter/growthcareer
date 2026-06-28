/**
 * LMS 공통 로딩 overlay — skeleton 위에 dim + 중앙 spinner + 텍스트.
 *
 * UX 표준 (노아 2026-06-28):
 *   - 뒤에 skeleton pulse (children)
 *   - 그 위에 반투명 dim layer (backdrop-blur)
 *   - 중앙에 spinner + "X 불러오는 중" 텍스트
 *   - overlay 가 모든 터치 차단
 *
 * 클린 아키텍처 (노아 요구):
 *   - DetailLoading / AdminLoading / 학생 loading 등 모든 LMS loading 이 이 컴포넌트 사용
 *   - 각자 skeleton 만 props.children 으로 전달
 *   - dim overlay + spinner 디자인 = 단 1곳 변경 시 전체 통일
 */
import { Loader2 } from "lucide-react";

export function LoadingOverlay({
  title,
  children,
}: {
  /** "X 불러오는 중..." 의 X 부분. 예: "학생 정보" / "기수 목록" */
  title: string;
  /** 뒤에 깔리는 skeleton (페이지 별 다른 모양) */
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div aria-hidden>{children}</div>
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] bg-[var(--background)] px-6 py-5 shadow-lg border border-[var(--border)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {title} 불러오는 중...
          </p>
        </div>
      </div>
    </div>
  );
}
