import type { ReactNode } from "react";
import { cn } from "../components/cn";

type Variant = "default" | "accent" | "subtle" | "solid";

const VARIANT: Record<Variant, string> = {
  default: "border-border bg-bg text-fg-muted",
  accent: "border-brand-pink/40 bg-brand-pink/10 text-brand-pink",
  subtle: "border-fg-subtle/30 bg-transparent text-fg-subtle",
  solid: "border-fg bg-fg text-bg",
};

type Size = "sm" | "md";
const SIZE: Record<Size, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3 py-1.5 text-xs",
};

export function Chip({
  children,
  variant = "default",
  size = "sm",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center border font-black uppercase",
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      style={{ letterSpacing: "0.2em" }}
    >
      {children}
    </span>
  );
}
