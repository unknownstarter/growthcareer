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
  gender: StudentGenderSchema.nullable(),
  visa_type: z.string().trim().min(1).max(30).nullable(),
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
  gender: StudentGenderSchema.nullable().optional(),
  visa_type: z.string().trim().min(1).max(30).nullable().optional(),
});

export type StudentProfileUpsertInput = z.infer<
  typeof StudentProfileUpsertInputSchema
>;
