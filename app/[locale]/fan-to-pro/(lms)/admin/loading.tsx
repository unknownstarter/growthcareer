/**
 * LMS admin 전체 공통 loading (cohorts list / students list / dashboard 등).
 *
 * LoadingOverlay 위에 list-style skeleton (KPI 카드 4 + 표 골격) 박음.
 * 페이지 별 detail loading (학생/강사/지원자 detail) 은 폴더에 별 loading.tsx 추가.
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/admin/loading-overlay";

export default function AdminLoading() {
  return (
    <LoadingOverlay title="페이지">
      <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto animate-pulse">
        {/* PageHeader skeleton */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border)] pb-6 mb-6">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-[var(--muted)]" />
            <div className="h-4 w-72 rounded bg-[var(--muted)]" />
          </div>
          <div className="h-9 w-32 rounded-[var(--radius)] bg-[var(--muted)]" />
        </header>

        {/* KPI cards skeleton (4 cards) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2"
            >
              <div className="h-3 w-16 rounded bg-[var(--muted)]" />
              <div className="h-7 w-20 rounded bg-[var(--muted)]" />
              <div className="h-3 w-24 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <div className="h-5 w-40 rounded bg-[var(--muted)]" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-4 border-b border-[var(--border)] p-4 last:border-b-0"
            >
              <div className="h-4 rounded bg-[var(--muted)]" />
              <div className="h-4 rounded bg-[var(--muted)]" />
              <div className="h-4 rounded bg-[var(--muted)]" />
              <div className="h-4 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </LoadingOverlay>
  );
}
