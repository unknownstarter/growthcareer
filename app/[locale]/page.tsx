/**
 * 우산 랜딩 (`/`). Growth Career umbrella brand landing.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * 구성:
 *   1. HeroUmbrellaStats: 지표 4개 + 다음 기수 CTA
 *   2. CohortShowcaseGrid (landing, 최대 3개)
 *   3. CourseGrid preview (maxItems=3)
 *   4. BundleGrid preview (maxItems=3)
 *   5. StoryGrid preview (maxItems=3)
 *   6. 하단 CTA (대기 명단)
 *
 * 다크 톤 tokens 유지. 그라데이션 X. Server Component + ISR 1h.
 */
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchUmbrellaStats } from "@/src/programs/growth-career/application/queries/showcase/fetch-umbrella-stats";
import { fetchCohortsForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-cohorts-for-showcase";
import { fetchCoursesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-courses-for-showcase";
import { fetchBundlesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-bundles-for-showcase";
import { fetchStoriesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-stories-for-showcase";
import {
  HeroUmbrellaStats,
  CohortShowcaseGrid,
  CourseGrid,
  BundleGrid,
  StoryGrid,
} from "@/src/programs/growth-career/presentation/components/showcase";

export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta.site" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export default async function UmbrellaLanding({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";

  const [stats, cohortResult, courseResult, bundles, stories] =
    await Promise.all([
      fetchUmbrellaStats({
        applyHref: `${prefix}/fan-to-pro#apply`,
        waitlistHref: `${prefix}/fan-to-pro#apply`,
        backgroundImage: {
          src: "/images/stock/boy-group-concert-stage-1.jpg",
          alt: "",
        },
      }),
      fetchCohortsForShowcase({
        variant: "landing",
        detailHrefFn: (slug) => `${prefix}/cohorts/${slug}`,
      }),
      fetchCoursesForShowcase({
        programSlug: "fan-to-pro",
        detailHrefFn: (slug) => `${prefix}/courses/${slug}`,
        maxItems: 3,
      }),
      fetchBundlesForShowcase({
        programSlug: "fan-to-pro",
        detailHrefFn: (slug) => `${prefix}/bundles/${slug}`,
        maxItems: 3,
      }),
      Promise.resolve(
        fetchStoriesForShowcase({
          locale: localeTyped,
          limit: 3,
          detailHrefFn: (slug) => `${prefix}/stories/${slug}`,
        }),
      ),
    ]);

  return (
    <main className="bg-bg text-fg">
      <HeroUmbrellaStats data={stats} />

      <section
        aria-labelledby="landing-cohorts-title"
        className="border-t border-border px-6 py-24 sm:px-10 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <SectionHeader
            eyebrow="COHORTS"
            title="지금까지의 기수"
            description="각 기수 커리큘럼, 강사진, 수료 결과를 확인하세요."
            titleId="landing-cohorts-title"
            ctaHref={`${prefix}/cohorts`}
            ctaLabel="모든 기수 보기"
          />
          <div className="mt-12">
            <CohortShowcaseGrid
              cohorts={cohortResult.cohorts}
              variant="landing"
              instructorsByCohortSlug={cohortResult.instructorsByCohortSlug}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="landing-courses-title"
        className="border-t border-border bg-surface px-6 py-24 sm:px-10 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <SectionHeader
            eyebrow="COURSES"
            title="단과 코스"
            description="개별 도메인만 골라 듣는 옵션."
            titleId="landing-courses-title"
            ctaHref={`${prefix}/courses`}
            ctaLabel="전체 단과 보기"
          />
          <div className="mt-12">
            <CourseGrid
              courses={courseResult.courses}
              instructorsBySlug={courseResult.instructorsBySlug}
            />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="landing-bundles-title"
        className="border-t border-border px-6 py-24 sm:px-10 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <SectionHeader
            eyebrow="BUNDLES"
            title="올인원 번들"
            description="여러 코스를 묶어 할인가로."
            titleId="landing-bundles-title"
            ctaHref={`${prefix}/bundles`}
            ctaLabel="모든 번들 보기"
          />
          <div className="mt-12">
            <BundleGrid bundles={bundles} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="landing-stories-title"
        className="border-t border-border bg-surface px-6 py-24 sm:px-10 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1280px]">
          <SectionHeader
            eyebrow="STORIES"
            title="수료생 스토리"
            description="다음 커리어로 이동한 수료생들의 여정."
            titleId="landing-stories-title"
            ctaHref={`${prefix}/stories`}
            ctaLabel="모든 스토리 보기"
          />
          <div className="mt-12">
            <StoryGrid stories={stories} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="landing-final-cta"
        className="border-t border-border px-6 py-24 sm:px-10 sm:py-32"
      >
        <div className="mx-auto w-full max-w-[1280px] text-center">
          <h2
            id="landing-final-cta"
            className="mb-6 font-black text-fg text-display-sm sm:text-display-md"
            style={{ letterSpacing: "-0.04em" }}
          >
            다음 기수에서 만나요.
          </h2>
          <p className="mb-10 mx-auto max-w-2xl text-fg-muted sm:text-lg">
            새 기수 오픈 알림과 조기 신청 혜택을 받으세요.
          </p>
          <a
            href={`${prefix}/fan-to-pro#apply`}
            className="inline-flex items-center justify-center bg-brand-pink text-fg font-black px-10 py-5 text-lg hover:bg-brand-purple transition-colors"
            style={{ letterSpacing: "-0.02em" }}
          >
            지금 신청하기
          </a>
        </div>
      </section>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  titleId,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  titleId: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p
          className="mb-4 text-xs uppercase text-fg-subtle sm:text-sm"
          style={{ letterSpacing: "0.4em" }}
        >
          {eyebrow}
        </p>
        <h2
          id={titleId}
          className="font-black text-fg text-display-sm sm:text-display-md"
          style={{ letterSpacing: "-0.04em" }}
        >
          {title}
        </h2>
        <p className="mt-4 text-fg-muted sm:text-lg">{description}</p>
      </div>
      <a
        href={ctaHref}
        className="inline-flex items-center gap-2 text-fg border-b border-fg-muted pb-1 hover:border-brand-pink hover:text-brand-pink transition-colors self-start sm:self-end"
      >
        {ctaLabel}
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}
