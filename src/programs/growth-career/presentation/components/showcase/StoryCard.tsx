import type { StoryFrontmatter } from "@/src/programs/growth-career/application/dto/showcase-view";
import { cn } from "@/src/shared/ui/cn";

/**
 * 수료생 스토리 카드. /stories + 우산 랜딩 하단.
 *
 * Server Component. anonymous=true 시 얼굴 blur + 이름 이니셜 처리.
 * 국기 이모지 X (Echo 리서치 정치적 위험).
 * 곡선 따옴표 X. 직선 " " 사용.
 * 화살표 U+2192 는 UI 요소로 §6.5 허용.
 *
 * Luna B0083 UX spec §3 기반.
 */
export function StoryCard({ story }: { story: StoryFrontmatter }) {
  const displayName = story.anonymous
    ? `${story.name.slice(0, 1)}. (익명)`
    : story.name;

  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl bg-surface border border-border p-6",
        "transition-colors hover:bg-surface-elevated hover:border-border-strong",
      )}
    >
      <a
        href={story.detailHref}
        className="flex h-full flex-col items-start gap-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-xl"
        aria-label={`${displayName} 인터뷰 전문 보기`}
      >
        <StoryAvatar story={story} displayName={displayName} />

        <div className="flex flex-col gap-1">
          <p
            className="text-xl font-bold text-fg"
            style={{ letterSpacing: "-0.02em" }}
          >
            {displayName}
          </p>
          <p className="text-sm text-fg-muted">{story.nationality}</p>
          <p
            className="text-xs uppercase text-fg-subtle mt-1"
            style={{ letterSpacing: "0.25em" }}
          >
            {story.cohortName}
          </p>
        </div>

        {story.visaJourney && (
          <p className="text-sm text-fg-muted">{story.visaJourney}</p>
        )}

        <blockquote className="text-base text-fg italic">
          <p>&quot;{story.quote}&quot;</p>
        </blockquote>

        {story.currentRole && (
          <p className="text-sm font-bold text-brand-pink">
            {story.currentRole}
          </p>
        )}

        <span
          aria-hidden
          className="text-sm text-fg group-hover:text-brand-pink mt-auto"
        >
          인터뷰 전문 보기 →
        </span>
      </a>
    </article>
  );
}

function StoryAvatar({
  story,
  displayName,
}: {
  story: StoryFrontmatter;
  displayName: string;
}) {
  const size = "h-40 w-40 sm:h-48 sm:w-48";

  if (story.avatarSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={story.avatarSrc}
        alt={story.anonymous ? "" : `${story.name} 프로필 사진`}
        className={cn(
          "rounded-full object-cover",
          size,
          story.anonymous && "blur-md",
        )}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center rounded-full",
        "bg-brand-purple text-fg text-3xl font-black",
        size,
      )}
      style={{ letterSpacing: "-0.04em" }}
      aria-label={`${displayName} 이니셜`}
    >
      {displayName.slice(0, 2)}
    </div>
  );
}
