import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const PHASES = [
  {
    n: "01",
    title: "Class",
    kr: "1개월 현업 강의",
    body: "현업 전문가가 직접 진행하는 4주 집중 강의. 무대 음향 · 비주얼 · 스테이지 매니지먼트 · 아티스트 운영의 실무를 한국어/영어 혼용으로 압축.",
  },
  {
    n: "02",
    title: "Career Set",
    kr: "포트폴리오 + 면접",
    body: "결과물 큐레이션, 이력서 작성, 모의 면접. 유니온 픽처스 수료증 발급으로 이력서에 한 줄 추가.",
  },
  {
    n: "03",
    title: "Network",
    kr: "현업 네트워킹",
    body: "현직 멘토 3인 + 동기와 카카오톡 오픈채팅으로 연결. 업계 행사 · 소개 라인이 수강 이후에도 이어진다.",
  },
  {
    n: "04",
    title: "On Stage",
    kr: "공연 프로젝트 합류",
    body: "실제 K-pop 공연 한 시즌에 합류. 무대 음향 / 비주얼 / 스테이지 매니지먼트 중 역할 배정. 리허설부터 본 공연까지 풀 사이클.",
  },
];

export function Program() {
  return (
    <Section id="program" tone="bg">
      <Container>
        <Eyebrow n="05">Program</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          한 시즌.
          <br />풀 사이클.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          1개월 현업 강의로 시작해 포트폴리오 · 네트워킹 · 실제 공연 프로젝트까지
          4단계로 끝까지 같이 만든다.
        </p>

        <ol className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
          {PHASES.map((p) => (
            <li key={p.n} className="flex flex-col gap-5 bg-bg p-8 sm:p-10">
              <div className="flex items-baseline gap-4">
                <span
                  className="font-black text-brand-purple text-6xl sm:text-7xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {p.n}
                </span>
                <p
                  className="text-fg-subtle text-xs uppercase sm:text-sm"
                  style={{ letterSpacing: "0.3em" }}
                >
                  {p.title}
                </p>
              </div>

              <h3
                className="font-black text-2xl text-fg sm:text-3xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {p.kr}
              </h3>

              <p className="text-base leading-relaxed text-fg-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
