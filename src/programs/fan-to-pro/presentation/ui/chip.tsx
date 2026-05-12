import type { ReactNode } from "react";
import { cn } from "../components/cn";

type Variant = "default" | "accent" | "subtle" | "solid";

const VARIANT: Record<Variant, string> = {
  default: "border-border bg-bg text-fg-muted",
  accent: "border-brand-pink/40 bg-brand-pink/10 text-brand-pink",
  subtle: "border-fg-subtle/30 bg-transparent text-fg-subtle",
  solid: "border-fg bg-fg text-bg",
};

export function Chip({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border px-2.5 py-1 text-[11px] font-bold uppercase",
        VARIANT[variant],
        className,
      )}
      style={{ letterSpacing: "0.2em" }}
    >
      {children}
    </span>
  );
}
