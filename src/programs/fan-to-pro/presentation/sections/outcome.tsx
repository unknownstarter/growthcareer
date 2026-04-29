import Image from "next/image";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const RESULTS = [
  "K-pop 공연 1 시즌 풀 참여 — 사진/영상/공연 데이터 전부 결과물.",
  "이력서·포트폴리오·면접 패턴 — 면접관이 신뢰하는 형식.",
  "현직 멘토 3인 + 동기 네트워크 — 카카오톡 오픈채팅 평생 유효.",
  "유니온 픽처스 수료증 — 한 줄로 끝나는 신뢰 신호.",
];

const GALLERY = [
  {
    src: "/images/stock/concert-stage-from-behind-performer-3.jpg",
    caption: "공연 현장",
  },
  {
    src: "/images/stock/concert-stage-from-behind-performer-4.jpg",
    caption: "관객과의 호흡",
  },
  {
    src: "/images/stock/stage-lights-purple-pink-3.jpg",
    caption: "무대 셋업",
  },
  {
    src: "/images/stock/male-singer-silhouette-stage-1.jpg",
    caption: "리허설 디테일",
  },
];

export function Outcome() {
  return (
    <Section tone="bg">
      <Container>
        <Eyebrow n="06">Outcome</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          완성된 너의
          <br />
          <span className="text-brand-pink">새 챕터.</span>
        </h2>

        <ul className="mb-16 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {RESULTS.map((r) => (
            <li
              key={r}
              className="flex items-start gap-3 border-l-2 border-brand-pink bg-surface px-5 py-4 text-base text-fg/90 sm:text-lg"
            >
              <span className="mt-0.5 font-black text-brand-pink">✓</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {GALLERY.map((g) => (
            <figure
              key={g.src}
              className="relative aspect-[4/3] overflow-hidden bg-surface"
            >
              <Image
                src={g.src}
                alt={g.caption}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover grayscale-[20%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
              <figcaption
                className="absolute bottom-3 left-3 text-fg text-xs font-bold uppercase sm:text-sm"
                style={{ letterSpacing: "0.2em" }}
              >
                {g.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <p
          className="mt-6 text-fg-subtle text-xs"
          style={{ letterSpacing: "0.1em" }}
        >
          * 이미지는 분위기 참고용. 실제 본 시즌 공연 사진은 수강 시작 후 공유.
        </p>
      </Container>
    </Section>
  );
}
