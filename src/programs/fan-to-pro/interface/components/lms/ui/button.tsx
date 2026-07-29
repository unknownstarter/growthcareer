/**
 * shadcn/ui Button (Tailwind v4 호환, 우리 토큰 wire).
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        // 주 액션 = solid 핑크 (채워진, 눌러야 할 게 분명). hover 는 opacity
        // fade (AI-slop) 대신 한 shade 진한 핑크로 명확한 상태 전환.
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-strong)] focus-visible:ring-[var(--ring)]",
        // 보조 accent = solid 남보라 indigo (목적 있는 두 번째 강조)
        accent:
          "bg-[var(--color-accent-solid)] text-white hover:bg-[var(--color-indigo-strong)] focus-visible:ring-[var(--color-indigo)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] border border-[var(--border)] hover:bg-[var(--muted)] hover:border-[var(--border-strong)] focus-visible:ring-[var(--ring)]",
        outline:
          "border border-[var(--border-strong)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--secondary)] focus-visible:ring-[var(--ring)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--secondary)] focus-visible:ring-[var(--ring)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:brightness-95 focus-visible:ring-[var(--destructive)]",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
