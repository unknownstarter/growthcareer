import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

import { routing } from "@/src/i18n/routing";

/**
 * `/gc-preview` → `/` 영구 리다이렉트 (308).
 *
 * GC 메인이 루트(/)로 승격되면서 옛 프리뷰 경로는 홈으로 보낸다.
 * 북마크 / 외부 링크 / 검색엔진 인덱스 잔재 대비. locale 유지 (ko = /ko, en = /).
 * next-intl 의 redirect 는 307(temporary) 이라, 영구(308)는 next/navigation
 * permanentRedirect 로 locale-aware 경로를 직접 구성.
 * gc.module.css · community-gate.tsx 는 이 디렉터리에 그대로 두고 다른 페이지가 모듈로 import.
 */
export default async function GcPreviewRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const target = locale === routing.defaultLocale ? "/" : `/${locale}`;
  permanentRedirect(target as Route);
}
