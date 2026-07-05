/**
 * `/cohorts/[showcase_slug]`. 기수 상세 페이지.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * 목적: 특정 기수의 개요, 강사진, 대표 성과, 해당 기수 수료생 스토리를 노출.
 * 데이터 소스: fetchCohortsForShowcase(archive) → slug 매칭.
 * 스토리는 fetchStoriesForShowcase(cohortShowcaseSlug) 로 필터.
 *
 * SSG hint: generateStaticParams (전체 cohort 사전 렌더).
 * ISR 1h.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchCohortsForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-cohorts-for-showcase";
import { fetchStoriesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-stories-for-showcase";
import { StoryGrid } from "@/src/programs/growth-career/presentation/components/showcase";
import { formatPeriod } from "@/src/programs/growth-career/presentation/components/showcase/format";

export const revalidate = 3600;

type Params = { locale: string; showcase_slug: string };

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export async function generateStaticParams(): Promise<
  { locale: string; showcase_slug: string }[]
> {
  const params: { locale: string; showcase_slug: string }[] = [];
  for (const locale of routing.locales) {
    const prefix = localePrefix(locale);
    const { cohorts } = await fetchCohortsForShowcase({
      variant: "archive",
      detailHrefFn: (slug) => `${prefix}/cohorts/${slug}`,
    });
    for (const c of cohorts) {
      params.push({ locale, showcase_slug: c.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { showcase_slug } = await params;
  return {
    title: `${showcase_slug} 기수`,
    description: `${showcase_slug} 기수 상세: 강사진, 커리큘럼, 수료 결과.`,
  };
}

export default async function CohortDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, showcase_slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";

  const { cohorts, instructorsByCohortSlug } = await fetchCohortsForShowcase({
    variant: "archive",
    detailHrefFn: (slug) => `${prefix}/cohorts/${slug}`,
  });

  const cohort = cohorts.find((c) => c.slug === showcase_slug);
  if (!cohort) notFound();

  const instructors = instructorsByCohortSlug[cohort.slug] ?? [];

  const stories = fetchStoriesForShowcase({
    locale: localeTyped,
    cohortShowcaseSlug: cohort.slug,
    detailHrefFn: (slug) => `${prefix}/stories/${slug}`,
  });

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-fg-subtle sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            COHORT
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            {cohort.name}
          </h1>
          <time
            dateTime={`${cohort.period.startDate}/${cohort.period.endDate}`}
            className="mt-6 block text-fg-muted sm:text-lg"
          >
            {formatPeriod(cohort.period.startDate, cohort.period.endDate)}
          </time>

          <dl className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <dt
                className="text-xs uppercase text-fg-subtle"
                style={{ letterSpacing: "0.25em" }}
              >
                수료 인원
              </dt>
              <dd
                className="font-black text-fg text-4xl sm:text-5xl"
                style={{ letterSpacing: "-0.04em" }}
              >
                {cohort.graduateCount}
              </dd>
            </div>
            {cohort.heroStat && (
              <div className="flex flex-col gap-2">
                <dt
                  className="text-xs uppercase text-fg-subtle"
                  style={{ letterSpacing: "0.25em" }}
                >
                  {cohort.heroStat.label}
                </dt>
                <dd
                  className="font-black text-brand-pink text-4xl sm:text-5xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {cohort.heroStat.numerator}
                  <span className="text-fg-muted">
                    /{cohort.heroStat.denominator}
                  </span>
                </dd>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <dt
                className="text-xs uppercase text-fg-subtle"
                style={{ letterSpacing: "0.25em" }}
              >
                강사진
              </dt>
              <dd
                className="font-black text-fg text-4xl sm:text-5xl"
                style={{ letterSpacing: "-0.04em" }}
              >
                {instructors.length}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {instructors.length > 0 && (
        <section className="border-b border-border bg-surface px-6 py-20 sm:px-10 sm:py-24">
          <div className="mx-auto w-full max-w-[1280px]">
            <h2
              className="mb-10 font-black text-fg text-display-sm"
              style={{ letterSpacing: "-0.04em" }}
            >
              강사진
            </h2>
            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {instructors.map((ins) => (
                <li
                  key={ins.name}
                  className="flex flex-col items-center gap-3 rounded-xl border border-border bg-bg p-6"
                >
                  <div
                    aria-hidden
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-purple text-fg font-black"
                    style={{ letterSpacing: "-0.04em" }}
                  >
                    {ins.name.slice(0, 2)}
                  </div>
                  <p className="font-bold text-fg text-center">{ins.name}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px]">
          <h2
            className="mb-10 font-black text-fg text-display-sm"
            style={{ letterSpacing: "-0.04em" }}
          >
            이 기수 수료생 스토리
          </h2>
          <StoryGrid stories={stories} />
        </div>
      </section>

      <section className="border-t border-border bg-surface px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] text-center">
          <p className="mb-6 text-fg-muted sm:text-lg">
            다음 기수 신청을 원하시나요?
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
