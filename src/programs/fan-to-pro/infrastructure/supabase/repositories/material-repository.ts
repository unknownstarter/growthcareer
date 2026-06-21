/**
 * Material repository — Wave 2 강의 자료.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  MaterialSchema,
  type Material,
  type MaterialStatus,
} from "@/src/programs/fan-to-pro/domain/entities/material";

const TABLE = "materials";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchMaterialsByCohort(
  cohortId: string,
): Promise<Material[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => MaterialSchema.parse(row));
}

export async function fetchPublishedMaterialsByCohort(
  cohortId: string,
): Promise<Material[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => MaterialSchema.parse(row));
}

export async function fetchMaterialById(id: string): Promise<Material | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return MaterialSchema.parse(data);
}

export type InsertMaterialInput = {
  cohort_id: string;
  session_id?: string | null;
  uploaded_by?: string | null;
  title: string;
  description?: string | null;
  file_path: string;
  file_size_bytes?: number | null;
  mime_type?: string | null;
  status?: MaterialStatus;
};

export async function insertMaterial(
  input: InsertMaterialInput,
): Promise<Material> {
  const supabase = requireClient();
  const now = new Date().toISOString();
  const status = input.status ?? "draft";
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      cohort_id: input.cohort_id,
      session_id: input.session_id ?? null,
      uploaded_by: input.uploaded_by ?? null,
      title: input.title,
      description: input.description ?? null,
      file_path: input.file_path,
      file_size_bytes: input.file_size_bytes ?? null,
      mime_type: input.mime_type ?? null,
      status,
      published_at: status === "published" ? now : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return MaterialSchema.parse(data);
}

export async function updateMaterialStatus(
  id: string,
  nextStatus: MaterialStatus,
): Promise<Material> {
  const supabase = requireClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "published") patch.published_at = now;
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return MaterialSchema.parse(data);
}

export async function deleteMaterial(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
