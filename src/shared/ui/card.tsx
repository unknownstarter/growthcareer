import type { ElementType, ReactNode } from "react";
import styles from "./card.module.css";

/**
 * 디자인 시스템 Card — 서피스별 variant.
 * clean(light 우산) / pixel(dark 2기 모집). href 주면 <a>, 아니면 as(기본 div).
 * 레이아웃 클래스(padding, grid, flex 등)는 className 으로.
 */

export type CardVariant = "clean" | "pixel";

const VARIANT: Record<CardVariant, string> = {
  clean: `${styles.clean} rounded-2xl bg-white`,
  pixel: `${styles.pixel} bg-surface`,
};

export function Card({
  variant = "clean",
  href,
  as = "div",
  className = "",
  children,
}: {
  variant?: CardVariant;
  href?: string;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const cls = `${VARIANT[variant]} ${className}`.trim();
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  const Comp = as;
  return <Comp className={cls}>{children}</Comp>;
}
