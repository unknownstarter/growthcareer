"use server";

/**
 * Lecture Material — Signed Upload URL 발급 server action (B0067 slice 1).
 *
 * 배경: Vercel Server Action bodySizeLimit (실질 100MB 상한) 우회.
 * client 가 signed URL 로 Supabase Storage 에 직접 PUT. Vercel Function 미경유.
 *
 * Flow:
 *   1) client: file 선택 → 본 action 호출 (fileName + mime + size + meta)
 *   2) server: 가드 + sanitize + material_id 예약 + signed URL 발급
 *   3) client: PUT signedUrl (progress bar 표시)
 *   4) client: finalize action 호출 (material_id + path 확정 → DB INSERT)
 *
 * 왜 material_id 를 여기서 발급하나?
 *   - Storage path 패턴 = {cohort_id}/{material_id}.{ext} — buildLectureMaterialPath.
 *   - upload 성공 후 finalize 시 같은 id 로 DB row INSERT.
 *   - 실패 시 orphan Storage 파일만 남음 (finalize 실패 시 삭제 처리).
 *
 * 권한: assertCanUploadMaterial (기존 가드 재사용).
 *
 * TTL: Supabase signed upload URL default = 2 시간 (변경 불가). 대용량 500MB
 *      네트워크 느린 사용자 여유.
 *
 * Sage 검토 대상 (path traversal / soverignty):
 *   - fileName 은 sanitize (control char / '../' 제거) — storage path 에 직접 사용 X.
 *   - material_id 는 서버 생성 crypto.randomUUID() — client 조작 불가.
 *   - cohortId 소유권 검증 = assertCanUploadMaterial (super_admin / program admin /
 *     cohort instructor).
 */
import { z } from "zod";
import { assertCanUploadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  buildLectureMaterialPath,
  MAX_WEEK_NUMBER,
  MIN_WEEK_NUMBER,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";
import { LECTURE_MATERIALS_BUCKET } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/lecture-materials-storage";

/**
 * lecture-materials bucket 은 all-MIME 허용. size cap = 500MB (bucket-level
 * file_size_limit 로 강제됨. Supabase 가 upload 시점에 reject).
 */
export const MAX_LECTURE_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

const InputSchema = z.object({
  cohort_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
  week_number: z
    .number()
    .int()
    .min(MIN_WEEK_NUMBER)
    .max(MAX_WEEK_NUMBER)
    .nullable()
    .optional(),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  file_size_bytes: z.number().int().positive().max(MAX_LECTURE_UPLOAD_BYTES),
});

export type CreateLectureUploadUrlInput = z.infer<typeof InputSchema>;

export type CreateLectureUploadUrlResult =
  | {
      status: "ok";
      material_id: string;
      path: string;
      signed_url: string;
      token: string;
      /** 초 단위. Supabase 기본 2 시간. */
      expires_in_sec: number;
    }
  | { status: "error"; error: string };

/**
 * Signed upload URL 발급. DB INSERT 는 finalize 에서.
 */
export async function createLectureUploadUrlAction(
  input: CreateLectureUploadUrlInput,
): Promise<CreateLectureUploadUrlResult> {
  // ----- 1. 입력 검증 -----
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const data = parsed.data;

  // ----- 2. 권한 가드 -----
  try {
    await assertCanUploadMaterial(data.cohort_id, data.session_id ?? null);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. fileName sanitize (Sage: path traversal 방어) -----
  const safeName = sanitizeFileName(data.file_name);
  if (!safeName) {
    return { status: "error", error: "invalidFileName" };
  }

  // ----- 4. material_id 예약 + path 구성 -----
  const materialId = crypto.randomUUID();
  const path = buildLectureMaterialPath(
    data.cohort_id,
    materialId,
    data.mime_type,
    safeName,
  );

  // ----- 5. signed upload URL 발급 -----
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { status: "error", error: "supabaseUnavailable" };
  }

  const { data: signed, error } = await supabase.storage
    .from(LECTURE_MATERIALS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !signed) {
    return {
      status: "error",
      error: error?.message ?? "signedUrlFailed",
    };
  }

  return {
    status: "ok",
    material_id: materialId,
    path,
    signed_url: signed.signedUrl,
    token: signed.token,
    expires_in_sec: 60 * 60 * 2, // Supabase 기본 2 시간
  };
}

/**
 * 사용자 입력 파일명 sanitize.
 * - control char / null byte 제거
 * - path separator ('/' '\') 제거 — display-only.
 * - trim + 255 자 컷.
 *
 * 반환값이 empty 면 caller 가 invalidFileName 처리.
 */
function sanitizeFileName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "");
  const noSep = stripped.replace(/[/\\]/g, "_");
  const noDotDot = noSep.replace(/\.\.+/g, ".");
  return noDotDot.trim().slice(0, 255);
}
