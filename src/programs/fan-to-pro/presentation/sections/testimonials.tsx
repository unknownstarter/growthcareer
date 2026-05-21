import {
  SATISFACTION,
  TESTIMONIALS,
  TESTIMONIAL_DISCLOSURE,
} from "@/src/programs/fan-to-pro/domain/testimonials";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

export function Testimonials() {
  return (
    <Section id="testimonials" tone="surface">
      <Container>
        <Eyebrow n="05">Voices</Eyebrow>

        <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
          <h2
            className="max-w-3xl font-black text-display-lg"
            style={{ lineHeight: 1.05, letterSpacing: "-0.04em" }}
          >
            이전 수강생들이
            <br />
            <span className="text-brand-pink">남긴 후기.</span>
          </h2>

          <div className="border-l-2 border-brand-pink pl-6">
            <p
              className="text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              수강생 만족도
            </p>
            <p
              className="mt-2 font-black text-fg leading-none"
              style={{
                fontSize: "var(--text-display-sm)",
                letterSpacing: "-0.04em",
              }}
            >
              {SATISFACTION.score}
              <span className="text-fg-subtle text-2xl">/{SATISFACTION.max}</span>
            </p>
            <p className="mt-2 text-fg-subtle text-xs">
              종료 설문 기준 (N=
              {SATISFACTION.sampleSize ?? "—"})
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <li
              key={t.id}
              className="flex flex-col gap-5 border border-border bg-bg p-6 sm:p-8"
            >
              <span
                className="text-brand-pink text-xs font-black uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {t.aspiration}
              </span>

              <blockquote
                className="text-fg text-lg leading-relaxed sm:text-xl"
                style={{ letterSpacing: "-0.02em" }}
              >
                <span aria-hidden className="mr-1 text-brand-pink">
                  "
                </span>
                {t.quote}
                <span aria-hidden className="ml-1 text-brand-pink">
                  "
                </span>
              </blockquote>

              <footer className="mt-auto flex items-center gap-3 border-border border-t pt-4">
                <span
                  className="flex h-10 w-10 items-center justify-center bg-brand-indigo font-black text-fg"
                  aria-hidden
                >
                  {t.initial}
                </span>
                <div className="text-fg-muted text-sm">
                  <p className="font-black text-fg">
                    {t.initial}, {t.age}세
                  </p>
                  <p>{t.nationality}</p>
                </div>
              </footer>
            </li>
          ))}
        </ul>

        <p
          className="mt-12 max-w-3xl text-fg-subtle text-xs leading-relaxed"
          style={{ letterSpacing: "0.05em" }}
        >
          * {TESTIMONIAL_DISCLOSURE}
        </p>
      </Container>
    </Section>
  );
}
