import { useTranslations } from "next-intl";
import { cn } from "@/src/shared/ui/cn";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Accent = "indigo" | "purple" | "pink";

const ACCENT_ORDER: Accent[] = ["indigo", "purple", "pink"];

const ACCENT: Record<Accent, string> = {
  indigo: "text-brand-indigo",
  purple: "text-brand-purple",
  pink: "text-brand-pink",
};

type Item = {
  number: string;
  en: string;
  kr: string;
  body: string;
};

export function ValueCards() {
  const t = useTranslations("value");
  const items = t.raw("items") as Item[];

  return (
    <Section id="value" tone="bg" trackingName="Value Cards" trackingOrder={4}>
      <Container>
        <Eyebrow n="03">{t("eyebrow")}</Eyebrow>

        <h2
          className="mb-16 max-w-4xl font-black text-display-lg"
          style={{
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            textWrap: "balance",
          }}
        >
          {t("headlineLine1")}
          <br />
          <span className="text-brand-pink">{t("headlineEmphasis")}</span>{" "}
          {t("headlineLine2")}
        </h2>

        <div
          className="grid gap-4 md:gap-6 lg:gap-8"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {items.map((card, i) => {
            const accent = ACCENT_ORDER[i] ?? "pink";
            return (
              <article
                key={card.number}
                className="flex flex-col gap-6 border border-border bg-surface p-8 transition-colors hover:border-brand-purple sm:p-10"
              >
                <div className="flex flex-wrap items-baseline gap-4">
                  <span
                    className={cn("font-black text-5xl", ACCENT[accent])}
                    style={{ letterSpacing: "-0.04em" }}
                  >
                    {card.number}
                  </span>
                  <p
                    className="text-fg-subtle text-xs uppercase"
                    style={{ letterSpacing: "0.3em" }}
                  >
                    {card.en}
                  </p>
                </div>

                <h3
                  className="font-black text-fg text-3xl sm:text-4xl"
                  style={{
                    letterSpacing: "-0.03em",
                    textWrap: "balance",
                  }}
                >
                  {card.kr}
                </h3>

                <p className="max-w-prose text-base leading-relaxed text-fg-muted">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
