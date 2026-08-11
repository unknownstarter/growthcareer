/* Fan to Pro 기수 리스트 로딩 skeleton (§6.7). blank 화면 방지. */

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

export default function Loading() {
  return (
    <main className="min-h-screen break-keep bg-white">
      {/* GNB placeholder (높이 h-14 = light-clean nav) */}
      <div className="sticky top-0 z-50 h-14 border-[#EDEFF2] border-b bg-white" />

      <section className={`${WRAP} pt-14 pb-10 sm:pt-20`} aria-hidden>
        <div className="h-5 w-24 animate-pulse rounded bg-[#F2F4F6]" />
        <div className="mt-4 h-9 w-3/4 animate-pulse rounded bg-[#F2F4F6] sm:w-1/2" />
        <div className="mt-4 h-5 w-full max-w-xl animate-pulse rounded bg-[#F2F4F6]" />
      </section>

      <section className={`${WRAP} pb-24`} aria-hidden>
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_6px_rgba(17,24,39,0.08)]"
            >
              <div className="aspect-[16/9] w-full animate-pulse bg-[#F2F4F6]" />
              <div className="p-6 sm:p-7">
                <div className="h-6 w-24 animate-pulse rounded-full bg-[#F2F4F6]" />
                <div className="mt-4 h-7 w-2/3 animate-pulse rounded bg-[#F2F4F6]" />
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[#F2F4F6]" />
                <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-[#F2F4F6]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
