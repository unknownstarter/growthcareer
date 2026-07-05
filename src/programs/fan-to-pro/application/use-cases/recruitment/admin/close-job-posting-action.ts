/**
 * Use case — super_admin JD 마감 (open -> closed).
 *
 * status='open' row 만 closed 로 전이. closes_at 을 now() 로 세팅.
 */
"use server";

import { z } from "zod";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { closeJobPosting } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import type { JobPosting } from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const InputSchema = z.object({
  id: z.string().uuid(),
});

export type CloseJobPostingResult =
  | { status: "ok"; data: JobPosting }
  | { status: "error"; error: string };

export async function closeJobPostingAction(
  input: unknown,
): Promise<CloseJobPostingResult> {
  await assertSuperAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const data = await closeJobPosting(parsed.data.id);
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
