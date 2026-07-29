import type { ReactNode } from "react";
import { cn } from "@/src/shared/ui/cn";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1280px] px-6 sm:px-10", className)}>
      {children}
    </div>
  );
}
