import type { ReactNode } from "react";
import { cn } from "../components/cn";

type Tone = "bg" | "surface" | "purple" | "pink" | "indigo" | "violet";

const TONE: Record<Tone, string> = {
  bg: "bg-bg text-fg",
  surface: "bg-surface text-fg border-y border-border",
  purple: "section-purple",
  pink: "section-pink",
  indigo: "section-indigo",
  violet: "section-violet",
};

export function Section({
  id,
  tone = "bg",
  className,
  children,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-24 sm:px-10 sm:py-32",
        TONE[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}
