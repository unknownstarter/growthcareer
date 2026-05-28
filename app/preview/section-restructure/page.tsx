import type { Metadata } from "next";
import { MentorOptions } from "./mentor-options";
import { PricingOptions } from "./pricing-options";
import { ValueOptions } from "./value-options";

export const metadata: Metadata = {
  title: "[Preview] Section Restructure — Fan to Pro",
  description: "내부 시안 비교 페이지. 실제 사이트와 무관.",
  robots: { index: false, follow: false, nocache: true },
};

export default function PreviewPage() {
  return (
    <main className="bg-bg text-fg">
      <header className="border-border border-b bg-surface px-6 py-10 sm:px-10 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <p
            className="mb-3 text-brand-fuchsia text-xs font-black uppercase"
            style={{ letterSpacing: "0.4em" }}
          >
            Preview · Internal · Noindex
          </p>
          <h1
            className="mb-4 font-black text-fg text-3xl sm:text-5xl"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            Fan to Pro 섹션 재구성 시안
          </h1>
          <p className="max-w-3xl text-fg-muted text-base leading-relaxed sm:text-lg">
            Value · Mentor · Pricing & Guarantees 세 섹션의 옵션 A/B/C 비교.
            마음에 드는 시안의 <span className="font-black text-brand-pink">[이걸 골랐어]</span>{" "}
            버튼을 누르면 선택값이 클립보드에 복사됩니다. 채팅창에 paste 하면
            결정이 전달됩니다.
          </p>

          <div className="mt-6 border border-brand-pink/40 bg-brand-pink/5 p-4 text-sm">
            <p className="mb-1 font-black text-brand-pink text-xs uppercase" style={{ letterSpacing: "0.2em" }}>
              주의
            </p>
            <ul className="space-y-1 text-fg-muted text-xs leading-relaxed">
              <li>· 이 페이지는 <strong className="text-fg">실제 사이트 (/fan-to-pro) 와 무관</strong>한 시안 비교 페이지입니다.</li>
              <li>· 도메인 데이터 (가격·일정·강사) 는 현재 값을 그대로 사용했습니다.</li>
              <li>· 카피 정정 (공연 = 우수자만 등) 은 별도 차수에서 반영됩니다.</li>
              <li>· robots.txt 에서 차단되어 검색 노출되지 않습니다.</li>
            </ul>
          </div>
        </div>
      </header>

      <ValueOptions />
      <div className="mx-auto my-8 h-px max-w-7xl bg-border" />
      <MentorOptions />
      <div className="mx-auto my-8 h-px max-w-7xl bg-border" />
      <PricingOptions />

      <footer className="border-border border-t bg-surface px-6 py-10 sm:px-10">
        <div className="mx-auto max-w-7xl text-fg-subtle text-xs">
          <p>
            Plan: <code className="text-fg-muted">docs/superpowers/plans/2026-05-27-fan-to-pro-section-restructure.md</code>
          </p>
          <p>
            Spec: <code className="text-fg-muted">docs/superpowers/specs/2026-05-28-fan-to-pro-section-restructure-design.md</code>
          </p>
        </div>
      </footer>
    </main>
  );
}
