/**
 * 커뮤니티 상세 loading skeleton (§6.7).
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export default function CommunityDetailLoading() {
  return (
    <LoadingOverlay title="커뮤니티">
      <div className="px-6 py-8 md:px-10 md:py-10 max-w-7xl mx-auto motion-safe:animate-pulse">
        <div className="mx-auto max-w-3xl">
          <div className="h-4 w-20 rounded bg-[var(--muted)]" />

          <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 md:p-8 space-y-4">
            <div className="h-6 w-64 rounded bg-[var(--muted)]" />
            <div className="h-3 w-40 rounded bg-[var(--muted)]" />
            <div className="space-y-2 pt-2">
              <div className="h-4 w-full rounded bg-[var(--muted)]" />
              <div className="h-4 w-11/12 rounded bg-[var(--muted)]" />
              <div className="h-4 w-2/3 rounded bg-[var(--muted)]" />
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="h-4 w-20 rounded bg-[var(--muted)]" />
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2"
              >
                <div className="h-3 w-32 rounded bg-[var(--muted)]" />
                <div className="h-4 w-full rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
}
