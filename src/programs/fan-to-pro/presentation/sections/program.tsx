import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const PHASES = [
  {
    n: "01",
    title: "Onboarding",
    kr: "팀 매칭 + 멘토 1차 면담",
    body: "외국인 유학생 동기끼리 팀 구성. 비자 상태별 운영 가이드, 한국어/영어 혼용 진행.",
  },
  {
    n: "02",
    title: "Project In",
    kr: "공연 프로젝트 합류",
    body: "실제 K-pop 공연 한 시즌에 합류. 무대 음향 / 비주얼 / 스테이지 매니지먼트 중 역할 배정.",
  },
  {
    n: "03",
    title: "On Stage",
    kr: "현장 실전",
    body: "리허설부터 본 공연까지 풀 사이클 참여. 멘토 1:1 피드백 + 동기 협업으로 결과물을 만든다.",
  },
  {
    n: "04",
    title: "Career Set",
    kr: "포트폴리오 + 면접",
    body: "결과물 큐레이션, 이력서 작성, 모의 면접. 유니온 픽처스 수료증 + 카카오톡 오픈채팅 합류.",
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
          교과 과정이 아니다. 한 시즌의 K-pop 공연을 4단계로 나눠 끝까지 같이
          만든다.
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
