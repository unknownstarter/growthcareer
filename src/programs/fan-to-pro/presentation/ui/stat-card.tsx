import type { ReactNode } from "react";
import { cn } from "../components/cn";

type Props = {
  value: ReactNode;
  label: string;
  hint?: string;
  className?: string;
};

/**
 * 큰 숫자 + 작은 라벨. SocialProof / Outcome / Hero 보조 등에서 재사용.
 */
export function StatCard({ value, label, hint, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p
        className="font-black text-fg text-5xl leading-none sm:text-6xl"
        style={{ letterSpacing: "-0.04em" }}
      >
        {value}
      </p>
      <p
        className="text-fg-subtle text-xs uppercase sm:text-sm"
        style={{ letterSpacing: "0.25em" }}
      >
        {label}
      </p>
      {hint && (
        <p className="text-fg-muted text-sm">{hint}</p>
      )}
    </div>
  );
}
