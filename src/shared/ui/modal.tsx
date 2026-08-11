"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef } from "react";
import { cn } from "./cn";
import styles from "./modal.module.css";

/**
 * 접근성 모달 (재사용).
 * backdrop 클릭 / ESC 로 닫힘, 포커스 트랩 (첫 포커스 = 패널 내 첫 focusable),
 * body scroll lock, role="dialog" aria-modal. 등장 = motion-safe fade+scale (§6.7).
 * 검정 하드 드롭섀도만 (글로우 금지, §6.8). actions 없으면 하단 렌더 X.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
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
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    // 첫 focusable 로 포커스 이동
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4",
        styles.backdrop,
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "w-full max-w-[420px] break-keep rounded-2xl bg-white p-6 text-[#191F28] shadow-[0_20px_48px_-12px_rgba(0,0,0,0.35)] sm:p-8",
          styles.panel,
          className,
        )}
      >
        {title ? (
          <h2 id={titleId} className="font-black text-[20px] tracking-tight">
            {title}
          </h2>
        ) : null}
        {children ? (
          <div className="mt-3 text-[15px] text-[#4E5968] leading-relaxed">{children}</div>
        ) : null}
        {actions ? <div className="mt-6 flex justify-end gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
