"use client";

/**
 * 화면 단위 트래커. 페이지에 1개 마운트하면:
 *  - view_<screen>            (마운트 시 1회)
 *  - scroll_<screen>          (25/50/75/100% 도달 시 각 1회, passive 리스너)
 *  - click_<object>_in_<screen> (data-track="<object>" 요소 클릭 시)
 *
 * "기존 클릭/스크롤이 안되면 안돼" 를 위한 안전장치:
 *  - scroll: addEventListener("scroll", ..., { passive: true }) → 스크롤 동작/성능 무해.
 *  - click: document 버블 단계 리스너 1개가 data-track 을 읽기만 함.
 *           preventDefault/stopPropagation 절대 호출 안 함 → 기존 href/onClick 그대로.
 *  - 모든 콜백은 track() 내부에서 try/catch 됨.
 */
import { useEffect } from "react";
import { track } from "./track";

export function AnalyticsScreen({ screen }: { screen: string }) {
  useEffect(() => {
    // 1) view — 마운트 1회
    track(`view_${screen}`, { screen });

    // 2) scroll depth — passive, 각 마일스톤 1회
    const milestones = [25, 50, 75, 100];
    const fired = new Set<number>();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const doc = document.documentElement;
        const scrollable = doc.scrollHeight - window.innerHeight;
        const pct =
          scrollable <= 0
            ? 100
            : Math.min(100, Math.round((window.scrollY / scrollable) * 100));
        for (const m of milestones) {
          if (pct >= m && !fired.has(m)) {
            fired.add(m);
            track(`scroll_${screen}`, { screen, scroll_depth: m });
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // 초기 뷰가 이미 100% (짧은 화면) 인 경우 대비

    // 3) delegated click — data-track 속성 읽기만
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const el = target?.closest?.("[data-track]");
      if (!el) return;
      const object = el.getAttribute("data-track") || "unknown";
      track(`click_${object}_in_${screen}`, { screen, object });
      // preventDefault/stopPropagation 없음 — 원래 동작 그대로 진행
    };
    document.addEventListener("click", onClick, { passive: true, capture: false });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
    };
  }, [screen]);

  return null;
}
