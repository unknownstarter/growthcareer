import { Button } from "@/src/shared/ui/button";

/**
 * GC 공용 GNB 우측 CTA — "2기 모집 중" 단일 소스.
 *
 * gc-preview / fan-to-pro(리스트) / insight / press / 2기 / 1기 6개 서피스의
 * SiteHeader actions 슬롯에 동일하게 주입해서 GNB 가 픽셀 동일하게 유지된다.
 * (버튼 유무가 페이지마다 다르면 이동 시 메뉴가 좌우로 밀림.)
 *
 * prefix = locale-aware 경로. gc-preview / 리스트 는 절대경로("")를,
 * insight 등 localePrefix 를 넘기는 서피스는 prefix 를 넘긴다.
 */
export function GcHeaderCta({ prefix = "" }: { prefix?: string }) {
  const isKo = prefix.startsWith("/ko");
  return (
    <Button
      variant="pink-solid"
      href={`${prefix}/fan-to-pro/2`}
      className="px-5 py-2.5 text-sm"
    >
      {isKo ? "2기 모집 중" : "Cohort 2 open"}
    </Button>
  );
}
