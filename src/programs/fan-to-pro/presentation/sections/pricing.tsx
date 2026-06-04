import { useLocale, useTranslations } from "next-intl";
import {
  PRICING,
  discountRate,
  formatKRW,
} from "@/src/programs/fan-to-pro/domain/pricing";
import { Button } from "../ui/button";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";

export function Pricing() {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const off = discountRate(PRICING.original, PRICING.discounted);
  const bullets = t.raw("bullets") as string[];
  const unsupportedItems = t.raw(
    "paymentSide.unsupportedItems",
  ) as string[];

  return (
    <section className="section-pink px-6 py-28 sm:px-10 sm:py-36">
      <Container>
        <Eyebrow n="12">{t("eyebrow")}</Eyebrow>

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

        <p
          className="mb-16 max-w-2xl text-base leading-relaxed text-fg/90 sm:text-lg"
          style={{ textWrap: "pretty" }}
        >
          {t("intro1")}
          <br />
          <span className="font-black">{t("introEmphasis")}</span>{" "}
          {t("intro2")}
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Price card */}
          <div className="bg-bg p-8 text-fg sm:p-12">
            <p
              className="mb-3 text-fg-subtle text-xs uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("cardLabel")}
            </p>

            <div className="mb-8 flex flex-wrap items-end gap-4">
              <span
                className="text-fg-subtle text-2xl line-through sm:text-3xl"
                aria-label={t("originalAriaLabel", {
                  price: formatKRW(PRICING.original, locale),
                })}
              >
                {formatKRW(PRICING.original, locale)}
              </span>
              <span className="bg-brand-pink px-2 py-1 font-black text-fg text-sm whitespace-nowrap">
                {t("offBadge", { off })}
              </span>
            </div>

            <p
              className="mb-2 font-black text-fg leading-none"
              style={{
                fontSize: "var(--text-display-md)",
                letterSpacing: "-0.05em",
              }}
            >
              {formatKRW(PRICING.discounted, locale)}
            </p>
            <p className="mb-10 text-fg-muted text-sm">{t("vatNote")}</p>

            <Button
              href="#apply"
              variant="primary"
              size="xl"
              className="w-full"
            >
              {t("cta")}
            </Button>

            <ul
              className="mt-8 grid gap-2 text-sm text-fg-muted"
              style={{
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
              }}
            >
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className="mt-1 block h-1 w-1 shrink-0 bg-brand-pink"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <p
              id="enrollment-cap"
              className="mt-8 border-t border-border pt-4 text-fg-subtle text-[11px] leading-relaxed max-w-prose"
              style={{ letterSpacing: "0.02em" }}
            >
              {t("footnote")}
            </p>
          </div>

          {/* Payment side card */}
          <div className="flex flex-col gap-6 bg-bg p-8 text-fg sm:p-10">
            <div>
              <p
                className="mb-3 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {t("paymentSide.methodLabel")}
              </p>
              <p
                className="font-black text-2xl sm:text-3xl"
                style={{ textWrap: "balance" }}
              >
                {t("paymentSide.methodTitleA")}
                <br />
                <span className="text-brand-pink">
                  {t("paymentSide.methodTitleB")}
                </span>
              </p>
            </div>

            <div className="border-t border-border pt-6">
              <p
                className="mb-2 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {t("paymentSide.holderLabel")}
              </p>
              <p className="font-black text-fg text-xl">
                {PRICING.bank.accountHolder}
              </p>
              <p className="mt-4 text-fg-muted text-sm leading-relaxed max-w-prose">
                {t("paymentSide.holderNote")}
              </p>
            </div>

            <div className="mt-auto border-border border-t pt-6">
              <p
                className="mb-2 text-fg-subtle text-xs uppercase"
                style={{ letterSpacing: "0.3em" }}
              >
                {t("paymentSide.unsupportedLabel")}
              </p>
              <ul className="list-disc pl-5 text-fg-muted text-sm marker:text-fg-subtle">
                {unsupportedItems.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

      </Container>
    </section>
  );
}
