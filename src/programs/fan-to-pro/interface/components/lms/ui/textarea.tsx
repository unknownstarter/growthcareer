/**
 * shadcn/ui Textarea — 라이트 토큰 wire.
 */
import * as React from "react";
import { cn } from "@/src/programs/fan-to-pro/interface/components/lms/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[0.9375rem] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors leading-6",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
