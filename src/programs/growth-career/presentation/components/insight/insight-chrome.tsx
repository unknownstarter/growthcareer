import type { ReactNode } from "react";

import { SiteFooter } from "@/src/shared/navigation/site-footer";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import { gcFooterNav, gcNavAfter, gcNavBefore } from "@/src/programs/growth-career/presentation/gc-nav";

/**
 * InsightChrome — insight 리스트/상세 공통 헤더 + 푸터 셸.
 *
 * Slice C. Luna.
 *
 * gc-preview 와 동일한 라이트 GC 크롬:
 *   - SiteHeader (light-clean): brand=GrowthCareer, menu=Fan to Pro / 인사이트 / 커뮤니티(모달)
 *   - SiteFooter: GC 사이트 구조 nav 주입
 *
 * prefix 는 locale-aware 경로 (ko = "/ko", en = "").
 * children 은 <main> 내부 콘텐츠.
 */
export function InsightChrome({
  prefix,
  children,
}: {
  prefix: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader
        brand={<GcWordmark variant="light-clean" href={`${prefix}/`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: "커뮤니티", node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />

      <main className="min-h-screen break-keep bg-white text-[#191F28]">
        {children}
      </main>

      <SiteFooter nav={gcFooterNav(prefix)} />
    </>
  );
}
