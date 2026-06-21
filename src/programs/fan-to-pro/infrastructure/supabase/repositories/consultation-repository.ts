/**
 * Consultation + ConsultationReview repository — Wave 2.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  ConsultationSchema,
  ConsultationReviewSchema,
  type Consultation,
  type ConsultationReview,
  type ConsultationKind,
  type ConsultationStatus,
} from "@/src/programs/fan-to-pro/domain/entities/consultation";

const TABLE = "consultations";
const REVIEW_TABLE = "consultation_reviews";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchConsultationsByStudent(
  studentId: string,
): Promise<Consultation[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ConsultationSchema.parse(row));
}

export async function fetchAllConsultations(): Promise<Consultation[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ConsultationSchema.parse(row));
}

export async function fetchConsultationById(
  id: string,
): Promise<Consultation | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return ConsultationSchema.parse(data);
}

export async function fetchLatestVersion(
  studentId: string,
  kind: ConsultationKind,
): Promise<number> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("version")
    .eq("student_id", studentId)
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const top = (data ?? [])[0] as { version?: number } | undefined;
  return top?.version ?? 0;
}

export type InsertConsultationInput = {
  student_id: string;
  kind: ConsultationKind;
  version: number;
  file_path?: string | null;
  body?: string | null;
  status?: ConsultationStatus;
};

export async function insertConsultation(
  input: InsertConsultationInput,
): Promise<Consultation> {
  const supabase = requireClient();
  const status = input.status ?? "submitted";
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      student_id: input.student_id,
      kind: input.kind,
      version: input.version,
      file_path: input.file_path ?? null,
      body: input.body ?? null,
      status,
      submitted_at: status === "submitted" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return ConsultationSchema.parse(data);
}

export async function updateConsultationStatus(
  id: string,
  nextStatus: ConsultationStatus,
): Promise<Consultation> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: nextStatus })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return ConsultationSchema.parse(data);
}

export async function fetchReviewsByConsultation(
  consultationId: string,
): Promise<ConsultationReview[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(REVIEW_TABLE)
    .select("*")
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ConsultationReviewSchema.parse(row));
}

export async function insertConsultationReview(input: {
  consultation_id: string;
  instructor_id?: string | null;
  body: string;
}): Promise<ConsultationReview> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(REVIEW_TABLE)
    .insert({
      consultation_id: input.consultation_id,
      instructor_id: input.instructor_id ?? null,
      body: input.body,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return ConsultationReviewSchema.parse(data);
}
