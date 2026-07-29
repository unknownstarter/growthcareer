/**
 * 학생 surface loading (cohortSlug/student/* — dashboard / profile / materials / career).
 *
 * 공통 LoadingOverlay 위에 학생 페이지 형 skeleton (3 link card 또는 list).
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export default function StudentLoading() {
  return (
    <LoadingOverlay title="페이지">
      <div className="px-6 py-8 md:px-10 md:py-10 max-w-5xl mx-auto motion-safe:animate-pulse">
        {/* PageHeader */}
        <header className="border-b border-[var(--border)] pb-6 mb-6 space-y-2">
          <div className="h-7 w-56 rounded bg-[var(--muted)]" />
          <div className="h-4 w-80 rounded bg-[var(--muted)]" />
        </header>

        {/* 3 카드 또는 폼 영역 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
            >
              <div className="h-10 w-10 rounded-[var(--radius)] bg-[var(--muted)]" />
              <div className="h-5 w-32 rounded bg-[var(--muted)]" />
              <div className="h-4 w-full rounded bg-[var(--muted)]" />
              <div className="h-4 w-3/4 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </LoadingOverlay>
  );
}
