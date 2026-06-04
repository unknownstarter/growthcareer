import type { MetadataRoute } from "next";
import { routing } from "@/src/i18n/routing";

const BASE = "https://growthcareer.xyz";

const ROUTES = ["/", "/fan-to-pro", "/privacy", "/terms"] as const;

const PRIORITY: Record<(typeof ROUTES)[number], number> = {
  "/": 1,
  "/fan-to-pro": 1,
  "/privacy": 0.3,
  "/terms": 0.3,
};

const FREQUENCY: Record<
  (typeof ROUTES)[number],
  "weekly" | "yearly"
> = {
  "/": "weekly",
  "/fan-to-pro": "weekly",
  "/privacy": "yearly",
  "/terms": "yearly",
};

function localizedHref(locale: string, route: string) {
  if (locale === routing.defaultLocale) return `${BASE}${route}`;
  if (route === "/") return `${BASE}/${locale}`;
  return `${BASE}/${locale}${route}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.flatMap((route) =>
    routing.locales.map((locale) => {
      const languages: Record<string, string> = {};
      for (const l of routing.locales) {
        languages[l] = localizedHref(l, route);
      }
      languages["x-default"] = localizedHref(routing.defaultLocale, route);
      return {
        url: localizedHref(locale, route),
        lastModified,
        changeFrequency: FREQUENCY[route],
        priority: PRIORITY[route],
        alternates: { languages },
      };
    }),
  );
}
