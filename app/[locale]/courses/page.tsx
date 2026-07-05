/**
 * `/courses`. 단과 코스 리스트.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * Server Component + ISR 1h.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchCoursesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-courses-for-showcase";
import { CourseGrid } from "@/src/programs/growth-career/presentation/components/showcase";

export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "단과 코스",
    description: "개별 도메인만 골라 듣는 단과 옵션.",
  };
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export default async function CoursesList({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const { courses, instructorsBySlug } = await fetchCoursesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (slug) => `${prefix}/courses/${slug}`,
  });

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-fg-subtle sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            COURSES
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            단과 코스
          </h1>
          <p className="mt-6 max-w-2xl text-fg-muted sm:text-lg">
            원하는 도메인만 골라 수강하세요. 회당 완결형 세션.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px]">
          <CourseGrid courses={courses} instructorsBySlug={instructorsBySlug} />
        </div>
      </section>
    </main>
  );
}
