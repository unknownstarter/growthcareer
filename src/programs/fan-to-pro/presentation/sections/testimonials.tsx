import { useTranslations } from "next-intl";
import { SATISFACTION } from "@/src/programs/fan-to-pro/domain/testimonials";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type TestimonialItem = {
  id: string;
  initial: string;
  age: number;
  nationality: string;
  aspiration: string;
  quote: string;
};

export function Testimonials() {
  const t = useTranslations("testimonials");
  const items = t.raw("items") as TestimonialItem[];
  const ageSuffix = t("ageSuffix");

  return (
    <Section id="testimonials" tone="surface">
      <Container>
        <Eyebrow n="05">{t("eyebrow")}</Eyebrow>

        <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
          <h2
            className="max-w-3xl font-black text-display-lg"
            style={{
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              textWrap: "balance",
            }}
          >
            {t("headlineLine1")}
            <br />
            <span className="text-brand-pink">{t("headlineEmphasis")}</span>
          </h2>

          <div className="border-l-2 border-brand-pink pl-6">
            <p
              className="text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("satisfactionLabel")}
            </p>
            <p
              className="mt-2 font-black text-fg leading-none"
              style={{
                fontSize: "var(--text-display-sm)",
                letterSpacing: "-0.04em",
              }}
            >
              {SATISFACTION.score}
              <span className="text-fg-subtle text-2xl">
                /{SATISFACTION.max}
              </span>
            </p>
            <p className="mt-2 text-fg-subtle text-xs">
              {SATISFACTION.sampleSize == null
                ? t("satisfactionFallback")
                : t("satisfactionFootnote", {
                    sampleSize: SATISFACTION.sampleSize,
                  })}
            </p>
          </div>
        </div>

        <ul
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {items.map((it) => (
            <li
              key={it.id}
              className="flex flex-col gap-5 border border-border bg-bg p-6 sm:p-8"
            >
              <span
                className="text-brand-pink text-xs font-black uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {it.aspiration}
              </span>

              <blockquote
                className="text-fg text-lg leading-relaxed sm:text-xl"
                style={{
                  letterSpacing: "-0.02em",
                  textWrap: "pretty",
                }}
              >
                <span aria-hidden className="mr-1 text-brand-pink">
                  "
                </span>
                {it.quote}
                <span aria-hidden className="ml-1 text-brand-pink">
                  "
                </span>
              </blockquote>

              <footer className="mt-auto flex items-center gap-3 border-border border-t pt-4">
                <span
                  className="flex h-10 w-10 items-center justify-center bg-brand-indigo font-black text-fg"
                  aria-hidden
                >
                  {it.initial}
                </span>
                <div className="text-fg-muted text-sm">
                  <p className="font-black text-fg">
                    {it.initial}, {it.age}
                    {ageSuffix}
                  </p>
                  <p>{it.nationality}</p>
                </div>
              </footer>
            </li>
          ))}
        </ul>

        <p
          className="mt-12 max-w-3xl text-fg-subtle text-xs leading-relaxed"
          style={{ letterSpacing: "0.05em" }}
        >
          {t("disclosure")}
        </p>
      </Container>
    </Section>
  );
}
