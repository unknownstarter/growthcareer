"use server";

/**
 * Student Note — create server action (B0044).
 *
 * 권한: assertCanWriteStudentNote(student_id).
 * author_id / author_role 은 가드가 반환한 값으로 자동 채움.
 */
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentNote } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  StudentNoteCreateInputSchema,
  type StudentNote,
} from "@/src/programs/fan-to-pro/domain/entities/student-note";
import { insertStudentNote } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";

export type CreateStudentNoteResult =
  | { status: "ok"; note: StudentNote }
  | { status: "error"; error: string };

export async function createStudentNoteAction(
  input: unknown,
): Promise<CreateStudentNoteResult> {
  const parsed = StudentNoteCreateInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  let authorId: string;
  let authorRole: "super_admin" | "admin" | "instructor";
  try {
    const result = await assertCanWriteStudentNote(parsed.data.student_id);
    authorId = result.user.id;
    authorRole = result.authorRole;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const note = await insertStudentNote({
      student_id: parsed.data.student_id,
      author_id: authorId,
      author_role: authorRole,
      body: parsed.data.body,
      is_pinned: parsed.data.is_pinned ?? false,
    });

    revalidatePath(
      `/ko/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );
    revalidatePath(
      `/en/fan-to-pro/admin/students/${parsed.data.student_id}`,
    );

    return { status: "ok", note };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
