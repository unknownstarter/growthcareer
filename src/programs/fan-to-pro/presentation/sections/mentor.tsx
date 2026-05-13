import Image from "next/image";
import { INSTRUCTORS } from "@/src/programs/fan-to-pro/domain/program";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

export function Mentor() {
  return (
    <Section id="mentor" tone="surface">
      <Container>
        <Eyebrow n="05">Faculty</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          현장을 만드는
          <br />
          <span className="text-brand-pink">진짜 전문가</span>.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          교수가 아닙니다. 지금 이 순간에도 K-pop 공연 현장과 음반 비즈니스 한복판에서
          일하고 있는 두 명의 현직 디렉터가 4주를 같이 만듭니다.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {INSTRUCTORS.map((instructor) => (
            <article
              key={instructor.id}
              className="flex flex-col border border-border bg-bg transition-colors hover:border-brand-pink"
            >
              {/* Photo */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                {instructor.photo ? (
                  <>
                    <Image
                      src={instructor.photo}
                      alt={instructor.photoAlt}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 28px)",
                      }}
                    />
                    <span
                      className="relative font-black text-fg-subtle text-xs uppercase"
                      style={{ letterSpacing: "0.4em" }}
                    >
                      Profile · Pending
                    </span>
                  </div>
                )}
                <div className="absolute left-5 top-5 flex gap-2">
                  <Chip variant="accent">{instructor.day} 강사</Chip>
                  {instructor.status === "pending" ? (
                    <Chip variant="default">확정 예정</Chip>
                  ) : null}
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <p
                    className="font-black text-fg text-4xl sm:text-5xl"
                    style={{ letterSpacing: "-0.04em" }}
                  >
                    {instructor.name}
                  </p>
                  {instructor.nameSub ? (
                    <p
                      className="mt-1 text-fg/80 text-base font-bold"
                      style={{ letterSpacing: "0.05em" }}
                    >
                      {instructor.nameSub}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-8 p-8 sm:p-10">
                {/* Affiliation */}
                {instructor.affiliation.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {instructor.affiliation.map((a) => (
                      <Chip key={a} variant="default">
                        {a}
                      </Chip>
                    ))}
                  </div>
                ) : null}

                {/* One-liner */}
                <p
                  className="text-base leading-relaxed text-fg sm:text-lg"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {instructor.oneLiner}
                </p>

                {/* Curriculum */}
                <div className="border-t border-border pt-6">
                  <p
                    className="mb-4 text-fg-subtle text-xs uppercase"
                    style={{ letterSpacing: "0.3em" }}
                  >
                    담당 커리큘럼 (4주)
                  </p>
                  <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {instructor.curriculum.map((c, i) => (
                      <li
                        key={c}
                        className="flex items-start gap-3 text-base text-fg"
                      >
                        <span
                          className="mt-1 font-black text-brand-pink text-sm"
                          style={{ letterSpacing: "0.1em" }}
                        >
                          W{i + 1}
                        </span>
                        <span style={{ letterSpacing: "-0.01em" }}>{c}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Career groups */}
                {instructor.careerGroups.length > 0 ? (
                  <div className="border-t border-border pt-6">
                    <p
                      className="mb-6 text-fg-subtle text-xs uppercase"
                      style={{ letterSpacing: "0.3em" }}
                    >
                      주요 경력
                    </p>
                    <div className="flex flex-col gap-6">
                      {instructor.careerGroups.map((g) => (
                        <div key={g.label}>
                          <p
                            className="mb-3 font-black text-brand-pink text-sm uppercase sm:text-base"
                            style={{ letterSpacing: "0.15em" }}
                          >
                            {g.label}
                          </p>
                          <ul className="flex flex-wrap gap-2">
                            {g.items.map((item) => (
                              <li key={item}>
                                <Chip variant="subtle">{item}</Chip>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
