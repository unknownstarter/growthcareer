"use server";

/**
 * Student Profile — upsert server action (B0044).
 *
 * 권한: assertCanWriteStudentProfile(student_id).
 *   - super_admin / program admin / student-self 통과.
 *   - instructor 는 쓰기 X.
 */
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentProfileUpsertInputSchema,
  type StudentProfile,
} from "@/src/programs/fan-to-pro/domain/entities/student-profile";
import { upsertStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";

export type UpsertStudentProfileResult =
  | { status: "ok"; profile: StudentProfile }
  | { status: "error"; error: string };

export async function upsertStudentProfileAction(
  input: unknown,
): Promise<UpsertStudentProfileResult> {
  const parsed = StudentProfileUpsertInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanWriteStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const profile = await upsertStudentProfile(parsed.data);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    return { status: "ok", profile };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
