import type { StoryFrontmatter } from "@/src/programs/growth-career/application/dto/showcase-view";
import { StoryCard } from "./StoryCard";
import { EmptyStoriesState } from "./EmptyStoriesState";

/**
 * 수료생 스토리 grid. /stories + 우산 랜딩 하단 (maxItems=3).
 *
 * Server Component. 빈 상태 = EmptyStoriesState (인터뷰 촬영 예정 안내).
 */
export function StoryGrid({
  stories,
  maxItems,
}: {
  stories: StoryFrontmatter[];
  maxItems?: number;
}) {
  const shown = typeof maxItems === "number" ? stories.slice(0, maxItems) : stories;

  if (shown.length === 0) {
    return <EmptyStoriesState />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((story) => (
        <StoryCard key={story.slug} story={story} />
      ))}
    </div>
  );
}
