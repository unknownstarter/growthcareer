import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/src/programs/fan-to-pro/presentation/components/footer";
import { StickyCTA } from "@/src/programs/fan-to-pro/presentation/components/sticky-cta";
import { StructuredData } from "@/src/programs/fan-to-pro/presentation/components/structured-data";
import { ApplyForm } from "@/src/programs/fan-to-pro/presentation/sections/apply-form";
import { Bonus } from "@/src/programs/fan-to-pro/presentation/sections/bonus";
import { FAQ } from "@/src/programs/fan-to-pro/presentation/sections/faq";
import { Guarantees } from "@/src/programs/fan-to-pro/presentation/sections/guarantees";
import { Hero } from "@/src/programs/fan-to-pro/presentation/sections/hero";
import { Mentor } from "@/src/programs/fan-to-pro/presentation/sections/mentor";
import { Outcome } from "@/src/programs/fan-to-pro/presentation/sections/outcome";
import { Pricing } from "@/src/programs/fan-to-pro/presentation/sections/pricing";
import { Problem } from "@/src/programs/fan-to-pro/presentation/sections/problem";
import { Program } from "@/src/programs/fan-to-pro/presentation/sections/program";
import { Recruitment } from "@/src/programs/fan-to-pro/presentation/sections/recruitment";
import { SocialProof } from "@/src/programs/fan-to-pro/presentation/sections/social-proof";
import { Solution } from "@/src/programs/fan-to-pro/presentation/sections/solution";
import { Testimonials } from "@/src/programs/fan-to-pro/presentation/sections/testimonials";
import { ValueCards } from "@/src/programs/fan-to-pro/presentation/sections/value-cards";
import { routing } from "@/src/i18n/routing";

const SITE_URL = "https://growthcareer.xyz";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta.fanToPro" });
  const ogLocale = locale === "ko" ? "ko_KR" : "en_US";
  const canonical =
    locale === routing.defaultLocale ? "/fan-to-pro" : `/${locale}/fan-to-pro`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: "/fan-to-pro",
        ko: "/ko/fan-to-pro",
        "x-default": "/fan-to-pro",
      },
    },
    openGraph: {
      type: "article",
      url: `${SITE_URL}${canonical}`,
      title: t("ogTitle"),
      description: t("ogDescription"),
      siteName: t("siteName"),
      locale: ogLocale,
      alternateLocale: locale === "ko" ? ["en_US"] : ["ko_KR"],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function FanToProPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <main className="relative">
      <StructuredData locale={locale} />
      <Hero />
      <Problem />
      <Solution />
      <ValueCards />
      <Outcome />
      <Testimonials />
      <Mentor />
      <Program />
      <SocialProof />
      <Guarantees />
      <Bonus />
      <Recruitment />
      <Pricing />
      <FAQ />
      <ApplyForm />
      <Footer />

      <StickyCTA />
    </main>
  );
}
