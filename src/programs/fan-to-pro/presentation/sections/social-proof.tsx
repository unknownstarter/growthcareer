import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { StatCard } from "../ui/stat-card";

type Stat = { value: string; label: string; hint: string };

export function SocialProof() {
  const t = useTranslations("socialProof");
  const stats = t.raw("stats") as Stat[];

  return (
    <section className="relative overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/stock/korean-concert-audience-1.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/70 to-bg" />
      </div>

      <div className="relative z-10 px-6 py-24 sm:px-10 sm:py-32">
        <Container>
          <Eyebrow n="08">{t("eyebrow")}</Eyebrow>

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
            <span className="text-brand-pink">{t("headlineEmphasis")}</span>
          </h2>

          <div
            className="grid gap-x-6 gap-y-12"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            }}
          >
            {stats.map((s) => (
              <StatCard
                key={s.label}
                value={s.value}
                label={s.label}
                hint={s.hint}
              />
            ))}
          </div>

          <p
            className="mt-12 max-w-2xl text-fg-subtle text-xs"
            style={{ letterSpacing: "0.1em" }}
          >
            {t("disclaimer")}
          </p>
        </Container>
      </div>
    </section>
  );
}
