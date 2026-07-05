/**
 * Enrollment repository — B0068 ADR 0013.
 *
 * 결제 단위 CRUD. student 승격 전 (applicant 단계) 에도 pending row 로 존재 가능.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  EnrollmentSchema,
  type Enrollment,
  type EnrollmentStatus,
} from "@/src/programs/fan-to-pro/domain/entities/enrollment";

const TABLE = "enrollments";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchEnrollmentById(
  id: string,
): Promise<Enrollment | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return EnrollmentSchema.parse(data);
}

export async function fetchEnrollmentsByStudent(
  studentId: string,
): Promise<Enrollment[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentSchema.parse(row));
}

export async function fetchEnrollmentsByApplicant(
  applicantId: string,
): Promise<Enrollment[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("applicant_id", applicantId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentSchema.parse(row));
}

export async function fetchEnrollmentsByCohort(
  cohortId: string,
): Promise<Enrollment[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => EnrollmentSchema.parse(row));
}

export type InsertEnrollmentInput = {
  student_id?: string | null;
  applicant_id?: string | null;
  cohort_id?: string | null;
  bundle_id?: string | null;
  purchase_amount_krw?: number | null;
  purchased_at?: string | null;
  status?: EnrollmentStatus;
  notes?: string | null;
};

export async function insertEnrollment(
  input: InsertEnrollmentInput,
): Promise<Enrollment> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: input.student_id ?? null,
      applicant_id: input.applicant_id ?? null,
      cohort_id: input.cohort_id ?? null,
      bundle_id: input.bundle_id ?? null,
      purchase_amount_krw: input.purchase_amount_krw ?? null,
      purchased_at: input.purchased_at ?? null,
      status: input.status ?? "pending",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return EnrollmentSchema.parse(data);
}

/**
 * 상태 전이 UPDATE — optimistic concurrency (WHERE status=expected).
 * 0 row 면 stale.
 */
export async function updateEnrollmentStatus(
  id: string,
  expectedStatus: EnrollmentStatus,
  nextStatus: EnrollmentStatus,
): Promise<
  { status: "ok" } | { status: "stale" } | { status: "error"; error: string }
> {
  const supabase = requireClient();
  const { error, count } = await supabase
    .from(TABLE)
    .update({ status: nextStatus }, { count: "exact" })
    .eq("id", id)
    .eq("status", expectedStatus);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale" };
  return { status: "ok" };
}

/** applicant 를 student 로 승격 시 enrollment 의 student_id 를 채워 넣음. */
export async function attachStudentToEnrollment(
  enrollmentId: string,
  studentId: string,
): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase
    .from(TABLE)
    .update({ student_id: studentId })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);
}
