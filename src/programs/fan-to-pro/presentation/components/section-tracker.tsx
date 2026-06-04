"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/src/lib/analytics/gtag";

/**
 * Drop-in tracking child for raw <section> elements that cannot use the
 * Section primitive (e.g. Hero with custom min-h-screen + background image).
 *
 * Renders nothing visible. On mount it walks up to its closest <section>
 * ancestor and observes that element with the same policy as
 * useSectionImpression:
 *   - threshold 50%
 *   - debounce 500ms
 *   - first impression only (page-scoped dedup)
 */
export function SectionTracker({
  sectionId,
  sectionName,
  sectionOrder,
}: {
  sectionId: string;
  sectionName: string;
  sectionOrder: number;
}) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const firedRef = useRef(false);
  const locale = useLocale();

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    if (firedRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const target = anchor.closest("section") as HTMLElement | null;
    if (!target) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const isImpression = (entry: IntersectionObserverEntry): boolean => {
      // Mirror useSectionImpression: a section counts as "in view" if EITHER
      // 50% of the section is visible OR the section fills 50% of the viewport.
      // The OR handles tall sections that exceed viewport height.
      const root = entry.rootBounds;
      if (!root) return entry.intersectionRatio >= 0.5;
      const interH = entry.intersectionRect.height;
      const viewportH = root.height;
      const viewportRatio = viewportH > 0 ? interH / viewportH : 0;
      return entry.intersectionRatio >= 0.5 || viewportRatio >= 0.5;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (isImpression(entry) && !firedRef.current) {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (firedRef.current) return;
              firedRef.current = true;
              trackEvent({
                event_name: "section_view",
                parameters: {
                  section_id: sectionId,
                  section_name: sectionName,
                  section_order: sectionOrder,
                  locale,
                },
              });
              observer.disconnect();
              timeoutId = null;
            }, 500);
          } else if (!isImpression(entry) && timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [sectionId, sectionName, sectionOrder, locale]);

  return <span ref={anchorRef} aria-hidden className="sr-only" />;
}
