/**
 * Use case — super_admin JD 공개 (draft -> open).
 *
 * repository 안에서 status='draft' row 만 open 으로 전이. race 방어.
 */
"use server";

import { z } from "zod";
import { assertSuperAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { publishJobPosting } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/job-posting-repository";
import type { JobPosting } from "@/src/programs/fan-to-pro/domain/entities/job-posting";

const InputSchema = z.object({
  id: z.string().uuid(),
});

export type PublishJobPostingResult =
  | { status: "ok"; data: JobPosting }
  | { status: "error"; error: string };

export async function publishJobPostingAction(
  input: unknown,
): Promise<PublishJobPostingResult> {
  await assertSuperAdmin();

  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    const data = await publishJobPosting(parsed.data.id);
    return { status: "ok", data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
