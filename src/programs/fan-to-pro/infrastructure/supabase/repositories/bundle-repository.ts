/**
 * Bundle repository — B0068 ADR 0013.
 *
 * Bundle = 여러 course 조합 + 할인.
 * Repository 책임: Supabase row → entity 변환 + 단순 CRUD.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  BundleSchema,
  type Bundle,
  type BundleStatus,
} from "@/src/programs/fan-to-pro/domain/entities/bundle";

const TABLE = "bundles";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchBundlesByProgram(
  programId: string,
): Promise<Bundle[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => BundleSchema.parse(row));
}

export async function fetchBundleBySlug(
  programId: string,
  slug: string,
): Promise<Bundle | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return BundleSchema.parse(data);
}

export async function fetchBundleById(id: string): Promise<Bundle | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return BundleSchema.parse(data);
}

export async function fetchOpenBundlesByProgram(
  programId: string,
): Promise<Bundle[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("program_id", programId)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => BundleSchema.parse(row));
}

export type InsertBundleInput = {
  program_id: string;
  slug: string;
  title_ko: string;
  title_en?: string | null;
  description?: string | null;
  price_krw?: number | null;
  discount_percent?: number | null;
  status?: BundleStatus;
};

export async function insertBundle(input: InsertBundleInput): Promise<Bundle> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      program_id: input.program_id,
      slug: input.slug,
      title_ko: input.title_ko,
      title_en: input.title_en ?? null,
      description: input.description ?? null,
      price_krw: input.price_krw ?? null,
      discount_percent: input.discount_percent ?? null,
      status: input.status ?? "draft",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return BundleSchema.parse(data);
}

export async function updateBundleStatus(
  id: string,
  expectedStatus: BundleStatus,
  nextStatus: BundleStatus,
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
