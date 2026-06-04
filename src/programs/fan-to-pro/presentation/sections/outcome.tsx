import Image from "next/image";
import { useTranslations } from "next-intl";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type GalleryItem = { src: string; caption: string };

export function Outcome() {
  const t = useTranslations("outcome");
  const items = t.raw("items") as string[];
  const gallery = t.raw("gallery") as GalleryItem[];

  return (
    <Section tone="bg">
      <Container>
        <Eyebrow n="04">{t("eyebrow")}</Eyebrow>

        <h2
          className="mb-12 max-w-4xl font-black text-display-lg"
          style={{
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            textWrap: "balance",
          }}
        >
          {t("headlineLine1")}
          <br />
          <span className="text-brand-pink">{t("headlineEmphasis")}</span>
        </h2>

        <ul
          className="mb-16 grid max-w-5xl gap-4 md:gap-6"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          }}
        >
          {items.map((r) => (
            <li
              key={r}
              className="flex items-start gap-3 border-l-2 border-brand-pink bg-surface px-5 py-4 text-base text-fg/90 sm:text-lg"
            >
              <span aria-hidden className="mt-0.5 font-black text-brand-pink">
                ✓
              </span>
              <span className="max-w-prose">{r}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {gallery.map((g) => (
            <figure
              key={g.src}
              className="relative aspect-[4/3] overflow-hidden bg-surface"
            >
              <Image
                src={g.src}
                alt={g.caption}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover grayscale-[20%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-transparent" />
              <figcaption
                className="absolute bottom-3 left-3 text-fg text-xs font-bold uppercase sm:text-sm"
                style={{ letterSpacing: "0.2em" }}
              >
                {g.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <p
          className="mt-6 max-w-prose text-fg-subtle text-xs"
          style={{ letterSpacing: "0.1em" }}
        >
          {t("disclaimer")}
        </p>
      </Container>
    </Section>
  );
}
