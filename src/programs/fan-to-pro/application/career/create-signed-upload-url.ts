"use server";

/**
 * Career Document — Signed Upload URL 발급 server action (B0067 slice 1).
 *
 * 배경: Vercel Server Action bodySizeLimit 우회. 포트폴리오 최대 50MB — Vercel
 * 상한 근접해 실패 잦음. client direct upload 로 우회.
 *
 * Flow (create → finalize):
 *   1) client: file 선택 → 본 action 호출
 *   2) server: 가드 + MIME whitelist + size cap (doc_type 별) + path 생성
 *   3) client: PUT signed_url (progress bar)
 *   4) client: finalize action 호출
 *
 * 권한: assertCanAccessStudentCareer (기존 가드).
 *
 * MIME whitelist: entity 의 ALLOWED_MIME_TYPES + doc_type 별 size cap.
 * bucket-level file_size_limit = 50MB 강제 (Supabase reject).
 *
 * Sage 검토 대상:
 *   - MIME 서버 whitelist 검증 (client 우회 방지) — bucket-level 도 강제되지만 이중.
 *   - path traversal — buildStoragePath 는 studentId + doc_type + ext 로만 구성.
 *     사용자 file_name 은 path 미사용 (display-only).
 *   - 소유권 = assertCanAccessStudentCareer.
 */
import { z } from "zod";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  CareerDocTypeSchema,
  ALLOWED_MIME_TYPES,
  maxFileSizeForDocType,
  buildStoragePath,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import { CAREER_DOCUMENTS_BUCKET } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

const InputSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(200),
  file_size_bytes: z.number().int().positive(),
});

export type CreateCareerUploadUrlInput = z.infer<typeof InputSchema>;

export type CreateCareerUploadUrlResult =
  | {
      status: "ok";
      path: string;
      signed_url: string;
      token: string;
      expires_in_sec: number;
    }
  | { status: "error"; error: string };

export async function createCareerUploadUrlAction(
  input: CreateCareerUploadUrlInput,
): Promise<CreateCareerUploadUrlResult> {
  // ----- 1. 입력 검증 -----
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const data = parsed.data;

  // ----- 2. 권한 가드 -----
  try {
    await assertCanAccessStudentCareer(data.student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  // ----- 3. MIME whitelist (Sage: 서버 재검증) -----
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(data.mime_type)) {
    return { status: "error", error: "mimeNotAllowed" };
  }

  // ----- 4. doc_type 별 size cap -----
  const cap = maxFileSizeForDocType(data.doc_type);
  if (data.file_size_bytes > cap) {
    return { status: "error", error: "fileTooLarge" };
  }

  // ----- 5. path 생성 (studentId + doc_type + mime → ext) -----
  const path = buildStoragePath(data.student_id, data.doc_type, data.mime_type);

  // ----- 6. signed upload URL 발급 -----
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // upsert 를 지원해야 함 — 같은 studentId+doc_type 은 path 가 같아 덮어쓰기.
  // Supabase signed upload URL 은 upsert 옵션 지원.
  const { data: signed, error } = await supabase.storage
    .from(CAREER_DOCUMENTS_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !signed) {
    return {
      status: "error",
      error: error?.message ?? "signedUrlFailed",
    };
  }

  return {
    status: "ok",
    path,
    signed_url: signed.signedUrl,
    token: signed.token,
    expires_in_sec: 60 * 60 * 2,
  };
}
