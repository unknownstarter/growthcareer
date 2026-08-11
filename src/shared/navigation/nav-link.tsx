"use client";

import { usePathname } from "next/navigation";

/**
 * NavLink — GNB 메뉴 링크. 현재 경로면 active 스타일.
 *
 * usePathname 은 locale 접두어(/ko|/en)를 포함하므로 target 과 비교 전에
 * 양쪽 다 접두어를 제거한다. target 이 "/" 가 아니면
 * path === target 이거나 path 가 "target/" 로 시작하면 active (하위 경로 포함).
 *
 * 스타일 클래스는 SiteHeader THEME 에서 주입 (variant 별 색/굵기).
 */

function stripLocale(path: string): string {
  const m = path.match(/^\/(ko|en)(?=\/|$)/);
  const stripped = m ? path.slice(m[0].length) : path;
  return stripped === "" ? "/" : stripped;
}

export function NavLink({
  href,
  label,
  activeClassName,
  inactiveClassName,
}: {
  href: string;
  label: string;
  activeClassName: string;
  inactiveClassName: string;
}) {
  const rawPath = usePathname();
  const path = stripLocale(rawPath);
  const target = stripLocale(href);

  const isActive =
    target !== "/" && (path === target || path.startsWith(`${target}/`));

  return (
    <a
      href={href}
      className={`transition-colors duration-150 ${isActive ? activeClassName : inactiveClassName}`}
      {...(isActive ? { "aria-current": "page" } : {})}
    >
      {label}
    </a>
  );
}
