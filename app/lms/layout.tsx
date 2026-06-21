import type { Metadata, Viewport } from "next";
import "../globals.css";

/**
 * /lms/* 전용 root layout (ADR 0006 §3 + ADR 0007 §1).
 *
 * 기존 /admin/* 와 동일한 패턴 — next-intl provider 거치지 않는 단일 한국어
 * 페이지. globals.css 의 dark 토큰 대신 LMS 라이트 토큰 적용.
 *
 * <html data-theme="light"> + <body class="bg-bg text-fg">.
 * 마케팅 (/* root) 의 다크 와 완전 분리. nested wrapper 안 써도 root 가
 * 통째로 라이트라 안전 (한 페이지 두 theme 섞임 사고 0).
 *
 * 노출 차단: middleware 가 X-Robots-Tag 헤더를 박지만 메타 태그로도 이중 방어.
 */

export const metadata: Metadata = {
  title: "Growth Career LMS",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function LmsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-theme="light">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </head>
      <body className="min-h-screen antialiased bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
