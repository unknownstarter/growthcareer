import { cn } from "../components/cn";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Accent = "indigo" | "purple" | "pink";

const ACCENT: Record<Accent, string> = {
  indigo: "text-brand-indigo",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

const CARDS: Array<{
  number: string;
  en: string;
  kr: string;
  body: string;
  accent: Accent;
}> = [
  {
    number: "01",
    en: "REAL STAGE",
    kr: "실제 공연 참여",
    body: "실제 K-pop 공연 한 시즌을 멘토와 함께 풀 사이클로 진행! 사진, 영상, 공연 데이터까지 결과물로 남습니다.",
    accent: "indigo",
  },
  {
    number: "02",
    en: "PORTFOLIO",
    kr: "포트폴리오 + 면접",
    body: "이력서·포트폴리오·면접 코칭까지! 면접관이 공감할 수 있는 형식으로 결과물을 함께 만듭니다.",
    accent: "purple",
  },
  {
    number: "03",
    en: "NETWORK",
    kr: "업계 네트워킹",
    body: "현직 멘토 + 기수 동기 + K-POP 엔터테인먼트 직무 수료증! 한 시즌 끝나도 카카오톡 오픈채팅으로 이어집니다.",
    accent: "pink",
  },
];

export function ValueCards() {
  return (
    <Section tone="bg">
      <Container>
        <Eyebrow n="03">Core Value</Eyebrow>

        <h2
          className="mb-16 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          이력서에
          <br />
          <span className="text-brand-pink">쓸 수 있는</span> 경험.
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 lg:gap-8">
          {CARDS.map((card) => (
            <article
              key={card.number}
              className="flex flex-col gap-6 border border-border bg-surface p-8 transition-colors hover:border-brand-purple sm:p-10"
            >
              <div className="flex items-baseline gap-4">
                <span
                  className={cn("font-black text-5xl", ACCENT[card.accent])}
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {card.number}
                </span>
                <p
                  className="text-fg-subtle text-xs uppercase"
                  style={{ letterSpacing: "0.3em" }}
                >
                  {card.en}
                </p>
              </div>

              <h3
                className="font-black text-fg text-3xl sm:text-4xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {card.kr}
              </h3>

              <p className="text-base leading-relaxed text-fg-muted">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
