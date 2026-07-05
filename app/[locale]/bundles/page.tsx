/**
 * `/bundles`. 올인원 번들 리스트.
 *
 * B0083 Phase 1 Slice 3. Luna.
 */
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/src/i18n/routing";
import { fetchBundlesForShowcase } from "@/src/programs/growth-career/application/queries/showcase/fetch-bundles-for-showcase";
import { BundleGrid } from "@/src/programs/growth-career/presentation/components/showcase";

export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "올인원 번들",
    description: "여러 코스를 묶어 할인가로 제공되는 번들.",
  };
}

function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

export default async function BundlesList({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const prefix = localePrefix(locale);
  const bundles = await fetchBundlesForShowcase({
    programSlug: "fan-to-pro",
    detailHrefFn: (slug) => `${prefix}/bundles/${slug}`,
  });

  return (
    <main className="bg-bg text-fg min-h-screen">
      <section className="border-b border-border px-6 py-24 sm:px-10 sm:py-32">
        <div className="mx-auto w-full max-w-[1280px]">
          <p
            className="mb-6 text-xs uppercase text-fg-subtle sm:text-sm"
            style={{ letterSpacing: "0.4em" }}
          >
            BUNDLES
          </p>
          <h1
            className="font-black text-fg text-display-md sm:text-display-lg"
            style={{ letterSpacing: "-0.04em" }}
          >
            올인원 번들
          </h1>
          <p className="mt-6 max-w-2xl text-fg-muted sm:text-lg">
            여러 코스를 묶어 할인된 금액으로 수강하세요.
          </p>
        </div>
      </section>

      <section className="px-6 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto w-full max-w-[1280px]">
          <BundleGrid bundles={bundles} />
        </div>
      </section>
    </main>
  );
}
