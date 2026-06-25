"use server";

/**
 * Student Note — update server action (B0044).
 *
 * 권한:
 *   - super_admin / program admin : 모든 note update OK
 *   - instructor : 본인 author note 만 (note.author_id == user.id)
 */
import { revalidatePath } from "next/cache";
import {
  assertCanWriteStudentNote,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentNoteUpdateInputSchema,
  type StudentNote,
} from "@/src/programs/fan-to-pro/domain/entities/student-note";
import {
  fetchStudentNoteById,
  updateStudentNote,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";

export type UpdateStudentNoteResult =
  | { status: "ok"; note: StudentNote }
  | { status: "error"; error: string };

export async function updateStudentNoteAction(
  input: unknown,
): Promise<UpdateStudentNoteResult> {
  const parsed = StudentNoteUpdateInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  let existing: StudentNote | null;
  try {
    existing = await fetchStudentNoteById(parsed.data.id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "fetchFailed",
    };
  }
  if (!existing) return { status: "error", error: "notFound" };

  let userId: string;
  let authorRole: "super_admin" | "admin" | "instructor";
  try {
    const result = await assertCanWriteStudentNote(existing.student_id);
    userId = result.user.id;
    authorRole = result.authorRole;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // instructor 는 본인 author note 만.
  if (authorRole === "instructor" && existing.author_id !== userId) {
    return { status: "error", error: "forbiddenOtherAuthor" };
  }

  try {
    const note = await updateStudentNote(parsed.data);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${existing.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${existing.student_id}`,
    );
    return { status: "ok", note };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
