"use server";

/**
 * Student Note — toggle pin server action (B0044).
 *
 * 권한:
 *   - super_admin / program admin : 모든 note toggle OK
 *   - instructor : 본인 author note 만
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentNote } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchStudentNoteById,
  updateStudentNote,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";
import type { StudentNote } from "@/src/programs/fan-to-pro/domain/entities/student-note";

const InputSchema = z.object({
  id: z.string().uuid(),
  is_pinned: z.boolean(),
});

export type TogglePinNoteResult =
  | { status: "ok"; note: StudentNote }
  | { status: "error"; error: string };

export async function toggleStudentNotePinAction(
  input: unknown,
): Promise<TogglePinNoteResult> {
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
    const note = await updateStudentNote({
      id: parsed.data.id,
      is_pinned: parsed.data.is_pinned,
    });
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
