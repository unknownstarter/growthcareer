"use server";

/**
 * Lecture Material — 삭제 server action (B0044).
 *
 * 권한: assertCanUploadMaterial(material.cohort_id). 우선 material 조회 후 가드.
 *
 * 동작: Storage 파일 삭제 + DB row delete.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanUploadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  materialsTag,
  purgeTag,
} from "@/src/programs/fan-to-pro/application/queries/cache/cache-tags";
import {
  fetchLectureMaterialById,
  deleteLectureMaterial,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import { deleteLectureFile } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/lecture-materials-storage";

const InputSchema = z.object({
  material_id: z.string().uuid(),
});

export type DeleteMaterialResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function deleteLectureMaterialAction(
  input: unknown,
): Promise<DeleteMaterialResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { material_id } = parsed.data;

  let material;
  try {
    material = await fetchLectureMaterialById(material_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "fetchFailed",
    };
  }
  if (!material) return { status: "error", error: "notFound" };

  try {
    await assertCanUploadMaterial(material.cohort_id, material.session_id ?? null);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // Storage 파일 삭제 (file_upload 인 경우) — 실패해도 DB delete 진행.
  if (material.storage_method === "file_upload" && material.file_path) {
    try {
      await deleteLectureFile(material.file_path);
    } catch {
      // 비치명 — DB 삭제 우선.
    }
  }

  try {
    await deleteLectureMaterial(material_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "deleteFailed",
    };
  }

  purgeTag(materialsTag(material.cohort_id));
  revalidatePath("/ko/fan-to-pro/admin/materials");
  revalidatePath("/en/fan-to-pro/admin/materials");

  return { status: "ok" };
}
