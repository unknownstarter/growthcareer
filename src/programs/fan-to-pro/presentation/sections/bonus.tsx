import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Perk = { title: string; body: string };

export function Bonus() {
  const t = useTranslations("bonus");
  const perks = t.raw("items") as Perk[];

  return (
    <Section id="bonus" tone="surface" trackingName="Bonus" trackingOrder={11}>
      <Container>
        <Eyebrow n="10">{t("eyebrow")}</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
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

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          {t("intro")}
        </p>

        <ul
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {perks.map((p, i) => (
            <li
              key={p.title}
              className="flex flex-col gap-3 border border-border bg-bg p-6 sm:p-8"
            >
              <span
                className="text-brand-pink text-xs font-black uppercase whitespace-nowrap"
                style={{ letterSpacing: "0.3em" }}
              >
                {t("perkLabel")} {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="font-black text-xl text-fg sm:text-2xl"
                style={{
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                {p.title}
              </h3>
              <p className="max-w-prose text-base leading-relaxed text-fg-muted">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
