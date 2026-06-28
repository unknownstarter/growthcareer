/**
 * Auth surface loading — login / forgot-password / reset-password / change-password / callback.
 *
 * 짧은 폼 페이지라 카드 1개 skeleton + 공통 LoadingOverlay.
 */
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export default function AuthLoading() {
  return (
    <LoadingOverlay title="페이지">
      <div className="min-h-[80vh] flex items-center justify-center px-6 py-12 animate-pulse">
        <div className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-8 space-y-4">
          <div className="h-7 w-48 rounded bg-[var(--muted)]" />
          <div className="h-4 w-64 rounded bg-[var(--muted)]" />
          <div className="space-y-3 pt-2">
            <div className="h-10 w-full rounded bg-[var(--muted)]" />
            <div className="h-10 w-full rounded bg-[var(--muted)]" />
            <div className="h-10 w-full rounded bg-[var(--muted)]" />
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
}
