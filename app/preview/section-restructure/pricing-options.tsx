import type { ReactNode } from "react";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import {
  ENROLLMENT_CAP,
  REFUND_POLICY,
} from "@/src/programs/fan-to-pro/domain/program";
import { PickButton } from "./pick-button";

const GUARANTEES = [
  "결제 후 7일 이내 또는 수강 시작 전 100% 환불",
  `${ENROLLMENT_CAP.minToProceed}명 미달 시 전액 자동 환불 + 차기 기수 재모집`,
  "외국인 유학생용 비자 가이드 PDF 제공",
];

function OptionWrap({
  badge,
  title,
  pros,
  cons,
  option,
  label,
  children,
}: {
  badge: string;
  title: string;
  pros: string;
  cons: string;
  option: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border border-border bg-surface">
      <div className="border-border border-b px-6 py-5">
        <p
          className="mb-2 text-brand-pink text-[10px] font-black uppercase"
          style={{ letterSpacing: "0.3em" }}
        >
          {badge}
        </p>
        <h3
          className="font-black text-fg text-xl sm:text-2xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}
        </h3>
      </div>
      <div className="flex-1 bg-bg p-6 sm:p-8">{children}</div>
      <div className="grid grid-cols-1 gap-2 border-border border-t px-6 py-5 text-sm sm:grid-cols-2">
        <p className="text-fg-muted">
          <span className="mr-2 font-black text-brand-pink">+</span>
          {pros}
        </p>
        <p className="text-fg-muted">
          <span className="mr-2 font-black text-fg-subtle">−</span>
          {cons}
        </p>
      </div>
      <div className="px-6 pb-6">
        <PickButton section="Pricing&Guarantees" option={option} label={label} />
      </div>
    </div>
  );
}

// 옵션 A — Split-screen (좌 가격 / 우 보장)
function OptionA() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="bg-brand-violet p-5 text-fg">
        <p
          className="mb-2 text-fg/70 text-[10px] uppercase"
          style={{ letterSpacing: "0.3em" }}
        >
          참가비
        </p>
        <s className="text-fg/60 text-sm">{formatKRW(PRICING.original)}</s>
        <p
          className="mt-1 font-black text-2xl sm:text-3xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          {formatKRW(PRICING.discounted)}
        </p>
        <p className="mt-2 text-fg/80 text-xs">VAT 포함 · 계좌이체</p>
        <button
          type="button"
          className="mt-5 w-full bg-bg px-4 py-3 font-black text-brand-pink text-sm uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          지금 신청 →
        </button>
      </div>
      <div className="bg-brand-purple p-5 text-fg">
        <p
          className="mb-3 text-fg/70 text-[10px] uppercase"
          style={{ letterSpacing: "0.3em" }}
        >
          환불 보장
        </p>
        <ul className="space-y-2 text-xs">
          {GUARANTEES.map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-0.5 font-black">✓</span>
              <span className="leading-snug">{g}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 옵션 B — 스택형 단일 컬럼
function OptionB() {
  return (
    <div className="border-2 border-brand-pink bg-bg p-5">
      <s className="text-fg-subtle text-sm">{formatKRW(PRICING.original)}</s>
      <p
        className="mt-1 mb-2 font-black text-fg text-4xl sm:text-5xl"
        style={{ letterSpacing: "-0.04em" }}
      >
        {formatKRW(PRICING.discounted)}
      </p>
      <p className="mb-5 text-fg-muted text-xs">VAT 포함 · 계좌이체</p>

      <button
        type="button"
        className="w-full bg-brand-pink py-4 font-black text-fg text-sm uppercase"
        style={{ letterSpacing: "0.2em" }}
      >
        지금 신청 →
      </button>

      <div className="mt-5 border-border border-t pt-4">
        <p
          className="mb-2 text-fg-subtle text-[10px] uppercase"
          style={{ letterSpacing: "0.3em" }}
        >
          환불 보장
        </p>
        <ul className="space-y-1.5 text-fg-muted text-[11px]">
          {GUARANTEES.map((g) => (
            <li key={g}>· {g}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// 옵션 C — 가격 카드 + Ribbon
function OptionC() {
  return (
    <div className="flex flex-col gap-3">
      <div className="border border-border bg-surface p-5">
        <s className="text-fg-subtle text-sm">{formatKRW(PRICING.original)}</s>
        <p
          className="mt-1 mb-1 font-black text-fg text-3xl sm:text-4xl"
          style={{ letterSpacing: "-0.04em" }}
        >
          {formatKRW(PRICING.discounted)}
        </p>
        <p className="mb-4 text-fg-muted text-xs">VAT 포함 · 계좌이체</p>

        <button
          type="button"
          className="w-full bg-brand-pink py-3 font-black text-fg text-sm uppercase"
          style={{ letterSpacing: "0.2em" }}
        >
          지금 신청 →
        </button>
      </div>

      <div className="bg-brand-pink px-4 py-3 text-center text-fg">
        <p
          className="font-black text-[11px] uppercase"
          style={{ letterSpacing: "0.15em" }}
        >
          ✓ 100% 환불 보장 · {ENROLLMENT_CAP.minToProceed}명 미달 시 전액 환불 + 재모집
        </p>
      </div>

      <p className="text-fg-subtle text-[11px] leading-relaxed">
        + 외국인 유학생용 비자 가이드 PDF 별도 제공.{" "}
        {REFUND_POLICY.legalBasis} 기준 비례 환불.
      </p>
    </div>
  );
}

export function PricingOptions() {
  return (
    <section className="px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <p
          className="mb-3 text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.4em" }}
        >
          06 · Pricing & Guarantees
        </p>
        <h2
          className="mb-12 font-black text-display-md text-fg"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          가격 + 보장 동시 = 리스크 제거
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <OptionWrap
            badge="옵션 A"
            title="Split-screen (좌 가격 / 우 보장)"
            pros="가격 충격 ↔ 보장 진정 동시 시야. 1화면."
            cons="좌우 분할로 모바일 스택 시 가격이 위."
            option="A"
            label="Split-screen"
          >
            <OptionA />
          </OptionWrap>

          <OptionWrap
            badge="옵션 B"
            title="스택형 단일 컬럼"
            pros="CTA 가 압도적. 가격 → CTA → 보장 순."
            cons="보장이 푸터처럼 → 신뢰 강도 약함."
            option="B"
            label="스택형 단일 컬럼"
          >
            <OptionB />
          </OptionWrap>

          <OptionWrap
            badge="옵션 C"
            title="가격 카드 + 보장 Ribbon"
            pros="가격 카드만 시선 집중. 보장은 한 줄 ribbon."
            cons="보장 디테일 약함. 환불 분쟁 시 근거 노출 X."
            option="C"
            label="가격 카드 + Ribbon"
          >
            <OptionC />
          </OptionWrap>
        </div>
      </div>
    </section>
  );
}
