"use server";

/**
 * Career document — signed download URL 발급 server action.
 *
 * 1 시간 유효 signed URL 만 발급. 호출자는 새 탭에서 열거나 `<a download>` 로.
 *
 * 권한: assertCanAccessStudentCareer(studentId).
 *
 * 로그에 URL 자체를 남기지 않도록 주의 (CLAUDE.md §7.4).
 */
import { z } from "zod";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { CareerDocTypeSchema } from "@/src/programs/fan-to-pro/domain/entities/career-document";
import { fetchCareerDocument } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { createSignedDownloadUrl } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
});

export type SignedUrlResult =
  | { status: "ok"; url: string; file_name: string | null }
  | { status: "error"; error: string };

export async function getCareerSignedDownloadUrlAction(
  input: unknown,
): Promise<SignedUrlResult> {
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
    const doc = await fetchCareerDocument(student_id, doc_type);
    if (!doc) return { status: "error", error: "notFound" };
    if (doc.storage_method !== "file_upload" || !doc.file_path) {
      return { status: "error", error: "notFileUpload" };
    }
    const { url } = await createSignedDownloadUrl(doc.file_path);
    return { status: "ok", url, file_name: doc.file_name };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
