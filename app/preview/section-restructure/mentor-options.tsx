"use client";

import Image from "next/image";
import { useState } from "react";
import { INSTRUCTORS } from "@/src/programs/fan-to-pro/domain/program";
import { PickButton } from "./pick-button";

type OptionWrapProps = {
  badge: string;
  title: string;
  pros: string;
  cons: string;
  option: string;
  label: string;
  children: React.ReactNode;
};

function OptionWrap({
  badge,
  title,
  pros,
  cons,
  option,
  label,
  children,
}: OptionWrapProps) {
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
        <PickButton section="Mentor" option={option} label={label} />
      </div>
    </div>
  );
}

// 옵션 A — 현재 풀카드 그대로
function OptionA() {
  return (
    <div className="flex flex-col gap-4">
      {INSTRUCTORS.slice(0, 1).map((m) => (
        <div key={m.id} className="border border-border bg-surface p-4">
          {m.photo ? (
            <div className="relative mb-3 aspect-[4/3] overflow-hidden">
              <Image
                src={m.photo}
                alt={m.photoAlt}
                fill
                sizes="300px"
                className="object-cover grayscale"
                style={{ objectPosition: m.photoPosition ?? "center" }}
              />
            </div>
          ) : null}
          <p
            className="mb-1 font-black text-fg text-xl"
            style={{ letterSpacing: "-0.02em" }}
          >
            {m.name}
          </p>
          <p className="mb-3 text-fg-subtle text-xs">
            {m.affiliation.join(" · ")}
          </p>
          <p className="mb-3 text-fg-muted text-xs leading-relaxed">
            {m.oneLiner}
          </p>
          <ul className="space-y-1 text-fg-muted text-[11px]">
            {m.careerGroups[0]?.items.slice(0, 3).map((it) => (
              <li key={it}>· {it}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-center text-fg-subtle text-xs">
        × 3명 동일 형태 반복 (실제 페이지)
      </p>
    </div>
  );
}

// 옵션 B — 인용 중심 압축
function OptionB() {
  const m = INSTRUCTORS[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="border border-border bg-surface">
        {m.photo ? (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={m.photo}
              alt={m.photoAlt}
              fill
              sizes="400px"
              className="object-cover grayscale"
              style={{ objectPosition: m.photoPosition ?? "center" }}
            />
          </div>
        ) : null}
        <div className="p-5">
          <p
            className="mb-3 font-black text-brand-fuchsia text-base leading-snug sm:text-lg"
            style={{ letterSpacing: "-0.02em" }}
          >
            &ldquo;{m.oneLiner.split(".")[0]}.&rdquo;
          </p>
          <p className="mb-3 text-fg-subtle text-xs">
            — {m.name} · {m.affiliation[0]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {m.careerGroups[0]?.items.slice(0, 3).map((it) => (
              <span
                key={it}
                className="border border-border bg-bg px-2 py-1 text-fg-muted text-[10px]"
              >
                {it.split(" ").slice(0, 3).join(" ")}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center text-fg-subtle text-xs">
        × 3명 세로 스택 (실제 페이지)
      </p>
    </div>
  );
}

// 옵션 C — 탭 전환
function OptionC() {
  const [active, setActive] = useState(0);
  const m = INSTRUCTORS[active];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-1">
        {INSTRUCTORS.map((mi, i) => (
          <button
            key={mi.id}
            type="button"
            onClick={() => setActive(i)}
            className={`border px-2 py-2 font-black text-[11px] uppercase transition-colors ${
              active === i
                ? "border-brand-pink bg-brand-pink text-fg"
                : "border-border bg-bg text-fg-subtle hover:text-fg"
            }`}
            style={{ letterSpacing: "0.15em" }}
          >
            {mi.initials}
          </button>
        ))}
      </div>
      <div className="border border-border bg-surface p-4">
        <p
          className="mb-1 font-black text-fg text-lg"
          style={{ letterSpacing: "-0.02em" }}
        >
          {m.name}
        </p>
        <p className="mb-3 text-fg-subtle text-[11px]">
          {m.affiliation.join(" · ")}
        </p>
        <p className="text-fg-muted text-xs leading-relaxed">
          {m.oneLiner}
        </p>
      </div>
    </div>
  );
}

export function MentorOptions() {
  return (
    <section className="px-6 py-20 sm:px-10">
      <div className="mx-auto max-w-7xl">
        <p
          className="mb-3 text-fg-subtle text-xs uppercase"
          style={{ letterSpacing: "0.4em" }}
        >
          03 · Mentor
        </p>
        <h2
          className="mb-12 font-black text-display-md text-fg"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          현직 인사이더가 1:1 로 붙는다
        </h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <OptionWrap
            badge="옵션 A"
            title="현재 풀카드 (사진+약력)"
            pros="정보 풀공개. 신뢰 최대."
            cons="섹션 길이 길어짐. 스크롤 부담."
            option="A"
            label="현재 풀카드"
          >
            <OptionA />
          </OptionWrap>

          <OptionWrap
            badge="옵션 B"
            title="인용 중심 압축"
            pros="권위 한 줄 + 사진 = 강력. 시각 임팩트."
            cons="디테일 약함 → '약력 보기' 토글 보완 필요."
            option="B"
            label="인용 중심 압축"
          >
            <OptionB />
          </OptionWrap>

          <OptionWrap
            badge="옵션 C"
            title="탭 전환"
            pros="섹션 길이 가장 짧음. 정보 밀도 高."
            cons="한 명만 보임. 모바일 탭 UX 까다로움."
            option="C"
            label="탭 전환"
          >
            <OptionC />
          </OptionWrap>
        </div>
      </div>
    </section>
  );
}
