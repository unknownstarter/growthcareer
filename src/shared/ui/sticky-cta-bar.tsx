"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * 디자인 시스템 primitive. 하단 고정 CTA 바 (원티드 Global 하단 플로팅 패턴).
 * 동작(fixed 하단 + 스크롤 시 특정 섹션 진입하면 숨김)만 소유하고, 버튼 비주얼은
 * children 슬롯으로 각 서피스가 주입한다(라이트 clean pill / 다크 pixel 등).
 * 기본은 모바일 전용(md:hidden). 데스크탑은 GNB CTA 로 충분.
 * showOnDesktop=true 면 데스크탑에도 노출(원티드 하단 글로벌 바 패턴, 서브 GNB 대체용).
 * a11y: 숨김 시 aria-hidden. motion-reduce 시 트랜지션 없음.
 */
export function StickyCtaBar({
  children,
  hideAtId,
  showOnDesktop = false,
  maxWidthClassName = "max-w-[1160px]",
}: {
  children: ReactNode;
  /** 이 id 섹션이 뷰포트에 들어오면 바를 숨김(예: "apply" 폼, footer). */
  hideAtId?: string;
  /** true 면 데스크탑에도 노출(md:hidden 제거). 기본 false = 모바일 전용. */
  showOnDesktop?: boolean;
  maxWidthClassName?: string;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!hideAtId) return;
    const target = document.getElementById(hideAtId);
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hideAtId]);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-200 motion-reduce:transition-none ${
        showOnDesktop ? "" : "md:hidden"
      } ${hidden ? "translate-y-[130%]" : ""}`}
    >
      <div className={`mx-auto w-full ${maxWidthClassName} px-5 pb-6 md:pb-7`}>{children}</div>
    </div>
  );
}
