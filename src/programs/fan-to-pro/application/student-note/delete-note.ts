"use server";

/**
 * Student Note — delete server action (B0044).
 *
 * 권한:
 *   - super_admin / program admin : 모든 note delete OK
 *   - instructor : 본인 author note 만
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentNote } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchStudentNoteById,
  deleteStudentNote,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";

const InputSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteStudentNoteResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function deleteStudentNoteAction(
  input: unknown,
): Promise<DeleteStudentNoteResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const existing = await fetchStudentNoteById(parsed.data.id);
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

  if (authorRole === "instructor" && existing.author_id !== userId) {
    return { status: "error", error: "forbiddenOtherAuthor" };
  }

  try {
    await deleteStudentNote(parsed.data.id);
    revalidatePath(
      `/ko/fan-to-pro/admin/students/${existing.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${existing.student_id}`,
    );
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
