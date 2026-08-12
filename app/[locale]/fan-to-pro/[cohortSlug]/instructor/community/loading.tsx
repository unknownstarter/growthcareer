/**
 * 커뮤니티 목록 loading skeleton (강사, §6.7). 학생과 동일 형태.
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export default function InstructorCommunityListLoading() {
  return (
    <LoadingOverlay title="커뮤니티">
      <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto motion-safe:animate-pulse">
        <header className="flex items-end justify-between border-b border-[var(--border)] pb-6 mb-6">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-[var(--muted)]" />
            <div className="h-4 w-64 rounded bg-[var(--muted)]" />
          </div>
          <div className="h-11 w-24 rounded-[var(--radius)] bg-[var(--muted)]" />
        </header>

        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
            >
              <div className="h-5 w-52 rounded bg-[var(--muted)]" />
              <div className="h-4 w-full rounded bg-[var(--muted)]" />
              <div className="h-3 w-40 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      </div>
    </LoadingOverlay>
  );
}
