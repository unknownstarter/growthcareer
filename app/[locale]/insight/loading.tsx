/**
 * /insight 리스트 로딩 skeleton (§6.7).
 * 헤더 크롬은 즉시, 카드 그리드는 회색 placeholder.
 */
const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

export default function InsightListLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* header spacer (실 SiteHeader 높이 h-14 대응) */}
      <div className="h-14 border-hairline border-b" />

      <section className={`${WRAP} pt-16 sm:pt-20`}>
        <div className="h-5 w-24 animate-pulse rounded bg-fill" />
        <div className="mt-4 h-9 w-3/4 animate-pulse rounded bg-fill" />
        <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-fill" />
      </section>

      <section className={`${WRAP} pt-10 pb-24`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex h-[220px] flex-col rounded-2xl border border-hairline p-6 sm:p-7"
            >
              <div className="h-6 w-16 animate-pulse rounded-full bg-fill" />
              <div className="mt-4 h-6 w-4/5 animate-pulse rounded bg-fill" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-fill" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-fill" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
