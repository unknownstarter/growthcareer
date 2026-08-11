import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/src/programs/fan-to-pro/presentation/components/footer";
import { StickyCTA } from "@/src/programs/fan-to-pro/presentation/components/sticky-cta";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import {
  gcNavAfter,
  gcNavBefore,
} from "@/src/programs/growth-career/presentation/gc-nav";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import { StructuredData } from "@/src/programs/fan-to-pro/presentation/components/structured-data";
import {
  ApplyForm,
  type ApplyFormSelection,
} from "@/src/programs/fan-to-pro/presentation/sections/apply-form";
import {
  getCurrentPricingPhase,
  resolveBundlePriceKrw,
  resolveCoursePriceKrw,
} from "@/src/programs/fan-to-pro/domain/pricing";
import { fetchCourseBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/course-repository";
import { fetchBundleBySlug } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/bundle-repository";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
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

// B0039 모집 마감 자동 전환 — request-time 평가 강제 (SSG cache 회피).
// 빌드 시점이 cutoff 전이면 isEnrollmentClosed() false 가 정적 HTML 에 박혀
// 자정 지나도 안 바뀌는 사고를 방지. 다음 기수 모집 재개 후 재고 가능.
export const dynamic = "force-dynamic";

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
  // 1기 아카이브 = 영구 퍼머링크. self-referential canonical (에버그린 /fan-to-pro/2 와 중복 오판 방지).
  const canonical =
    locale === routing.defaultLocale
      ? "/fan-to-pro/1"
      : `/${locale}/fan-to-pro/1`;
  const archiveSuffix = locale === "ko" ? "1기 아카이브" : "Cohort 1 archive";

  return {
    title: `${t("title")} | ${archiveSuffix}`,
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: "/fan-to-pro/1",
        ko: "/ko/fan-to-pro/1",
        "x-default": "/fan-to-pro/1",
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

// B0068 Slice 2c — 2기 신청 flow. courses/bundles 페이지에서 slug 를 query param
// 으로 전달. 상위에서 DB 조회 후 ApplyForm 에 selection props 로 주입.
// slug 검증 실패 (DB 없음, status !== 'open') 는 silent skip → selection=null →
// 1기 기본 UI 로 fallback (사용자 신청 자체는 계속 가능).
type SearchParams = {
  course?: string | string[];
  bundle?: string | string[];
};

const SLUG_RE = /^[a-z0-9-]{1,120}$/i;

function pickSlug(value: string | string[] | undefined): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!SLUG_RE.test(trimmed)) return null;
  return trimmed;
}

async function resolveSelection(
  courseSlug: string | null,
  bundleSlug: string | null,
): Promise<ApplyFormSelection | null> {
  if (!courseSlug && !bundleSlug) return null;
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("slug", "fan-to-pro")
    .maybeSingle();
  if (!program?.id) return null;

  const phase = getCurrentPricingPhase(null); // TODO: recruitmentStartsAt 확정 후 주입

  // bundle 이 우선 (더 상위 상품). 둘 다 전달되면 bundle 우선.
  if (bundleSlug) {
    try {
      const bundle = await fetchBundleBySlug(program.id, bundleSlug);
      if (bundle && bundle.status === "open") {
        return {
          kind: "bundle",
          slug: bundle.slug,
          titleKo: bundle.title_ko,
          priceKrw: resolveBundlePriceKrw(bundle.price_krw),
        };
      }
    } catch {
      // silent fallback
    }
  }

  if (courseSlug) {
    try {
      const course = await fetchCourseBySlug(program.id, courseSlug);
      if (course && course.status === "open") {
        return {
          kind: "course",
          slug: course.slug,
          titleKo: course.title_ko,
          priceKrw: resolveCoursePriceKrw(course.price_krw, phase),
        };
      }
    } catch {
      // silent fallback
    }
  }

  return null;
}

export default async function FanToProPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sp = await searchParams;
  const courseSlug = pickSlug(sp.course);
  const bundleSlug = pickSlug(sp.bundle);
  const selection = await resolveSelection(courseSlug, bundleSlug);
  const pricingPhase = getCurrentPricingPhase(null);
  // GC 공통 GNB 링크는 locale-aware (ko = "/ko", en = "").
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;

  return (
    <main className="relative">
      {/* 상단 공통 GC GNB (전역 이동, 라이트 통일). 동결 1기 본문은 그대로, 네비 chrome 만 추가.
          6개 GC 서피스 GNB 픽셀 동일 = light-clean brand + 4탭 + locale + CTA. */}
      <SiteHeader
        brand={<GcWordmark variant="light-clean" href={`${prefix}/gc-preview`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: "커뮤니티", node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />
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
      <ApplyForm selection={selection} pricingPhase={pricingPhase} />
      <Footer />

      <StickyCTA />
    </main>
  );
}
