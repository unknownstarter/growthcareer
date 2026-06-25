"use server";

/**
 * Student Resume Item — create server action (B0044).
 */
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentResumeItemCreateInputSchema,
  type StudentResumeItem,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";
import { insertStudentResumeItem } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";

export type CreateResumeItemResult =
  | { status: "ok"; item: StudentResumeItem }
  | { status: "error"; error: string };

export async function createStudentResumeItemAction(
  input: unknown,
): Promise<CreateResumeItemResult> {
  const parsed = StudentResumeItemCreateInputSchema.safeParse(input);
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
    const item = await insertStudentResumeItem(parsed.data);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    return { status: "ok", item };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
