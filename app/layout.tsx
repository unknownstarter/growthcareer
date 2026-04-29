import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Growth Career",
    template: "%s | Growth Career",
  },
  description:
    "글로벌 커리어를 위한 실무 트랙. 첫 트랙은 K-엔터테인먼트 업계 취업 — Fan to Pro.",
  metadataBase: new URL("https://growthcareer.xyz"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://growthcareer.xyz",
    siteName: "Growth Career",
    title: "Growth Career",
    description:
      "글로벌 커리어를 위한 실무 트랙. 첫 트랙은 K-엔터테인먼트 업계 취업 — Fan to Pro.",
    images: [
      {
        url: "/brand/logo-black.png",
        width: 600,
        height: 600,
        alt: "Growth Career",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Growth Career",
    description:
      "글로벌 커리어를 위한 실무 트랙. 첫 트랙은 K-엔터테인먼트 업계 취업 — Fan to Pro.",
    images: ["/brand/logo-black.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-bg text-fg min-h-screen antialiased">{children}</body>
    </html>
  );
}
