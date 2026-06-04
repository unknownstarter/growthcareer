import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Item = { title: string; body: string };

export function Problem() {
  const t = useTranslations("problem");
  const items = t.raw("items") as Item[];

  return (
    <Section tone="indigo">
      <Container>
        <Eyebrow n="01">{t("eyebrow")}</Eyebrow>

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

        <div
          className="grid max-w-5xl gap-4 md:gap-6"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {items.map((item) => (
            <article
              key={item.title}
              className="border border-fg/15 bg-bg/15 p-6 sm:p-8"
            >
              <h3
                className="mb-3 font-black text-2xl sm:text-3xl"
                style={{
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                {item.title}
              </h3>
              <p className="max-w-prose text-base text-fg/85 leading-relaxed">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
