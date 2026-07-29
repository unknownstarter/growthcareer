import type { Bundle } from "@/src/programs/growth-career/application/dto/showcase-view";
import { formatKrw } from "./format";
import { cn } from "@/src/shared/ui/cn";

/**
 * 번들 카드. /bundles + /bundles/[slug] + 코스 상세 관련 번들.
 *
 * Server Component. 정상 가격 (originalPriceKrw) 취소선 + 번들 가격
 * (priceKrw) 강조. 할인 금액 brand-pink accent.
 *
 * 원 단위 표기 (formatKrw). 축약 X.
 *
 * Luna B0083 wireframe 페이지 6 기반.
 */
export function BundleCard({ bundle }: { bundle: Bundle }) {
  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl bg-surface border border-border",
        "transition-colors hover:bg-surface-elevated hover:border-border-strong",
      )}
    >
      <a
        href={bundle.detailHref}
        className="flex h-full flex-col gap-4 p-6 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-xl"
        aria-label={`${bundle.name} 번들 상세 보기`}
      >
        <h3
          className="text-xl font-bold text-fg"
          style={{ letterSpacing: "-0.02em" }}
        >
          {bundle.name}
        </h3>

        {bundle.description && (
          <p className="text-sm text-fg-muted line-clamp-2">
            {bundle.description}
          </p>
        )}

        <p className="text-sm text-fg-muted">
          {bundle.courseCount}개 코스 포함
        </p>

        <PriceBlock bundle={bundle} />

        <span
          aria-hidden
          className="text-sm text-fg group-hover:text-brand-pink mt-auto"
        >
          자세히 보기 →
        </span>
      </a>
    </article>
  );
}

function PriceBlock({ bundle }: { bundle: Bundle }) {
  const hasOriginal =
    bundle.originalPriceKrw !== null &&
    bundle.originalPriceKrw !== undefined &&
    bundle.priceKrw !== null &&
    bundle.priceKrw !== undefined &&
    bundle.originalPriceKrw > bundle.priceKrw;

  return (
    <div className="flex flex-col gap-1 border-t border-border pt-4">
      {hasOriginal && bundle.originalPriceKrw !== null && (
        <p className="text-sm text-fg-subtle line-through">
          정상 {formatKrw(bundle.originalPriceKrw)}
        </p>
      )}
      <p
        className="font-black text-fg text-xl"
        style={{ letterSpacing: "-0.02em" }}
      >
        {formatKrw(bundle.priceKrw)}
      </p>
      {bundle.discountKrw !== null &&
        bundle.discountKrw !== undefined &&
        bundle.discountKrw > 0 && (
          <p className="text-sm font-bold text-brand-pink">
            {formatKrw(bundle.discountKrw)} 할인
          </p>
        )}
    </div>
  );
}
