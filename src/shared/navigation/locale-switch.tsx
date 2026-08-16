"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

/**
 * 인라인 언어 토글 (`EN | 한국어`) — 헤더 우측 액션 그룹에 편입되는 버전.
 * 전역 fixed 스위처(locale-switcher.tsx)와 달리 GNB 안에 자연스럽게 앉는다.
 * 현재 경로를 유지한 채 locale 만 교체. a11y: nav landmark + aria-current.
 */

const LABELS: Record<(typeof routing.locales)[number], string> = {
  en: "EN",
  ko: "한국어",
};

export function LocaleSwitch({ variant = "light" }: { variant?: "light" | "dark" }) {
  const activeLocale = useLocale();
  const pathname = usePathname();

  const rest = variant === "light" ? "text-ink-faint" : "text-fg-subtle";
  const divider = variant === "light" ? "text-ink-divider" : "text-fg-subtle/60";

  return (
    <nav aria-label="Select language" className="flex items-center gap-2 font-bold text-[13px]">
      {routing.locales.map((locale, i) => {
        const isActive = locale === activeLocale;
        return (
          <span key={locale} className="flex items-center gap-2">
            {i > 0 ? <span aria-hidden className={divider}>|</span> : null}
            {isActive ? (
              <span aria-current="true" className="text-brand-pink">{LABELS[locale]}</span>
            ) : (
              <Link href={pathname} locale={locale} className={`${rest} transition-colors hover:text-brand-pink`}>
                {LABELS[locale]}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
