import type { Metadata } from "next";

/**
 * /[locale]/auth/* — 통합 로그인 영역 layout (ADR 0008 §1).
 *
 * 마케팅 [locale]/layout 의 다크 wrapper 안에 nested `data-theme="light"`.
 * SSR/hydration 안전 (ADR 0006 §3).
 *
 * 회원가입 없음 — 운영자 invite + 첫 로그인 강제 PW 변경 (ADR 0008 §4).
 *
 * 마케팅 layout 의 KakaoChannelButton + LocaleSwitcher 는 그대로 노출됨.
 * Wave 4 에서 pathname 분기로 hide 검토 (현 단계 트레이드오프 인정).
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme="light"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      {children}
    </div>
  );
}
