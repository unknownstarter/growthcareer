/**
 * Student Note repository (B0044 LMS Launch Phase 1).
 *
 * 운영 코멘트 — 학생 본인 안 봄. server action 가드가 책임.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentNoteSchema,
  type StudentNote,
  type StudentNoteAuthorRole,
} from "@/src/programs/fan-to-pro/domain/entities/student-note";

const TABLE = "student_notes";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** 학생의 모든 notes (pinned 우선, 그 다음 최신순). */
export async function fetchStudentNotes(
  studentId: string,
): Promise<StudentNote[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => StudentNoteSchema.parse(row));
}

export async function fetchStudentNoteById(
  id: string,
): Promise<StudentNote | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentNoteSchema.parse(data);
}

export type InsertStudentNoteInput = {
  student_id: string;
  author_id: string;
  author_role: StudentNoteAuthorRole;
  body: string;
  is_pinned?: boolean;
};

export async function insertStudentNote(
  input: InsertStudentNoteInput,
): Promise<StudentNote> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: input.student_id,
      author_id: input.author_id,
      author_role: input.author_role,
      body: input.body,
      is_pinned: input.is_pinned ?? false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentNoteSchema.parse(data);
}

export type UpdateStudentNoteInput = {
  id: string;
  body?: string;
  is_pinned?: boolean;
};

export async function updateStudentNote(
  input: UpdateStudentNoteInput,
): Promise<StudentNote> {
  const supabase = requireClient();
  const patch: Record<string, unknown> = {};
  if (input.body !== undefined) patch.body = input.body;
  if (input.is_pinned !== undefined) patch.is_pinned = input.is_pinned;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentNoteSchema.parse(data);
}

export async function deleteStudentNote(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
