/**
 * shadcn/ui Badge — 토스 톤 (radius 8px, font-weight 600).
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)] border-[var(--border)]",
        outline: "border-[var(--border-strong)] text-[var(--foreground)]",
        // 브랜드 soft-tint — 핑크 (주) + 남보라 (보조). 상태 라벨용.
        pink: "border-transparent bg-[var(--color-pink-soft)] text-[var(--color-pink-soft-fg)]",
        indigo:
          "border-transparent bg-[var(--color-indigo-soft)] text-[var(--color-indigo-soft-fg)]",
        success: "border-transparent bg-[#dcfae6] text-[#067647]",
        warning: "border-transparent bg-[#fef0c7] text-[#b54708]",
        destructive: "border-transparent bg-[#fee4e2] text-[#b42318]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
