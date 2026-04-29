import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const PHASES = [
  {
    n: "01",
    title: "Class",
    kr: "1개월 현업 강의",
    body: "토 · 일 주말반 · 총 8회 · 4주 진행. 현업 전문가가 무대 음향 · 비주얼 · 스테이지 매니지먼트 · 아티스트 운영의 실무를 한국어로 압축해 전달.",
  },
  {
    n: "02",
    title: "Certificate",
    kr: "교육 수료증",
    body: "강의 종료 시 유니온 픽처스 명의 수료증 발급. 결과물 큐레이션 · 이력서 작성 · 모의 면접 워크북이 함께 제공.",
  },
  {
    n: "03",
    title: "Network",
    kr: "현업 네트워킹",
    body: "수료생 + 현직 멘토 3인 카카오톡 오픈채팅 입장. 업계 행사 · 소개 라인이 강의가 끝난 뒤에도 이어진다.",
  },
  {
    n: "04",
    title: "On Stage",
    kr: "공연 프로젝트 실무 체험",
    body: "출석률 90% 이상 수료자에게만 열리는 별도 혜택. 실제 K-pop 공연 현장에 동행해 무대 음향 / 비주얼 / 스테이지 매니지먼트 실무를 가까이서 체험. 별도 결제 없음.",
    note: "조건부 · 별도 신청",
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
          한 달.
          <br />그리고 무대.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          4주 강의 + 수료증 + 네트워킹이 본 프로그램.
          <br />출석률 90% 이상 수료자에게만 별도로 열리는 K-pop 공연 현장 실무 체험까지 이어지다.
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
                {"note" in p && p.note ? (
                  <span
                    className="ml-auto inline-flex items-center border border-brand-pink/40 bg-brand-pink/10 px-2 py-1 font-black text-brand-pink text-[10px] uppercase"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    {p.note}
                  </span>
                ) : null}
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
