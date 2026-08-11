/**
 * `/press` — Press Room (보도자료 리스트).
 *
 * Slice D. Luna.
 *
 * PEOPLEGATE 등 외부 매체 기사 모음. 공유 도메인 PRESS_ARTICLES 단일 소스.
 * 라이트 GC 디자인 시스템 (gc-preview 와 동일 크롬). 프리뷰 단계 = noindex.
 * 카드 클릭 = 외부 기사 새 탭. globals.css 안 건드림 (1기 동결).
 * 컬러 그라데이션 X, 글로우 X (§6.8). 딤은 단색 alpha 만.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import {
  PRESS_ARTICLES,
  pressDesc,
  pressTitle,
} from "@/src/programs/growth-career/domain/press";
import { gcFooterNav, gcNavAfter, gcNavBefore } from "@/src/programs/growth-career/presentation/gc-nav";
import { CommunityGate } from "@/app/[locale]/gc-preview/community-gate";
import gc from "@/app/[locale]/gc-preview/gc.module.css";
import { SiteFooter } from "@/src/shared/navigation/site-footer";
import { SiteHeader } from "@/src/shared/navigation/site-header";
import { GcWordmark } from "@/src/shared/navigation/gc-wordmark";
import { GcHeaderCta } from "@/src/shared/navigation/gc-header-cta";
import { Card } from "@/src/shared/ui/card";
import { SectionHeader } from "@/src/shared/ui/section-header";

type Params = { locale: string };

const WRAP = "mx-auto w-full max-w-[1160px] px-5 md:px-8";
const HEAD = { letterSpacing: "-0.02em", lineHeight: 1.24 } as const;

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Press Room (프리뷰)",
    description:
      "Growth Career 와 Fan to Pro 를 다룬 언론 보도 모음입니다.",
    robots: { index: false, follow: false },
  };
}

export default async function PressRoomPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const isKo = locale === "ko";

  return (
    <>
      <SiteHeader
        brand={<GcWordmark variant="light-clean" href={`${prefix}/gc-preview`} />}
        menu={[
          ...gcNavBefore(prefix),
          { label: "커뮤니티", node: <CommunityGate /> },
          ...gcNavAfter(prefix),
        ]}
        actions={<GcHeaderCta prefix={prefix} />}
      />

      <main className="min-h-screen break-keep bg-white text-[#191F28]">
        <section className={`${WRAP} pt-14 pb-10 sm:pt-20`}>
          <div className={gc.reveal}>
            <SectionHeader
              label="Press Room"
              title={
                isKo ? (
                  <>
                    언론이 <span className="text-brand-pink">주목했습니다</span>
                  </>
                ) : (
                  <>
                    The press <span className="text-brand-pink">took notice</span>
                  </>
                )
              }
              description={
                isKo
                  ? "Growth Career 와 Fan to Pro 를 다룬 외부 매체 보도입니다. 카드를 누르면 기사 원문으로 이동합니다."
                  : "Coverage of Growth Career and Fan to Pro from external outlets. Tap a card to read the full article."
              }
            />
          </div>
        </section>

        <section className={`${WRAP} pb-24`}>
          <div className="flex flex-col gap-4">
            {PRESS_ARTICLES.map((a, idx) => (
              <a
                key={a.url}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className={gc.reveal}
                style={{ animationDelay: `${0.06 + idx * 0.07}s` }}
              >
                <Card variant="clean" className="group flex flex-col overflow-hidden sm:flex-row">
                  {/* 16:9 썸네일. Supabase 원격은 next.config 미설정이라 plain img. */}
                  <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-64 md:w-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.thumb}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>

                  <div className="flex flex-1 flex-col p-6 sm:p-7">
                    <p className="font-bold text-[#8B95A1] text-sm">
                      {a.outlet} / {a.date}
                    </p>
                    <h3
                      className="mt-2 text-pretty font-black text-[#191F28] text-[19px] leading-snug sm:text-[22px]"
                      style={HEAD}
                    >
                      {pressTitle(a, locale)}
                    </h3>
                    <p className="mt-3 line-clamp-2 text-[#4E5968] text-sm leading-relaxed sm:text-base">
                      {pressDesc(a, locale)}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 font-bold text-[15px] text-brand-pink transition-transform duration-150 group-hover:translate-x-0.5">
                      {isKo ? "기사 보기" : "Read article"} <span aria-hidden>→</span>
                    </span>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter nav={gcFooterNav(prefix)} />
    </>
  );
}
