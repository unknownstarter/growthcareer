import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

export function Solution() {
  const t = useTranslations("solution");
  const points = t.raw("points") as string[];

  return (
    <Section tone="purple">
      <Container>
        <Eyebrow n="02">{t("eyebrow")}</Eyebrow>

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

        <div className="grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-2">
          <p
            className="max-w-prose text-lg leading-relaxed text-fg/95 sm:text-xl"
            style={{ textWrap: "pretty" }}
          >
            {t("body1")}
            <br />
            {t("body2")}
            <br />
            <span className="font-bold">{t("bodyEmphasis")}</span>
          </p>

          <ul className="space-y-4">
            {points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-base sm:text-lg"
              >
                <span aria-hidden className="mt-0.5 font-black text-fg">
                  →
                </span>
                <span className="text-fg/95">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
