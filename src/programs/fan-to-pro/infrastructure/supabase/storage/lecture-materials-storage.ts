/**
 * Lecture Materials Storage helper (B0044 LMS Launch Phase 1).
 *
 * Bucket: lecture-materials (private, public=false).
 * 모든 operation 은 service_role — Storage RLS 우회. 호출자 (server action) 가
 * 권한 가드 책임 (CLAUDE.md §7.4).
 *
 * Path 패턴: {cohort_id}/{material_id}.{ext}. (buildLectureMaterialPath 참조)
 *
 * Signed URL TTL: 5 분 (300초). ADR 0011 §8 — 학생 다운로드 시작 직후 만료 무관.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { LECTURE_MATERIAL_SIGNED_URL_TTL_SEC } from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

export const LECTURE_MATERIALS_BUCKET = "lecture-materials";

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/**
 * 파일 업로드. 같은 path 면 덮어쓰기 (upsert: true).
 */
export async function uploadLectureFile(
  path: string,
  body: ArrayBuffer | Uint8Array,
  mime: string,
): Promise<{ path: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(LECTURE_MATERIALS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: true,
      cacheControl: "no-store",
    });
  if (error) throw new Error(error.message);
  return { path: data.path };
}

/** path 의 파일 삭제. 존재하지 않아도 silent. */
export async function deleteLectureFile(path: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.storage
    .from(LECTURE_MATERIALS_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}

/**
 * 다운로드용 signed URL — 5 분 유효.
 * 로그에 URL 자체를 남기지 않을 것 (CLAUDE.md §7.4).
 */
export async function createLectureSignedDownloadUrl(
  path: string,
  options?: { downloadFileName?: string },
): Promise<{ url: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(LECTURE_MATERIALS_BUCKET)
    .createSignedUrl(path, LECTURE_MATERIAL_SIGNED_URL_TTL_SEC, {
      download: options?.downloadFileName ?? true,
    });
  if (error) throw new Error(error.message);
  return { url: data.signedUrl };
}
