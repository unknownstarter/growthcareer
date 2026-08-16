import type { ReactNode } from "react";

/**
 * SubNav — 공통 SiteHeader 의 below 슬롯 안에 들어가는 얇은 서브 GNB (2단 헤더의 하단 바).
 *
 * ⚠️ 이 컴포넌트는 자체 sticky 를 갖지 않는다. 반드시 SiteHeader 의 below 슬롯 안에서
 * 렌더돼야 하고, sticky/top/z-index 는 부모 <header sticky top-0> 가 담당한다.
 * 그래야 메인바 + 서브바 + (progress) 가 하나의 불투명 헤더 유닛으로 붙어 스크롤돼서
 * 두 바 사이 틈으로 본문이 비쳐 보이거나 덜커덕거리는 문제가 안 생긴다.
 *
 * 좌 identity / 가운데 in-page 앵커 / 우 모집 CTA.
 *
 * variant:
 *   - "dark-pixel": 2기 모집 픽셀 톤 (mono 라벨, 하드 보더).
 *   - "light-clean": 라이트 톤.
 *
 * 앵커는 in-page #id 로 스크롤. 각 대상 섹션은 헤더 유닛 총 높이만큼 scroll-mt 여유를 둬야
 * 앵커 도착 시 서브바에 가려지지 않는다 (2기 섹션은 scroll-mt-[136px] 로 조정).
 *
 * glow/gradient 금지 (§6.8). 딤/보더는 단색만.
 */

export type SubNavAnchor = { label: string; href: string };

export type SubNavProps = {
  variant: "light-clean" | "dark-pixel";
  identity?: ReactNode;
  anchors: SubNavAnchor[];
  cta?: ReactNode;
  below?: ReactNode;
  containerClassName?: string;
};

const DEFAULT_WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

const THEME = {
  "light-clean": {
    // 부모 헤더가 sticky 담당. 이 바는 상단 헤더와 붙는 구분선 border-t 만.
    bar: "border-hairline border-t bg-white",
    anchor: "text-ink-muted text-sm transition-colors duration-150 hover:text-brand-pink",
    anchorFont: "font-medium",
  },
  "dark-pixel": {
    // solid bg-bg (반투명 X). 상단 헤더와 붙는 구분선 border-t 만.
    bar: "border-border border-t bg-bg",
    anchor: "text-fg-muted text-sm transition-colors duration-150 hover:text-fg",
    anchorFont: "font-medium",
  },
} as const;

export function SubNav({
  variant,
  identity,
  anchors,
  cta,
  below,
  containerClassName = DEFAULT_WRAP,
}: SubNavProps) {
  const t = THEME[variant];
  const mono = variant === "dark-pixel";
  return (
    <div className={t.bar}>
      <nav
        className={`${containerClassName} flex h-12 items-center gap-6`}
        aria-label="페이지 내 네비게이션"
      >
        {identity ? <div className="flex shrink-0 items-center">{identity}</div> : null}
        {anchors.length > 0 ? (
          <ul className="hidden min-w-0 items-center gap-5 md:flex">
            {anchors.map((a) => (
              <li key={a.href}>
                <a
                  href={a.href}
                  className={`${t.anchor} ${t.anchorFont} ${mono ? "uppercase" : ""}`}
                  style={mono ? { letterSpacing: "0.04em" } : undefined}
                >
                  {a.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        {cta ? <div className="ml-auto flex shrink-0 items-center">{cta}</div> : null}
      </nav>
      {below}
    </div>
  );
}
