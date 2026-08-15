import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GoogleAnalytics } from "@next/third-parties/google";
import { KakaoChannelButton } from "@/src/programs/fan-to-pro/presentation/components/kakao-channel-button";
import { LocaleSwitcher } from "@/src/programs/fan-to-pro/presentation/components/locale-switcher";
import { routing } from "@/src/i18n/routing";
import "../globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const SITE_URL = "https://growthcareer.xyz";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// 봇 스캐너가 존재하지 않는 locale (예: /wp-login.php, /.env) 을 긁을 때 Next 가
// 동적 렌더를 시도하다 next-intl requestLocale + static/dynamic 충돌로 500 을 던지는
// 문제 방지. generateStaticParams 에 없는 locale (en/ko 외) 은 곧바로 404.
export const dynamicParams = false;

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta.site" });
  const ogLocale = locale === "ko" ? "ko_KR" : "en_US";
  const canonical = locale === routing.defaultLocale ? "/" : `/${locale}`;

  return {
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical,
      languages: {
        en: "/",
        ko: "/ko",
        "x-default": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
      url: `${SITE_URL}${canonical}`,
      siteName: t("title"),
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
    // Search Console 소유권 확인 (HTML 태그 방식). 인증 코드는 공개값(HTML 소스 노출)이라
    // 하드코딩 OK. Vercel env NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 로 오버라이드 가능.
    verification: {
      google:
        process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ??
        "SSMT9Wj3uRldQnAFDn_0b-NvaeHUWh0Yj-YtGGVrfGc",
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
}

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Allow static rendering of the [locale] segment.
  setRequestLocale(locale);

  return (
    <html lang={locale} className="dark">
      <body className="bg-bg text-fg min-h-screen antialiased">
        <NextIntlClientProvider>
          <LocaleSwitcher />
          {children}
          <KakaoChannelButton />
        </NextIntlClientProvider>
      </body>
      {GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
    </html>
  );
}
