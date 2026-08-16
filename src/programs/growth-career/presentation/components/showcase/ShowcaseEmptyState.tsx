import type { LucideIcon } from "lucide-react";

/**
 * Showcase grid 공용 빈 상태.
 *
 * 사무적 "준비 중입니다" 대신 아이콘 + 살가운 톤 (커뮤니티 coming-soon 과 결).
 * 끝 마침표 없음 (§6.5). Server Component 안전 (lucide RSC 렌더).
 */
export function ShowcaseEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center sm:p-12">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-pink/10">
        <Icon className="h-7 w-7 text-brand-pink" aria-hidden="true" />
      </div>
      <h3 className="mb-2 font-black text-fg text-lg">{title}</h3>
      <p className="mx-auto max-w-[420px] text-fg-muted text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
