import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type FAQItem = { q: string; a: string };

export function FAQ() {
  const t = useTranslations("faq");
  const items = t.raw("items") as FAQItem[];

  return (
    <Section id="faq" tone="bg" trackingName="FAQ" trackingOrder={14}>
      <Container>
        <Eyebrow n="13">{t("eyebrow")}</Eyebrow>

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

        <ul className="divide-y divide-border border-border border-y">
          {items.map((item, i) => (
            <li key={item.q}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-start gap-4 sm:gap-6 py-6 sm:py-8">
                  <span
                    className="shrink-0 font-black text-brand-pink text-sm sm:text-base"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="flex-1 font-black text-fg text-xl sm:text-2xl"
                    style={{
                      letterSpacing: "-0.02em",
                      lineHeight: 1.3,
                      textWrap: "balance",
                    }}
                  >
                    {item.q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 shrink-0 text-fg-subtle text-2xl transition-transform group-open:rotate-45 sm:text-3xl"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-8 pl-10 pr-4 sm:pl-12 sm:pr-12 text-base leading-relaxed text-fg-muted sm:text-lg max-w-prose">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
