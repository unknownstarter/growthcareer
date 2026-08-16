/**
 * /insight/[slug] 상세 로딩 skeleton (§6.7).
 * 아티클 가독폭(720px) 유지. 제목/리드/본문 라인 placeholder.
 */
export default function InsightDetailLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="h-14 border-hairline border-b" />

      <div className="mx-auto w-full max-w-[720px] px-5 pt-14 pb-24 md:px-8 md:pt-20">
        <div className="h-4 w-24 animate-pulse rounded bg-fill" />
        <div className="mt-6 h-6 w-16 animate-pulse rounded-full bg-fill" />
        <div className="mt-4 h-10 w-full animate-pulse rounded bg-fill" />
        <div className="mt-2 h-10 w-3/4 animate-pulse rounded bg-fill" />
        <div className="mt-6 h-5 w-full animate-pulse rounded bg-fill" />
        <div className="mt-2 h-5 w-5/6 animate-pulse rounded bg-fill" />

        <div className="mt-12 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-fill"
              style={{ width: `${[100, 95, 88, 70, 100, 92, 80, 60][i]}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
