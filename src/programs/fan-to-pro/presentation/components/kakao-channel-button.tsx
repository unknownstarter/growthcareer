"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const KAKAO_CHANNEL_CHAT_URL = "https://pf.kakao.com/_nxhDGX/chat";
const KAKAO_BRAND_YELLOW = "#FEE500";

/**
 * LMS surface (admin / student / instructor) 에서는 노출 X.
 *
 * B0056: 어드민에는 PageGuideBot 이 우측 하단에 위치. Kakao 와 겹치면 안 됨.
 * 학생/강사 surface 도 LMS 인증된 학습 공간이라 마케팅 채널 노출 부적합.
 *
 * 모집 페이지 (/fan-to-pro 와 그 하위 marketing) 에는 그대로 노출 — CLAUDE.md
 * §7.4 보호 룰 (모집 페이지 변경 금지) 준수.
 *
 * URL 패턴 (ADR 0008):
 *   /[locale]/fan-to-pro/admin/*       → LMS admin (숨김)
 *   /[locale]/fan-to-pro/<slug>/student/*    → student (숨김)
 *   /[locale]/fan-to-pro/<slug>/instructor/* → instructor (숨김)
 *   /[locale]/auth/*                   → LMS auth (숨김)
 *   /[locale]/fan-to-pro               → marketing (노출)
 */
function isLmsSurface(pathname: string | null): boolean {
  if (!pathname) return false;
  // /admin/* (마케팅 사이트 어드민 / fan-to-pro 어드민 모두 포함).
  if (/^\/(?:[a-z]{2}\/)?(?:fan-to-pro\/)?admin(?:\/|$)/.test(pathname)) {
    return true;
  }
  // /[locale]/fan-to-pro/<cohortSlug>/(student|instructor)/*.
  if (
    /^\/(?:[a-z]{2}\/)?fan-to-pro\/[^/]+\/(?:student|instructor)(?:\/|$)/.test(
      pathname,
    )
  ) {
    return true;
  }
  // LMS auth (login / change-password / reset 등).
  if (/^\/(?:[a-z]{2}\/)?auth(?:\/|$)/.test(pathname)) {
    return true;
  }
  return false;
}

export function KakaoChannelButton() {
  const t = useTranslations("kakao");
  const pathname = usePathname();
  if (isLmsSurface(pathname)) return null;
  // 2기 모집 페이지(/fan-to-pro/2)엔 하단 StickyCTA 바가 있어 카카오 버튼을 그 위로
  // 올린다(겹침 방지). 그 외 페이지에서는 일반 코너 위치.
  const onCohort2 = /^\/(?:[a-z]{2}\/)?fan-to-pro\/2(?:\/|$)/.test(pathname ?? "");
  return (
    <a
      href={KAKAO_CHANNEL_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("ariaLabel")}
      style={{
        backgroundColor: KAKAO_BRAND_YELLOW,
        // 2기(하단 StickyCTA 바 존재) 에서는 바 위로 7rem, 그 외엔 코너 1.5rem.
        bottom: `calc(env(safe-area-inset-bottom, 0px) + ${onCohort2 ? "7rem" : "1.5rem"})`,
      }}
      className="
        fixed right-4 z-[60]
        sm:right-6
        flex h-12 w-12 items-center justify-center
        sm:h-14 sm:w-14
        rounded-full shadow-lg shadow-black/40
        ring-1 ring-black/10
        transition-transform duration-200 ease-out
        hover:scale-105 active:scale-95
        motion-reduce:transition-none motion-reduce:hover:scale-100
      "
    >
      {/* KakaoTalk speech bubble — official silhouette. Fill uses Kakao's
          near-black brown so the icon stays legible on Kakao yellow. */}
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        className="h-6 w-6 sm:h-7 sm:w-7"
      >
        <path
          fill="#181600"
          d="M12 3.5c-5.247 0-9.5 3.36-9.5 7.5 0 2.682 1.79 5.034 4.49 6.376l-1.146 4.182a.4.4 0 0 0 .61.43l4.93-3.262c.2.013.408.024.616.024 5.247 0 9.5-3.36 9.5-7.75S17.247 3.5 12 3.5Z"
        />
      </svg>
    </a>
  );
}
