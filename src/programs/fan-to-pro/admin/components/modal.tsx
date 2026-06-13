"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

/**
 * 단순 모달. focus trap + ESC + backdrop click + scroll lock.
 * apply-confirm-modal 의 패턴을 운영자 페이지용으로 정리.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // busy / onClose 는 ref 로 추적해서 useEffect 가 [open] 변화에만 반응.
  // 그래야 parent re-render (polling, transition) 에서 cleanup→focus restore 가
  // 실행되어 textarea focus 가 빠지는 사고를 회피 (2026-06-12 한글 IME 깨짐 사고).
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      const root = ref.current;
      if (!root) return;
      // 이미 modal 안의 element 가 focus 잡고 있으면 (autoFocus 등) 건드리지 않음.
      const active = document.activeElement as HTMLElement | null;
      if (active && root.contains(active)) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      focusables?.[0]?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const root = ref.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !root.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (busy) return;
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center bg-bg/85 backdrop-blur-sm"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative flex w-full flex-col overflow-y-auto border-t-2 border-brand-pink bg-surface shadow-2xl sm:border-2",
          // iOS Safari 의 dynamic viewport. 100dvh 가 chrome 자동 보정.
          "max-h-[100dvh] sm:max-h-[90dvh]",
          size === "sm" && "sm:max-w-[420px]",
          size === "md" && "sm:max-w-[560px]",
          size === "lg" && "sm:max-w-[760px]",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-2.5 sm:px-5 sm:py-3">
          <h2
            id="modal-title"
            className="text-sm font-black text-fg sm:text-base lg:text-lg"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="닫기"
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center text-fg/80 hover:text-fg disabled:opacity-40 sm:h-8 sm:w-8"
          >
            <span aria-hidden className="text-xl leading-none">
              ×
            </span>
          </button>
        </div>
        {/* 모바일은 홈 인디케이터 회피 위해 pb-[env(safe-area-inset-bottom)]. */}
        <div
          className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
