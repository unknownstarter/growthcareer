/**
 * Detail 페이지 공통 Skeleton + dim overlay.
 *
 * UX 표준 (노아 2026-06-28):
 *   - 뒤에 skeleton pulse 애니메이션
 *   - 그 위에 반투명 dim layer (backdrop-blur)
 *   - 중앙에 spinner + "불러오는 중" 텍스트
 *   - overlay 가 모든 터치 차단 (자동)
 *
 * Next.js loading.tsx 안에서 사용 → main 영역만 덮음 (sidebar / topbar 보존).
 */
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";

export function DetailLoading({ title }: { title: string }) {
  return (
    <div className="relative">
      {/* 배경 — skeleton blocks (pulse) */}
      <div aria-hidden className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-12 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-4 w-40 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 animate-pulse rounded bg-[var(--muted)]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--muted)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 위에 dim overlay + 중앙 spinner + 텍스트 — 터치 차단 */}
      <div
        role="status"
        aria-live="polite"
        className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--background)]/60 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius)] bg-[var(--background)] px-6 py-5 shadow-lg border border-[var(--border)]">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {title} 불러오는 중...
          </p>
        </div>
      </div>
    </div>
  );
}
