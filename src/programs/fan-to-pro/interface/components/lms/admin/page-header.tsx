/**
 * LMS admin 페이지 공통 헤더.
 *
 * 모든 /lms/admin/* page 가 사용 — 일관된 타이틀 + 부가 description + 우측 액션.
 */
import * as React from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-6 mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
      <h3 className="text-base font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
