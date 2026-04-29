import type { ReactNode } from "react";

/**
 * 선착순 마감 강조 배지. 핑크 펄스 도트 + 작고 강한 라벨.
 */
export function ScarcityBadge({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 border border-brand-pink/40 bg-brand-pink/10 px-3 py-1 text-xs font-black uppercase text-brand-pink"
      style={{ letterSpacing: "0.2em" }}
    >
      <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-pink" />
      {children}
    </span>
  );
}
