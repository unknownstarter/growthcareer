import type { Bundle } from "./types";
import { BundleCard } from "./BundleCard";

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
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-fg-muted">번들 상품 준비 중입니다.</p>
      </div>
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
