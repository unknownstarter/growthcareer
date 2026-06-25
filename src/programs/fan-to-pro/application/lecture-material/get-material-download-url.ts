"use server";

/**
 * Lecture Material — signed download URL 발급 server action (B0044).
 *
 * 5분 TTL. 호출자는 새 탭에서 열거나 `<a download>` 로.
 *
 * 권한: assertCanDownloadMaterial(materialId).
 *
 * external_url 모드면 그대로 URL 반환 (signed URL X — 외부 link).
 *
 * 로그에 URL 자체를 남기지 않도록 주의 (CLAUDE.md §7.4).
 */
import { z } from "zod";
import { assertCanDownloadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { createLectureSignedDownloadUrl } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/lecture-materials-storage";

const InputSchema = z.object({
  material_id: z.string().uuid(),
});

export type GetMaterialDownloadUrlResult =
  | {
      status: "ok";
      kind: "file_upload";
      url: string;
      file_name: string | null;
    }
  | { status: "ok"; kind: "external_url"; url: string }
  | { status: "error"; error: string };

export async function getMaterialDownloadUrlAction(
  input: unknown,
): Promise<GetMaterialDownloadUrlResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { material_id } = parsed.data;

  let material;
  try {
    const result = await assertCanDownloadMaterial(material_id);
    material = result.material;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  if (material.storage_method === "external_url") {
    if (!material.external_url) {
      return { status: "error", error: "externalUrlMissing" };
    }
    return {
      status: "ok",
      kind: "external_url",
      url: material.external_url,
    };
  }

  if (!material.file_path) {
    return { status: "error", error: "filePathMissing" };
  }

  try {
    const { url } = await createLectureSignedDownloadUrl(material.file_path, {
      downloadFileName: material.file_name ?? undefined,
    });
    return {
      status: "ok",
      kind: "file_upload",
      url,
      file_name: material.file_name,
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "signFailed",
    };
  }
}
