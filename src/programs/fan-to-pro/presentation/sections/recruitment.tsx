import { useTranslations } from "next-intl";
import { ENROLLMENT_CAP } from "@/src/programs/fan-to-pro/domain/marketing/program-config";
import { Chip } from "../ui/chip";
import { Container } from "../ui/container";
import { Eyebrow } from "../ui/eyebrow";
import { Section } from "../ui/section";

type Qualification = {
  title: string;
  body: string;
  chips: string[];
};

export function Recruitment() {
  const t = useTranslations("recruitment");
  const items = t.raw("items") as Qualification[];

  return (
    <Section id="recruitment" tone="violet" trackingName="Recruitment" trackingOrder={12}>
      <Container>
        <Eyebrow n="11">{t("eyebrow")}</Eyebrow>

        <div className="mb-12 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1.6fr_1fr]">
          <h2
            className="max-w-3xl font-black text-display-lg"
            style={{
              lineHeight: 1.05,
              letterSpacing: "-0.04em",
              textWrap: "balance",
            }}
          >
            {t("headlineLine1")}
            <br />
            {t("headlineLine2")}
            <br />
            <span className="text-black">{t("headlineLine3")}</span>
          </h2>

          <p
            className="max-w-prose text-base leading-relaxed text-fg/90 sm:text-lg"
            style={{ textWrap: "pretty" }}
          >
            {t("intro1")}{" "}
            <span className="font-black text-fg">
              {t("introEmphasis")}
            </span>{" "}
            {t("intro2")}
          </p>
        </div>

        <ol className="border border-border bg-bg">
          {items.map((q, i) => (
            <li
              key={q.title}
              className="grid grid-cols-[auto_1fr] gap-6 border-border border-b p-6 last:border-b-0 sm:grid-cols-[140px_1fr_auto] sm:gap-10 sm:p-10"
            >
              {/* Required + number */}
              <div className="flex flex-col gap-2 border-l-2 border-brand-pink pl-4 sm:border-l-4 sm:pl-5">
                <span
                  className="text-brand-pink text-[10px] font-black uppercase sm:text-xs whitespace-nowrap"
                  style={{ letterSpacing: "0.3em" }}
                >
                  {t("requiredLabel")}
                </span>
                <span
                  className="font-black text-fg text-5xl leading-none sm:text-6xl"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title + body */}
              <div className="flex flex-col gap-3">
                <h3
                  className="font-black text-2xl text-fg sm:text-3xl"
                  style={{
                    letterSpacing: "-0.03em",
                    textWrap: "balance",
                  }}
                >
                  {q.title}
                </h3>
                <p className="max-w-xl text-base leading-relaxed text-fg-muted">
                  {q.body}
                </p>
                {/* Chips — mobile only (below body) */}
                <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                  {q.chips.map((c) => (
                    <Chip key={c} variant="accent" size="md">
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              {/* Chips — desktop only (right column) */}
              <div className="hidden flex-col items-end gap-2 sm:flex">
                {q.chips.map((c) => (
                  <Chip key={c} variant="accent" size="md">
                    {c}
                  </Chip>
                ))}
              </div>
            </li>
          ))}
        </ol>

        {/* Schedule strip */}
        <div className="mt-8 grid grid-cols-1 gap-px border border-fg/20 bg-fg/20 sm:grid-cols-3">
          <ScheduleCell
            label={t("schedule.firstSessionLabel")}
            value={t("schedule.firstSessionValue")}
            sub={t("schedule.durationValue")}
          />
          <ScheduleCell
            label={t("schedule.locationLabel")}
            value={t("schedule.locationValue")}
            sub={t("schedule.locationSub")}
          />
          <ScheduleCell
            label={t("schedule.cutoffLabel")}
            value={t("schedule.cutoffValue")}
            sub={t("schedule.cutoffSubTemplate", {
              min: ENROLLMENT_CAP.minToProceed,
            })}
            accent
          />
        </div>

        {/* Capacity strip */}
        <div className="mt-px flex flex-col gap-6 border border-fg/20 bg-bg p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-10">
          <div className="flex flex-col gap-2">
            <span
              className="text-fg-subtle text-[10px] font-black uppercase"
              style={{ letterSpacing: "0.3em" }}
            >
              {t("capacity.eyebrow")}
            </span>
            <p
              className="font-black text-fg text-3xl sm:text-4xl"
              style={{
                letterSpacing: "-0.03em",
                textWrap: "balance",
              }}
            >
              {t("capacity.lineTemplateA")}{" "}
              <span className="text-brand-pink whitespace-nowrap">
                {ENROLLMENT_CAP.totalSeats}
              </span>{" "}
              {t("capacity.lineTemplateB")}
            </p>
          </div>

          <p className="max-w-md text-sm leading-relaxed text-fg-muted sm:text-base">
            {t("capacity.noteTemplate", {
              cutoff: t("schedule.cutoffValue"),
              min: ENROLLMENT_CAP.minToProceed,
            })}
          </p>
        </div>
      </Container>
    </Section>
  );
}

function ScheduleCell({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 bg-bg p-6 sm:p-8">
      <span
        className="text-fg-subtle text-[10px] font-black uppercase sm:text-xs"
        style={{ letterSpacing: "0.3em" }}
      >
        {label}
      </span>
      <p
        className={`font-black text-xl leading-tight sm:text-2xl ${
          accent ? "text-brand-pink" : "text-fg"
        }`}
        style={{
          letterSpacing: "-0.03em",
          textWrap: "balance",
        }}
      >
        {value}
      </p>
      {sub ? (
        <p className="text-fg-muted text-xs leading-relaxed sm:text-sm">{sub}</p>
      ) : null}
    </div>
  );
}
