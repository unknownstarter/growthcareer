import { ENROLLMENT_CAP } from "@/src/programs/fan-to-pro/domain/program";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const QUALIFICATIONS = [
  {
    title: "외국인 유학생",
    body: "한국 거주 중인 외국 국적 학습자를 위한 프로그램입니다. 국적은 무관합니다.",
    chips: ["국적 무관", "한국 거주"],
  },
  {
    title: "학생 또는 취업 비자 보유",
    body: "유학(D-2 / D-4) 또는 취업 비자(E-시리즈)를 보유하고 있어야 합니다. 신청 시 비자 상태를 확인합니다.",
    chips: ["D-2", "D-4", "E-시리즈"],
  },
  {
    title: "한국어 강의 이해",
    body: "강의는 100% 한국어로 진행됩니다. 공식 시험 점수는 요구하지 않지만, 한국어로 강의를 이해할 수 있는 수준이어야 합니다.",
    chips: ["한국어 강의", "TOPIK 점수 불필요"],
  },
  {
    title: "주말 4주 출석",
    body: "토 · 일 양일, 총 8회 출석이 기본입니다. 출석률 90% 이상 수료자에게만 별도 K-pop 공연 현장 체험 기회가 열립니다.",
    chips: ["토 · 일", "4주 · 8회", "출석률 90%+"],
  },
];

export function Recruitment() {
  return (
    <Section id="recruitment" tone="violet">
      <Container>
        <Eyebrow n="03">Eligibility</Eyebrow>

        <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
          <h2
            className="max-w-3xl font-black text-display-lg"
            style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
          >
            이 4주는,
            <br />
            아무에게나
            <br />
            <span className="text-brand-pink">열리지 않습니다.</span>
          </h2>

          <p className="text-base leading-relaxed text-fg/90 sm:text-lg">
            K-POP 엔터테인먼트 업계 진출을 진지하게 노리는 외국인 유학생을 위해
            설계된 4주 주말 과정입니다.{" "}
            <span className="font-black text-fg">아래 네 가지 자격</span>을 모두
            충족해야 신청할 수 있습니다.
          </p>
        </div>

        <ol className="border border-border bg-bg">
          {QUALIFICATIONS.map((q, i) => (
            <li
              key={q.title}
              className="grid grid-cols-[auto_1fr] gap-6 border-border border-b p-6 last:border-b-0 sm:grid-cols-[140px_1fr_auto] sm:gap-10 sm:p-10"
            >
              {/* Required + number */}
              <div className="flex flex-col gap-2 border-l-2 border-brand-pink pl-4 sm:border-l-4 sm:pl-5">
                <span
                  className="text-brand-pink text-[10px] font-black uppercase sm:text-xs"
                  style={{ letterSpacing: "0.3em" }}
                >
                  Required
                </span>
                <span
                  className="font-black text-fg text-5xl leading-none sm:text-6xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title + body */}
              <div className="flex flex-col gap-3">
                <h3
                  className="font-black text-2xl text-fg sm:text-3xl"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {q.title}
                </h3>
                <p className="max-w-xl text-base leading-relaxed text-fg-muted">
                  {q.body}
                </p>
                {/* Chips — mobile only (below body) */}
                <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                  {q.chips.map((c) => (
                    <Chip key={c} variant="accent" size="md">
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Chips — desktop only (right column) */}
              <div className="hidden flex-col items-end gap-2 sm:flex">
                {q.chips.map((c) => (
                  <Chip key={c} variant="accent" size="md">
                    {c}
                  </Chip>
                ))}
              </div>
            </li>
          ))}
        </ol>

        {/* Capacity strip */}
        <div className="mt-8 flex flex-col gap-6 border border-fg/20 bg-bg p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-10">
          <div className="flex flex-col gap-2">
            <span
              className="text-fg-subtle text-[10px] font-black uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              Capacity
            </span>
            <p
              className="font-black text-fg text-3xl sm:text-4xl"
              style={{ letterSpacing: "-0.03em" }}
            >
              정원{" "}
              <span className="text-brand-pink">
                {ENROLLMENT_CAP.totalSeats}인
              </span>{" "}
              · 선착순 마감
            </p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">
            시작일{" "}
            <span className="font-black text-fg">
              {ENROLLMENT_CAP.cutoffDaysBeforeStart}일 전
            </span>{" "}
            신청자{" "}
            <span className="font-black text-fg">
              {ENROLLMENT_CAP.minToProceed}명
            </span>
            {" "}미만 시 강좌 취소 · 전액 자동 환불.
          </p>
        </div>
      </Container>
    </Section>
  );
}
