import type { ReactNode } from "react";
import { LocaleSwitch } from "./locale-switch";
import { MobileNav } from "./mobile-nav";
import { NavLink } from "./nav-link";

/**
 * 공통 사이트 헤더 (GNB) — 서피스별 variant + 슬롯.
 * 구조(좌 brand+menu 한 그룹 / 우 [언어][actions])와 언어 스위처는 공유하고,
 * 테마(light-clean 우산 / dark-pixel 2기 모집)만 variant 로 분기.
 * brand / actions / below 는 슬롯이라 서피스 고유 요소(BootLogo, .pixelBtn,
 * ScrollProgress 등)를 페이지가 CSS 소유권을 유지한 채 주입한다.
 * 좌측 그룹핑이 2기 GNB 의 justify-between 3-블록 "휑한 간격" 문제를 해소.
 * 레퍼런스: 토스/원티드 (언어 스위처를 우측 액션 그룹 안, primary CTA 왼쪽).
 */

/**
 * NavItem: 링크(href) 또는 커스텀 노드(node) 중 하나.
 * node 를 주면 메뉴 슬롯에 그 노드를 렌더 (모달 게이트 등 onClick 필요 항목).
 * node 는 자체 스타일을 가져야 함 (기존 링크 텍스트 스타일과 맞추려면 t.menu/menuHover 참고).
 */
export type NavItem = { label: string; href?: string; node?: React.ReactNode };

export type SiteHeaderProps = {
  variant?: "light-clean" | "dark-pixel";
  brand: ReactNode;
  menu: NavItem[];
  actions?: ReactNode;
  showLocaleSwitch?: boolean;
  below?: ReactNode;
  containerClassName?: string;
};

const DEFAULT_WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

const THEME = {
  "light-clean": {
    header: "border-[#EDEFF2] border-b bg-white",
    nav: "h-14",
    menu: "text-[#333D4B] text-[15px]",
    menuHover: "hover:text-brand-pink",
    active: "text-brand-pink font-bold",
    localeVariant: "light" as const,
  },
  "dark-pixel": {
    // solid bg-bg (반투명 X): 2단 헤더 사이 틈으로 본문 텍스트가 비쳐 보이는 문제 방지.
    header: "border-border border-b bg-bg",
    nav: "py-4",
    menu: "text-fg-muted text-sm",
    menuHover: "hover:text-fg",
    active: "text-fg font-bold",
    localeVariant: "dark" as const,
  },
};

export function SiteHeader({
  variant = "light-clean",
  brand,
  menu,
  actions,
  showLocaleSwitch = true,
  below,
  containerClassName = DEFAULT_WRAP,
}: SiteHeaderProps) {
  const t = THEME[variant];
  return (
    <header className={`sticky top-0 z-50 ${t.header}`}>
      <nav className={`${containerClassName} flex items-center ${t.nav}`} aria-label="주요 네비게이션">
        <div className="flex items-center gap-10">
          {brand}
          <ul className={`hidden items-center gap-6 font-medium md:flex ${t.menu}`}>
            {menu.map((m) => (
              <li key={`${m.label}-${m.href ?? "node"}`}>
                {m.node ?? (
                  <NavLink
                    href={m.href!}
                    label={m.label}
                    activeClassName={t.active}
                    inactiveClassName={t.menuHover}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
        {/* 데스크탑 우측 그룹 — 무변경(md 이상). 모바일에선 드로어로 이동. */}
        <div className="ml-auto hidden items-center gap-5 md:flex">
          {showLocaleSwitch ? <LocaleSwitch variant={t.localeVariant} /> : null}
          {actions}
        </div>
        {/* 모바일 햄버거 + 드로어 (additive, md 미만 전용). */}
        <div className="ml-auto md:hidden">
          <MobileNav
            menu={menu}
            actions={actions}
            showLocaleSwitch={showLocaleSwitch}
            variant={variant}
          />
        </div>
      </nav>
      {below}
    </header>
  );
}
