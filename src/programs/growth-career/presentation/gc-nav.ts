/**
 * GC 라이트 크롬 공통 GNB 항목 (DRY).
 *
 * gc-preview / fan-to-pro(리스트) / insight-chrome / press 가 모두 같은 4탭을 쓴다.
 * 커뮤니티는 onClick 모달(CommunityGate, client node)이라 여기서 다루지 않고
 * 각 surface 가 label/href 사이에 node 를 직접 주입한다 (아래 링크 배열은 링크 항목만).
 *
 * prefix = locale-aware 경로 (ko 는 "" 또는 "/ko", surface 마다 규칙 상이).
 * gc-preview / 리스트 는 절대경로("")를 쓰고, insight 는 localePrefix 를 넘긴다.
 */

export type GcNavLink = { label: string; href: string };

/** 커뮤니티(모달 node) 앞 = Fan to Pro. 커뮤니티 뒤 = Press Room. */
export function gcNavBefore(prefix = ""): GcNavLink[] {
  return [
    { label: "Fan to Pro", href: `${prefix}/fan-to-pro` },
    { label: "Insights", href: `${prefix}/insight` },
  ];
}

export function gcNavAfter(prefix = ""): GcNavLink[] {
  return [{ label: "Press Room", href: `${prefix}/press` }];
}

/**
 * 푸터 nav = GC 사이트 구조 4항목 (헤더와 동기화, 단일 소스).
 * 커뮤니티는 푸터에선 모달 대신 홈 커뮤니티 섹션 앵커 링크로.
 * 헤더/푸터가 어긋나지 않게 nav 변경은 반드시 이 파일에서만.
 */
export function gcFooterNav(prefix = ""): GcNavLink[] {
  return [
    { label: "Fan to Pro", href: `${prefix}/fan-to-pro` },
    { label: "Insights", href: `${prefix}/insight` },
    { label: "Community", href: `${prefix}/gc-preview#community` },
    { label: "Press Room", href: `${prefix}/press` },
  ];
}
