/**
 * Detail 페이지 공통 skeleton — 학생 / 강사 / 지원자 / 기수 detail.
 *
 * LoadingOverlay 위에 detail 페이지 모양 skeleton 만 박음.
 * spinner (지연 노출) + non-blocking 처리는 LoadingOverlay 책임.
 */
import {
  Card,
  CardContent,
  CardHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";
import { LoadingOverlay } from "@/src/programs/fan-to-pro/interface/components/lms/ui/loading-overlay";

export function DetailLoading({ title }: { title: string }) {
  return (
    <LoadingOverlay title={title}>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-12 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="space-y-2">
          <div className="h-7 w-64 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-4 w-40 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-32 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full motion-safe:animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-4 w-3/4 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-4 w-1/2 motion-safe:animate-pulse rounded bg-[var(--muted)]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LoadingOverlay>
  );
}
