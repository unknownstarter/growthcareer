/**
 * Student Career Target repository (B0044 LMS Launch Phase 1).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentCareerTargetSchema,
  type StudentCareerTarget,
  type StudentCareerTargetUpsertInput,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";

const TABLE = "student_career_target";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchStudentCareerTarget(
  studentId: string,
): Promise<StudentCareerTarget | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentCareerTargetSchema.parse(data);
}

export async function upsertStudentCareerTarget(
  input: StudentCareerTargetUpsertInput,
): Promise<StudentCareerTarget> {
  const supabase = requireClient();

  const existing = await fetchStudentCareerTarget(input.student_id);

  const merged: Record<string, unknown> = {
    student_id: input.student_id,
    target_role_category:
      input.target_role_category !== undefined
        ? input.target_role_category
        : (existing?.target_role_category ?? null),
    target_companies:
      input.target_companies !== undefined
        ? input.target_companies
        : (existing?.target_companies ?? []),
    desired_start_date:
      input.desired_start_date !== undefined
        ? input.desired_start_date
        : (existing?.desired_start_date ?? null),
    self_pitch:
      input.self_pitch !== undefined
        ? input.self_pitch
        : (existing?.self_pitch ?? null),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(merged, { onConflict: "student_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentCareerTargetSchema.parse(data);
}
