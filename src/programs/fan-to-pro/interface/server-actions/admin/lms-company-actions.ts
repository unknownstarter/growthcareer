"use server";

/**
 * LMS Company server actions — super_admin 전용.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  insertCompany,
  updateCompany,
  type InsertCompanyInput,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/company-repository";
import { updateInstructorCompany } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/instructor-lms-repository";

const InsertSchema = z.object({
  name: z.string().trim().min(1),
  biz_no: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  contact_name: z.string().trim().nullable().optional(),
  contact_email: z.string().trim().email().nullable().optional().or(z.literal("")),
  bank_name: z.string().trim().nullable().optional(),
  bank_account: z.string().trim().nullable().optional(),
  bank_holder: z.string().trim().nullable().optional(),
  vat_issuer: z.boolean().optional(),
  notes: z.string().trim().nullable().optional(),
});

export type CompanyActionResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

export async function createCompanyAction(
  input: unknown,
): Promise<CompanyActionResult> {
  await assertLmsRole("super_admin");
  const parsed = InsertSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    const company = await insertCompany(parsed.data as InsertCompanyInput);
    revalidatePath("/lms/admin/companies");
    return { status: "ok", id: company.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

const UpdateSchema = InsertSchema.partial().extend({
  id: z.string().uuid(),
});

export async function updateCompanyAction(
  input: unknown,
): Promise<CompanyActionResult> {
  await assertLmsRole("super_admin");
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const { id, ...patch } = parsed.data;
  try {
    await updateCompany(id, patch);
    revalidatePath("/lms/admin/companies");
    revalidatePath("/lms/admin/finance");
    return { status: "ok", id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

const LinkSchema = z.object({
  instructor_id: z.string().uuid(),
  company_id: z.string().uuid().nullable(),
});

export async function linkInstructorCompanyAction(
  input: unknown,
): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  const parsed = LinkSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    await updateInstructorCompany(
      parsed.data.instructor_id,
      parsed.data.company_id,
    );
    revalidatePath("/lms/admin/instructors");
    revalidatePath("/lms/admin/companies");
    revalidatePath("/lms/admin/finance");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
