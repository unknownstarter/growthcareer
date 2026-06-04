/**
 * next-intl routing config.
 *
 * - en is the default locale (no prefix): `/` -> en
 * - ko is the secondary locale (prefix): `/ko/*` -> ko
 * - localePrefix: 'as-needed' avoids `/en/...` redundancy on the default locale.
 */
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ko"] as const,
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
