"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/src/shared/ui/cn";
import { LocaleSwitch } from "./locale-switch";
import styles from "./mobile-nav.module.css";
import { NavLink } from "./nav-link";
import type { NavItem } from "./site-header";

/**
 * 모바일 GNB 드로어 (md 미만 전용). SiteHeader 데스크탑 nav 는 무변경, additive.
 *
 * 데스크탑 nav 가 `hidden md:flex` 라 768px 미만에서 메뉴가 통째로 사라지는 문제 해결.
 * 햄버거 버튼(`md:hidden`) + 우측 슬라이드 드로어. 메뉴 항목(href 링크 / node)·
 * 언어 스위치·actions(CTA)를 모두 드로어 안에 담는다.
 *
 * a11y: 버튼 aria-expanded / aria-controls, 드로어 role=dialog + aria-modal,
 * 포커스 트랩(Modal 패턴 재사용), Esc / 바깥 클릭 / 링크 클릭 시 닫힘, body scroll lock.
 * §6.7: 열림/닫힘 transition (mobile-nav.module.css, motion-safe). §6.8: solid, glow 없음.
 *
 * variant 는 SiteHeader THEME 와 동일 분기 (라이트 우산 / 다크 2기 톤).
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

const THEME = {
  "light-clean": {
    trigger: "text-[#333D4B] hover:text-brand-pink",
    panel: "bg-white text-[#333D4B]",
    border: "border-[#EDEFF2]",
    menu: "text-[#333D4B]",
    menuHover: "hover:text-brand-pink",
    active: "text-brand-pink font-bold",
    localeVariant: "light" as const,
  },
  "dark-pixel": {
    trigger: "text-fg-muted hover:text-fg",
    panel: "bg-bg text-fg",
    border: "border-border",
    menu: "text-fg-muted",
    menuHover: "hover:text-fg",
    active: "text-fg font-bold",
    localeVariant: "dark" as const,
  },
};

export function MobileNav({
  menu,
  actions,
  showLocaleSwitch = true,
  variant = "light-clean",
}: {
  menu: NavItem[];
  actions?: ReactNode;
  showLocaleSwitch?: boolean;
  variant?: "light-clean" | "dark-pixel";
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const t = THEME[variant];

  const close = useCallback(() => setOpen(false), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus?.();
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className={cn(
          "-mr-1 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 active:scale-90",
          t.trigger,
        )}
      >
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open ? (
        <div
          className={cn("fixed inset-0 z-[90] bg-black/45", styles.backdrop)}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onKeyDown={handleKeyDown}
        >
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="주요 네비게이션"
            className={cn(
              "absolute inset-y-0 right-0 flex w-[78%] max-w-[320px] flex-col shadow-[0_0_48px_-8px_rgba(0,0,0,0.5)]",
              t.panel,
              styles.panel,
            )}
          >
            <div className={cn("flex h-14 items-center justify-end border-b px-4", t.border)}>
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={close}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-150 active:scale-90",
                  t.trigger,
                )}
              >
                <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav
              aria-label="주요 네비게이션"
              className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-5 font-medium text-[17px]"
            >
              {menu.map((m) => (
                <div
                  key={`${m.label}-${m.href ?? "node"}`}
                  className="py-2"
                  onClickCapture={close}
                >
                  {m.node ?? (
                    <NavLink
                      href={m.href!}
                      label={m.label}
                      activeClassName={t.active}
                      inactiveClassName={cn(t.menu, t.menuHover)}
                    />
                  )}
                </div>
              ))}
            </nav>

            <div className={cn("flex items-center justify-between border-t px-4 py-4", t.border)}>
              {showLocaleSwitch ? <LocaleSwitch variant={t.localeVariant} /> : <span />}
              {actions ? <div onClickCapture={close}>{actions}</div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
