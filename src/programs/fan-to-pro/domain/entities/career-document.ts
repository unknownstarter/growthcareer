/**
 * Career Document entity (B0034 Wave A+).
 *
 * 학생 1명 당 3 종 (resume / cover_letter / portfolio) 의 단일 최신본.
 * external_url 또는 file_upload XOR — schema refinement 로 강제.
 *
 * DB invariant 는 마이그레이션 의 check constraint 와 동일.
 */
import { z } from "zod";

export const CAREER_DOC_TYPES = ["resume", "cover_letter", "portfolio"] as const;
export type CareerDocType = (typeof CAREER_DOC_TYPES)[number];
export const CareerDocTypeSchema = z.enum(CAREER_DOC_TYPES);

export const STORAGE_METHODS = ["external_url", "file_upload"] as const;
export type StorageMethod = (typeof STORAGE_METHODS)[number];
export const StorageMethodSchema = z.enum(STORAGE_METHODS);

export const CAREER_DOC_LABELS: Record<CareerDocType, string> = {
  resume: "이력서",
  cover_letter: "자기소개서",
  portfolio: "포트폴리오",
};

export const CAREER_DOC_DESCRIPTIONS: Record<CareerDocType, string> = {
  resume: "최신 이력서. Notion 링크나 PDF 파일.",
  cover_letter: "자기소개서. Google Doc 링크나 docx 파일.",
  portfolio: "포트폴리오. 사이트 링크나 PDF / 압축 파일.",
};

/**
 * 허용 MIME type — bucket 정책과 동기화. 추가/제거 시 마이그레이션도 갱신.
 */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/zip",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** extension fallback — browser 가 MIME 잘못 보내는 케이스 대비. */
export const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB

export const CareerDocumentSchema = z
  .object({
    student_id: z.string().uuid(),
    doc_type: CareerDocTypeSchema,
    storage_method: StorageMethodSchema,
    external_url: z.string().url().nullable(),
    file_path: z.string().nullable(),
    file_name: z.string().nullable(),
    file_size_bytes: z.number().int().nonnegative().nullable(),
    mime_type: z.string().nullable(),
    notes: z.string().max(500).nullable(),
    updated_at: z.string(),
    created_at: z.string(),
  })
  .refine(
    (d) =>
      (d.storage_method === "external_url" &&
        !!d.external_url &&
        !d.file_path) ||
      (d.storage_method === "file_upload" && !!d.file_path && !d.external_url),
    {
      message:
        "storage_method must match exactly one of external_url or file_path",
    },
  );

export type CareerDocument = z.infer<typeof CareerDocumentSchema>;

/**
 * 파일 입력 검증 — server-side 재검증 (브라우저 검증만 신뢰 X, CLAUDE.md §7.4).
 *
 * @returns null 이면 통과. string 이면 error code.
 */
export function validateFileInput(input: {
  size: number;
  mime: string;
}): string | null {
  if (input.size <= 0) return "fileEmpty";
  if (input.size > MAX_FILE_SIZE_BYTES) return "fileTooLarge";
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(input.mime)) {
    return "mimeNotAllowed";
  }
  return null;
}

/**
 * Storage path 결정 — {student_id}/{doc_type}.{ext}.
 * 사용자 입력 파일명은 sanitize 차원에서 path 에 안 씀.
 */
export function buildStoragePath(
  studentId: string,
  docType: CareerDocType,
  mime: string,
): string {
  const ext = MIME_TO_EXT[mime] ?? "bin";
  return `${studentId}/${docType}.${ext}`;
}
