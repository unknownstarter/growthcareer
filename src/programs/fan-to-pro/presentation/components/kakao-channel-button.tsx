"use client";

import { useTranslations } from "next-intl";

const KAKAO_CHANNEL_CHAT_URL = "https://pf.kakao.com/_nxhDGX/chat";
const KAKAO_BRAND_YELLOW = "#FEE500";

export function KakaoChannelButton() {
  const t = useTranslations("kakao");
  return (
    <a
      href={KAKAO_CHANNEL_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("ariaLabel")}
      style={{
        backgroundColor: KAKAO_BRAND_YELLOW,
        // Sit above the slide-up StickyCTA bar (~72-88px) on fan-to-pro page;
        // on other pages the button just floats a little higher than usual,
        // which is an acceptable trade-off for a single global mount point.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5rem)",
      }}
      className="
        fixed right-5 z-[60]
        sm:right-6
        flex h-14 w-14 items-center justify-center
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
        className="h-7 w-7"
      >
        <path
          fill="#181600"
          d="M12 3.5c-5.247 0-9.5 3.36-9.5 7.5 0 2.682 1.79 5.034 4.49 6.376l-1.146 4.182a.4.4 0 0 0 .61.43l4.93-3.262c.2.013.408.024.616.024 5.247 0 9.5-3.36 9.5-7.75S17.247 3.5 12 3.5Z"
        />
      </svg>
    </a>
  );
}
