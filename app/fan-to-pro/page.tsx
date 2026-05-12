import type { Metadata } from "next";
import { Footer } from "@/src/programs/fan-to-pro/presentation/components/footer";
import { StickyCTA } from "@/src/programs/fan-to-pro/presentation/components/sticky-cta";
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

export const metadata: Metadata = {
  title: "Fan to Pro · Growth Career",
  description:
    "한국 엔터테인먼트 업계 취업. 실제 K-pop 공연 프로젝트로 경력을 만든다. 880,000원 · 선착순 마감.",
  alternates: { canonical: "/fan-to-pro" },
  openGraph: {
    type: "article",
    url: "https://growthcareer.xyz/fan-to-pro",
    title: "Fan to Pro · Growth Career",
    description:
      "한국 엔터테인먼트 업계 취업. 실제 K-pop 공연 프로젝트로 경력을 만든다. 880,000원 · 선착순 마감.",
    siteName: "Growth Career",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fan to Pro · Growth Career",
    description:
      "한국 엔터테인먼트 업계 취업. 실제 K-pop 공연 프로젝트로 경력을 만든다. 880,000원 · 선착순 마감.",
  },
};

export default function FanToProPage() {
  return (
    <main className="relative">
      <Hero />
      <Problem />
      <Solution />
      <Recruitment />
      <ValueCards />
      <Mentor />
      <Program />
      <Outcome />
      <SocialProof />
      <Guarantees />
      <Bonus />
      <Pricing />
      <Testimonials />
      <FAQ />
      <ApplyForm />
      <Footer />

      <StickyCTA />
    </main>
  );
}
