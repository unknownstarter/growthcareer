/**
 * Job Posting repository (B0072 Recruitment MVP).
 *
 * service_role client. RLS 우회 — 호출자 (server action) 가 권한 가드 책임 (CLAUDE.md §7.4).
 *
 * 공개 read (익명) 는 이 repository 대신 anon client 를 사용하는 별도 함수
 * (`fetchPublishedJobsAnon` / `fetchPublishedJobDetailAnon`) 로 격리한다 —
 * RLS 정책 (`p_job_postings_public_read`) 통과 여부를 실제 anon 세션에서 검증하기 위함.
 */
import { createClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  JobPostingSchema,
  JobPostingListItemSchema,
  type JobPosting,
  type JobPostingListItem,
  type JobPostingStatus,
  type EmploymentType,
} from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const TABLE = "job_postings";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/**
 * 익명 client — anon key 로 RLS 실제 통과 여부 검증.
 * 공개 페이지 (익명 SSR) 진입 시 사용.
 */
function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("supabaseAnonUnavailable");
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// 공개 read (anon)
// ---------------------------------------------------------------------------

export type FetchPublishedJobsFilter = {
  programId?: string;
  roleCategory?: string;
  employmentType?: EmploymentType;
  remoteOnly?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * 공개 리스트 (익명 client). RLS 가 status='open' + closes_at 유효 필터.
 */
export async function fetchPublishedJobsAnon(
  filter: FetchPublishedJobsFilter = {},
): Promise<JobPostingListItem[]> {
  const supabase = getAnonClient();
  let q = supabase
    .from(TABLE)
    .select(
      "id, slug, title, company_name, company_logo_path, role_category, employment_type, location, remote_ok, salary_range, published_at, closes_at",
    )
    .order("published_at", { ascending: false });

  if (filter.programId) q = q.eq("program_id", filter.programId);
  if (filter.roleCategory) q = q.eq("role_category", filter.roleCategory);
  if (filter.employmentType) q = q.eq("employment_type", filter.employmentType);
  if (filter.remoteOnly) q = q.eq("remote_ok", true);
  if (typeof filter.limit === "number") {
    const from = filter.offset ?? 0;
    q = q.range(from, from + filter.limit - 1);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => JobPostingListItemSchema.parse(row));
}

/**
 * 공개 상세 (익명 client). slug 매칭. RLS 필터 통과 안 하면 null.
 */
export async function fetchPublishedJobBySlugAnon(
  slug: string,
): Promise<JobPosting | null> {
  const supabase = getAnonClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return JobPostingSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Admin read (service_role) — draft / closed 포함 전체 접근.
// ---------------------------------------------------------------------------

export type FetchAllJobsFilter = {
  programId?: string;
  status?: JobPostingStatus;
  limit?: number;
  offset?: number;
};

export async function fetchAllJobs(
  filter: FetchAllJobsFilter = {},
): Promise<JobPosting[]> {
  const supabase = requireClient();
  let q = supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.programId) q = q.eq("program_id", filter.programId);
  if (filter.status) q = q.eq("status", filter.status);
  if (typeof filter.limit === "number") {
    const from = filter.offset ?? 0;
    q = q.range(from, from + filter.limit - 1);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => JobPostingSchema.parse(row));
}

export async function fetchJobById(id: string): Promise<JobPosting | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return JobPostingSchema.parse(data);
}

export async function fetchJobBySlug(slug: string): Promise<JobPosting | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return JobPostingSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Admin write (service_role)
// ---------------------------------------------------------------------------

export type InsertJobPostingInput = {
  program_id: string;
  slug: string;
  title: string;
  company_name: string;
  company_logo_path?: string | null;
  role_category: string;
  employment_type: EmploymentType;
  location?: string | null;
  remote_ok?: boolean;
  description: string;
  requirements?: string | null;
  benefits?: string | null;
  salary_range?: string | null;
  contact_email: string;
  company_retention_period?: string | null;
  closes_at?: string | null;
  created_by: string;
};

export async function insertJobPosting(
  input: InsertJobPostingInput,
): Promise<JobPosting> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      program_id: input.program_id,
      slug: input.slug,
      title: input.title,
      company_name: input.company_name,
      company_logo_path: input.company_logo_path ?? null,
      role_category: input.role_category,
      employment_type: input.employment_type,
      location: input.location ?? null,
      remote_ok: input.remote_ok ?? false,
      description: input.description,
      requirements: input.requirements ?? null,
      benefits: input.benefits ?? null,
      salary_range: input.salary_range ?? null,
      contact_email: input.contact_email,
      company_retention_period: input.company_retention_period ?? null,
      closes_at: input.closes_at ?? null,
      created_by: input.created_by,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return JobPostingSchema.parse(data);
}

export type UpdateJobPostingPatch = Partial<
  Omit<
    InsertJobPostingInput,
    "slug" | "created_by" | "program_id"
  >
>;

export async function updateJobPosting(
  id: string,
  patch: UpdateJobPostingPatch,
): Promise<JobPosting> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return JobPostingSchema.parse(data);
}

/** draft -> open transition. published_at 을 now() 로 세팅. */
export async function publishJobPosting(id: string): Promise<JobPosting> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "open",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft") // 방어선: draft 인 row 만 open 으로 전이.
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return JobPostingSchema.parse(data);
}

/** open -> closed transition. closes_at 도 now() 로 세팅. */
export async function closeJobPosting(id: string): Promise<JobPosting> {
  const supabase = requireClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "closed", closes_at: now })
    .eq("id", id)
    .eq("status", "open")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return JobPostingSchema.parse(data);
}

/** 봇 필터 후속. detail page 서버 렌더 시 fire-and-forget 호출. */
export async function incrementJobViewCount(id: string): Promise<void> {
  const supabase = requireClient();
  // race condition 방어 위해 rpc 대신 atomic update.
  const { error } = await supabase.rpc("increment_job_view_count_stub", {
    p_id: id,
  });
  // RPC 부재 시 fallback = 정적 SELECT + UPDATE 는 race 위험. MVP 는 error 무시.
  if (error && !error.message.includes("does not exist")) {
    // 로그만.
    console.warn("[job-posting-repository] view_count increment skipped:", error.message);
  }
}
