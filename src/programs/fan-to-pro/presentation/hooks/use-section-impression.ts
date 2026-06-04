"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { trackEvent } from "@/src/lib/analytics/gtag";

/**
 * Fires a single GA4 `section_view` event the first time a section is at
 * least 50% in view for >= 500ms. Subsequent re-entries are ignored.
 *
 * - threshold 50% (intersectionRatio >= 0.5)
 * - debounce 500ms (fast scrolls past the section do not fire)
 * - first impression only (page-scoped dedup via ref)
 *
 * Returns a ref to attach to the tracked element.
 */
export function useSectionImpression(opts: {
  sectionId: string;
  sectionName: string;
  sectionOrder: number;
  enabled?: boolean;
}) {
  const { sectionId, sectionName, sectionOrder, enabled = true } = opts;
  const ref = useRef<HTMLElement | null>(null);
  const firedRef = useRef(false);
  const locale = useLocale();

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    if (firedRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const isImpression = (entry: IntersectionObserverEntry): boolean => {
      // Use the larger of:
      //   - section coverage: how much of the section is in viewport
      //   - viewport coverage: how much of the viewport is filled by section
      // A tall section (e.g. 3x viewport) can never reach 50% section coverage,
      // but DOES fill the viewport entirely while scrolling through it.
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
      // Fine-grained thresholds so the observer fires frequently enough to
      // catch the moment a tall section fills the viewport while scrolling.
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enabled, sectionId, sectionName, sectionOrder, locale]);

  return ref;
}
