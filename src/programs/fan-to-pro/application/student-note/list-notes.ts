"use server";

/**
 * Student Note — list query server action (B0044).
 *
 * 권한: assertCanReadStudentNote(student_id) — 학생 본인은 차단.
 */
import { z } from "zod";
import { assertCanReadStudentNote } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { fetchStudentNotes } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-note-repository";
import type { StudentNote } from "@/src/programs/fan-to-pro/domain/entities/student-note";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type ListStudentNotesResult =
  | { status: "ok"; notes: StudentNote[] }
  | { status: "error"; error: string };

export async function listStudentNotesAction(
  input: unknown,
): Promise<ListStudentNotesResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  try {
    await assertCanReadStudentNote(parsed.data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const notes = await fetchStudentNotes(parsed.data.student_id);
    return { status: "ok", notes };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
