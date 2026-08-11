/**
 * Cohort repository — ADR 0005 §5 concrete function 패턴 (interface X).
 *
 * Repository 책임: Supabase row 를 entity 로 변환 + 단순 CRUD.
 * 비즈니스 규칙 (상태 전이, 정원 미달 판정 등) 은 domain entity 또는 use case.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CohortSchema,
  type Cohort,
  type CohortStatus,
} from "@/src/programs/fan-to-pro/domain/entities/cohort";

const TABLE = "cohorts";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 모든 cohort 조회. starts_on DESC. */
export async function fetchAllCohorts(): Promise<Cohort[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CohortSchema.parse(row));
}

/** id 로 단일 cohort. 없으면 null. */
export async function fetchCohortById(id: string): Promise<Cohort | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CohortSchema.parse(data);
}

/** 현재 활성 cohort (open / enrollment_closed / in_progress) — dashboard 가 사용. */
export async function fetchActiveCohorts(): Promise<Cohort[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .in("status", ["open", "enrollment_closed", "in_progress"])
    .order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => CohortSchema.parse(row));
}

/** slug 로 단일 cohort. 없으면 null. URL [cohortSlug] 라우트에서 사용. */
export async function fetchCohortBySlug(slug: string): Promise<Cohort | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return CohortSchema.parse(data);
}

/**
 * 신규 신청을 받을 cohort — cohort별 시각 기반 판정 (Slice O 디커플).
 *
 * 조건: accepts_signup_now=true AND status=open AND
 *       (enrollment_closes_at IS NULL OR now < enrollment_closes_at).
 * 전역 program-config.isEnrollmentClosed (1기 cutoff 하드코딩) 대체 — 기수별
 * 독립 마감 시각으로 판정. 서버 시각 (`now`) 을 인자로 받아 SSG 캐시 회피 (§7).
 *
 * submit-application 이 이 값으로 pending vs next_cohort_interest 를 결정:
 *   있으면 → status='pending', cohort_id = 이 cohort.
 *   없으면 → status='next_cohort_interest', cohort_id = NULL (waitlist).
 *
 * 0건이면 신청은 waitlist 로 계속 받음 (신청 blocking X).
 * 2건 이상이면 가장 빠른 starts_on 우선 (=다음 코앞 기수).
 */
export async function fetchSignupOpenCohort(
  now: Date = new Date(),
): Promise<Cohort | null> {
  const supabase = requireClient();
  // accepts_signup_now + status=open 은 DB filter. 마감 시각 (enrollment_closes_at)
  // 비교는 JS 에서 (PostgREST .or() 의 timestamp 파싱 엣지케이스 회피 + 서버 시각 일관).
  // starts_on ASC 로 가장 코앞 기수 우선. 후보 여러 개일 수 있어 limit 없이 받아
  // 마감 전 첫 cohort 를 고른다.
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("accepts_signup_now", true)
    .eq("status", "open")
    .order("starts_on", { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((row) => CohortSchema.parse(row));
  const nowMs = now.getTime();
  const open = rows.find(
    (c) =>
      c.enrollment_closes_at == null ||
      new Date(c.enrollment_closes_at).getTime() > nowMs,
  );
  return open ?? null;
}

/** 신규 cohort INSERT. id/created_at/updated_at 은 DB default. */
export type InsertCohortInput = {
  name: string;
  starts_on: string;
  ends_on: string;
  ceremony_on: string | null;
  capacity: number;
  min_to_open: number;
  status?: CohortStatus;
  notes?: string | null;
};

export async function insertCohort(input: InsertCohortInput): Promise<Cohort> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      name: input.name,
      starts_on: input.starts_on,
      ends_on: input.ends_on,
      ceremony_on: input.ceremony_on,
      capacity: input.capacity,
      min_to_open: input.min_to_open,
      status: input.status ?? "draft",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return CohortSchema.parse(data);
}

/**
 * 상태 전이 UPDATE — optimistic concurrency (WHERE status=expected).
 * 0 row 면 stale.
 */
export async function updateCohortStatus(
  id: string,
  expectedStatus: CohortStatus,
  nextStatus: CohortStatus,
): Promise<{ status: "ok" } | { status: "stale" } | { status: "error"; error: string }> {
  const supabase = requireClient();
  const { error, count } = await supabase
    .from(TABLE)
    .update({ status: nextStatus }, { count: "exact" })
    .eq("id", id)
    .eq("status", expectedStatus);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale" };
  return { status: "ok" };
}
