import type { HeroUmbrellaStatsData } from "./types";
import { cn } from "@/src/programs/fan-to-pro/presentation/components/cn";

/**
 * 우산 랜딩 Hero. 지표 4개 + 다음 기수 CTA.
 *
 * Server Component (마감 상태 UI 는 Iris fetch layer 가 nextCohortCta.type
 * 을 결정. 이 컴포넌트는 렌더만).
 *
 * Luna B0083 UX spec §1 기반. 카운트업 애니메이션은 Slice 3 에서 추가.
 *
 * 다크 톤 tokens 만 사용. 그라데이션 X.
 */
export function HeroUmbrellaStats({ data }: { data: HeroUmbrellaStatsData }) {
  return (
    <section
      aria-labelledby="hero-umbrella-title"
      className="relative overflow-hidden bg-bg"
    >
      {data.backgroundImage.src && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            backgroundImage: `url(${data.backgroundImage.src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-bg/70"
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-24 sm:px-10 sm:py-32">
        <p
          className="mb-10 text-xs uppercase text-fg-subtle sm:text-sm"
          style={{ letterSpacing: "0.4em" }}
        >
          K-POP INDUSTRY BOOTCAMP FOR FOREIGNERS
        </p>

        <h1
          id="hero-umbrella-title"
          className="mb-10 font-black text-fg text-display-md sm:text-display-lg"
          style={{ letterSpacing: "-0.04em" }}
        >
          Fan to Pro. Global to Korea.
        </h1>

        <StatsGrid data={data} />

        <div className="mt-14">
          <CtaButton cta={data.nextCohortCta} />
        </div>
      </div>
    </section>
  );
}

function StatsGrid({ data }: { data: HeroUmbrellaStatsData }) {
  return (
    <dl className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
      <StatItem value={data.cohortCount} label="기수" />
      <StatItem value={data.graduateCount} label="수료 인원" />
      <StatItem value={data.countryCount} label="국가" />
      <StatItem
        value={
          <span>
            <span className="text-brand-pink">
              {data.headlineStat.numerator}
            </span>
            <span className="text-fg-muted">
              /{data.headlineStat.denominator}
            </span>
          </span>
        }
        label={data.headlineStat.label}
      />
    </dl>
  );
}

function StatItem({
  value,
  label,
}: {
  value: number | React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <dd
        className="font-black text-fg leading-none text-[clamp(2rem,6vw,3.5rem)]"
        style={{ letterSpacing: "-0.04em" }}
      >
        {value}
      </dd>
      <dt
        className="text-fg-muted text-xs uppercase sm:text-sm"
        style={{ letterSpacing: "0.25em" }}
      >
        {label}
      </dt>
    </div>
  );
}

function CtaButton({ cta }: { cta: HeroUmbrellaStatsData["nextCohortCta"] }) {
  const base =
    "inline-flex items-center justify-center gap-2 font-black text-lg sm:text-xl px-10 py-5 sm:py-6 transition-colors";

  if (cta.type === "closed") {
    return (
      <span
        role="status"
        aria-disabled="true"
        className={cn(
          base,
          "bg-transparent text-fg-muted border border-border-strong cursor-not-allowed",
        )}
        style={{ letterSpacing: "-0.02em" }}
      >
        {cta.label}
      </span>
    );
  }

  return (
    <a
      href={cta.href}
      className={cn(
        base,
        "bg-brand-pink text-fg hover:bg-brand-purple",
      )}
      style={{ letterSpacing: "-0.02em" }}
    >
      {cta.label}
    </a>
  );
}
