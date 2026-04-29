import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const ITEMS = [
  {
    title: "실무 경험 부족",
    body: "학교 프로젝트는 K-pop 업계 면접에서 통하지 않는다.",
  },
  {
    title: "포트폴리오 공백",
    body: "현장에서 검증된 결과물이 없으면 면접관을 설득하기 어렵다.",
  },
  {
    title: "네트워크 부재",
    body: "외국인 유학생은 K-pop 업계 진입 자체가 어렵다.",
  },
];

export function Problem() {
  return (
    <Section tone="indigo">
      <Container>
        <Eyebrow n="01">Problem</Eyebrow>

        <h2
          className="mb-12 font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          이력서에
          <br />쓸 게 없다.
        </h2>

        <div className="grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {ITEMS.map((item) => (
            <article
              key={item.title}
              className="border border-fg/15 bg-bg/15 p-6 sm:p-8"
            >
              <h3
                className="mb-3 font-black text-2xl sm:text-3xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {item.title}
              </h3>
              <p className="text-base text-fg/85 leading-relaxed">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
