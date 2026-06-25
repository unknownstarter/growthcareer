"use server";

/**
 * Student Career Target — get query server action (B0044).
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import type { StudentCareerTarget } from "@/src/programs/fan-to-pro/domain/entities/student-career-target";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GetCareerTargetResult =
  | { status: "ok"; target: StudentCareerTarget | null }
  | { status: "error"; error: string };

export async function getStudentCareerTargetAction(
  input: unknown,
): Promise<GetCareerTargetResult> {
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
    const target = await fetchStudentCareerTarget(parsed.data.student_id);
    return { status: "ok", target };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
