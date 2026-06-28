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
  "application/vnd.ms-powerpoint", // ppt (legacy)
  "application/zip",
  "application/x-zip-compressed", // Windows 변형
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
  "application/vnd.ms-powerpoint": "ppt",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Type-별 size cap (B0057).
 *   - resume / cover_letter: 5MB (워크넷 · 잡코리아 표준)
 *   - portfolio:           50MB (원티드 표준, 큰 PDF/PPTX/ZIP 대응)
 *
 * Bucket-level cap 은 50MB (가장 큰 type 기준). application 레이어가
 * type 별로 좁혀 적용 — 서버 측 재검증 필수.
 */
export const MAX_FILE_SIZE_BYTES_RESUME = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES_COVER_LETTER = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES_PORTFOLIO = 50 * 1024 * 1024;

/** @deprecated B0057 이전 호환용. type 별 cap 우선 — maxFileSizeForDocType() 사용 권장. */
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_BYTES_RESUME;

export function maxFileSizeForDocType(type: CareerDocType): number {
  switch (type) {
    case "resume":
      return MAX_FILE_SIZE_BYTES_RESUME;
    case "cover_letter":
      return MAX_FILE_SIZE_BYTES_COVER_LETTER;
    case "portfolio":
      return MAX_FILE_SIZE_BYTES_PORTFOLIO;
  }
}

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
 * B0057: doc_type 받아 type 별 cap 적용. type 미지정이면 가장 보수적인
 * resume cap (5MB) 사용 — 호환성.
 *
 * @returns null 이면 통과. string 이면 error code.
 */
export function validateFileInput(input: {
  size: number;
  mime: string;
  type?: CareerDocType;
}): string | null {
  if (input.size <= 0) return "fileEmpty";
  const cap = input.type
    ? maxFileSizeForDocType(input.type)
    : MAX_FILE_SIZE_BYTES_RESUME;
  if (input.size > cap) return "fileTooLarge";
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
