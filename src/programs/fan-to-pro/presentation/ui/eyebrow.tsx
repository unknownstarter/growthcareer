import type { ReactNode } from "react";
import { cn } from "@/src/shared/ui/cn";

/**
 * 섹션 상단 라벨 — "01 / PROBLEM" 처럼 작고 트래킹 넓은 텍스트.
 * 숫자와 라벨 사이는 슬래시로 구분 (CLAUDE.md §6.5 인터펑크 금지).
 */
export function Eyebrow({
  n,
  children,
  className,
}: {
  n?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-10 text-xs uppercase opacity-70 sm:text-sm",
        className,
      )}
      style={{ letterSpacing: "0.4em" }}
    >
      {n && <span className="mr-2">{n} /</span>}
      {children}
    </p>
  );
}
