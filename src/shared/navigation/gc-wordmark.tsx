/**
 * GcWordmark — GC 브랜드 워드마크 (단일 소스).
 *
 * "Growth" + "Career" 두 단어. Career 는 항상 핑크. Growth 는 variant 로 색 분기.
 * 기존 각 surface 가 인라인 <a>Growth<span>Career</span></a> 를 제각각 박아
 * light 서브페이지에서 Growth 가 상속 색에 의존해 안 보이는 사고가 있었음.
 * 색을 명시적으로 박아 배경과 무관하게 항상 보이게 한다.
 *
 * - light-clean: Growth = 진한 회흑 (#191F28), 라이트 배경용
 * - dark-pixel:  Growth = 흰색, 다크 배경용
 */

const GROWTH_COLOR = {
  "light-clean": "text-[#191F28]",
  "dark-pixel": "text-white",
} as const;

export type GcWordmarkVariant = keyof typeof GROWTH_COLOR;

export function GcWordmark({
  variant,
  href = "/gc-preview",
  className = "",
}: {
  variant: GcWordmarkVariant;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`font-black text-[20px] tracking-tight ${GROWTH_COLOR[variant]} ${className}`}
    >
      Growth<span className="text-brand-pink">Career</span>
    </a>
  );
}
