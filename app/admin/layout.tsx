import type { Metadata, Viewport } from "next";
import "../globals.css";

/**
 * /admin/* 전용 root layout. next-intl provider 거치지 않는 단일 한국어 페이지.
 * locale layout 과 동일한 dark / Pretendard 스타일은 globals.css 에서 상속.
 *
 * 노출 차단: middleware 가 X-Robots-Tag 헤더를 박지만 메타 태그로도 이중 방어.
 */

export const metadata: Metadata = {
  title: "Growth Career Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </head>
      <body className="bg-bg text-fg min-h-screen antialiased">{children}</body>
    </html>
  );
}
