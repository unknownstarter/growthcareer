"use server";

/**
 * Student Resume Item — delete server action (B0044).
 *
 * 가드: assertCanWriteStudentProfile + 실제 row.student_id 일치 검증 (IDOR 방어).
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchStudentResumeItemById,
  deleteStudentResumeItem,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";

const InputSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
});

export type DeleteResumeItemResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function deleteStudentResumeItemAction(
  input: unknown,
): Promise<DeleteResumeItemResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanWriteStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // IDOR 방어 — row 의 student_id 일치.
  try {
    const existing = await fetchStudentResumeItemById(parsed.data.id);
    if (!existing) return { status: "error", error: "notFound" };
    if (existing.student_id !== parsed.data.student_id) {
      return { status: "error", error: "studentMismatch" };
    }
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "fetchFailed",
    };
  }

  try {
    await deleteStudentResumeItem(parsed.data.id, parsed.data.student_id);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
