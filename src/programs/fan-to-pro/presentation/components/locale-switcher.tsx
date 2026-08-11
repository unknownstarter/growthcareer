"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

/**
 * Header language toggle — `EN | 한국어`.
 *
 * Fixed in the top-right of every page (above hero) since the site has no
 * persistent header. The current locale is highlighted; the other is a
 * hover-underline link that preserves the current path under the new locale.
 *
 * a11y: nav landmark with aria-label; active locale carries aria-current.
 */

const LABELS: Record<(typeof routing.locales)[number], string> = {
  en: "EN",
  ko: "한국어",
};

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();

  // LMS / auth surface 에서는 hide. 마케팅 (랜딩 + apply) 에서만 노출.
  // 루트(/) = GC 메인. 공통 SiteHeader 가 언어 스위처를 GNB 안에 편입하므로 전역 스위처 hide.
  // LMS 의 i18n 토글은 별도 (라이트 토스 톤, topbar 안) — Wave 4 보강.
  const usesOwnHeader =
    pathname === "/" || // 루트 GC 메인 = 공통 SiteHeader
    pathname.startsWith("/auth/") ||
    pathname === "/auth" ||
    pathname.startsWith("/insight") || // 인사이트 = 공통 SiteHeader (InsightChrome)
    pathname.startsWith("/press") || // Press Room = 공통 SiteHeader
    pathname === "/fan-to-pro" || // 기수 리스트 = 공통 SiteHeader
    pathname.startsWith("/fan-to-pro/1") || // 1기 아카이브 = 공통 SiteHeader
    pathname.startsWith("/fan-to-pro/2") || // 2기 모집 = 공통 SiteHeader 가 스위처 편입
    /^\/fan-to-pro\/(admin|[a-z0-9]{8})(\/|$)/.test(pathname);
  if (usesOwnHeader) return null;

  return (
    <nav
      aria-label="Select language"
      className="
        fixed right-4 top-4 z-[70]
        sm:right-6 sm:top-6
        flex items-center gap-2
        bg-bg/80 backdrop-blur
        border border-border
        px-3 py-1.5
        text-xs sm:text-sm
        font-black uppercase
      "
      style={{ letterSpacing: "0.2em" }}
    >
      {routing.locales.map((locale, i) => {
        const isActive = locale === activeLocale;
        return (
          <span key={locale} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden className="text-fg-subtle">
                |
              </span>
            ) : null}
            {isActive ? (
              <span
                aria-current="true"
                className="text-brand-pink"
              >
                {LABELS[locale]}
              </span>
            ) : (
              <Link
                href={pathname}
                locale={locale}
                className="text-fg-muted transition-colors hover:text-fg hover:underline"
              >
                {LABELS[locale]}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
