import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const POINTS = [
  "현직 무대 음향 감독 · 비주얼 디렉터 멘토링",
  "실제 공연 한 시즌 풀 사이클 참여",
  "이력서 · 포트폴리오 · 면접 코칭",
  "K-POP 엔터테인먼트 직무 수료증 발급",
];

export function Solution() {
  return (
    <Section tone="purple">
      <Container>
        <Eyebrow n="02">Solution</Eyebrow>

        <h2
          className="mb-12 font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          진짜 무대.
          <br />진짜 경력.
        </h2>

        <div className="grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <p className="text-lg leading-relaxed text-fg/95 sm:text-xl">
            단순한 교육이 아닙니다.
            <br />
            실제 K-pop 공연 프로젝트에 합류해 한 시즌을 같이 만듭니다.
            <br />
            <span className="font-bold">현장에서 부딪히고, 결과를 남기고,
            팬들을 만납니다.</span>
          </p>

          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-base sm:text-lg"
              >
                <span className="mt-0.5 font-black text-fg">→</span>
                <span className="text-fg/95">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
