/**
 * Announcement repository — Wave 2 공지.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  AnnouncementSchema,
  type Announcement,
  type AnnouncementStatus,
} from "@/src/programs/fan-to-pro/domain/entities/announcement";

const TABLE = "announcements";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

export async function fetchAnnouncementsByCohort(
  cohortId: string,
): Promise<Announcement[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AnnouncementSchema.parse(row));
}

export async function fetchPublishedAnnouncementsByCohort(
  cohortId: string,
): Promise<Announcement[]> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("cohort_id", cohortId)
    .eq("status", "published")
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => AnnouncementSchema.parse(row));
}

/** id 로 단일 공지. 캐시 무효화 시 cohort_id 조회용. 없으면 null. */
export async function fetchAnnouncementById(
  id: string,
): Promise<Announcement | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return AnnouncementSchema.parse(data);
}

export type InsertAnnouncementInput = {
  cohort_id: string;
  created_by?: string | null;
  title: string;
  body: string;
  pinned?: boolean;
  status?: AnnouncementStatus;
};

export async function insertAnnouncement(
  input: InsertAnnouncementInput,
): Promise<Announcement> {
  const supabase = requireClient();
  const status = input.status ?? "draft";
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      cohort_id: input.cohort_id,
      created_by: input.created_by ?? null,
      title: input.title,
      body: input.body,
      pinned: input.pinned ?? false,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return AnnouncementSchema.parse(data);
}

export async function updateAnnouncementStatus(
  id: string,
  nextStatus: AnnouncementStatus,
): Promise<Announcement> {
  const supabase = requireClient();
  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "published") patch.published_at = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return AnnouncementSchema.parse(data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
