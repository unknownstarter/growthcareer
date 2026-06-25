/**
 * Lecture Material repository (B0044 LMS Launch Phase 1).
 *
 * lecture_materials 테이블 CRUD. service_role 클라이언트 — RLS 우회.
 * 호출자 (server action) 가 권한 가드 책임 (CLAUDE.md §7.4).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  LectureMaterialSchema,
  type LectureMaterial,
  type LectureMaterialStorageMethod,
  type LectureMaterialVisibility,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

const TABLE = "lecture_materials";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** cohort 의 모든 자료 (운영자 view — visibility 무관). */
export async function fetchLectureMaterialsByCohort(
  cohortId: string,
): Promise<LectureMaterial[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("week_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => LectureMaterialSchema.parse(row));
}

/** 학생에게 가시한 자료만 (published 또는 scheduled-due). */
export async function fetchVisibleLectureMaterialsByCohort(
  cohortId: string,
): Promise<LectureMaterial[]> {
  const supabase = requireClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .or(
      `visibility.eq.published,and(visibility.eq.scheduled,visible_from.lte.${nowIso})`,
    )
    .order("week_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => LectureMaterialSchema.parse(row));
}

export async function fetchLectureMaterialById(
  id: string,
): Promise<LectureMaterial | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return LectureMaterialSchema.parse(data);
}

export type InsertLectureMaterialInput = {
  cohort_id: string;
  session_id?: string | null;
  week_number?: number | null;
  title: string;
  description?: string | null;
  storage_method: LectureMaterialStorageMethod;
  file_path?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  external_url?: string | null;
  visibility?: LectureMaterialVisibility;
  visible_from?: string | null;
  uploaded_by?: string | null;
};

export async function insertLectureMaterial(
  input: InsertLectureMaterialInput,
): Promise<LectureMaterial> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      cohort_id: input.cohort_id,
      session_id: input.session_id ?? null,
      week_number: input.week_number ?? null,
      title: input.title,
      description: input.description ?? null,
      storage_method: input.storage_method,
      file_path: input.file_path ?? null,
      file_name: input.file_name ?? null,
      file_size_bytes: input.file_size_bytes ?? null,
      mime_type: input.mime_type ?? null,
      external_url: input.external_url ?? null,
      visibility: input.visibility ?? "published",
      visible_from: input.visible_from ?? null,
      uploaded_by: input.uploaded_by ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return LectureMaterialSchema.parse(data);
}

export type UpdateLectureMaterialInput = {
  id: string;
  session_id?: string | null;
  week_number?: number | null;
  title?: string;
  description?: string | null;
  visibility?: LectureMaterialVisibility;
  visible_from?: string | null;
};

export async function updateLectureMaterial(
  input: UpdateLectureMaterialInput,
): Promise<LectureMaterial> {
  const supabase = requireClient();
  const patch: Record<string, unknown> = {};
  if (input.session_id !== undefined) patch.session_id = input.session_id;
  if (input.week_number !== undefined) patch.week_number = input.week_number;
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.visibility !== undefined) patch.visibility = input.visibility;
  if (input.visible_from !== undefined) patch.visible_from = input.visible_from;

  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return LectureMaterialSchema.parse(data);
}

export async function deleteLectureMaterial(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** material.cohort_id + session.cohort_id 일치 검증용 (server action 가드 안). */
export async function fetchSessionCohortId(
  sessionId: string,
): Promise<string | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("cohort_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.cohort_id as string | undefined) ?? null;
}
