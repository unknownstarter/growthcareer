/**
 * `/courses/[slug]`. 단과 코스 상세.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * 데이터 소스: fetchCoursesForShowcase (전체) → slug 매칭.
 * 신청 CTA: /fan-to-pro#apply?course=<slug> (Option A, 노아 승인).
 *   Iris Slice 2c 후속: apply-form 이 defaultCourseSlug 를 읽음.
 *
 * SSG: generateStaticParams (모든 open course 사전 렌더).
 * ISR 1h.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchCoursesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-courses-for-showcase";
import { formatKrw } from "@/src/programs/growth-career/presentation/components/showcase/format";

export const revalidate = 3600;

type Params = { locale: string; slug: string };

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export async function generateStaticParams(): Promise<
  { locale: string; slug: string }[]
> {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const prefix = localePrefix(locale);
    const { courses } = await fetchCoursesForShowcase({
      programSlug: "fan-to-pro",
      detailHrefFn: (slug) => `${prefix}/courses/${slug}`,
    });
    for (const c of courses) {
      out.push({ locale, slug: c.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const prefix = localePrefix(locale);
  const { courses } = await fetchCoursesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (s) => `${prefix}/courses/${s}`,
  });
  const course = courses.find((c) => c.slug === slug);
  if (!course) return { title: "코스 없음" };
  return {
    title: course.name,
    description: course.description ?? "단과 코스 상세.",
  };
}

export default async function CourseDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const { courses, instructorsBySlug } = await fetchCoursesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (s) => `${prefix}/courses/${s}`,
  });

  const course = courses.find((c) => c.slug === slug);
  if (!course) notFound();

  const instructor = instructorsBySlug[course.slug];
  // URL 표준: query 는 fragment 앞에 옴 (?course=...#apply).
  // #apply?course=... 는 fragment 전체로 취급돼 서버 searchParams 로 안 들어옴.
  const applyHref = `${prefix}/fan-to-pro?course=${course.slug}#apply`;

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-brand-pink sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            COURSE
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            {course.name}
          </h1>
          {course.description && (
            <p className="mt-8 max-w-3xl text-fg-muted text-lg sm:text-xl leading-relaxed">
              {course.description}
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-border bg-surface px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto w-full max-w-[1280px]">
          <dl className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {course.sessionCount !== null && course.sessionCount !== undefined && (
              <div className="flex flex-col gap-2">
                <dt
                  className="text-xs uppercase text-fg-subtle"
                  style={{ letterSpacing: "0.25em" }}
                >
                  세션 수
                </dt>
                <dd
                  className="font-black text-fg text-4xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {course.sessionCount}회
                </dd>
              </div>
            )}
            {course.durationLabel && (
              <div className="flex flex-col gap-2">
                <dt
                  className="text-xs uppercase text-fg-subtle"
                  style={{ letterSpacing: "0.25em" }}
                >
                  기간
                </dt>
                <dd
                  className="font-black text-fg text-4xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {course.durationLabel}
                </dd>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <dt
                className="text-xs uppercase text-fg-subtle"
                style={{ letterSpacing: "0.25em" }}
              >
                가격
              </dt>
              <dd
                className="font-black text-fg text-4xl"
                style={{ letterSpacing: "-0.04em" }}
              >
                {formatKrw(course.priceKrw)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {instructor && (
        <section className="border-b border-border px-6 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto w-full max-w-[1280px]">
            <p
              className="mb-4 text-xs uppercase text-fg-subtle"
              style={{ letterSpacing: "0.4em" }}
            >
              INSTRUCTOR
            </p>
            <div className="flex items-center gap-6">
              <div
                aria-hidden
                className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-purple text-fg font-black text-xl"
                style={{ letterSpacing: "-0.04em" }}
              >
                {instructor.name.slice(0, 2)}
              </div>
              <div>
                <p
                  className="font-black text-fg text-2xl"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {instructor.name}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-surface px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] text-center">
          <h2
            className="mb-6 font-black text-fg text-display-sm"
            style={{ letterSpacing: "-0.04em" }}
          >
            지금 신청하세요.
          </h2>
          <p className="mb-10 text-fg-muted sm:text-lg">
            신청 폼에서 이 코스가 자동 선택됩니다.
          </p>
          <a
            href={applyHref}
            className="inline-flex items-center justify-center bg-brand-pink text-fg font-black px-10 py-5 text-lg hover:bg-brand-purple transition-colors"
            style={{ letterSpacing: "-0.02em" }}
          >
            신청하기
          </a>
        </div>
      </section>
    </main>
  );
}
