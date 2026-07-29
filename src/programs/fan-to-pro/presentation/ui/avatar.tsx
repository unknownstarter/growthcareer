import { cn } from "@/src/shared/ui/cn";

type Tint = "indigo" | "purple" | "pink";

const TINT: Record<Tint, string> = {
  indigo: "bg-brand-indigo",
  purple: "bg-brand-purple",
  pink: "bg-brand-pink",
};

/**
 * 멘토/후기 placeholder 아바타.
 * 실사 사진 없이 익명성 유지 + 톤 일관성.
 */
export function Avatar({
  initials,
  tint = "purple",
  size = 96,
}: {
  initials: string;
  tint?: Tint;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-black text-fg",
        TINT[tint],
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        letterSpacing: "-0.04em",
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
