"use server";

/**
 * Student Photo — signed URL 발급 server action (B0057).
 *
 * 학생 사진은 private bucket. UI 가 <img src=> 로 표시하려면 5분 TTL signed URL.
 *
 * 권한: assertCanReadStudentProfile(student_id) — super_admin / program admin /
 *   instructor (해당 cohort) / 학생 본인 통과.
 *
 * 반환:
 *   - status: ok + url: string : photo 가 등록되어 있고 발급 성공.
 *   - status: ok + url: null   : 사진 미등록. UI 는 placeholder.
 *   - status: error            : 권한 부족 또는 storage 오류.
 */
import { z } from "zod";
import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { createPhotoSignedUrl } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/student-photos-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GetPhotoSignedUrlResult =
  | { status: "ok"; url: string | null; uploaded_at: string | null }
  | { status: "error"; error: string };

export async function getStudentPhotoSignedUrlAction(
  input: unknown,
): Promise<GetPhotoSignedUrlResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const { student_id } = parsed.data;

  try {
    await assertCanReadStudentProfile(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data, error } = await supabase
    .from("student_profile")
    .select("photo_path, photo_uploaded_at")
    .eq("student_id", student_id)
    .maybeSingle();

  if (error) return { status: "error", error: error.message };

  const photoPath =
    typeof data?.photo_path === "string" ? data.photo_path : null;
  const uploadedAt =
    typeof data?.photo_uploaded_at === "string" ? data.photo_uploaded_at : null;

  if (!photoPath) {
    return { status: "ok", url: null, uploaded_at: null };
  }

  try {
    const { url } = await createPhotoSignedUrl(photoPath);
    return { status: "ok", url, uploaded_at: uploadedAt };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "signedUrlFailed",
    };
  }
}
