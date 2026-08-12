/**
 * `/insight/[slug]` — 인사이트 상세 (Medium/Wanted형 아티클).
 *
 * Slice C. Luna.
 *
 * content/insights/{slug}.mdx frontmatter + body 를 렌더.
 * generateStaticParams 로 MDX slug 사전 렌더.
 * 레이아웃: 카테고리 chip → 큰 제목(h1) → 요약(리드) → 본문(가독폭 ~68ch) →
 *   출처 링크 블록 → 날짜 디스클레이머.
 * 라이트 GC 디자인 시스템. 색인 허용 (존재하는 아티클만).
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import {
  getAllInsightSlugs,
  getInsightBySlug,
} from "@/src/programs/growth-career/infrastructure/content/insight-loader";
import { ArticleBody } from "@/src/programs/growth-career/presentation/components/insight/article-body";
import { ArticleFooter } from "@/src/programs/growth-career/presentation/components/insight/article-footer";
import { InsightChrome } from "@/src/programs/growth-career/presentation/components/insight/insight-chrome";
import { InsightJsonLd } from "@/src/programs/growth-career/presentation/components/insight/insight-jsonld";

export const revalidate = 3600;

const SITE_URL = "https://growthcareer.xyz";

type Params = { locale: string; slug: string };

/** frontmatter.updatedAt("2026-08" 형태 YYYY-MM) 를 ISO date 로. day 없으면 1일 고정. */
function toIsoDate(updatedAt: string): string {
  if (/^\d{4}-\d{2}$/.test(updatedAt)) return `${updatedAt}-01`;
  return updatedAt;
}

/** thumbnail public 경로를 절대 URL 로. */
function absoluteAsset(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function generateStaticParams() {
  // locale 은 상위 layout 의 generateStaticParams 와 곱해짐.
  // 여기선 slug 만 (locale 무관하게 존재하는 전체 slug set).
  const seen = new Set<string>();
  const params: { slug: string }[] = [];
  for (const { slug } of getAllInsightSlugs()) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    params.push({ slug });
  }
  return params;
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";
  const loaded = getInsightBySlug({ locale: localeTyped, slug });
  if (!loaded) {
    // 존재하지 않는 slug = 색인 제외 (실재 아티클만 색인). 정상 아티클은 색인 허용.
    return { title: "인사이트", robots: { index: false, follow: false } };
  }

  const { frontmatter } = loaded;
  // en = defaultLocale (prefix 없음), ko = "/ko" prefix. routing 과 일치시킴.
  const canonicalPath = `${localePrefix(locale)}/insight/${slug}`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const ogLocale = localeTyped === "ko" ? "ko_KR" : "en_US";
  const brandSuffix = localeTyped === "ko"
    ? "Growth Career 인사이트"
    : "Growth Career Insights";
  const isoDate = toIsoDate(frontmatter.updatedAt);
  const ogImages = frontmatter.thumbnail
    ? [absoluteAsset(frontmatter.thumbnail)]
    : undefined;

  return {
    // absolute 로 layout template("%s | Growth Career") 우회 — 브랜드 이중 접미 방지.
    title: { absolute: `${frontmatter.title} | ${brandSuffix}` },
    description: frontmatter.summary,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: `/insight/${slug}`,
        ko: `/ko/insight/${slug}`,
        "x-default": `/insight/${slug}`,
      },
    },
    openGraph: {
      type: "article",
      locale: ogLocale,
      url: canonicalUrl,
      siteName: "Growth Career",
      title: frontmatter.title,
      description: frontmatter.summary,
      images: ogImages,
      publishedTime: isoDate,
      modifiedTime: isoDate,
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.summary,
      images: ogImages,
    },
  };
}

export default async function InsightDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";
  const loaded = getInsightBySlug({ locale: localeTyped, slug });
  if (!loaded) notFound();

  const { frontmatter, body } = loaded;
  const canonicalUrl = `${SITE_URL}${prefix}/insight/${slug}`;

  return (
    <InsightChrome prefix={prefix}>
      <InsightJsonLd frontmatter={frontmatter} articleUrl={canonicalUrl} />
      <article className="mx-auto w-full max-w-[720px] px-5 pt-14 pb-24 md:px-8 md:pt-20">
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
          {/* 뒤로 */}
          <a
            href={`${prefix}/insight`}
            className="group flex w-fit items-center gap-1.5 text-[#8B95A1] text-sm transition-colors duration-150 hover:text-brand-pink"
          >
            <span aria-hidden className="transition-transform duration-150 group-hover:-translate-x-0.5">
              ←
            </span>
            {localeTyped === "en" ? "All insights" : "인사이트 전체"}
          </a>

          {/* 카테고리 chip */}
          <span className="mt-6 inline-flex w-fit items-center rounded-full bg-brand-pink/10 px-3 py-1 font-bold text-brand-pink text-sm">
            {frontmatter.category}
          </span>

          {/* 제목 */}
          <h1 className="mt-4 text-balance break-keep font-black text-[#191F28] text-[32px] leading-[1.25] tracking-[-0.02em] sm:text-[40px]">
            {frontmatter.title}
          </h1>

          {/* 리드 요약 */}
          <p className="mt-6 break-keep text-[#4E5968] text-lg leading-relaxed sm:text-xl">
            {frontmatter.summary}
          </p>

          {/* 히어로 이미지 */}
          {frontmatter.thumbnail ? (
            <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#F2F4F6]">
              <Image
                src={frontmatter.thumbnail}
                alt=""
                fill
                priority
                sizes="(min-width: 720px) 720px, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
        </div>

        <hr className="mt-10 border-[#EDEFF2]" />

        {/* 본문 */}
        <div className="mt-10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-safe:[animation-delay:120ms]">
          <ArticleBody body={body} />
        </div>

        {/* 출처 + 디스클레이머 */}
        <ArticleFooter
          sources={frontmatter.sources}
          updatedAt={frontmatter.updatedAt}
          locale={localeTyped}
        />
      </article>
    </InsightChrome>
  );
}
