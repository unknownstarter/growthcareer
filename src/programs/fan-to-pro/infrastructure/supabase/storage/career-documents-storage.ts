/**
 * Career Documents Storage helper (B0034 Wave A+).
 *
 * Bucket: career-documents (private, public=false).
 * 모든 operation 은 service_role — Storage RLS 우회. 호출자 (server action) 가
 * 권한 가드 책임 (CLAUDE.md §7.4).
 *
 * Path 패턴: {student_id}/{doc_type}.{ext}. 같은 path 에 덮어쓰기 — 기존 파일
 * 자동 교체. 단 학생이 storage_method 를 file_upload → external_url 로 바꿀 때는
 * 명시적 delete 필요 (orphan storage 방지).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export const CAREER_DOCUMENTS_BUCKET = "career-documents";

/** signed URL TTL — 1 시간. 다운로드 후 만료. */
export const DOWNLOAD_SIGNED_URL_TTL_SEC = 60 * 60;

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/**
 * 파일 업로드 — 같은 path 에 덮어쓰기 (upsert: true).
 *
 * @param path  buildStoragePath() 로 생성된 sanitized path.
 * @param body  raw bytes (ArrayBuffer 또는 Uint8Array).
 * @param mime  contentType.
 */
export async function uploadCareerFile(
  path: string,
  body: ArrayBuffer | Uint8Array,
  mime: string,
): Promise<{ path: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(CAREER_DOCUMENTS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: true,
      cacheControl: "no-store",
    });
  if (error) throw new Error(error.message);
  return { path: data.path };
}

/** path 의 파일 삭제. 존재하지 않아도 silent (delete 후 재호출 대비). */
export async function deleteCareerFile(path: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.storage
    .from(CAREER_DOCUMENTS_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}

/**
 * 다운로드용 signed URL — 1 시간 유효. URL 자체에 만료 토큰 포함.
 * 로그에 남기지 않을 것 (CLAUDE.md §7.4 — file_path 직접 노출 X).
 */
export async function createSignedDownloadUrl(
  path: string,
): Promise<{ url: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(CAREER_DOCUMENTS_BUCKET)
    .createSignedUrl(path, DOWNLOAD_SIGNED_URL_TTL_SEC);
  if (error) throw new Error(error.message);
  return { url: data.signedUrl };
}
