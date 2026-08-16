"use client";

/**
 * LMS 공통 에러 뷰 (라이트 톤).
 *
 * route group 의 error.tsx 안전망에서 사용. 페이지 인라인 try/catch 로
 * 못 잡은 예상 밖 throw (Supabase 5xx / timeout 등) 를 graceful 하게 받아
 * blank / Next 기본 에러 화면 대신 "다시 시도" CTA 를 준다.
 *
 * NotFoundView 와 시각 톤 통일 (카드 + 아이콘 + fade-in + CTA).
 * 인터렉션 (CLAUDE.md §6.7): fade-in 등장 + 버튼 transition.
 */
import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/src/programs/fan-to-pro/interface/components/lms/ui/button";

export function ErrorView({
  error,
  reset,
  title = "잠시 문제가 생겼어요",
  description = "일시적인 오류일 수 있어요. 다시 시도해주세요. 계속되면 관리자에게 문의해주세요.",
  retryLabel = "다시 시도",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  retryLabel?: string;
}) {
  useEffect(() => {
    // 서버 로그로 흘려보내 원인 추적 (digest 는 prod 에서 클라에 노출되는 유일한 id).
    console.error("[lms error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      <div className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)]">
          <AlertTriangle
            className="h-6 w-6 text-[var(--muted-foreground)]"
            aria-hidden
          />
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>
        <Button size="lg" className="mt-6" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
        {error.digest ? (
          <p className="mt-4 font-mono text-[10px] text-[var(--muted-foreground)]">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
