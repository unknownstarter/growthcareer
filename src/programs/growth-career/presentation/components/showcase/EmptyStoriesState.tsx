import { Clapperboard } from "lucide-react";
import { ShowcaseEmptyState } from "./ShowcaseEmptyState";

/**
 * 수료생 스토리 빈 상태.
 *
 * 노아 결정 (Slice 1): 콘텐츠 확보 전 = 페이지 노출 X.
 * 단 `/stories/` 페이지 자체는 shell 배포하되, grid 는 안내 문구 노출.
 *
 * 아이콘 + 살가운 톤 (공용 ShowcaseEmptyState 재사용, §6.5 끝 마침표 X).
 */
export function EmptyStoriesState() {
  return (
    <ShowcaseEmptyState
      icon={Clapperboard}
      title="수료생 인터뷰를 준비하고 있어요"
      description="1기 수료 후 인터뷰를 촬영해요. 완성되는 대로 이곳에서 순차 공개할게요"
    />
  );
}
