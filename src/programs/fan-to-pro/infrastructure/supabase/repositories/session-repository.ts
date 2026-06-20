/**
 * Session repository — ADR 0005 §5.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  SessionSchema,
  type Session,
  type SessionStatus,
} from "@/src/programs/fan-to-pro/domain/entities/session";

const TABLE = "sessions";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** cohort 의 모든 session — starts_at ASC. */
export async function fetchSessionsByCohort(
  cohortId: string,
): Promise<Session[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => SessionSchema.parse(row));
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return SessionSchema.parse(data);
}

export type InsertSessionInput = {
  cohort_id: string;
  instructor_id?: string | null;
  title: string;
  location?: string | null;
  starts_at: string;
  ends_at: string;
  idx?: number | null;
  day_of_week?: "saturday" | "sunday" | null;
  topic?: string | null;
  notes?: string | null;
  status?: SessionStatus;
};

export async function insertSession(input: InsertSessionInput): Promise<Session> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      cohort_id: input.cohort_id,
      instructor_id: input.instructor_id ?? null,
      title: input.title,
      location: input.location ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      idx: input.idx ?? null,
      day_of_week: input.day_of_week ?? null,
      topic: input.topic ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "scheduled",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return SessionSchema.parse(data);
}

/** 여러 session 일괄 INSERT (단계 9 의 create-sessions use case 가 사용). */
export async function insertSessionsBulk(
  inputs: InsertSessionInput[],
): Promise<Session[]> {
  const supabase = requireClient();
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .insert(
      inputs.map((input) => ({
        cohort_id: input.cohort_id,
        instructor_id: input.instructor_id ?? null,
        title: input.title,
        location: input.location ?? null,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        idx: input.idx ?? null,
        day_of_week: input.day_of_week ?? null,
        topic: input.topic ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "scheduled",
      })),
    )
    .select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => SessionSchema.parse(row));
}

export async function updateSessionStatus(
  id: string,
  expectedStatus: SessionStatus,
  nextStatus: SessionStatus,
): Promise<{ status: "ok" } | { status: "stale" } | { status: "error"; error: string }> {
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
