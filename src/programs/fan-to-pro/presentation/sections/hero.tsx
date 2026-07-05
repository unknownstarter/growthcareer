import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { PRICING, formatKRW } from "@/src/programs/fan-to-pro/domain/pricing";
import { isEnrollmentClosed } from "@/src/programs/fan-to-pro/domain/marketing/program-config";
import { SectionTracker } from "../components/section-tracker";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { ScarcityBadge } from "../ui/scarcity-badge";

export function Hero() {
  const t = useTranslations("hero");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const features = t.raw("features") as string[];
  const visaItems = t.raw("visa.items") as string[];
  const closed = isEnrollmentClosed();

  return (
    <section id="hero" className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-bg">
      <SectionTracker sectionId="hero" sectionName="Hero" sectionOrder={1} />
      {/* Background — performer back-to-camera + crowd, b/w with dark gradient. */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/stock/boy-group-concert-stage-3.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg" />
      </div>

      <Container className="relative z-10">
        <div className="flex flex-col gap-10 py-24 sm:gap-14">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="text-fg-subtle text-xs uppercase sm:text-sm"
              style={{ letterSpacing: "0.4em" }}
            >
              {t("eyebrow")}
            </span>
            <ScarcityBadge>{t("badges.scarcity")}</ScarcityBadge>
            <span
              className="inline-flex items-center border border-brand-pink bg-brand-pink/10 px-3 py-1 font-black text-brand-pink text-[10px] uppercase sm:text-xs"
              style={{ letterSpacing: "0.2em" }}
            >
              {t("badges.audience")}
            </span>
          </div>

          <h1
            className="font-black"
            style={{ lineHeight: 0.95, letterSpacing: "-0.05em" }}
          >
            <span
              className="block text-fg"
              style={{
                fontSize: "clamp(3rem, 14vw, 10rem)",
                wordBreak: "keep-all",
              }}
            >
              {t("headline.first")}
            </span>
            <span
              className="my-4 block text-fg-muted italic sm:my-6"
              style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}
            >
              {t("headline.connector")}
            </span>
            <span
              className="block text-brand-pink"
              style={{
                fontSize: "clamp(3rem, 14vw, 10rem)",
                wordBreak: "keep-all",
              }}
            >
              {t("headline.second")}
            </span>
          </h1>

          <p
            className="max-w-2xl text-lg leading-snug text-fg-muted sm:text-2xl"
            style={{ textWrap: "pretty" }}
          >
            {t("subtitleA")}{" "}
            <span className="font-bold text-fg">
              {t("subtitleEmphasisA")}
            </span>{" "}
            {t("subtitleB")}
            <br />
            <span className="font-bold text-fg">
              {t("subtitleEmphasisB")}
            </span>{" "}
            {t("subtitleC")}
          </p>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div>
              <p
                className="text-fg-subtle mb-2 text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {closed ? t("tuition.closedLabel") : t("tuition.label")}
              </p>
              {closed ? (
                <div>
                  <span
                    className="font-black text-fg"
                    style={{
                      fontSize: "clamp(1.75rem, 4vw, 3rem)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {t("tuition.closedValue")}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <s className="text-fg-subtle text-xl">
                      {formatKRW(PRICING.original, locale)}
                    </s>
                    <span
                      className="font-black text-fg"
                      style={{
                        fontSize: "clamp(1.75rem, 4vw, 3rem)",
                        letterSpacing: "-0.04em",
                      }}
                    >
                      {formatKRW(PRICING.discounted, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-brand-pink">
                    {t("tuition.note")}
                  </p>
                </>
              )}
            </div>
            <Button href="#apply" variant="primary" size="xl">
              {closed ? t("ctaClosed") : t("cta")}
            </Button>
            {/* Screen reader hint: applyCta is functionally identical. */}
            <span className="sr-only">{tCommon("applyCta")}</span>
          </div>

          <ul className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 border-t border-border pt-12 sm:grid-cols-2">
            {features.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-base sm:text-lg"
              >
                <span aria-hidden className="mt-1 font-black text-brand-pink">
                  ✓
                </span>
                <span className="text-fg-muted">{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              className="mr-1 text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("visa.label")}
            </span>
            {visaItems.map((visa) => (
              <span
                key={visa}
                className="inline-flex items-center rounded-full border border-brand-pink/40 bg-brand-pink/10 px-3 py-1 font-black text-brand-pink text-xs sm:text-sm whitespace-nowrap"
                style={{ letterSpacing: "0.05em" }}
              >
                {visa}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
