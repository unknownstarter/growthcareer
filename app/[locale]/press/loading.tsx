/**
 * /press 리스트 로딩 skeleton (§6.7).
 * 헤더 spacer 는 즉시, 기사 카드 리스트는 회색 placeholder.
 */
const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

export default function PressListLoading() {
  return (
    <div className="min-h-screen bg-white">
      {/* header spacer (실 SiteHeader 높이 h-14 대응) */}
      <div className="h-14 border-[#EDEFF2] border-b" />

      <section className={`${WRAP} pt-16 sm:pt-20`}>
        <div className="h-5 w-28 animate-pulse rounded bg-[#F2F4F6]" />
        <div className="mt-4 h-9 w-3/4 animate-pulse rounded bg-[#F2F4F6]" />
        <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-[#F2F4F6]" />
      </section>

      <section className={`${WRAP} pt-10 pb-24`}>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#EDEFF2] sm:flex-row"
            >
              <div className="aspect-[16/9] w-full shrink-0 animate-pulse bg-[#F2F4F6] sm:aspect-auto sm:w-64 md:w-80" />
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="h-4 w-32 animate-pulse rounded bg-[#F2F4F6]" />
                <div className="mt-3 h-6 w-4/5 animate-pulse rounded bg-[#F2F4F6]" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-[#F2F4F6]" />
                <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-[#F2F4F6]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
