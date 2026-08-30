import type { ReactNode } from "react";
import styles from "./button.module.css";

/**
 * 디자인 시스템 Button — 서피스별 variant.
 * light-clean(우산): pink-solid / subtle / ghost. dark-pixel(2기 모집): pixel / pixel-ghost.
 * href 주면 <a>, 아니면 <button>. 크기·폭은 className(px/py/w-full 등)으로.
 * 비주얼 언어는 variant 로 분기하되 한 컴포넌트에서 관리 = 페이지 로컬 버튼 상수 제거.
 */

export type ButtonVariant =
  | "pink-solid"
  | "white-solid"
  | "indigo-outline"
  | "subtle"
  | "ghost"
  | "pixel"
  | "pixel-ghost";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-bold";

const VARIANT: Record<ButtonVariant, string> = {
  "pink-solid":
    "rounded-xl bg-brand-pink text-white transition-all duration-150 hover:brightness-95 active:scale-[0.98]",
  "white-solid":
    "rounded-full bg-white text-ink-black transition-all duration-150 hover:bg-white/90 active:scale-[0.98]",
  "indigo-outline":
    "rounded-xl border border-brand-indigo bg-white text-brand-indigo transition-all duration-150 hover:bg-brand-indigo/5 active:scale-[0.98]",
  subtle:
    "rounded-xl bg-fill text-ink-secondary transition-all duration-150 hover:bg-fill-strong active:scale-[0.98]",
  ghost:
    "rounded-xl border border-hairline-strong text-ink-secondary transition-all duration-150 hover:border-hairline-hover hover:bg-fill-subtle active:scale-[0.98]",
  pixel: styles.pixel,
  "pixel-ghost": styles.pixelGhost,
};

export function Button({
  variant = "pink-solid",
  href,
  className = "",
  onClick,
  type = "button",
  children,
  dataTrack,
  disabled = false,
}: {
  variant?: ButtonVariant;
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
  // 분석용 위임 클릭 훅 — 렌더 요소에 data-track 속성만 부여. 동작 무영향.
  dataTrack?: string;
  // 비활성화 — href 여도 <button disabled> 로 렌더(네비게이션 차단) + 흐리게.
  disabled?: boolean;
}) {
  const cls = `${BASE} ${VARIANT[variant]} ${className}`.trim();
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        className={`${cls} cursor-not-allowed opacity-50`}
        data-track={dataTrack}
      >
        {children}
      </button>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick} data-track={dataTrack}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} data-track={dataTrack}>
      {children}
    </button>
  );
}
