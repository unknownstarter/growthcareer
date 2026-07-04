/**
 * Student repository — ADR 0005 §5.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  StudentSchema,
  type Student,
  type StudentStatus,
} from "@/src/programs/fan-to-pro/domain/entities/student";

const TABLE = "students";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/**
 * cohort 의 active student — display_name ASC.
 *
 * 노아 룰 (2026-07-04): withdrawn / completed 는 출결 매트릭스, 명단, KPI 등
 * 운영 뷰에서 자동 제외. status='active' 만 반환.
 */
export async function fetchStudentsByCohort(
  cohortId: string,
): Promise<Student[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("status", "active")
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => StudentSchema.parse(row));
}

export async function fetchStudentById(id: string): Promise<Student | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentSchema.parse(data);
}

/** applicant_id 로 student 조회 — promote 중복 체크. */
export async function fetchStudentByApplicantId(
  applicantId: string,
): Promise<Student | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("applicant_id", applicantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return StudentSchema.parse(data);
}

export type InsertStudentInput = {
  applicant_id: string;
  cohort_id: string;
  display_name: string;
  status?: StudentStatus;
  notes?: string | null;
};

export async function insertStudent(input: InsertStudentInput): Promise<Student> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      applicant_id: input.applicant_id,
      cohort_id: input.cohort_id,
      display_name: input.display_name,
      status: input.status ?? "active",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return StudentSchema.parse(data);
}

export async function updateStudentStatus(
  id: string,
  expectedStatus: StudentStatus,
  nextStatus: StudentStatus,
): Promise<{ status: "ok" } | { status: "stale" } | { status: "error"; error: string }> {
  const supabase = requireClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "withdrawn") patch.withdrawn_at = now;
  if (nextStatus === "completed") patch.completed_at = now;
  const { error, count } = await supabase
    .from(TABLE)
    .update(patch, { count: "exact" })
    .eq("id", id)
    .eq("status", expectedStatus);
  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale" };
  return { status: "ok" };
}

/**
 * paid 신청자 backfill 용 — applicant 의 (id, name) list 를 받아 students INSERT.
 * 이미 promote 된 applicant 는 건너뜀.
 */
export async function backfillStudentsFromApplicants(
  cohortId: string,
  applicants: { id: string; name: string }[],
): Promise<{ inserted: number; skipped: number }> {
  const supabase = requireClient();
  if (applicants.length === 0) return { inserted: 0, skipped: 0 };

  // 이미 promote 된 applicant_id set.
  const { data: existing, error: readErr } = await supabase
    .from(TABLE)
    .select("applicant_id")
    .in(
      "applicant_id",
      applicants.map((a) => a.id),
    );
  if (readErr) throw new Error(readErr.message);
  const existingIds = new Set(
    (existing ?? []).map((r) => String((r as Record<string, unknown>).applicant_id)),
  );

  const toInsert = applicants
    .filter((a) => !existingIds.has(a.id))
    .map((a) => ({
      applicant_id: a.id,
      cohort_id: cohortId,
      display_name: a.name,
      status: "active" as const,
    }));

  if (toInsert.length === 0) {
    return { inserted: 0, skipped: applicants.length };
  }

  const { error: insertErr } = await supabase.from(TABLE).insert(toInsert);
  if (insertErr) throw new Error(insertErr.message);

  return {
    inserted: toInsert.length,
    skipped: applicants.length - toInsert.length,
  };
}
