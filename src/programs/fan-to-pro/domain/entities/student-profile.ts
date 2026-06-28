/**
 * Student Profile entity (B0044 LMS Launch Phase 1).
 *
 * ADR 0011 §3 — Echo C 결정. 단일 row per student. 본인 입력 + 운영자/강사 read.
 *
 * DB invariant 와 zod 검증 동기화 (check constraint 그대로).
 */
import { z } from "zod";

export const STUDENT_GENDERS = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const;
export type StudentGender = (typeof STUDENT_GENDERS)[number];
export const StudentGenderSchema = z.enum(STUDENT_GENDERS);

export const MIN_BIRTH_YEAR = 1940;
export const MAX_BIRTH_YEAR = 2020;

// B0052: months_in_korea 0 ~ 1200 (0년 ~ 100년).
export const MIN_MONTHS_IN_KOREA = 0;
export const MAX_MONTHS_IN_KOREA = 1200;

// B0052: birth_date 는 ISO date (YYYY-MM-DD) 형식 string.
const BirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "birth_date must be YYYY-MM-DD");

export const StudentProfileSchema = z.object({
  student_id: z.string().uuid(),
  name_ko: z.string().trim().min(1).max(100).nullable(),
  name_en: z.string().trim().min(1).max(100).nullable(),
  phone: z.string().trim().min(4).max(30).nullable(),
  birth_year: z
    .number()
    .int()
    .min(MIN_BIRTH_YEAR)
    .max(MAX_BIRTH_YEAR)
    .nullable(),
  // B0052: 생년월일 정확. birth_year 보다 우선 — UI 표시 시 birth_date 가 있으면 birth_date.
  birth_date: BirthDateSchema.nullable(),
  gender: StudentGenderSchema.nullable(),
  visa_type: z.string().trim().min(1).max(30).nullable(),
  // B0052: 한국 거주 개월수. 한국 국적은 NULL.
  months_in_korea: z
    .number()
    .int()
    .min(MIN_MONTHS_IN_KOREA)
    .max(MAX_MONTHS_IN_KOREA)
    .nullable(),
  // B0057: 학생 사진 (원티드 패턴). Supabase Storage 'student-photos' bucket path.
  // signed URL 은 별도 server action 으로 5분 TTL 발급. UI 직접 노출 X.
  photo_path: z.string().nullable(),
  photo_uploaded_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type StudentProfile = z.infer<typeof StudentProfileSchema>;

/**
 * upsert 입력 — student_id 외 컬럼은 모두 optional + nullable.
 * 부분 업데이트 OK (zod 가 null vs undefined 구분).
 */
export const StudentProfileUpsertInputSchema = z.object({
  student_id: z.string().uuid(),
  name_ko: z.string().trim().min(1).max(100).nullable().optional(),
  name_en: z.string().trim().min(1).max(100).nullable().optional(),
  phone: z.string().trim().min(4).max(30).nullable().optional(),
  birth_year: z
    .number()
    .int()
    .min(MIN_BIRTH_YEAR)
    .max(MAX_BIRTH_YEAR)
    .nullable()
    .optional(),
  birth_date: BirthDateSchema.nullable().optional(),
  gender: StudentGenderSchema.nullable().optional(),
  visa_type: z.string().trim().min(1).max(30).nullable().optional(),
  months_in_korea: z
    .number()
    .int()
    .min(MIN_MONTHS_IN_KOREA)
    .max(MAX_MONTHS_IN_KOREA)
    .nullable()
    .optional(),
});

export type StudentProfileUpsertInput = z.infer<
  typeof StudentProfileUpsertInputSchema
>;

/**
 * B0052: birth_date 가 주어지면 birth_year 자동 derive.
 *
 * UI / server action 양쪽에서 호출 — 사용자가 생년월일만 입력해도 birth_year 가 채워짐.
 * 양쪽 다 명시되어 불일치하면 birth_date 의 연도가 우선 (호환성).
 */
export function deriveBirthYearFromDate(
  birthDate: string | null | undefined,
): number | null {
  if (!birthDate) return null;
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec(birthDate);
  if (!m) return null;
  const year = Number(m[1]);
  if (!Number.isFinite(year)) return null;
  if (year < MIN_BIRTH_YEAR || year > MAX_BIRTH_YEAR) return null;
  return year;
}
