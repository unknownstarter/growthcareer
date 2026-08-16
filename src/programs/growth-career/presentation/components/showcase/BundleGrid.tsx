import { Package } from "lucide-react";
import type { Bundle } from "@/src/programs/growth-career/application/dto/showcase-view";
import { BundleCard } from "./BundleCard";
import { ShowcaseEmptyState } from "./ShowcaseEmptyState";

/**
 * 번들 grid. /bundles + 코스 상세 관련 번들.
 *
 * Server Component.
 */
export function BundleGrid({
  bundles,
  maxItems,
}: {
  bundles: Bundle[];
  maxItems?: number;
}) {
  const shown = typeof maxItems === "number" ? bundles.slice(0, maxItems) : bundles;

  if (shown.length === 0) {
    return (
      <ShowcaseEmptyState
        icon={Package}
        title="번들 상품은 준비 중이에요"
        description="여러 코스를 묶은 알찬 구성을 준비하고 있어요. 조금만 기다려주세요"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shown.map((bundle) => (
        <BundleCard key={bundle.slug} bundle={bundle} />
      ))}
    </div>
  );
}
