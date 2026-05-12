import { ENROLLMENT_CAP } from "@/src/programs/fan-to-pro/domain/program";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const QUALIFICATIONS = [
  {
    title: "외국인 유학생",
    body: "한국 거주 중인 외국 국적 학습자를 위한 프로그램입니다. 국적 무관.",
    chips: ["국적 무관", "한국 거주"],
  },
  {
    title: "비자 보유",
    body: "유학(D-2 / D-4) 또는 취업 비자(E-시리즈)를 보유하고 있어야 합니다. 신청 시 비자 상태를 확인합니다.",
    chips: ["D-2", "D-4", "E-시리즈"],
  },
  {
    title: "한국어 기본 이해",
    body: "강의는 한국어로 진행됩니다. 공식 시험 점수는 요구하지 않지만, 한국어로 강의를 이해할 수 있는 수준이어야 합니다.",
    chips: ["한국어 강의", "TOPIK 점수 불필요"],
  },
  {
    title: "주말 4주 출석",
    body: "토 · 일 양일, 총 8회 출석이 기본입니다. 출석률 90% 이상 수료자에게만 별도 공연 현장 체험 기회가 열립니다.",
    chips: ["토 · 일", "4주 · 8회"],
  },
];

export function Recruitment() {
  return (
    <Section id="recruitment" tone="violet">
      <Container>
        <Eyebrow n="03">Recruitment</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          누구를 위한
          <br />
          프로그램인가.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg/90 sm:text-lg">
          K-POP 엔터테인먼트 업계 진출을 꿈꾸는 외국인 유학생을 위해 설계된
          4주 주말 과정입니다. 아래 네 가지 조건을 모두 충족해야 신청할 수 있습니다.
        </p>

        <ol className="grid grid-cols-1 gap-px overflow-hidden border border-fg/20 bg-fg/20 md:grid-cols-2">
          {QUALIFICATIONS.map((q, i) => (
            <li key={q.title} className="flex flex-col gap-5 bg-brand-violet p-8 sm:p-10">
              <div className="flex items-baseline gap-4">
                <span
                  className="font-black text-fg text-6xl sm:text-7xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3
                className="font-black text-2xl text-fg sm:text-3xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {q.title}
              </h3>

              <p className="text-base leading-relaxed text-fg/90">{q.body}</p>

              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                {q.chips.map((c) => (
                  <Chip key={c} variant="solid">
                    {c}
                  </Chip>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-fg/20 pt-8">
          <Chip variant="solid">정원 {ENROLLMENT_CAP.totalSeats}인</Chip>
          <Chip variant="solid">선착순 입금 마감</Chip>
          <p className="text-fg/85 text-sm sm:text-base">
            * 시작일 7일 전 신청자 {ENROLLMENT_CAP.minToProceed}명 미만 시 강좌 취소 · 전액 자동 환불.
          </p>
        </div>
      </Container>
    </Section>
  );
}
