"use server";

/**
 * Lecture Material — 파일 업로드 server action (B0044 LMS Launch Phase 1).
 *
 * 입력: FormData (file + cohort_id + session_id? + week_number? + title + description? + visibility?).
 *
 * 권한: assertCanUploadMaterial(cohortId, sessionId?).
 *
 * 동작:
 *   1) FormData 파싱 + zod 검증.
 *   2) 권한 가드 (cohort/session 매칭 포함).
 *   3) 파일 검증 (size — 1GB cap, MIME 없으면 거부).
 *   4) DB insert (file_path placeholder → id 받아서 path 결정 → Storage upload → file_path 업데이트).
 *      두 단계로 나누는 이유: storage path 가 material_id 를 포함하기 때문.
 *   5) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanUploadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  materialsTag,
  purgeTag,
} from "@/src/programs/fan-to-pro/application/queries/cache/cache-tags";
import {
  validateLectureFileInput,
  buildLectureMaterialPath,
  LectureMaterialVisibilitySchema,
  MIN_WEEK_NUMBER,
  MAX_WEEK_NUMBER,
  MAX_LECTURE_FILE_SIZE_VIA_SERVER_ACTION,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";
import {
  insertLectureMaterial,
  updateLectureMaterial,
  deleteLectureMaterial,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import {
  uploadLectureFile,
  deleteLectureFile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/lecture-materials-storage";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "isoTimestamp")
  .optional()
  .nullable();

const MetaSchema = z
  .object({
    cohort_id: z.string().uuid(),
    session_id: z.string().uuid().nullable().optional(),
    week_number: z
      .number()
      .int()
      .min(MIN_WEEK_NUMBER)
      .max(MAX_WEEK_NUMBER)
      .nullable()
      .optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).nullable().optional(),
    visibility: LectureMaterialVisibilitySchema.optional(),
    visible_from: isoTimestamp,
  })
  .refine(
    (m) => m.visibility !== "scheduled" || !!m.visible_from,
    { message: "visibility=scheduled requires visible_from" },
  );

export type UploadLectureMaterialResult =
  | { status: "ok"; material_id: string; file_path: string }
  | { status: "error"; error: string };

export async function uploadLectureMaterialAction(
  formData: FormData,
): Promise<UploadLectureMaterialResult> {
  // ----- 1. 입력 파싱 -----
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", error: "fileMissing" };
  }

  const rawWeek = formData.get("week_number");
  const rawSession = formData.get("session_id");
  const rawDescription = formData.get("description");
  const rawVisibility = formData.get("visibility");
  const rawVisibleFrom = formData.get("visible_from");

  const metaParsed = MetaSchema.safeParse({
    cohort_id: formData.get("cohort_id"),
    session_id:
      typeof rawSession === "string" && rawSession.length > 0
        ? rawSession
        : null,
    week_number:
      typeof rawWeek === "string" && rawWeek.length > 0 ? Number(rawWeek) : null,
    title: formData.get("title"),
    description:
      typeof rawDescription === "string" && rawDescription.length > 0
        ? rawDescription
        : null,
    visibility:
      typeof rawVisibility === "string" && rawVisibility.length > 0
        ? rawVisibility
        : undefined,
    visible_from:
      typeof rawVisibleFrom === "string" && rawVisibleFrom.length > 0
        ? rawVisibleFrom
        : null,
  });

  if (!metaParsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const meta = metaParsed.data;

  // ----- 2. 권한 가드 -----
  let uploadedBy: string;
  try {
    const u = await assertCanUploadMaterial(meta.cohort_id, meta.session_id ?? null);
    uploadedBy = u.id;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. 파일 검증 -----
  // 레거시 경로 (Server Action) 는 Vercel bodySizeLimit 로 100MB 상한 강제.
  // 대용량 (>100MB) 는 createLectureUploadUrlAction (signed URL) 사용.
  const fileError = validateLectureFileInput({
    size: file.size,
    mime: file.type,
  });
  if (fileError) return { status: "error", error: fileError };
  if (file.size > MAX_LECTURE_FILE_SIZE_VIA_SERVER_ACTION) {
    return { status: "error", error: "fileTooLargeForServerAction" };
  }

  // ----- 4. 두 단계 insert → upload → update -----
  // 4-1) DB 에 placeholder file_path 로 insert (id 확보).
  let materialId: string;
  try {
    const placeholderPath = `pending/${crypto.randomUUID()}`;
    const inserted = await insertLectureMaterial({
      cohort_id: meta.cohort_id,
      session_id: meta.session_id ?? null,
      week_number: meta.week_number ?? null,
      title: meta.title,
      description: meta.description ?? null,
      storage_method: "file_upload",
      file_path: placeholderPath,
      file_name: sanitizeFileName(file.name),
      file_size_bytes: file.size,
      mime_type: file.type,
      visibility: meta.visibility ?? "published",
      visible_from: meta.visible_from ?? null,
      uploaded_by: uploadedBy,
    });
    materialId = inserted.id;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "dbInsertFailed",
    };
  }

  // 4-2) Storage upload (확정 path).
  const finalPath = buildLectureMaterialPath(
    meta.cohort_id,
    materialId,
    file.type,
    file.name,
  );

  try {
    const buffer = await file.arrayBuffer();
    await uploadLectureFile(finalPath, buffer, file.type);
  } catch (err) {
    // rollback — DB row 삭제.
    try {
      await deleteLectureMaterial(materialId);
    } catch {
      // ignore — orphan row 로 남는 한이 있어도 사용자에 error 우선.
    }
    return {
      status: "error",
      error: err instanceof Error ? err.message : "uploadFailed",
    };
  }

  // 4-3) DB 의 file_path placeholder → 확정 path 로 update.
  try {
    const supabase = getSupabaseServer();
    if (!supabase) throw new Error("supabaseUnavailable");
    const { error } = await supabase
      .from("lecture_materials")
      .update({ file_path: finalPath })
      .eq("id", materialId);
    if (error) throw new Error(error.message);
  } catch (err) {
    // Storage 는 올라갔는데 DB 업데이트 실패 — orphan 파일.
    try {
      await deleteLectureFile(finalPath);
    } catch {
      // ignore
    }
    try {
      await deleteLectureMaterial(materialId);
    } catch {
      // ignore
    }
    return {
      status: "error",
      error: err instanceof Error ? err.message : "dbUpdateFailed",
    };
  }

  revalidateMaterialPaths(meta.cohort_id);

  return { status: "ok", material_id: materialId, file_path: finalPath };
}

function revalidateMaterialPaths(cohortId: string): void {
  // 캐시 태그 무효화 (cohort 공용 자료 목록) — Task #8.
  purgeTag(materialsTag(cohortId));
  // admin surface
  revalidatePath("/ko/fan-to-pro/admin/cohorts");
  revalidatePath("/en/fan-to-pro/admin/cohorts");
  revalidatePath("/ko/fan-to-pro/admin/materials");
  revalidatePath("/en/fan-to-pro/admin/materials");
  // student surface 의 cohortSlug 별 path 는 broad revalidate.
}

function sanitizeFileName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return stripped.slice(0, 200) || "untitled";
}
