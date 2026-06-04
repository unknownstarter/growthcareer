"use client";

import type { ReactNode } from "react";
import { cn } from "../components/cn";
import { useSectionImpression } from "../hooks/use-section-impression";

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
  trackingName,
  trackingOrder,
}: {
  id?: string;
  tone?: Tone;
  className?: string;
  children: ReactNode;
  /**
   * GA4 `section_view` tracking. Both must be set together to enable tracking.
   * Hook is always invoked (rules-of-hooks); it stays inert when disabled.
   */
  trackingName?: string;
  trackingOrder?: number;
}) {
  const enabled =
    typeof trackingName === "string" && typeof trackingOrder === "number";
  const ref = useSectionImpression({
    sectionId: id ?? "",
    sectionName: trackingName ?? "",
    sectionOrder: trackingOrder ?? 0,
    enabled: enabled && !!id,
  });

  return (
    <section
      id={id}
      ref={ref}
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
