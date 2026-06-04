/**
 * next-intl request config — loads the per-request messages bundle.
 *
 * The locale is resolved by the middleware and passed through `getRequestConfig`.
 * If the value is missing or unknown we fall back to the default locale so SSG
 * for static pages (e.g. notFound) still works.
 */
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
  };
});
