"use server";

/**
 * Career document — 파일 업로드 server action.
 *
 * 입력: FormData (file + student_id + doc_type + notes).
 *
 * 권한: assertCanAccessStudentCareer(studentId).
 *
 * 동작:
 *   1) FormData 파싱 + 권한 가드.
 *   2) server-side 파일 검증 (size + MIME — 브라우저 검증 신뢰 X).
 *   3) 기존 doc 가 file_upload 였고 ext 가 다르면 옛 파일 삭제 (storage path 가 다르므로 덮어쓰기 안 됨).
 *   4) Storage upload (upsert: true — 같은 path 면 자동 교체).
 *   5) DB upsert.
 *   6) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  CareerDocTypeSchema,
  validateFileInput,
  buildStoragePath,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import {
  fetchCareerDocument,
  upsertCareerDocumentFile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import {
  uploadCareerFile,
  deleteCareerFile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

const MetaSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});

export type UploadFileResult =
  | { status: "ok"; file_path: string }
  | { status: "error"; error: string };

export async function uploadCareerFileAction(
  formData: FormData,
): Promise<UploadFileResult> {
  // ----- 1. 입력 파싱 -----
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", error: "fileMissing" };
  }
  const rawNotes = formData.get("notes");
  const meta = MetaSchema.safeParse({
    student_id: formData.get("student_id"),
    doc_type: formData.get("doc_type"),
    notes: typeof rawNotes === "string" && rawNotes.length > 0 ? rawNotes : null,
  });
  if (!meta.success) return { status: "error", error: "invalidInput" };

  const { student_id, doc_type, notes } = meta.data;

  // ----- 2. 권한 가드 -----
  try {
    await assertCanAccessStudentCareer(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. 파일 검증 (서버 측 재검증) -----
  const fileSize = file.size;
  const fileMime = file.type;
  const fileError = validateFileInput({ size: fileSize, mime: fileMime });
  if (fileError) return { status: "error", error: fileError };

  // ----- 4. 기존 파일 정리 + 업로드 -----
  const newPath = buildStoragePath(student_id, doc_type, fileMime);

  try {
    const existing = await fetchCareerDocument(student_id, doc_type);
    // 같은 path 면 upsert: true 가 덮어쓰기 — 별도 삭제 불필요.
    // 다른 path (이전 ext 와 다름) 이면 옛 path 명시적 삭제.
    if (
      existing?.storage_method === "file_upload" &&
      existing.file_path &&
      existing.file_path !== newPath
    ) {
      try {
        await deleteCareerFile(existing.file_path);
      } catch {
        // 비치명 — 진행.
      }
    }

    const buffer = await file.arrayBuffer();
    await uploadCareerFile(newPath, buffer, fileMime);

    await upsertCareerDocumentFile({
      student_id,
      doc_type,
      file_path: newPath,
      file_name: sanitizeFileName(file.name),
      file_size_bytes: fileSize,
      mime_type: fileMime,
      notes: notes ?? null,
    });

    revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}`);
    revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}/career`);

    return { status: "ok", file_path: newPath };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "uploadFailed",
    };
  }
}

/**
 * 파일명 sanitize — DB 표시용. 200자 컷 + control char (0x00-0x1F, 0x7F) 제거.
 * Storage path 에는 사용 X (buildStoragePath 가 강제 패턴).
 */
function sanitizeFileName(raw: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return stripped.slice(0, 200) || "untitled";
}
