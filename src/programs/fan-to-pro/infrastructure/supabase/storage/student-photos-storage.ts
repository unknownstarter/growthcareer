/**
 * Student Photos Storage helper (B0057).
 *
 * Bucket: student-photos (private, public=false).
 * service_role 만 직접 access — 호출자 (server action) 가 권한 가드 책임 (CLAUDE.md §7.4).
 *
 * Path 패턴: {student_id}.{jpg|png|webp}. 같은 path 에 덮어쓰기 (upsert: true).
 * 같은 student 가 png → jpg 로 바꿔 올리면 옛 path 가 orphan — server action 에서
 * existing.photo_path 와 newPath 가 다르면 옛 path 명시적 delete (career-documents 패턴 그대로).
 *
 * signed URL TTL: 5분. 페이지 로드마다 새로 발급. 학생 detail 페이지에 노출되는 만큼
 * 짧게 — 화면 캡처 후 URL 만 공유해도 5분 안에 만료.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export const STUDENT_PHOTOS_BUCKET = "student-photos";

/** signed URL TTL — 5 분. PII 차원에서 career-documents (1h) 보다 짧게. */
export const PHOTO_SIGNED_URL_TTL_SEC = 5 * 60;

/** type-별 cap (5MB). 마이그레이션 bucket cap 와 동기화. */
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

export const PHOTO_MIME_TO_EXT: Record<AllowedPhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function requireClient() {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");
  return supabase;
}

/** path 빌더 — student_id + ext. */
export function buildPhotoPath(
  studentId: string,
  mime: AllowedPhotoMimeType,
): string {
  return `${studentId}.${PHOTO_MIME_TO_EXT[mime]}`;
}

/** 업로드 — 같은 path 덮어쓰기 (upsert: true). cache-control 'no-store'. */
export async function uploadStudentPhoto(
  path: string,
  body: ArrayBuffer | Uint8Array | Buffer,
  mime: string,
): Promise<{ path: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .upload(path, body, {
      contentType: mime,
      upsert: true,
      cacheControl: "no-store",
    });
  if (error) throw new Error(error.message);
  return { path: data.path };
}

/** delete — 존재하지 않아도 silent. */
export async function deleteStudentPhoto(path: string): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .remove([path]);
  if (error) throw new Error(error.message);
}

/** 다운로드용 signed URL — 5분 유효. */
export async function createPhotoSignedUrl(
  path: string,
): Promise<{ url: string }> {
  const supabase = requireClient();
  const { data, error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .createSignedUrl(path, PHOTO_SIGNED_URL_TTL_SEC);
  if (error) throw new Error(error.message);
  return { url: data.signedUrl };
}
