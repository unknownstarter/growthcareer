"use client";

/**
 * [locale] 세그먼트 전역 에러 안전망.
 *
 * GC 라이트 surface (courses / bundles / cohorts / insight / press / fan-to-pro 리스트)
 * 와 2기 / 1기 페이지에서 예상 밖 throw (Supabase 5xx / timeout 등) 가 났을 때
 * blank / Next 기본 에러 화면 대신 "다시 시도" CTA 를 준다.
 *
 * 부모 배경 (다크 bg-bg 또는 라이트 bg-white) 에 의존하지 않도록
 * 컨테이너가 자체 흰 배경을 전체에 깐다 = 어떤 surface 든 일관된 라이트 에러 화면.
 *
 * next-intl provider 안에서 렌더되지만 hook 의존을 피하기 위해 locale 은
 * useParams 로 안전 추출 (없으면 en 기본).
 */
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === "ko" ? "ko" : "en";
  const isEn = locale === "en";

  useEffect(() => {
    console.error("[locale error boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center break-keep bg-white px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-white p-8 text-center shadow-[0_2px_10px_rgba(17,24,39,0.06)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-fill">
          <AlertTriangle className="h-6 w-6 text-ink-faint" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-ink">
          {isEn ? "Something went wrong" : "잠시 문제가 생겼어요"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {isEn
            ? "This may be temporary. Please try again in a moment."
            : "일시적인 오류일 수 있어요. 잠시 후 다시 시도해주세요."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-pink px-6 py-3 font-bold text-white transition-all duration-150 hover:brightness-95 active:scale-[0.98]"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          {isEn ? "Try again" : "다시 시도"}
        </button>
        {error.digest ? (
          <p className="mt-4 font-mono text-[10px] text-ink-faint">
            ref: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
