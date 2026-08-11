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

const BASE = "inline-flex items-center justify-center gap-1.5 font-bold";

const VARIANT: Record<ButtonVariant, string> = {
  "pink-solid":
    "rounded-xl bg-brand-pink text-white transition-all duration-150 hover:brightness-95 active:scale-[0.98]",
  "white-solid":
    "rounded-full bg-white text-[#0A0A0A] transition-all duration-150 hover:bg-white/90 active:scale-[0.98]",
  "indigo-outline":
    "rounded-xl border border-brand-indigo bg-white text-brand-indigo transition-colors duration-150 hover:bg-brand-indigo/5",
  subtle:
    "rounded-xl bg-[#F2F4F6] text-[#333D4B] transition-colors duration-150 hover:bg-[#E8EBED]",
  ghost:
    "rounded-xl border border-[#E5E8EB] text-[#333D4B] transition-colors duration-150 hover:border-[#C9CFD6] hover:bg-[#F7F8FA]",
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
}: {
  variant?: ButtonVariant;
  href?: string;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}) {
  const cls = `${BASE} ${VARIANT[variant]} ${className}`.trim();
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
