/**
 * next-intl middleware — intercepts every request, detects the locale, and
 * rewrites the URL so route handlers see the correct `[locale]` segment.
 *
 * The matcher excludes `/api`, Next.js internals, and static assets so they
 * pass through untouched.
 */
import createMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Skip Next.js internals and static assets
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
