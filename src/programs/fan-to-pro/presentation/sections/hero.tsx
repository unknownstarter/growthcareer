import Image from "next/image";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { ScarcityBadge } from "../ui/scarcity-badge";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-bg">
      {/* Background — 무대에 선 퍼포머 뒷모습 + 객석. 흑백 위에 다크 그라데이션 오버레이 */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/stock/boy-group-concert-stage-3.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      </div>

      <Container className="relative z-10">
        <div className="flex flex-col gap-10 py-24 sm:gap-14">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="text-fg-subtle text-xs uppercase sm:text-sm"
              style={{ letterSpacing: "0.4em" }}
            >
              Fan to Pro · Growth Career · 2026
            </span>
            <ScarcityBadge>선착순 마감</ScarcityBadge>
            <span
              className="inline-flex items-center border border-brand-pink bg-brand-pink/10 px-3 py-1 font-black text-brand-pink text-[10px] uppercase sm:text-xs"
              style={{ letterSpacing: "0.2em" }}
            >
              For International Students in Korea
            </span>
          </div>

          <h1
            className="font-black"
            style={{ lineHeight: 0.95, letterSpacing: "-0.05em" }}
          >
            <span className="block text-fg text-display-xl">FAN.</span>
            <span className="my-4 block text-fg-muted text-display-md italic sm:my-6">
              to
            </span>
            <span className="block text-brand-pink text-display-xl">
              PRO.
            </span>
          </h1>

          <p className="max-w-2xl text-lg leading-snug text-fg-muted sm:text-2xl">
            한국 거주{" "}
            <span className="font-bold text-fg">외국인 유학생</span>을 위한
            K-POP 엔터테인먼트 직무 취업 트랙
            <br />
            <span className="font-bold text-fg">실제 K-pop 공연 프로젝트</span>
            로 경력을 만들다!
          </p>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-fg-subtle mb-2 text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                수강료
              </p>
              <div className="flex items-baseline gap-3">
                <s className="text-fg-subtle text-xl">
                  {formatKRW(PRICING.original)}
                </s>
                <span
                  className="font-black text-fg text-display-sm"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {formatKRW(PRICING.discounted)}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-brand-pink">
                VAT 포함 · 결제는 계좌이체만 가능
              </p>
            </div>
            <Button href="#apply" variant="primary" size="xl">
              지금 신청 →
            </Button>
          </div>

          <ul className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-12 sm:grid-cols-2">
            {[
              "주말 4주 · 총 8회 현업 강의",
              "Dropdown 명의 수료증",
              "현직 멘토 3인 + 동기 네트워킹",
              "수료자 전원 K-pop 공연 현장 실무 체험",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-base sm:text-lg"
              >
                <span className="mt-1 font-black text-brand-pink">✓</span>
                <span className="text-fg-muted">{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className="mr-1 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
              style={{ letterSpacing: "0.3em" }}
            >
              수강 자격 비자
            </span>
            {["D-2", "D-4", "D-10", "E-시리즈"].map((visa) => (
              <span
                key={visa}
                className="inline-flex items-center rounded-full border border-brand-pink/40 bg-brand-pink/10 px-3 py-1 font-black text-brand-pink text-xs sm:text-sm"
                style={{ letterSpacing: "0.05em" }}
              >
                {visa}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
