/**
 * shadcn/ui Input — 우리 라이트 토큰 (var(--*)) wire.
 * 토스 톤: radius 8px (--radius-sm), h-12 (BottomCTA 동급), focus ring primary.
 */
import * as React from "react";

import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[0.9375rem] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
