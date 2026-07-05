/**
 * `/cohorts`. 기수 아카이브.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * Server Component + ISR 1h. 다크 톤. 그라데이션 X.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchCohortsForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-cohorts-for-showcase";
import { CohortShowcaseGrid } from "@/src/programs/growth-career/presentation/components/showcase";

export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "기수 아카이브",
    description: "역대 기수의 커리큘럼, 강사진, 수료 결과.",
  };
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export default async function CohortsArchive({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const { cohorts, instructorsByCohortSlug } = await fetchCohortsForShowcase({
    variant: "archive",
    detailHrefFn: (slug) => `${prefix}/cohorts/${slug}`,
  });

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-fg-subtle sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            COHORTS
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            기수 아카이브
          </h1>
          <p className="mt-6 max-w-2xl text-fg-muted sm:text-lg">
            각 기수의 강사진과 수료생 여정을 확인하세요.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px]">
          <CohortShowcaseGrid
            cohorts={cohorts}
            variant="archive"
            instructorsByCohortSlug={instructorsByCohortSlug}
          />
        </div>
      </section>
    </main>
  );
}
