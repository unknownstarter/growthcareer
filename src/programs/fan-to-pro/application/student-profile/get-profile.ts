"use server";

/**
 * Student Profile — get query server action (B0044).
 *
 * 권한: assertCanReadStudentProfile(student_id).
 *   - super_admin / program admin / student-self / cohort instructor 통과.
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import type { StudentProfile } from "@/src/programs/fan-to-pro/domain/entities/student-profile";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GetStudentProfileResult =
  | { status: "ok"; profile: StudentProfile | null }
  | { status: "error"; error: string };

export async function getStudentProfileAction(
  input: unknown,
): Promise<GetStudentProfileResult> {
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
    const profile = await fetchStudentProfile(parsed.data.student_id);
    return { status: "ok", profile };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
