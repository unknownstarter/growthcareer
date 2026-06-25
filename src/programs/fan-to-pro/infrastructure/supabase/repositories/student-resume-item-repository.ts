/**
 * Student Resume Item repository (B0044 LMS Launch Phase 1).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentResumeItemSchema,
  type StudentResumeItem,
  type StudentResumeItemCreateInput,
  type StudentResumeItemUpdateInput,
} from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

const TABLE = "student_resume_item";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchStudentResumeItems(
  studentId: string,
): Promise<StudentResumeItem[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("type", { ascending: true })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => StudentResumeItemSchema.parse(row));
}

export async function fetchStudentResumeItemById(
  id: string,
): Promise<StudentResumeItem | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentResumeItemSchema.parse(data);
}

export async function insertStudentResumeItem(
  input: StudentResumeItemCreateInput,
): Promise<StudentResumeItem> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: input.student_id,
      type: input.type,
      title: input.title,
      organization: input.organization ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      description: input.description ?? null,
      credential_url: input.credential_url ?? null,
      order_index: input.order_index ?? 0,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentResumeItemSchema.parse(data);
}

export async function updateStudentResumeItem(
  input: StudentResumeItemUpdateInput,
): Promise<StudentResumeItem> {
  const supabase = requireClient();
  const patch: Record<string, unknown> = {};
  if (input.type !== undefined) patch.type = input.type;
  if (input.title !== undefined) patch.title = input.title;
  if (input.organization !== undefined) patch.organization = input.organization;
  if (input.start_date !== undefined) patch.start_date = input.start_date;
  if (input.end_date !== undefined) patch.end_date = input.end_date;
  if (input.description !== undefined) patch.description = input.description;
  if (input.credential_url !== undefined)
    patch.credential_url = input.credential_url;
  if (input.order_index !== undefined) patch.order_index = input.order_index;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", input.id)
    .eq("student_id", input.student_id) // 가드 — 본인 row 만.
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentResumeItemSchema.parse(data);
}

export async function deleteStudentResumeItem(
  id: string,
  studentId: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}
