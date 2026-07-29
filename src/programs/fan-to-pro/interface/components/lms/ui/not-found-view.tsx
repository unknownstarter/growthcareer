"use client";

/**
 * LMS 공통 404 뷰 (라이트 톤).
 *
 * not-found.tsx 는 route param 을 못 받으므로 pathname 에서 locale / surface 를 추론해
 * 안전한 "돌아가기" 목적지를 계산한다.
 *
 * 인터렉션 (CLAUDE.md §6.7): fade-in 등장 + 링크 hover transition.
 */
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Compass } from "lucide-react";

export function NotFoundView({
  title,
  description,
  homeLabel,
}: {
  title: string;
  description: string;
  homeLabel: string;
}) {
  const pathname = usePathname() ?? "/ko/fan-to-pro/admin/dashboard";

  // pathname: /{locale}/fan-to-pro/... -> locale + surface 추론.
  const segments = pathname.split("/").filter(Boolean);
  const locale = segments[0] === "en" ? "en" : "ko";

  // admin surface 면 admin dashboard, 그 외는 locale 홈으로.
  const isAdmin = segments.includes("admin");
  const home = (
    isAdmin
      ? `/${locale}/fan-to-pro/admin/dashboard`
      : `/${locale}/fan-to-pro`
  ) as Route;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-12 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      <div className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary)]">
          <Compass className="h-6 w-6 text-[var(--muted-foreground)]" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
          {description}
        </p>
        <Link
          href={home}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--primary-foreground)] transition-all duration-150 hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}
