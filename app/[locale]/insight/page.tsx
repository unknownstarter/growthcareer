/**
 * `/insight` — 인사이트 리스트.
 *
 * Slice C. Luna.
 *
 * 재한 외국인 생활 정보 아티클 모음. content/insights/*.mdx frontmatter 로 렌더.
 * /stories 리스트 파이프라인 미러링 (fs frontmatter 로더 → grid).
 * 라이트 GC 디자인 시스템 (gc-preview 와 동일 크롬). 프리뷰 단계 = noindex.
 * globals.css 안 건드림 (1기 동결).
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { getAllInsights } from "@/src/programs/growth-career/infrastructure/content/insight-loader";
import { InsightChrome } from "@/src/programs/growth-career/presentation/components/insight/insight-chrome";
import { SectionHeader } from "@/src/shared/ui/section-header";

export const revalidate = 3600;

const SITE_URL = "https://growthcareer.xyz";

type Params = { locale: string };

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";
  const canonicalPath = `${localePrefix(locale)}/insight`;
  const ogLocale = localeTyped === "ko" ? "ko_KR" : "en_US";

  // 짧은 라벨 — layout template("%s | Growth Career") 이 브랜드를 자동 append.
  const title = localeTyped === "ko" ? "인사이트" : "Insights";
  // OG/twitter 는 template 미적용이라 브랜드를 직접 포함.
  const ogTitle = localeTyped === "ko"
    ? "인사이트 | Growth Career"
    : "Insights | Growth Career";
  const description = localeTyped === "ko"
    ? "재한 외국인을 위한 한국 생활 정보. 비자, TOPIK, 한국어, 금융, 취업, 생활을 공식 자료로만 정리했습니다."
    : "Living-in-Korea guides for international residents. Visa, TOPIK, Korean, banking, jobs, and daily life sourced only from official materials.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: "/insight",
        ko: "/ko/insight",
        "x-default": "/insight",
      },
    },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: `${SITE_URL}${canonicalPath}`,
      siteName: "Growth Career",
      title: ogTitle,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function InsightList({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const localeTyped: "ko" | "en" = locale === "ko" ? "ko" : "en";
  const isKo = localeTyped === "ko";
  const insights = getAllInsights({ locale: localeTyped });

  return (
    <InsightChrome prefix={prefix}>
      {/* Hero */}
      <section className={`${WRAP} pt-16 pb-10 sm:pt-20`}>
        <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">
          <SectionHeader
            label={isKo ? "인사이트" : "Insights"}
            title={
              isKo ? (
                <>
                  한국 생활, 막막하지 않게 <span className="text-brand-pink">공식 자료</span>로만
                </>
              ) : (
                <>
                  Life in Korea, made clear with <span className="text-brand-pink">official sources</span>
                </>
              )
            }
            description={
              isKo
                ? "비자, TOPIK, 한국어, 금융, 취업, 생활. 출입국과 국립국제교육원, 금융감독원 등 공식 기관 자료만 담습니다. 확인되지 않은 정보는 싣지 않습니다."
                : "Visa, TOPIK, Korean, banking, jobs, and daily life. We only cover material from official bodies like immigration, the National Institute for International Education, and the Financial Supervisory Service. Nothing unverified goes in."
            }
          />
        </div>
      </section>

      {/* 카테고리 카드 그리드 */}
      <section className={`${WRAP} pb-24`}>
        {insights.length === 0 ? (
          <p className="rounded-2xl bg-fill-subtle px-6 py-16 text-center text-ink-faint">
            {isKo ? "준비된 아티클이 없습니다." : "No articles yet."}
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insights.map((a, index) => (
              <li
                key={a.slug}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <a
                  href={`${prefix}/insight/${a.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-white transition-colors duration-150 hover:border-hairline-mid hover:bg-fill-subtlest"
                >
                  {a.thumbnail ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-fill">
                      <Image
                        src={a.thumbnail}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 373px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <span className="inline-flex w-fit items-center rounded-full bg-brand-pink/10 px-3 py-1 font-bold text-brand-pink text-sm">
                      {a.category}
                    </span>
                    <h2 className="mt-4 font-black text-ink text-[20px] leading-snug tracking-[-0.01em]">
                      {a.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 flex-1 text-ink-subtle text-sm leading-relaxed">
                      {a.summary}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 font-bold text-brand-pink text-sm transition-transform duration-150 group-hover:translate-x-0.5">
                      {isKo ? "자세히 보기" : "Read more"} <span aria-hidden>→</span>
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </InsightChrome>
  );
}
