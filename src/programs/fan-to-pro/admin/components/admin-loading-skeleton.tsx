/**
 * 다크 어드민 공용 로딩 스켈레톤.
 *
 * /admin/* 은 force-dynamic 이라 첫 페인트가 blank 될 수 있어 route loading.tsx 에서 사용.
 * AdminNav (top-0, ~44px) + sticky 헤더 + 컨텐츠 골격을 실제 레이아웃에 맞춰 흉내.
 * 검정 배경 다크 톤, motion-safe pulse 만 (컬러 그라데이션/glow 금지 §6.8).
 */

function Bar({ className }: { className?: string }) {
  return (
    <div
      className={`motion-safe:animate-pulse rounded-sm bg-fg/10 ${className ?? ""}`}
    />
  );
}

export function AdminLoadingSkeleton({
  tabs = 3,
  variant = "table",
}: {
  tabs?: number;
  variant?: "table" | "cards";
}) {
  return (
    <div aria-hidden="true">
      {/* AdminNav 자리 */}
      <div className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-1.5 px-3 py-2 sm:px-4">
          {Array.from({ length: tabs }).map((_, i) => (
            <Bar key={i} className="h-6 w-16" />
          ))}
        </div>
      </div>

      {/* 페이지 헤더 자리 */}
      <div className="border-b border-border bg-bg/95">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2">
            <Bar className="h-5 w-40" />
            <Bar className="h-3 w-24" />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bar key={i} className="h-7 w-20" />
            ))}
          </div>
        </div>
      </div>

      {/* 컨텐츠 자리 */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-4">
        {variant === "cards" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 border border-border bg-surface p-4"
              >
                <Bar className="h-3 w-20" />
                <Bar className="h-8 w-32" />
                <Bar className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <Bar className="h-9 w-full lg:max-w-sm" />
            <div className="flex flex-col gap-px border border-border bg-surface">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 border-border border-b px-3 py-3 last:border-b-0"
                >
                  <Bar className="h-4 w-4 shrink-0" />
                  <Bar className="h-3 w-24" />
                  <Bar className="h-3 w-32" />
                  <Bar className="hidden h-3 w-40 sm:block" />
                  <Bar className="ml-auto h-3 w-16" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <span className="sr-only">불러오는 중</span>
    </div>
  );
}
