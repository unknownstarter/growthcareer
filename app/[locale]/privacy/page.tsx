import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

const EFFECTIVE = "2026-04-29";

type Params = { locale: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "meta.privacy" });
  const canonical =
    locale === routing.defaultLocale ? "/privacy" : `/${locale}/privacy`;
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: {
        en: "/privacy",
        ko: "/ko/privacy",
        "x-default": "/privacy",
      },
    },
  };
}

type SubSection = {
  heading: string;
  items: string[];
};

type SectionData = {
  n: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  subSections?: SubSection[];
  tableHeaders?: string[];
  tableRows?: string[][];
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <PrivacyContent />;
}

function PrivacyContent() {
  const t = useTranslations("privacy");
  // `raw` returns the underlying JSON structure so we can iterate sections.
  const sections = t.raw("sections") as SectionData[];
  const eyebrow = t("eyebrow");
  const title = t("title");
  const effectiveLabel = t("effectiveLabelTemplate", { date: EFFECTIVE });
  const backLabel = t("backToProgram");
  const linkToTerms = t("linkToTerms");

  return (
    <main className="bg-bg text-fg">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <p
          className="text-fg-subtle text-xs uppercase mb-4"
          style={{ letterSpacing: "0.3em" }}
        >
          {eyebrow}
        </p>
        <h1
          className="mb-4 font-black text-4xl sm:text-5xl"
          style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
        >
          {title}
        </h1>
        <p className="mb-12 text-fg-muted text-sm">{effectiveLabel}</p>

        <div className="space-y-12 text-fg-muted leading-relaxed">
          {sections.map((section) => (
            <Section key={section.n} n={section.n} title={section.title}>
              {section.paragraphs?.map((p, i) => (
                <p key={`p-${i}`}>{p}</p>
              ))}

              {section.subSections?.map((sub) => (
                <div key={sub.heading}>
                  <SubHeading>{sub.heading}</SubHeading>
                  <ul className="list-disc pl-6 space-y-1">
                    {sub.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}

              {section.items?.length ? (
                <ul className="list-disc pl-6 space-y-1">
                  {section.items.map((it) => (
                    <li key={it}>{it}</li>
                  ))}
                </ul>
              ) : null}

              {section.tableHeaders && section.tableRows ? (
                <table className="w-full border-collapse border border-border text-sm mt-4">
                  <thead className="bg-surface">
                    <tr>
                      {section.tableHeaders.map((h) => (
                        <th
                          key={h}
                          className="border border-border p-3 text-left font-black"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.tableRows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="border border-border p-3"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </Section>
          ))}
        </div>

        <div className="mt-16 border-t border-border pt-8 text-sm flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href="/fan-to-pro"
            className="text-brand-pink hover:underline"
          >
            {backLabel}
          </Link>
          <span className="text-fg-subtle" aria-hidden>
            /
          </span>
          <Link href="/terms" className="text-fg-muted hover:text-brand-pink">
            {linkToTerms}
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8 first:border-0 first:pt-0">
      <div className="mb-6 flex items-baseline gap-4">
        <span
          className="font-black text-brand-pink text-2xl"
          style={{ letterSpacing: "-0.04em" }}
        >
          {n}
        </span>
        <h2
          className="font-black text-fg text-xl sm:text-2xl"
          style={{ letterSpacing: "-0.03em" }}
        >
          {title}
        </h2>
      </div>
      <div className="space-y-4 text-base">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-3 font-black text-fg text-base">{children}</h3>
  );
}
