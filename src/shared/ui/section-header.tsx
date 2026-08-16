import type { ReactNode } from "react";

/**
 * 디자인 시스템 — 섹션 헤더.
 * 섹션 이름 라벨(크게, accent 컬러) → 타이틀(h2) → 디스크립션 stacked (좌측 정렬).
 * 페이지마다 하드코딩하지 말고 이 컴포넌트로 = 한 번 고치면 전 섹션 반영.
 * 컴포지션 룰 §H 준수 (라벨 작게 두지 않음, title|desc 2컬럼 금지).
 */
export function SectionHeader({
  label,
  title,
  description,
  className = "",
}: {
  label: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`break-keep ${className}`}>
      <p className="font-bold text-[17px] text-brand-pink">{label}</p>
      <h2
        className="mt-3 max-w-2xl text-balance font-black text-ink leading-[1.22] tracking-[-0.02em]"
        style={{ fontSize: "clamp(1.7rem, 4.2vw, 2.25rem)" }}
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 max-w-2xl text-ink-subtle text-base leading-relaxed sm:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  );
}
