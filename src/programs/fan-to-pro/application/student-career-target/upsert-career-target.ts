"use server";

/**
 * Student Career Target — upsert server action (B0044).
 */
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentCareerTargetUpsertInputSchema,
  type StudentCareerTarget,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import { upsertStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";

export type UpsertCareerTargetResult =
  | { status: "ok"; target: StudentCareerTarget }
  | { status: "error"; error: string };

export async function upsertStudentCareerTargetAction(
  input: unknown,
): Promise<UpsertCareerTargetResult> {
  const parsed = StudentCareerTargetUpsertInputSchema.safeParse(input);
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
    const target = await upsertStudentCareerTarget(parsed.data);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    return { status: "ok", target };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
