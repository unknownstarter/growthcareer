/**
 * Locale-aware wrappers around Next.js navigation primitives.
 *
 * Use these instead of `next/link` / `next/navigation` in app code so the
 * current locale is preserved automatically when generating URLs.
 */
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
