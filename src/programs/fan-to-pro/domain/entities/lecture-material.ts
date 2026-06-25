/**
 * Lecture Material entity (B0044 LMS Launch Phase 1).
 *
 * ADR 0011 §2. 강의 자료 — cohort × session(nullable) × file_upload XOR external_url.
 *
 * 기존 `material.ts` (Wave 2 placeholder, materials 테이블) 와 별도. 본 entity 는
 * 신규 `lecture_materials` 테이블 대응. 분리 이유:
 *   - 파일 크기 (10MB vs 1GB) 차이
 *   - 라이프사이클 (cohort 자료 누적)
 *   - bucket 분리 (lecture-materials)
 *
 * State machine: draft → scheduled → published → archived
 *
 * Storage path 패턴: {cohort_id}/{material_id}.{ext}.
 */
import { z } from "zod";

export const LECTURE_MATERIAL_VISIBILITY = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;
export type LectureMaterialVisibility =
  (typeof LECTURE_MATERIAL_VISIBILITY)[number];
export const LectureMaterialVisibilitySchema = z.enum(LECTURE_MATERIAL_VISIBILITY);

export const LECTURE_MATERIAL_STORAGE_METHODS = [
  "file_upload",
  "external_url",
] as const;
export type LectureMaterialStorageMethod =
  (typeof LECTURE_MATERIAL_STORAGE_METHODS)[number];
export const LectureMaterialStorageMethodSchema = z.enum(
  LECTURE_MATERIAL_STORAGE_METHODS,
);

/**
 * 100 MB hard cap — bucket file_size_limit 와 동기.
 * Sage CRIT-4 fix (2026-06-26): 1GB → 100MB. Vercel Server Action bodySizeLimit
 * 정합 + 1기 운영 PPT/영상 50~100MB 수준 충분.
 * Wave 2 에 signed upload URL (client direct) 패턴 도입 시 재상향 검토.
 */
export const MAX_LECTURE_FILE_SIZE_BYTES = 100 * 1024 * 1024;

/** 회차 미연결 자료 fallback 범위 (1주차 ~ 20주차). */
export const MIN_WEEK_NUMBER = 1;
export const MAX_WEEK_NUMBER = 20;

/** Signed URL TTL — ADR 0011 §2.4 위험 분석 후 5분 (300초). */
export const LECTURE_MATERIAL_SIGNED_URL_TTL_SEC = 60 * 5;

export const LectureMaterialSchema = z
  .object({
    id: z.string().uuid(),
    cohort_id: z.string().uuid(),
    session_id: z.string().uuid().nullable(),
    week_number: z.number().int().min(MIN_WEEK_NUMBER).max(MAX_WEEK_NUMBER).nullable(),

    title: z.string().min(1).max(200),
    description: z.string().max(1000).nullable(),

    storage_method: LectureMaterialStorageMethodSchema,
    file_path: z.string().nullable(),
    file_name: z.string().nullable(),
    file_size_bytes: z.number().int().nonnegative().nullable(),
    mime_type: z.string().nullable(),
    external_url: z.string().url().nullable(),

    visibility: LectureMaterialVisibilitySchema,
    visible_from: z.string().nullable(),

    uploaded_by: z.string().uuid().nullable(),

    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .refine(
    (d) =>
      (d.storage_method === "file_upload" &&
        !!d.file_path &&
        d.external_url === null) ||
      (d.storage_method === "external_url" &&
        !!d.external_url &&
        d.file_path === null),
    {
      message:
        "storage_method must match exactly one of file_path or external_url",
    },
  )
  .refine(
    (d) => d.visibility !== "scheduled" || !!d.visible_from,
    { message: "visibility=scheduled requires visible_from" },
  );

export type LectureMaterial = z.infer<typeof LectureMaterialSchema>;

const ALLOWED_TRANSITIONS: Record<
  LectureMaterialVisibility,
  readonly LectureMaterialVisibility[]
> = {
  draft: ["scheduled", "published", "archived"],
  scheduled: ["draft", "published", "archived"],
  published: ["scheduled", "archived"],
  archived: ["draft", "published"],
};

export function canTransitionLectureMaterial(
  from: LectureMaterialVisibility,
  to: LectureMaterialVisibility,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * 학생에게 가시한가? RLS 와 동일 조건.
 *
 * scheduled 는 visible_from <= now() 일 때만.
 */
export function isVisibleToStudent(
  material: Pick<LectureMaterial, "visibility" | "visible_from">,
  now: Date = new Date(),
): boolean {
  if (material.visibility === "published") return true;
  if (material.visibility === "scheduled" && material.visible_from) {
    return new Date(material.visible_from).getTime() <= now.getTime();
  }
  return false;
}

/**
 * 파일 검증 — server-side 재검증. validateFileInput (career-document) 패턴 그대로.
 *
 * @returns null 통과. string 이면 error code.
 */
export function validateLectureFileInput(input: {
  size: number;
  mime: string;
}): string | null {
  if (input.size <= 0) return "fileEmpty";
  if (input.size > MAX_LECTURE_FILE_SIZE_BYTES) return "fileTooLarge";
  // MIME 화이트리스트 X — ADR 0011 §4.1 (강의 자료는 형식 다양).
  // 단 빈 MIME 거부.
  if (!input.mime || input.mime.length === 0) return "mimeMissing";
  return null;
}

/**
 * Storage path — {cohort_id}/{material_id}.{ext}.
 * 사용자 입력 file_name 은 path 에 사용 X (sanitize).
 */
export function buildLectureMaterialPath(
  cohortId: string,
  materialId: string,
  mime: string,
  fallbackName: string,
): string {
  const ext = inferExtension(mime, fallbackName);
  return `${cohortId}/${materialId}${ext ? `.${ext}` : ""}`;
}

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/zip": "zip",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "text/plain": "txt",
  "text/markdown": "md",
};

function inferExtension(mime: string, fallbackName: string): string {
  const fromMime = MIME_TO_EXT[mime];
  if (fromMime) return fromMime;
  // fallback — 파일명의 마지막 . 뒤 부분 (alphanumeric 만).
  const lastDot = fallbackName.lastIndexOf(".");
  if (lastDot < 0) return "";
  const ext = fallbackName
    .slice(lastDot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  return ext;
}
