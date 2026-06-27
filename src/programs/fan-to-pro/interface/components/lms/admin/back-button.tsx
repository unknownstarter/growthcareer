"use client";

/**
 * 뒤로가기 버튼 — browser history 기반 + fallback URL.
 *
 * detail 페이지 (학생 / 강사 / 지원자 / 기수) 상단에 사용.
 * 노아 요청 2026-06-27: "이전 경로 기억하게".
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton({
  fallbackHref,
  label = "뒤로",
}: {
  fallbackHref: Route;
  label?: string;
}) {
  const router = useRouter();
  const [hasHistory, setHasHistory] = React.useState(false);

  React.useEffect(() => {
    // browser history 가 있으면 router.back() 사용 가능.
    // window.history.length === 1 이면 직접 URL 진입 — fallback 필요.
    setHasHistory(window.history.length > 1);
  }, []);

  if (hasHistory) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Link
      href={fallbackHref}
      className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
