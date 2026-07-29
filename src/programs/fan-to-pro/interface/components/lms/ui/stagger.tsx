/**
 * LMS 공통 stagger 등장 애니메이션 유틸 (CLAUDE.md §6.7).
 *
 * 리스트형 페이지의 카드/행이 위 -> 아래로 순차 fade-in 되도록 하는 공유 컴포넌트.
 * tickets / cohorts / students / materials / announcements 에 흩어져 있던
 * `motion-safe:animate-in ... slide-in-from-bottom-2` + `animationDelay` 패턴을 단일화.
 *
 * 원칙:
 *   - motion-safe: prefix 로 prefers-reduced-motion 존중 (강제 애니메이션 X)
 *   - index * step 으로 delay, cap 으로 긴 리스트에서 마지막 아이템이 너무 늦게 뜨는 것 방지
 *   - 순수 presentational (hook 없음) -> server / client component 양쪽에서 사용 가능
 */
import * as React from "react";

/** 아이템 등장 애니메이션 클래스 (팔레트 고정). */
export const STAGGER_ITEM_CLASS =
  "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300";

/**
 * index 기반 delay style 을 계산한다.
 *
 * @param index  리스트 내 순번 (0-based)
 * @param step   아이템 간 간격 (ms), 기본 40ms
 * @param cap    delay 상한 index, 기본 12 (그 이상은 동일 delay)
 */
export function staggerDelay(
  index: number,
  step = 40,
  cap = 12,
): React.CSSProperties {
  return { animationDelay: `${Math.min(index, cap) * step}ms` };
}

/**
 * 리스트 아이템 wrapper. `<StaggerItem index={i}>...</StaggerItem>` 로 감싸면
 * 순차 fade-in 이 적용된다. 기본 태그는 div, `as` 로 교체 가능.
 */
export function StaggerItem({
  index,
  step,
  cap,
  className,
  style,
  children,
  ...rest
}: {
  index: number;
  step?: number;
  cap?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[STAGGER_ITEM_CLASS, className].filter(Boolean).join(" ")}
      style={{ ...staggerDelay(index, step, cap), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
