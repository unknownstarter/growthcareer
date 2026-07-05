/**
 * EnrollmentCourse repository — B0068 ADR 0013.
 *
 * enrollment 안의 course join row. 단과 결제면 1개, 번들 결제면 unpack 여러 개.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  EnrollmentCourseSchema,
  type EnrollmentCourse,
} from "@/src/programs/fan-to-pro/domain/entities/enrollment-course";

const TABLE = "enrollment_courses";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchEnrollmentCoursesByEnrollment(
  enrollmentId: string,
): Promise<EnrollmentCourse[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("enrollment_id", enrollmentId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentCourseSchema.parse(row));
}

export async function fetchEnrollmentCoursesByCourse(
  courseId: string,
): Promise<EnrollmentCourse[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentCourseSchema.parse(row));
}

export type InsertEnrollmentCourseInput = {
  enrollment_id: string;
  course_id: string;
  completed_at?: string | null;
};

/** 단일 course 결제 (단과) 또는 번들 unpack 시 개별 insert. */
export async function insertEnrollmentCourse(
  input: InsertEnrollmentCourseInput,
): Promise<EnrollmentCourse> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      enrollment_id: input.enrollment_id,
      course_id: input.course_id,
      completed_at: input.completed_at ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return EnrollmentCourseSchema.parse(data);
}

/** 번들 결제 시 여러 course join 을 한 번에 insert. */
export async function insertEnrollmentCoursesBulk(
  rows: readonly InsertEnrollmentCourseInput[],
): Promise<EnrollmentCourse[]> {
  if (rows.length === 0) return [];
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert(
      rows.map((r) => ({
        enrollment_id: r.enrollment_id,
        course_id: r.course_id,
        completed_at: r.completed_at ?? null,
      })),
    )
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentCourseSchema.parse(row));
}

/** course 수료 마킹. */
export async function markEnrollmentCourseCompleted(
  enrollmentId: string,
  courseId: string,
  completedAt: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ completed_at: completedAt })
    .eq("enrollment_id", enrollmentId)
    .eq("course_id", courseId);
  if (error) throw new Error(error.message);
}
