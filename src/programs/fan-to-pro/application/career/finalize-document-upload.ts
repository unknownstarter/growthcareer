"use server";

/**
 * Career Document — Signed Upload 완료 후 finalize (B0067 slice 1).
 *
 * Flow (create-signed-upload-url.ts 참조):
 *   1) create-signed → { path, signed_url }
 *   2) client PUT
 *   3) 본 action: 소유권 + Storage 재확인 + DB upsert
 *
 * career-documents 는 studentId + doc_type 이 unique. upsert 로 덮어쓰기.
 *
 * Sage 검토 대상:
 *   - path 소유권 = studentId prefix 확인 (cross-student orphan 방지).
 *   - MIME 재검증 (client 신뢰 X).
 *   - Storage size 재확인.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CareerDocTypeSchema,
  ALLOWED_MIME_TYPES,
  maxFileSizeForDocType,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import {
  fetchCareerDocument,
  upsertCareerDocumentFile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import {
  CAREER_DOCUMENTS_BUCKET,
  deleteCareerFile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
  path: z.string().min(1).max(500),
  file_name: z.string().trim().min(1).max(200),
  mime_type: z.string().min(1).max(200),
  file_size_bytes: z.number().int().positive(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type FinalizeCareerUploadInput = z.infer<typeof InputSchema>;

export type FinalizeCareerUploadResult =
  | { status: "ok"; file_path: string }
  | { status: "error"; error: string };

export async function finalizeCareerUploadAction(
  input: FinalizeCareerUploadInput,
): Promise<FinalizeCareerUploadResult> {
  // ----- 1. 입력 검증 -----
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  const data = parsed.data;

  // ----- 2. 권한 가드 -----
  try {
    await assertCanAccessStudentCareer(data.student_id);
  } catch (err) {
    await tryDeleteOrphan(data.path);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. path 소유권 검증 (Sage: cross-student orphan 방지) -----
  // buildStoragePath 패턴: {student_id}/{doc_type}.{ext}
  if (!data.path.startsWith(`${data.student_id}/`)) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: "pathStudentMismatch" };
  }

  // ----- 4. MIME whitelist 재검증 -----
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(data.mime_type)) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: "mimeNotAllowed" };
  }

  // ----- 5. size cap 재검증 -----
  const cap = maxFileSizeForDocType(data.doc_type);
  if (data.file_size_bytes > cap) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: "fileTooLarge" };
  }

  // ----- 6. Storage 재확인 -----
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const verified = await verifyStorageObject(
    supabase,
    data.path,
    data.file_size_bytes,
    cap,
  );
  if (!verified.ok) {
    await tryDeleteOrphan(data.path);
    return { status: "error", error: verified.error };
  }

  // ----- 7. 기존 doc 정리 (path 가 다르면 옛 파일 삭제) -----
  // path 는 mime → ext 로 결정 — 같은 doc_type 이라도 mime 바뀌면 path 다름.
  try {
    const existing = await fetchCareerDocument(data.student_id, data.doc_type);
    if (
      existing?.storage_method === "file_upload" &&
      existing.file_path &&
      existing.file_path !== data.path
    ) {
      try {
        await deleteCareerFile(existing.file_path);
      } catch {
        // 비치명 — 진행.
      }
    }
  } catch {
    // fetchCareerDocument 실패는 비치명 — 새 row 로 진행.
  }

  // ----- 8. DB upsert -----
  try {
    await upsertCareerDocumentFile({
      student_id: data.student_id,
      doc_type: data.doc_type,
      file_path: data.path,
      file_name: sanitizeDisplayName(data.file_name),
      file_size_bytes: verified.size,
      mime_type: data.mime_type,
      notes: data.notes ?? null,
    });
  } catch (err) {
    await tryDeleteOrphan(data.path);
    return {
      status: "error",
      error: err instanceof Error ? err.message : "dbUpsertFailed",
    };
  }

  // ----- 9. revalidate -----
  revalidatePath(`/ko/fan-to-pro/admin/students/${data.student_id}`);
  revalidatePath(`/ko/fan-to-pro/admin/students/${data.student_id}/career`);

  return { status: "ok", file_path: data.path };
}

async function verifyStorageObject(
  supabase: ReturnType<typeof getSupabaseServer>,
  path: string,
  expectedSize: number,
  cap: number,
): Promise<{ ok: true; size: number } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "supabaseUnavailable" };

  const lastSlash = path.lastIndexOf("/");
  const dir = lastSlash > 0 ? path.slice(0, lastSlash) : "";
  const fileName = path.slice(lastSlash + 1);

  const { data: list, error } = await supabase.storage
    .from(CAREER_DOCUMENTS_BUCKET)
    .list(dir, { search: fileName });

  if (error) return { ok: false, error: `storageListFailed:${error.message}` };
  if (!list || list.length === 0) return { ok: false, error: "objectMissing" };

  const found = list.find((o) => o.name === fileName);
  if (!found) return { ok: false, error: "objectMissing" };

  const storageSize =
    (found.metadata as { size?: number } | null)?.size ?? null;
  if (storageSize === null) return { ok: false, error: "objectSizeMissing" };

  if (Math.abs(storageSize - expectedSize) > expectedSize * 0.02 + 1024) {
    return { ok: false, error: "sizeMismatch" };
  }
  if (storageSize > cap) return { ok: false, error: "fileTooLarge" };

  return { ok: true, size: storageSize };
}

async function tryDeleteOrphan(path: string): Promise<void> {
  try {
    await deleteCareerFile(path);
  } catch {
    // best-effort
  }
}

function sanitizeDisplayName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return stripped.slice(0, 200) || "untitled";
}
