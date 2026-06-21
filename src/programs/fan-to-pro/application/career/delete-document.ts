"use server";

/**
 * Career document — 삭제 server action.
 *
 * 권한: assertCanAccessStudentCareer(studentId).
 *
 * 동작:
 *   1) 권한 가드.
 *   2) 기존 doc 조회 — file_upload 면 Storage 파일도 삭제.
 *   3) DB row 삭제.
 *   4) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { CareerDocTypeSchema } from "@/src/programs/fan-to-pro/domain/entities/career-document";
import {
  fetchCareerDocument,
  deleteCareerDocument,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { deleteCareerFile } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
});

export type DeleteDocumentResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function deleteCareerDocumentAction(
  input: unknown,
): Promise<DeleteDocumentResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { student_id, doc_type } = parsed.data;

  try {
    await assertCanAccessStudentCareer(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const existing = await fetchCareerDocument(student_id, doc_type);
    if (!existing) {
      // 이미 없으면 idempotent.
      return { status: "ok" };
    }
    if (existing.storage_method === "file_upload" && existing.file_path) {
      try {
        await deleteCareerFile(existing.file_path);
      } catch {
        // 비치명 — DB 정리 우선.
      }
    }
    await deleteCareerDocument(student_id, doc_type);

    revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}`);
    revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}/career`);

    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
