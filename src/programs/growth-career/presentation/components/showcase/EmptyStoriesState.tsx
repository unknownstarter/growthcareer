/**
 * 수료생 스토리 빈 상태.
 *
 * 노아 결정 (Slice 1): 콘텐츠 확보 전 = 페이지 노출 X.
 * 단 `/stories/` 페이지 자체는 shell 배포하되, grid 는 안내 문구 노출.
 *
 * "1기 수료생 인터뷰는 촬영 후 순차 공개 예정" 톤.
 */
export function EmptyStoriesState() {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 sm:p-14 text-center">
      <p
        className="mb-3 text-xs uppercase text-fg-subtle"
        style={{ letterSpacing: "0.4em" }}
      >
        준비 중
      </p>
      <h3
        className="mb-4 font-black text-fg text-2xl sm:text-3xl"
        style={{ letterSpacing: "-0.02em" }}
      >
        수료생 인터뷰 촬영 예정
      </h3>
      <p className="mx-auto max-w-[560px] text-fg-muted">
        1기 수료 후 인터뷰 촬영을 진행합니다. 촬영 완료 후 순차 공개 예정이에요.
      </p>
    </div>
  );
}
