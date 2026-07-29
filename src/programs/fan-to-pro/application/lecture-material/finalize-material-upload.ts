"use server";

/**
 * Lecture Material — Signed Upload 완료 후 finalize (B0067 slice 1).
 *
 * Flow (create-signed-upload-url.ts 참조):
 *   1) create-signed-upload-url → { material_id, path, signed_url }
 *   2) client 가 PUT signed_url (직접 Storage)
 *   3) 본 action 호출 → Storage 확인 + DB INSERT + revalidate
 *
 * 왜 upload 성공을 서버가 확인해야 하나?
 *   - Client 조작 우려. signed URL 을 받은 뒤 PUT 안 하고 finalize 만 호출해서
 *     phantom row 만들 수 있음. Storage 에 실제 object 존재 확인 필수.
 *   - Storage 의 file_size / mime 로 client 신뢰 값 재검증.
 *
 * 권한: assertCanUploadMaterial (재검증).
 *
 * Sage 검토 대상:
 *   - path 소유권: client 가 넘긴 path 가 자기 cohort 인지 확인 (path prefix 검증).
 *   - Storage 재확인 (list + file_size).
 *   - MIME 서버 재확인 (client 보낸 값 vs Storage metadata) — lecture 는 all-MIME
 *     이라 우선순위 낮으나 로깅.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanUploadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  materialsTag,
  purgeTag,
} from "@/src/programs/fan-to-pro/application/queries/cache/cache-tags";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  LectureMaterialVisibilitySchema,
  MAX_WEEK_NUMBER,
  MIN_WEEK_NUMBER,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";
import { insertLectureMaterial } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import {
  deleteLectureFile,
  LECTURE_MATERIALS_BUCKET,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/lecture-materials-storage";
import { MAX_LECTURE_UPLOAD_BYTES } from "@/src/programs/fan-to-pro/application/lecture-material/create-signed-upload-url";

const isoTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "isoTimestamp")
  .optional()
  .nullable();

const InputSchema = z
  .object({
    material_id: z.string().uuid(),
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

    // upload 결과 (client 가 전달, 서버가 Storage 재확인).
    path: z.string().min(1).max(500),
    file_name: z.string().trim().min(1).max(200),
    mime_type: z.string().min(1).max(200),
    file_size_bytes: z.number().int().positive().max(MAX_LECTURE_UPLOAD_BYTES),
  })
  .refine((m) => m.visibility !== "scheduled" || !!m.visible_from, {
    message: "visibility=scheduled requires visible_from",
  });

export type FinalizeMaterialUploadInput = z.infer<typeof InputSchema>;

export type FinalizeMaterialUploadResult =
  | { status: "ok"; material_id: string; file_path: string }
  | { status: "error"; error: string };

export async function finalizeMaterialUploadAction(
  input: FinalizeMaterialUploadInput,
): Promise<FinalizeMaterialUploadResult> {
  // ----- 1. 입력 검증 -----
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const data = parsed.data;

  // ----- 2. 권한 가드 -----
  let uploadedBy: string;
  try {
    const u = await assertCanUploadMaterial(
      data.cohort_id,
      data.session_id ?? null,
    );
    uploadedBy = u.id;
  } catch (err) {
    // Storage 파일 정리 시도 (best-effort).
    await tryDeleteOrphan(data.path);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. path 소유권 검증 (Sage: cross-cohort orphan 방지) -----
  // buildLectureMaterialPath 패턴: {cohort_id}/{material_id}.{ext}
  if (!data.path.startsWith(`${data.cohort_id}/`)) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: "pathCohortMismatch" };
  }

  // ----- 4. Storage 재확인 -----
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const verified = await verifyStorageObject(
    supabase,
    data.path,
    data.file_size_bytes,
  );
  if (!verified.ok) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: verified.error };
  }

  // ----- 5. DB INSERT -----
  try {
    // Sage HIGH-1 fix (2026-07-11): storage path 안 material_id 를 DB.id 로 강제.
    // 이렇게 하면 file_path 안 uuid === lecture_materials.id 정합성 유지.
    await insertLectureMaterial({
      id: data.material_id,
      cohort_id: data.cohort_id,
      session_id: data.session_id ?? null,
      week_number: data.week_number ?? null,
      title: data.title,
      description: data.description ?? null,
      storage_method: "file_upload",
      file_path: data.path,
      file_name: sanitizeDisplayName(data.file_name),
      file_size_bytes: verified.size, // Storage 값 우선
      mime_type: data.mime_type,
      visibility: data.visibility ?? "published",
      visible_from: data.visible_from ?? null,
      uploaded_by: uploadedBy,
    });
  } catch (err) {
    // DB 실패 시 orphan 파일 정리.
    await tryDeleteOrphan(data.path);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "dbInsertFailed",
    };
  }

  // ----- 6. revalidate -----
  purgeTag(materialsTag(data.cohort_id));
  revalidatePath("/ko/fan-to-pro/admin/cohorts");
  revalidatePath("/en/fan-to-pro/admin/cohorts");
  revalidatePath("/ko/fan-to-pro/admin/materials");
  revalidatePath("/en/fan-to-pro/admin/materials");

  return { status: "ok", material_id: data.material_id, file_path: data.path };
}

/**
 * Storage 에 object 실제 존재 확인 + size 재확인.
 *
 * Supabase Storage 는 upload 후 metadata 를 list() 로 노출. 그러나 list() 는
 * bucket root 만 지원 → 개별 path 확인은 createSignedUrl 로 우회 (성공하면 존재).
 * 여기선 list() 로 dir 조회 + name 매칭.
 */
async function verifyStorageObject(
  supabase: ReturnType<typeof getSupabaseServer>,
  path: string,
  expectedSize: number,
): Promise<{ ok: true; size: number } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "supabaseUnavailable" };

  const lastSlash = path.lastIndexOf("/");
  const dir = lastSlash > 0 ? path.slice(0, lastSlash) : "";
  const fileName = path.slice(lastSlash + 1);

  const { data: list, error } = await supabase.storage
    .from(LECTURE_MATERIALS_BUCKET)
    .list(dir, { search: fileName });

  if (error) return { ok: false, error: `storageListFailed:${error.message}` };
  if (!list || list.length === 0) return { ok: false, error: "objectMissing" };

  const found = list.find((o) => o.name === fileName);
  if (!found) return { ok: false, error: "objectMissing" };

  const storageSize =
    (found.metadata as { size?: number } | null)?.size ?? null;
  if (storageSize === null) {
    return { ok: false, error: "objectSizeMissing" };
  }

  // client 신뢰 size vs Storage 실제 size 비교 (2% 여유 — multipart overhead).
  if (Math.abs(storageSize - expectedSize) > expectedSize * 0.02 + 1024) {
    return { ok: false, error: "sizeMismatch" };
  }

  if (storageSize > MAX_LECTURE_UPLOAD_BYTES) {
    return { ok: false, error: "fileTooLarge" };
  }

  return { ok: true, size: storageSize };
}

async function tryDeleteOrphan(path: string): Promise<void> {
  try {
    await deleteLectureFile(path);
  } catch {
    // best-effort — orphan 남더라도 사용자 error 우선.
  }
}

function sanitizeDisplayName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return stripped.slice(0, 200) || "untitled";
}
