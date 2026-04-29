import { MENTORS } from "@/src/programs/fan-to-pro/domain/program";
import { Avatar } from "../ui/avatar";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

const TINTS = ["indigo", "purple", "pink"] as const;

export function Mentor() {
  return (
    <Section id="mentor" tone="surface">
      <Container>
        <Eyebrow n="04">Mentor</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          현장을 만드는
          <br />
          <span className="text-brand-pink">진짜 전문가</span>.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          교수가 아닌 실제 K-pop 공연 현장에서 활동 중인 감독 2인 + 
          <br />
          업계 네트워킹 멘토가 한 시즌을 같이 만듭니다.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {MENTORS.map((m, i) => (
            <article
              key={m.id}
              className="flex flex-col gap-6 border border-border bg-bg p-8 transition-colors hover:border-brand-purple"
            >
              <div className="flex items-center justify-between">
                <Avatar
                  initials={m.roleEn
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                  tint={TINTS[i % TINTS.length]}
                  size={72}
                />
                {m.status === "pending" && (
                  <span
                    className="border border-fg-subtle/40 bg-bg px-2 py-1 text-[10px] font-bold uppercase text-fg-subtle"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    확정 예정
                  </span>
                )}
              </div>

              <div>
                <p
                  className="text-fg-subtle text-xs uppercase"
                  style={{ letterSpacing: "0.3em" }}
                >
                  {m.roleEn}
                </p>
                <h3
                  className="mt-2 font-black text-2xl text-fg sm:text-3xl"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {m.role}
                </h3>
              </div>

              <p className="text-base leading-relaxed text-fg-muted">
                {m.bio ?? "현직 K-pop 공연 현장에서 활동 중. 상세 프로필은 곧 공개."}
              </p>

              <p
                className="mt-auto text-fg text-base"
                style={{ letterSpacing: "-0.02em" }}
              >
                <span className="text-brand-pink font-black">
                  {m.name ?? "—"}
                </span>
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
