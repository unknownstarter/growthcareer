"use server";

/**
 * Student Resume Item — list query server action (B0044).
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentResumeItems } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";
import type { StudentResumeItem } from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type ListResumeItemsResult =
  | { status: "ok"; items: StudentResumeItem[] }
  | { status: "error"; error: string };

export async function listStudentResumeItemsAction(
  input: unknown,
): Promise<ListResumeItemsResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanReadStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const items = await fetchStudentResumeItems(parsed.data.student_id);
    return { status: "ok", items };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
