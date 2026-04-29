import { GUARANTEES } from "@/src/programs/fan-to-pro/domain/program";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

export function Guarantees() {
  return (
    <Section tone="indigo">
      <Container>
        <Eyebrow n="08">Guarantee</Eyebrow>

        <h2
          className="mb-12 font-black text-display-lg"
          style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
        >
          3가지
          <br />보장.
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg/85 sm:text-lg">
          한 시즌이 끝나도 *남는 것* 만 약속한다. 마케팅 카피가 아니라 산출물.
        </p>

        <div className="grid grid-cols-1 gap-px overflow-hidden border border-fg/20 bg-fg/20 md:grid-cols-3">
          {GUARANTEES.map((g, i) => (
            <article
              key={g.id}
              className="flex flex-col gap-5 bg-brand-indigo p-8 sm:p-10"
            >
              <div className="flex items-baseline gap-4">
                <span
                  className="font-black text-fg text-6xl sm:text-7xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3
                className="font-black text-3xl text-fg sm:text-4xl"
                style={{ letterSpacing: "-0.03em" }}
              >
                {g.title}
              </h3>

              <p className="text-base leading-relaxed text-fg/90">{g.body}</p>

              <p
                className="mt-auto pt-4 text-fg text-sm font-black uppercase"
                style={{ letterSpacing: "0.2em" }}
              >
                보장합니다.
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
