import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Guarantee = { id: string; title: string; body: string };

export function Guarantees() {
  const t = useTranslations("guarantees");
  const items = t.raw("items") as Guarantee[];

  return (
    <Section tone="indigo">
      <Container>
        <Eyebrow n="09">{t("eyebrow")}</Eyebrow>

        <h2
          className="mb-12 font-black text-display-lg"
          style={{
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            textWrap: "balance",
          }}
        >
          {t("headlineLine1")}
          <br />
          {t("headlineLine2")}
        </h2>

        <p
          className="mb-16 max-w-2xl text-base leading-relaxed text-fg/85 sm:text-lg"
          style={{ textWrap: "pretty" }}
        >
          {t("intro")}
        </p>

        <div
          className="grid gap-px overflow-hidden border border-fg/20 bg-fg/20"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {items.map((g, i) => (
            <article
              key={g.id}
              className="flex flex-col gap-5 bg-brand-indigo p-8 sm:p-10"
            >
              <div className="flex flex-wrap items-baseline gap-4">
                <span
                  className="font-black text-fg text-6xl sm:text-7xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3
                className="font-black text-3xl text-fg sm:text-4xl"
                style={{
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                {g.title}
              </h3>

              <p className="max-w-prose text-base leading-relaxed text-fg/90">
                {g.body}
              </p>

              <p
                className="mt-auto pt-4 text-fg text-sm font-black uppercase"
                style={{ letterSpacing: "0.2em" }}
              >
                {t("promiseLabel")}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
