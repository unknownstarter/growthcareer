/**
 * fetchUmbrellaStats — 우산 랜딩 Hero 지표.
 *
 * B0083 Phase 1 Slice 2b. Iris.
 *
 * shape: `HeroUmbrellaStatsData` (presentation/showcase/types.ts).
 *
 * 지표 정의:
 *   - cohortCount    : showcase_slug IS NOT NULL AND status != cancelled 인 cohort 수
 *   - graduateCount  : 위 cohort 의 status='active' student 합계
 *                     (cohort 이 in_progress / completed 이어도 active 만 세는 노아 룰)
 *   - countryCount   : 위 cohort 학생의 applicants.nationality distinct 수
 *                     (student_profile.nationality 는 학생 사후 수정 사본 — 원본은 applicants)
 *   - headlineStat   : 랜딩 headline 용 raw fraction. 가장 최근 cohort 의 hero_stat 를 우선.
 *                     hero_stat 없으면 { value: graduateCount, denominator: paidCount, label: "수료 인원" }
 *   - nextCohortCta  : 다음 모집 상태.
 *                     - 현재 accepts_signup_now=true 인 cohort → apply CTA
 *                     - 그 외 → waitlist / closed
 *
 * Cache: 우산 랜딩 SEO 페이지 — 5분 revalidate 권장. 여기서는 fetch 만 반환.
 *
 * 실패 정책 (Iris 경계 원칙):
 *   - Supabase 미연결 시 safe empty 반환 (cohortCount=0, closed CTA).
 *   - 개별 count 실패 시 0 으로 fallback (전체 페이지 500 방지).
 */
import { z } from "zod";

import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchPubliclyDisplayableCohorts } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-showcase-repository";
import type { HeroUmbrellaStatsData } from "@/src/programs/growth-career/presentation/components/showcase/types";

export type FetchUmbrellaStatsInput = {
  /** apply CTA href. locale 기준 라우트. */
  applyHref: string;
  /** waitlist CTA href. */
  waitlistHref: string;
  /** hero 배경 이미지. */
  backgroundImage: { src: string; alt: string };
};

const InputSchema = z.object({
  applyHref: z.string().min(1),
  waitlistHref: z.string().min(1),
  backgroundImage: z.object({
    src: z.string(),
    alt: z.string(),
  }),
});

/** hero_stat JSONB shape (cohorts.hero_stat). */
type HeroStat = {
  label: string;
  value: number;
  denominator: number | null;
};

export async function fetchUmbrellaStats(
  input: FetchUmbrellaStatsInput,
): Promise<HeroUmbrellaStatsData> {
  const parsed = InputSchema.parse(input);

  const emptyStats: HeroUmbrellaStatsData = {
    cohortCount: 0,
    graduateCount: 0,
    countryCount: 0,
    headlineStat: {
      numerator: 0,
      denominator: 0,
      label: "수료 인원",
    },
    nextCohortCta: {
      type: "closed",
      label: "모집 준비 중",
    },
    backgroundImage: parsed.backgroundImage,
  };

  const supabase = getSupabaseServer();
  if (!supabase) return emptyStats;

  const cohorts = await fetchPubliclyDisplayableCohorts().catch(() => []);
  if (cohorts.length === 0) return emptyStats;

  const cohortIds = cohorts.map((c) => c.id);

  // graduate count = active students (노아 룰 §7.4)
  const { count: graduateCount } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .in("cohort_id", cohortIds)
    .eq("status", "active");

  // country count = applicants.nationality distinct
  // paid 상태 필터 — showcase 대상은 실제 수강 완료자 group.
  const { data: nationalityRows } = await supabase
    .from("applicants")
    .select("nationality, cohort_id")
    .in("cohort_id", cohortIds)
    .eq("payment_status", "paid")
    .not("nationality", "is", null);

  const countries = new Set<string>();
  for (const row of nationalityRows ?? []) {
    const nat = (row as { nationality: string | null }).nationality;
    if (nat && nat.trim().length > 0) countries.add(nat.trim());
  }

  // headline stat: 가장 최근 cohort 의 hero_stat 우선.
  // hero_stat 없거나 malformed 면 graduateCount 기반 fallback.
  const latest = cohorts[0];
  const heroStat = latest.hero_stat as HeroStat | null;
  const headlineStat =
    heroStat && typeof heroStat.value === "number"
      ? {
          numerator: heroStat.value,
          denominator: heroStat.denominator ?? heroStat.value,
          label: heroStat.label,
        }
      : {
          numerator: graduateCount ?? 0,
          denominator: graduateCount ?? 0,
          label: "수료 인원",
        };

  // 다음 기수 CTA: accepts_signup_now=true cohort 존재 여부.
  const nextCohortCta = await resolveNextCohortCta({
    supabase,
    applyHref: parsed.applyHref,
    waitlistHref: parsed.waitlistHref,
  });

  return {
    cohortCount: cohorts.length,
    graduateCount: graduateCount ?? 0,
    countryCount: countries.size,
    headlineStat,
    nextCohortCta,
    backgroundImage: parsed.backgroundImage,
  };
}

async function resolveNextCohortCta({
  supabase,
  applyHref,
  waitlistHref,
}: {
  supabase: ReturnType<typeof getSupabaseServer>;
  applyHref: string;
  waitlistHref: string;
}): Promise<HeroUmbrellaStatsData["nextCohortCta"]> {
  if (!supabase) {
    return { type: "closed", label: "모집 준비 중" };
  }
  const { data } = await supabase
    .from("cohorts")
    .select("id, accepts_signup_now, status")
    .eq("accepts_signup_now", true)
    .neq("status", "cancelled")
    .limit(1);
  if ((data ?? []).length > 0) {
    return { type: "apply", href: applyHref, label: "지금 신청하기" };
  }
  // waitlist 는 CTA 는 열어두되 실제 신청 페이지가 마감 상태를 인식.
  return { type: "waitlist", href: waitlistHref, label: "대기 명단 등록" };
}
