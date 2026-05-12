import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const PERKS = [
  {
    title: "카카오톡 오픈채팅",
    body: "수강 확정 즉시 동기 + 멘토 그룹챗 입장. 한 시즌 끝나도 평생 유효.",
  },
  {
    title: "1:1 멘토 세션",
    body: "음향감독·비주얼디렉터 멘토와 직접 1:1. 진로·기술 두 트랙 모두.",
  },
  {
    title: "면접 모의 시뮬레이션",
    body: "K-엔터 회사 실제 면접 패턴으로 모의 진행. 영상 피드백 포함.",
  },
  {
    title: "포트폴리오 큐레이션",
    body: "현장 결과물을 면접관 눈높이에 맞게 정리. 이력서·자기소개서까지.",
  },
  {
    title: "비자 가이드",
    body: "외국인 유학생 비자 상태별 취업 경로 정리. 별도 문서 제공.",
  },
  {
    title: "동문 네트워크",
    body: "동기 + 다음 기수 + 운영 멘토 라인 연결. 업계 진입 통로가 된다.",
  },
];

export function Bonus() {
  return (
    <Section tone="surface">
      <Container>
        <Eyebrow n="10">Bonus</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          신청 즉시
          <br />
          <span className="text-brand-pink">함께 받는 것.</span>
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          본 프로그램 외 추가로 무료로 합류하는 부록. 별도 결제 없음.
        </p>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {PERKS.map((p, i) => (
            <li
              key={p.title}
              className="flex flex-col gap-3 border border-border bg-bg p-6 sm:p-8"
            >
              <span
                className="text-brand-pink text-xs font-black uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                Perk {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="font-black text-xl text-fg sm:text-2xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {p.title}
              </h3>
              <p className="text-base leading-relaxed text-fg-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
