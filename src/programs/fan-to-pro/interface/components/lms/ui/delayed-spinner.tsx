"use client";

/**
 * 300ms 지연 노출 spinner — LoadingOverlay 전용.
 *
 * 왜 지연:
 *   - 대부분 LMS 라우트는 300ms 안에 렌더 완료 -> 즉시 spinner 표시하면 깜빡임 (flash) 발생.
 *   - 느린 로드에서만 spinner 를 띄워 "진행 중" 을 알린다.
 *
 * 왜 non-blocking:
 *   - 우하단 pill 로 고정. skeleton 위를 덮지 않고 터치를 차단하지 않음.
 *   - pointer-events-none 으로 클릭/스크롤 통과.
 *
 * 접근성: motion-safe:animate-spin 으로 prefers-reduced-motion 존중.
 */
import * as React from "react";
import { Loader2 } from "lucide-react";

export function DelayedSpinner({ delayMs = 300 }: { delayMs?: number }) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
    >
      <Loader2 className="h-4 w-4 text-[var(--primary)] motion-safe:animate-spin" />
    </div>
  );
}
