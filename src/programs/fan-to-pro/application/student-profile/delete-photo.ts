"use server";

/**
 * Student Photo — 삭제 server action (B0057).
 *
 * 권한: assertCanWriteStudentProfile(student_id).
 *
 * 동작:
 *   1) 권한 가드.
 *   2) 현재 photo_path 조회.
 *   3) storage 에서 path 삭제 (silent — 없어도 진행).
 *   4) student_profile.photo_path / photo_uploaded_at 모두 null 로 update.
 *   5) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { deleteStudentPhoto } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/student-photos-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type DeleteStudentPhotoResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function deleteStudentPhotoAction(
  input: unknown,
): Promise<DeleteStudentPhotoResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const { student_id } = parsed.data;

  try {
    await assertCanWriteStudentProfile(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data: existing } = await supabase
    .from("student_profile")
    .select("photo_path")
    .eq("student_id", student_id)
    .maybeSingle();

  const photoPath =
    typeof existing?.photo_path === "string" ? existing.photo_path : null;

  if (photoPath) {
    try {
      await deleteStudentPhoto(photoPath);
    } catch {
      // 비치명 — DB 상태만 정리해도 사용자 입장에서 "삭제됨".
    }
  }

  const { error: updateErr } = await supabase
    .from("student_profile")
    .update({ photo_path: null, photo_uploaded_at: null })
    .eq("student_id", student_id);

  if (updateErr) {
    return { status: "error", error: updateErr.message };
  }

  revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}`);
  revalidatePath(`/en/fan-to-pro/admin/students/${student_id}`);

  return { status: "ok" };
}
