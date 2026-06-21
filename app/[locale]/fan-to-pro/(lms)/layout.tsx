/**
 * (lms) route group layout — ADR 0008 §3.
 *
 * 마케팅 [locale]/fan-to-pro/page.tsx 와 같은 URL 공간을 공유하지만 group `(lms)`
 * 안의 페이지는 라이트 토스 톤. 다크 마케팅 + 라이트 LMS 공존.
 *
 * URL:
 *   /[locale]/fan-to-pro              -> 마케팅 page.tsx (다크, 변경 X)
 *   /[locale]/fan-to-pro/admin/...    -> (lms)/admin (라이트, 본 layout 적용)
 *   /[locale]/fan-to-pro/<slug>/...   -> (lms)/[cohortSlug] (라이트, Step 3/4)
 *
 * `<div data-theme="light">` nested wrapper — SSR/hydration 안전 (ADR 0006 §3).
 * `<html className="dark">` 의 다크 토큰 안에서 라이트 토큰만 nested override.
 *
 * 마케팅 [locale]/layout.tsx 의 KakaoChannelButton / LocaleSwitcher 는 그대로
 * 노출 — 트레이드오프 인정. Wave 4 에서 pathname 분기 검토.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function LmsGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      {children}
    </div>
  );
}
