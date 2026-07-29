/**
 * LMS 공통 로딩 컨테이너 — skeleton 우선, non-blocking (2026-07 Luna UX 개선).
 *
 * 이전 (2026-06-28): skeleton 위에 dim + backdrop-blur + 중앙 spinner + "X 불러오는 중"
 *   -> 문제: dim/blur 가 skeleton 의 형태 예고 이점을 죽이고, 전체 터치를 차단.
 *      하드코딩 한국어 title 이 i18n 을 우회 (LMS 는 라이트 톤 다국어 표면).
 *
 * 이제:
 *   - skeleton 을 그대로 노출 (dim/blur/blocking overlay 제거)
 *   - spinner 는 300ms 지연 노출 client sub-component (빠른 로드 시 깜빡임 방지)
 *   - spinner 는 우하단 pill 로 비침습 배치 (터치 차단 X)
 *   - 하드코딩 title 텍스트 제거 (skeleton 이 곧 로딩 신호)
 *
 * 클린 아키텍처:
 *   - DetailLoading / AdminLoading / StudentLoading 등 모든 LMS loading 이 이 컴포넌트 사용
 *   - 각자 skeleton 만 props.children 으로 전달
 *   - loading 표현 = 단 1곳 변경 시 전체 통일
 */
import { DelayedSpinner } from "./delayed-spinner";

export function LoadingOverlay({
  title,
  children,
}: {
  /**
   * @deprecated 시각 표현에는 더 이상 쓰이지 않음. 스크린리더 안내 label 로만 사용.
   * 기존 caller signature 유지를 위해 optional 로 보존.
   */
  title?: string;
  /** 뒤에 깔리는 skeleton (페이지 별 다른 모양) */
  children: React.ReactNode;
}) {
  return (
    <div className="relative" role="status" aria-live="polite" aria-busy="true">
      {children}
      <span className="sr-only">{title ? `${title} ` : ""}loading</span>
      <DelayedSpinner />
    </div>
  );
}
