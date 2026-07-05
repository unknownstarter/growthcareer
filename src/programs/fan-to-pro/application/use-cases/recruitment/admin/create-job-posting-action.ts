/**
 * Use case — super_admin JD 신규 등록.
 *
 * slug 자동 생성 (8자 alphanumeric) + UNIQUE 충돌 시 재시도 3회 + reserved word 회피.
 * status = draft 로 시작. publish 는 별도 use case.
 */
"use server";

import { z } from "zod";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  insertJobPosting,
  fetchJobBySlug,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import {
  EmploymentTypeSchema,
  isReservedSlug,
  type JobPosting,
} from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const InputSchema = z.object({
  programId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  companyName: z.string().trim().min(1).max(200),
  companyLogoPath: z.string().max(500).nullable().optional(),
  roleCategory: z.string().trim().min(1).max(100),
  employmentType: EmploymentTypeSchema,
  location: z.string().max(200).nullable().optional(),
  remoteOk: z.boolean().optional(),
  description: z.string().trim().min(1),
  requirements: z.string().nullable().optional(),
  benefits: z.string().nullable().optional(),
  salaryRange: z.string().max(200).nullable().optional(),
  contactEmail: z.string().email().max(200),
  companyRetentionPeriod: z.string().max(500).nullable().optional(),
  closesAt: z.string().datetime().nullable().optional(),
});

export type CreateJobPostingInput = z.infer<typeof InputSchema>;
export type CreateJobPostingResult =
  | { status: "ok"; data: JobPosting }
  | { status: "error"; error: string };

const SLUG_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateSlug(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  }
  return slug;
}

async function ensureUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug();
    if (isReservedSlug(slug)) continue;
    const existing = await fetchJobBySlug(slug);
    if (!existing) return slug;
  }
  throw new Error("slugCollision");
}

export async function createJobPostingAction(
  input: unknown,
): Promise<CreateJobPostingResult> {
  const user = await assertSuperAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const slug = await ensureUniqueSlug();
    const data = await insertJobPosting({
      program_id: parsed.data.programId,
      slug,
      title: parsed.data.title,
      company_name: parsed.data.companyName,
      company_logo_path: parsed.data.companyLogoPath ?? null,
      role_category: parsed.data.roleCategory,
      employment_type: parsed.data.employmentType,
      location: parsed.data.location ?? null,
      remote_ok: parsed.data.remoteOk ?? false,
      description: parsed.data.description,
      requirements: parsed.data.requirements ?? null,
      benefits: parsed.data.benefits ?? null,
      salary_range: parsed.data.salaryRange ?? null,
      contact_email: parsed.data.contactEmail,
      company_retention_period: parsed.data.companyRetentionPeriod ?? null,
      closes_at: parsed.data.closesAt ?? null,
      created_by: user.id,
    });
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
