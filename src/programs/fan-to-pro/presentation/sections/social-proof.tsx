import Image from "next/image";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { StatCard } from "../ui/stat-card";

const STATS = [
  { value: "—건", label: "누적 공연 진행", hint: "운영팀 누적 시즌 기준 (집계 중)" },
  { value: "—명+", label: "누적 관객", hint: "전 시즌 합산" },
  { value: "3인", label: "현직 멘토", hint: "음향감독 · 비주얼디렉터 · 네트워킹" },
  { value: "4.9 / 5.0", label: "수강생 만족도", hint: "이전 강의 종료 설문 (N=—)" },
];

export function SocialProof() {
  return (
    <section className="relative overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/stock/korean-concert-audience-1.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/70 to-bg" />
      </div>

      <div className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
        <Container>
          <Eyebrow n="07">Real</Eyebrow>

          <h2
            className="mb-16 max-w-4xl font-black text-display-lg"
            style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
          >
            수치로 보여주는
            <br />
            <span className="text-brand-pink">진짜.</span>
          </h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {STATS.map((s) => (
              <StatCard
                key={s.label}
                value={s.value}
                label={s.label}
                hint={s.hint}
              />
            ))}
          </div>

          <p
            className="mt-12 max-w-2xl text-fg-subtle text-xs"
            style={{ letterSpacing: "0.1em" }}
          >
            * 정확한 수치는 시즌 결과 정리 완료 시 갱신. 개별 공연·아티스트
            식별 정보는 보호를 위해 비공개.
          </p>
        </Container>
      </div>
    </section>
  );
}
