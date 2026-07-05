/**
 * `/bundles/[slug]`. 올인원 번들 상세.
 *
 * B0083 Phase 1 Slice 3. Luna.
 *
 * 신청 CTA: /fan-to-pro#apply?bundle=<slug> (Option A).
 *
 * SSG: generateStaticParams. ISR 1h.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchBundlesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-bundles-for-showcase";
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
    const bundles = await fetchBundlesForShowcase({
      programSlug: "fan-to-pro",
      detailHrefFn: (s) => `${prefix}/bundles/${s}`,
    });
    for (const b of bundles) {
      out.push({ locale, slug: b.slug });
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
  const bundles = await fetchBundlesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (s) => `${prefix}/bundles/${s}`,
  });
  const bundle = bundles.find((b) => b.slug === slug);
  if (!bundle) return { title: "번들 없음" };
  return {
    title: bundle.name,
    description: bundle.description ?? "올인원 번들 상세.",
  };
}

export default async function BundleDetail({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const bundles = await fetchBundlesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (s) => `${prefix}/bundles/${s}`,
  });

  const bundle = bundles.find((b) => b.slug === slug);
  if (!bundle) notFound();

  const applyHref = `${prefix}/fan-to-pro#apply?bundle=${bundle.slug}`;
  const hasOriginal =
    bundle.originalPriceKrw !== null &&
    bundle.priceKrw !== null &&
    bundle.originalPriceKrw > bundle.priceKrw;

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-brand-pink sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            BUNDLE
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            {bundle.name}
          </h1>
          {bundle.description && (
            <p className="mt-8 max-w-3xl text-fg-muted text-lg sm:text-xl leading-relaxed">
              {bundle.description}
            </p>
          )}
        </div>
      </section>

      <section className="border-b border-border bg-surface px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <p
                className="mb-4 text-xs uppercase text-fg-subtle"
                style={{ letterSpacing: "0.4em" }}
              >
                구성
              </p>
              <p className="font-black text-fg text-5xl" style={{ letterSpacing: "-0.04em" }}>
                {bundle.courseCount}
                <span className="text-fg-muted text-3xl">개 코스</span>
              </p>
            </div>
            <div>
              <p
                className="mb-4 text-xs uppercase text-fg-subtle"
                style={{ letterSpacing: "0.4em" }}
              >
                가격
              </p>
              {hasOriginal && bundle.originalPriceKrw !== null && (
                <p className="text-fg-subtle line-through">
                  정상 {formatKrw(bundle.originalPriceKrw)}
                </p>
              )}
              <p
                className="font-black text-fg text-5xl"
                style={{ letterSpacing: "-0.04em" }}
              >
                {formatKrw(bundle.priceKrw)}
              </p>
              {bundle.discountKrw !== null &&
                bundle.discountKrw !== undefined &&
                bundle.discountKrw > 0 && (
                  <p className="mt-2 font-bold text-brand-pink">
                    {formatKrw(bundle.discountKrw)} 할인
                  </p>
                )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px] text-center">
          <h2
            className="mb-6 font-black text-fg text-display-sm"
            style={{ letterSpacing: "-0.04em" }}
          >
            올인원으로 신청하기.
          </h2>
          <p className="mb-10 text-fg-muted sm:text-lg">
            신청 폼에서 이 번들이 자동 선택됩니다.
          </p>
          <a
            href={applyHref}
            className="inline-flex items-center justify-center bg-brand-pink text-fg font-black px-10 py-5 text-lg hover:bg-brand-purple transition-colors"
            style={{ letterSpacing: "-0.02em" }}
          >
            올인원 신청
          </a>
        </div>
      </section>
    </main>
  );
}
