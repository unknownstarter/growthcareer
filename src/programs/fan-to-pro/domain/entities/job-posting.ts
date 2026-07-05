/**
 * Job Posting entity (B0072 Recruitment MVP).
 *
 * 채용 공고. 회사 정보는 in-line (v5 companies_partners 폐기).
 *
 * State machine:
 *   draft (super_admin only)
 *     -> open (published_at 채워짐, 공개 SELECT 대상)
 *     -> closed (closes_at 도달 또는 super_admin 수동)
 *
 * Invariant:
 *   - slug UNIQUE (8자 nanoid alphanumeric).
 *   - contact_email 는 회사 담당자 email — 원클릭 지원 시 outbox 발송 대상.
 */
import { z } from "zod";

export const JOB_POSTING_STATUSES = ["draft", "open", "closed"] as const;
export type JobPostingStatus = (typeof JOB_POSTING_STATUSES)[number];
export const JobPostingStatusSchema = z.enum(JOB_POSTING_STATUSES);

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "internship",
  "contract",
  "freelance",
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export const EmploymentTypeSchema = z.enum(EMPLOYMENT_TYPES);

/**
 * slug 검증 — 8자 alphanumeric. reserved word 는 admin 등록 시 application 레이어 차단.
 */
export const JobPostingSlugSchema = z
  .string()
  .regex(/^[a-zA-Z0-9]{8}$/, "slug must be 8 alphanumeric characters");

export const JobPostingSchema = z.object({
  id: z.string().uuid(),
  program_id: z.string().uuid(),
  slug: JobPostingSlugSchema,
  title: z.string().min(1).max(200),
  company_name: z.string().min(1).max(200),
  company_logo_path: z.string().nullable(),
  role_category: z.string().min(1).max(100),
  employment_type: EmploymentTypeSchema,
  location: z.string().max(200).nullable(),
  remote_ok: z.boolean(),
  description: z.string().min(1),
  requirements: z.string().nullable(),
  benefits: z.string().nullable(),
  salary_range: z.string().max(200).nullable(),
  contact_email: z.string().email().max(200),
  company_retention_period: z.string().max(500).nullable(),
  published_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  status: JobPostingStatusSchema,
  view_count: z.number().int().nonnegative(),
  created_by: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;

/**
 * 공개 리스트 아이템 — 상세 진입 전에 노출되는 subset.
 */
export const JobPostingListItemSchema = JobPostingSchema.pick({
  id: true,
  slug: true,
  title: true,
  company_name: true,
  company_logo_path: true,
  role_category: true,
  employment_type: true,
  location: true,
  remote_ok: true,
  salary_range: true,
  published_at: true,
  closes_at: true,
});

export type JobPostingListItem = z.infer<typeof JobPostingListItemSchema>;

/**
 * State transition guard — draft -> open, open -> closed 만 허용.
 * super_admin 수동 revive 는 별도 use case 로 격리.
 */
export function canTransitionStatus(
  from: JobPostingStatus,
  to: JobPostingStatus,
): boolean {
  if (from === "draft" && to === "open") return true;
  if (from === "open" && to === "closed") return true;
  return false;
}

/**
 * 공개 노출 자격 — RLS 정책과 동기. status='open' + closes_at 유효.
 */
export function isPubliclyVisible(
  posting: Pick<JobPosting, "status" | "closes_at">,
  now: Date = new Date(),
): boolean {
  if (posting.status !== "open") return false;
  if (posting.closes_at === null) return true;
  return new Date(posting.closes_at).getTime() > now.getTime();
}

/**
 * URL / 등록 시 예약어 충돌 검사 — cohort slug 규칙 재사용.
 */
const RESERVED_SLUGS = new Set([
  "admin",
  "apply",
  "auth",
  "login",
  "logout",
  "student",
  "instructor",
  "dashboard",
  "api",
  "jobs",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
