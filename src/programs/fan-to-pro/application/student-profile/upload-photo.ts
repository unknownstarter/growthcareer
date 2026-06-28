"use server";

/**
 * Student Photo — 업로드 server action (B0057).
 *
 * 입력 형식: data URL string (클라이언트가 canvas 리사이즈 후 base64 인코딩).
 *   - FormData / File 직접 받지 않는 이유: 클라이언트 리사이즈를 강제하고
 *     서버에서 큰 파일이 stream 으로 들어오는 비용 회피.
 *   - 5MB cap → base64 inflation 33% 감안하면 ~6.7MB raw text. Vercel
 *     server action body limit (4.5MB 기본) 와 충돌 가능 — 클라이언트 측
 *     resize + JPEG 변환으로 1MB 이하로 떨어뜨리는 게 정상 경로.
 *
 * 권한: assertCanWriteStudentProfile(student_id).
 *
 * 동작:
 *   1) zod 검증 + 권한 가드.
 *   2) data URL → Buffer 변환. size 재검증 (서버 측).
 *   3) 옛 path 가 다르면 (ext 변경) 명시적 delete (orphan 방지).
 *   4) Storage upload (upsert: true).
 *   5) student_profile.photo_path + photo_uploaded_at update (raw upsert
 *      — 다른 컬럼 reset 방지를 위해 update 만).
 *   6) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  buildPhotoPath,
  deleteStudentPhoto,
  uploadStudentPhoto,
  type AllowedPhotoMimeType,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/student-photos-storage";

const PHOTO_MIME_ENUM = z.enum(ALLOWED_PHOTO_MIME_TYPES);

const InputSchema = z.object({
  student_id: z.string().uuid(),
  mime: PHOTO_MIME_ENUM,
  // data URL — "data:image/jpeg;base64,...". 너무 큰 base64 문자열 차단.
  file_data_url: z
    .string()
    .min(32)
    // 5MB raw → base64 ~6.7MB. 여유 더해 8MB string 컷.
    .max(8 * 1024 * 1024)
    .regex(
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/,
      "invalid data url",
    ),
});

export type UploadStudentPhotoResult =
  | { status: "ok"; photo_path: string; uploaded_at: string }
  | { status: "error"; error: string };

export async function uploadStudentPhotoAction(
  input: unknown,
): Promise<UploadStudentPhotoResult> {
  // ----- 1. 입력 검증 -----
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const { student_id, mime, file_data_url } = parsed.data;

  // data URL 의 MIME 와 input.mime 일치 확인 (spoofing 차단).
  const headerMatch = /^data:(image\/(jpeg|png|webp));base64,/.exec(
    file_data_url,
  );
  if (!headerMatch || headerMatch[1] !== mime) {
    return { status: "error", error: "mimeMismatch" };
  }

  // ----- 2. 권한 가드 -----
  try {
    await assertCanWriteStudentProfile(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. base64 → Buffer + size 재검증 -----
  const base64 = file_data_url.split(",", 2)[1];
  if (!base64) return { status: "error", error: "invalidInput" };

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return { status: "error", error: "invalidBase64" };
  }
  if (buffer.length <= 0) return { status: "error", error: "fileEmpty" };
  if (buffer.length > MAX_PHOTO_SIZE_BYTES) {
    return { status: "error", error: "fileTooLarge" };
  }

  // ----- 4. 옛 path orphan 정리 -----
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const newPath = buildPhotoPath(student_id, mime as AllowedPhotoMimeType);

  const { data: existing } = await supabase
    .from("student_profile")
    .select("photo_path")
    .eq("student_id", student_id)
    .maybeSingle();

  const oldPath =
    typeof existing?.photo_path === "string" ? existing.photo_path : null;

  if (oldPath && oldPath !== newPath) {
    try {
      await deleteStudentPhoto(oldPath);
    } catch {
      // 비치명 — 진행. 새 파일이 우선.
    }
  }

  // ----- 5. Storage upload -----
  try {
    await uploadStudentPhoto(newPath, buffer, mime);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "uploadFailed",
    };
  }

  // ----- 6. DB write — row 존재 여부에 따라 update 또는 insert -----
  const uploadedAt = new Date().toISOString();
  const photoPatch = {
    photo_path: newPath,
    photo_uploaded_at: uploadedAt,
  };

  if (existing) {
    const { error: updateErr } = await supabase
      .from("student_profile")
      .update(photoPatch)
      .eq("student_id", student_id);
    if (updateErr) return { status: "error", error: updateErr.message };
  } else {
    // student_profile row 가 아직 없는 학생 — photo 만 채운 stub row.
    const { error: insertErr } = await supabase
      .from("student_profile")
      .insert({ student_id, ...photoPatch });
    if (insertErr) return { status: "error", error: insertErr.message };
  }

  // ----- 7. revalidate -----
  revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}`);
  revalidatePath(`/en/fan-to-pro/admin/students/${student_id}`);

  return { status: "ok", photo_path: newPath, uploaded_at: uploadedAt };
}
