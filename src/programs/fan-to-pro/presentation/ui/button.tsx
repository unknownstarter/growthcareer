import type { ComponentProps, ReactNode } from "react";
import { cn } from "../components/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "xl";

const VARIANT: Record<Variant, string> = {
  primary: "bg-brand-pink text-fg hover:bg-brand-purple",
  secondary: "bg-fg text-bg hover:bg-brand-pink hover:text-fg",
  ghost:
    "bg-transparent text-fg border border-border-strong hover:border-brand-pink hover:text-brand-pink",
};

const SIZE: Record<Size, string> = {
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
  xl: "px-10 py-5 text-xl sm:py-6 sm:text-2xl",
};

type Props = ComponentProps<"a"> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "lg",
  className,
  children,
  ...rest
}: Props) {
  return (
    <a
      className={cn(
        "inline-flex items-center justify-center gap-2 font-black tracking-tight transition-colors",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      style={{ letterSpacing: "-0.02em" }}
      {...rest}
    >
      {children}
    </a>
  );
}
