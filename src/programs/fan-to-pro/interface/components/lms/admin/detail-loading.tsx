/**
 * Detail 페이지 공통 Skeleton — 학생 / 강사 / 지원자 / 기수 detail.
 *
 * Next.js loading.tsx 안에서 사용. server fetch 동안 "멈춰있는 것처럼"
 * 안 보이게 시각 피드백.
 */
import {
  Card,
  CardContent,
  CardHeader,
} from "@/src/programs/fan-to-pro/interface/components/lms/ui/card";

export function DetailLoading({ title }: { title: string }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="h-4 w-12 animate-pulse rounded bg-[var(--muted)]" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-64 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-40 animate-pulse rounded bg-[var(--muted)]" />
      </div>
      <p className="text-xs text-[var(--muted-foreground)]">
        {title} 불러오는 중...
      </p>
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
  );
}
