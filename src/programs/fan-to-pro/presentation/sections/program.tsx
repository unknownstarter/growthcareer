import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Phase = {
  n: string;
  title: string;
  kr: string;
  body: string;
  note?: string;
};

export function Program() {
  const t = useTranslations("program");
  const phases = t.raw("phases") as Phase[];

  return (
    <Section id="program" tone="bg" trackingName="Program" trackingOrder={8}>
      <Container>
        <Eyebrow n="07">{t("eyebrow")}</Eyebrow>

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
          {t("headlineLine2")}
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          {t("intro1")}
          <br />
          {t("intro2")}
        </p>

        <ol className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-2">
          {phases.map((p) => (
            <li key={p.n} className="flex flex-col gap-5 bg-bg p-8 sm:p-10">
              <div className="flex flex-wrap items-baseline gap-4">
                <span
                  className="font-black text-brand-purple text-6xl sm:text-7xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {p.n}
                </span>
                <p
                  className="text-fg-subtle text-xs uppercase sm:text-sm"
                  style={{ letterSpacing: "0.3em" }}
                >
                  {p.title}
                </p>
                {p.note ? (
                  <span
                    className="ml-auto inline-flex items-center border border-brand-pink/40 bg-brand-pink/10 px-2 py-1 font-black text-brand-pink text-[10px] uppercase whitespace-nowrap"
                    style={{ letterSpacing: "0.2em" }}
                  >
                    {p.note}
                  </span>
                ) : null}
              </div>

              <h3
                className="font-black text-2xl text-fg sm:text-3xl"
                style={{
                  letterSpacing: "-0.03em",
                  textWrap: "balance",
                }}
              >
                {p.kr}
              </h3>

              <p className="max-w-prose text-base leading-relaxed text-fg-muted">
                {p.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
