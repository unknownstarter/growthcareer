"use client";

/**
 * /admin/* (다크 어드민) 에러 안전망.
 *
 * fetchApplicants 등 기존 어드민 fetch 는 { error } 를 result 로 감싸 graceful
 * 처리하지만, 예상 밖 throw (role 조회 실패 / Supabase 5xx) 시 Next 기본 에러
 * 화면 대신 다크 톤 "다시 시도" CTA. layout 이 html/body (다크) 를 감싼다.
 */
import { useEffect } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 py-16 text-fg">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-border/40">
          <AlertTriangle className="h-6 w-6 text-fg-muted" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-fg">데이터를 불러오지 못했어요</h1>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          일시적인 오류일 수 있어요. 다시 시도하거나 새로고침해주세요. 계속되면 개발팀에 문의해주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-pink px-6 py-3 font-bold text-white transition-all duration-150 hover:brightness-95 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          다시 시도
        </button>
        {error.digest ? (
          <p className="mt-4 font-mono text-[10px] text-fg-subtle">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
