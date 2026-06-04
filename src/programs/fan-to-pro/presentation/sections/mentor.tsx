import Image from "next/image";
import { useTranslations } from "next-intl";
import { INSTRUCTORS } from "@/src/programs/fan-to-pro/domain/program";
import { Avatar } from "../ui/avatar";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

// The instructor domain stores days in Korean ("토요일"/"일요일") because the
// roster is authoritative in Korean. For display we look up the matching
// localized day string via `common.saturday/sunday`.
const DAY_KEY: Record<string, "saturday" | "sunday"> = {
  토요일: "saturday",
  일요일: "sunday",
};

export function Mentor() {
  const t = useTranslations("mentor");
  const tCommon = useTranslations("common");

  return (
    <Section id="mentor" tone="surface" trackingName="Mentor" trackingOrder={7}>
      <Container>
        <Eyebrow n="06">{t("eyebrow")}</Eyebrow>

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
          {t("headlineLine2")}
        </h2>

        <p className="mb-16 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">
          {t("intro")}
        </p>

        <div className="flex flex-col gap-6 lg:gap-8">
          {INSTRUCTORS.map((instructor) => (
            <article
              key={instructor.id}
              className="flex flex-col border border-border bg-bg transition-colors hover:border-brand-pink"
            >
              {/* Header: avatar + name + chips */}
              <div className="flex flex-col gap-6 border-border border-b p-8 sm:flex-row sm:items-center sm:gap-8 sm:p-10">
                <div className="shrink-0">
                  {instructor.photo ? (
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border border-border sm:h-28 sm:w-28">
                      <Image
                        src={instructor.photo}
                        alt={instructor.photoAlt}
                        fill
                        sizes="112px"
                        className="object-cover"
                        style={
                          instructor.photoPosition
                            ? { objectPosition: instructor.photoPosition }
                            : undefined
                        }
                      />
                    </div>
                  ) : (
                    <Avatar
                      initials={instructor.initials}
                      tint={instructor.tint}
                      size={112}
                    />
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip variant="accent">
                      {t("labels.instructorOfDay", {
                        day: tCommon(DAY_KEY[instructor.day] ?? "saturday"),
                      })}
                    </Chip>
                    {instructor.status === "pending" ? (
                      <Chip variant="default">
                        {t("labels.pendingChip")}
                      </Chip>
                    ) : null}
                  </div>

                  <div>
                    <p
                      className="font-black text-fg text-4xl sm:text-5xl"
                      style={{ letterSpacing: "-0.04em" }}
                    >
                      {instructor.name}
                    </p>
                    {instructor.nameSub ? (
                      <p
                        className="mt-1 font-bold text-base text-fg-muted"
                        style={{ letterSpacing: "0.05em" }}
                      >
                        {instructor.nameSub}
                      </p>
                    ) : null}
                  </div>

                  {instructor.affiliation.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {instructor.affiliation.map((a) => (
                        <Chip key={a} variant="default">
                          {a}
                        </Chip>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-8 p-8 sm:p-10">
                {/* One-liner */}
                <p
                  className="max-w-prose text-base leading-relaxed text-fg sm:text-lg"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {instructor.oneLiner}
                </p>

                {/* Curriculum */}
                {instructor.curriculum.length > 0 ? (
                  <div className="border-border border-t pt-6">
                    <p
                      className="mb-4 text-fg-subtle text-xs uppercase"
                      style={{ letterSpacing: "0.3em" }}
                    >
                      {t("labels.curriculumLabel")}
                    </p>
                    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {instructor.curriculum.map((c, i) => (
                        <li
                          key={c}
                          className="flex items-start gap-3 text-base text-fg"
                        >
                          <span
                            className="mt-1 font-black text-brand-pink text-sm whitespace-nowrap"
                            style={{ letterSpacing: "0.1em" }}
                          >
                            {t("labels.weekShort")}
                            {i + 1}
                          </span>
                          <span style={{ letterSpacing: "-0.01em" }}>{c}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {/* Career groups */}
                {instructor.careerGroups.length > 0 ? (
                  <div className="border-border border-t pt-6">
                    <p
                      className="mb-6 text-fg-subtle text-xs uppercase"
                      style={{ letterSpacing: "0.3em" }}
                    >
                      {t("labels.careerLabel")}
                    </p>
                    <div className="flex flex-col gap-6">
                      {instructor.careerGroups.map((g) => (
                        <div key={g.label}>
                          <p
                            className="mb-3 font-black text-brand-pink text-sm uppercase sm:text-base"
                            style={{ letterSpacing: "0.15em" }}
                          >
                            {g.label}
                          </p>
                          <ul className="flex flex-wrap gap-2">
                            {g.items.map((item) => (
                              <li key={item}>
                                <Chip variant="subtle">{item}</Chip>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
