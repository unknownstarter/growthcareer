/**
 * Student Resume Item entity (B0044 LMS Launch Phase 1).
 *
 * ADR 0011 §3 — Echo C 결정. polymorphic 다중 row per student.
 * type 으로 6 종 분류 — education / experience / certification / award / language / project.
 *
 * 각 type 별 의미:
 *   - education      : 학력 (school = organization, major = title)
 *   - experience     : 경력 (회사명 = organization, 직무 = title)
 *   - certification  : 자격증 (자격증명 = title, 발급기관 = organization)
 *   - award          : 수상 (수상명 = title, 주최 = organization)
 *   - language       : 어학 (예: TOEIC = title, 850 = description, 자격증명 = title)
 *   - project        : 프로젝트 (프로젝트명 = title, 클라이언트/팀 = organization)
 */
import { z } from "zod";

export const RESUME_ITEM_TYPES = [
  "education",
  "experience",
  "certification",
  "award",
  "language",
  "project",
] as const;
export type ResumeItemType = (typeof RESUME_ITEM_TYPES)[number];
export const ResumeItemTypeSchema = z.enum(RESUME_ITEM_TYPES);

export const RESUME_ITEM_LABELS: Record<ResumeItemType, string> = {
  education: "학력",
  experience: "경력",
  certification: "자격증",
  award: "수상",
  language: "어학",
  project: "프로젝트",
};

export const StudentResumeItemSchema = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    type: ResumeItemTypeSchema,
    title: z.string().min(1).max(200),
    organization: z.string().min(1).max(200).nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    description: z.string().max(1000).nullable(),
    credential_url: z.string().url().nullable(),
    order_index: z.number().int(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .refine(
    (d) =>
      !d.start_date ||
      !d.end_date ||
      new Date(d.start_date).getTime() <= new Date(d.end_date).getTime(),
    { message: "start_date must be <= end_date" },
  );

export type StudentResumeItem = z.infer<typeof StudentResumeItemSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const StudentResumeItemCreateInputSchema = z.object({
  student_id: z.string().uuid(),
  type: ResumeItemTypeSchema,
  title: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200).nullable().optional(),
  start_date: isoDate.nullable().optional(),
  end_date: isoDate.nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  credential_url: z
    .string()
    .url()
    .max(2048)
    .nullable()
    .optional(),
  order_index: z.number().int().nonnegative().optional(),
});

export type StudentResumeItemCreateInput = z.infer<
  typeof StudentResumeItemCreateInputSchema
>;

export const StudentResumeItemUpdateInputSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(), // 가드 — 본인의 row 만 update.
  type: ResumeItemTypeSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  organization: z.string().trim().min(1).max(200).nullable().optional(),
  start_date: isoDate.nullable().optional(),
  end_date: isoDate.nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  credential_url: z
    .string()
    .url()
    .max(2048)
    .nullable()
    .optional(),
  order_index: z.number().int().nonnegative().optional(),
});

export type StudentResumeItemUpdateInput = z.infer<
  typeof StudentResumeItemUpdateInputSchema
>;
