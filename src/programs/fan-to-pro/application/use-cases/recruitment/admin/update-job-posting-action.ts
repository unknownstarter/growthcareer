/**
 * Use case — super_admin JD 수정.
 *
 * slug 변경 X (URL 안정성). status 전이는 별도 use case (publish / close).
 */
"use server";

import { z } from "zod";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { updateJobPosting } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import {
  EmploymentTypeSchema,
  type JobPosting,
} from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const PatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
    companyLogoPath: z.string().max(500).nullable().optional(),
    roleCategory: z.string().trim().min(1).max(100).optional(),
    employmentType: EmploymentTypeSchema.optional(),
    location: z.string().max(200).nullable().optional(),
    remoteOk: z.boolean().optional(),
    description: z.string().trim().min(1).optional(),
    requirements: z.string().nullable().optional(),
    benefits: z.string().nullable().optional(),
    salaryRange: z.string().max(200).nullable().optional(),
    contactEmail: z.string().email().max(200).optional(),
    companyRetentionPeriod: z.string().max(500).nullable().optional(),
    closesAt: z.string().datetime().nullable().optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: "emptyPatch" });

const InputSchema = z.object({
  id: z.string().uuid(),
  patch: PatchSchema,
});

export type UpdateJobPostingInput = z.infer<typeof InputSchema>;
export type UpdateJobPostingResult =
  | { status: "ok"; data: JobPosting }
  | { status: "error"; error: string };

export async function updateJobPostingAction(
  input: unknown,
): Promise<UpdateJobPostingResult> {
  await assertSuperAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const p = parsed.data.patch;
    const data = await updateJobPosting(parsed.data.id, {
      title: p.title,
      company_name: p.companyName,
      company_logo_path: p.companyLogoPath ?? undefined,
      role_category: p.roleCategory,
      employment_type: p.employmentType,
      location: p.location ?? undefined,
      remote_ok: p.remoteOk,
      description: p.description,
      requirements: p.requirements ?? undefined,
      benefits: p.benefits ?? undefined,
      salary_range: p.salaryRange ?? undefined,
      contact_email: p.contactEmail,
      company_retention_period: p.companyRetentionPeriod ?? undefined,
      closes_at: p.closesAt ?? undefined,
    });
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
