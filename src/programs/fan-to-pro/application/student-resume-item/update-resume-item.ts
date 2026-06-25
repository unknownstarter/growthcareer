"use server";

/**
 * Student Resume Item — update server action (B0044).
 *
 * 권한 가드: input.student_id 와 fetched row.student_id 일치 검증 추가.
 */
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentResumeItemUpdateInputSchema,
  type StudentResumeItem,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";
import {
  fetchStudentResumeItemById,
  updateStudentResumeItem,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";

export type UpdateResumeItemResult =
  | { status: "ok"; item: StudentResumeItem }
  | { status: "error"; error: string };

export async function updateStudentResumeItemAction(
  input: unknown,
): Promise<UpdateResumeItemResult> {
  const parsed = StudentResumeItemUpdateInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  // 가드 1: student_id 권한.
  try {
    await assertCanWriteStudentProfile(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // 가드 2: 실제 row 의 student_id 와 input.student_id 일치 검증 (IDOR 방어).
  let existing: StudentResumeItem | null;
  try {
    existing = await fetchStudentResumeItemById(parsed.data.id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "fetchFailed",
    };
  }
  if (!existing) return { status: "error", error: "notFound" };
  if (existing.student_id !== parsed.data.student_id) {
    return { status: "error", error: "studentMismatch" };
  }

  try {
    const item = await updateStudentResumeItem(parsed.data);
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
