/**
 * `/stories`. 수료생 스토리 아카이브.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * 스토리 상세 페이지는 별도 슬라이스 (mdx 렌더러 필요). 스코프 밖.
 * 지금은 리스트만.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchStoriesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-stories-for-showcase";
import { StoryGrid } from "@/src/programs/growth-career/presentation/components/showcase";

export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "수료생 스토리",
    description: "Fan to Pro 수료생들이 다음 커리어로 이동한 여정.",
  };
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export default async function StoriesArchive({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";

  const stories = fetchStoriesForShowcase({
    locale: localeTyped,
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
            STORIES
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            수료생 스토리
          </h1>
          <p className="mt-6 max-w-2xl text-fg-muted sm:text-lg">
            수료생들이 어떤 여정을 거쳐 K-pop 산업의 다음 자리로 이동했는지.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px]">
          <StoryGrid stories={stories} />
        </div>
      </section>
    </main>
  );
}
