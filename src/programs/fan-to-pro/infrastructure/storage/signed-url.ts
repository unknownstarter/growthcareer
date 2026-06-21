/**
 * Supabase Storage signed URL helper.
 *
 * 사용처:
 * - 강의 자료 다운로드 (학생/강사)
 * - 컨설팅 자료 업로드/다운로드
 * - 과제 제출물
 *
 * Bucket 명명 규칙:
 * - lms-materials      : 강의 자료 (private)
 * - lms-submissions    : 과제 제출 (private)
 * - lms-consultations  : 컨설팅 자료 (private)
 * - lms-certificates   : 수료증 PDF (private)
 *
 * Bucket 은 Supabase Dashboard 에서 manual 생성 (Wave 2 노아 manual action).
 *
 * 모든 path 는 service_role 키 사용 — RLS 우회. 호출자 (server action) 가
 * 권한 가드 책임.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

export const STORAGE_BUCKETS = {
  materials: "lms-materials",
  submissions: "lms-submissions",
  consultations: "lms-consultations",
  certificates: "lms-certificates",
} as const;

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/**
 * 업로드용 signed URL 발급 (15분 TTL).
 * 호출자가 PUT 으로 직접 업로드 후 path 를 DB 에 저장.
 */
export async function createUploadSignedUrl(
  bucket: StorageBucket,
  path: string,
): Promise<
  | { status: "ok"; url: string; token: string; path: string }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) return { status: "error", error: error.message };
  return {
    status: "ok",
    url: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

/**
 * 다운로드용 signed URL 발급 (10분 TTL).
 */
export async function createDownloadSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSec: number = 600,
): Promise<
  | { status: "ok"; url: string }
  | { status: "error"; error: string }
> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec);

  if (error) return { status: "error", error: error.message };
  return { status: "ok", url: data.signedUrl };
}
