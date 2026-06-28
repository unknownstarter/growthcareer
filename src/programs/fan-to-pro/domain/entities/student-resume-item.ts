/**
 * Student Resume Item entity (B0044 LMS Launch Phase 1, B0063 잡코리아 정합).
 *
 * ADR 0011 §3 — Echo C 결정. polymorphic 다중 row per student.
 * type 으로 8 종 분류 — B0063 에서 activity / skill 2 종 추가.
 *
 * 각 type 별 의미:
 *   - education      : 학력      (school = organization, 전공/학위 = title)
 *   - experience     : 경력      (회사명 = organization, 직무 = title)
 *   - certification  : 자격증    (자격증명 = title, 발급기관 = organization)
 *   - award          : 수상      (수상명 = title, 주최 = organization)
 *   - language       : 어학      (시험명 = title, 점수/등급 = organization)
 *   - project        : 프로젝트  (프로젝트명 = title, 클라이언트/팀 = organization)
 *   - activity       : 기타활동  (활동명 = title, 단체/주최 = organization) — 동아리/봉사/대외활동
 *   - skill          : 활용능력  (도구/기술 = title, 숙련도 = organization) — 워드/파포/디자인툴/음향장비
 */
import { z } from "zod";

export const RESUME_ITEM_TYPES = [
  "education",
  "experience",
  "certification",
  "award",
  "language",
  "project",
  "activity",
  "skill",
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
  activity: "기타활동",
  skill: "활용능력",
};

/**
 * credential_url scheme allowlist — Sage CRIT-1 fix (2026-06-26).
 * `javascript:` / `data:` / `vbscript:` 등 비-http(s) scheme 차단.
 * 학생이 폼에서 저장 → 운영자가 admin/students/[id] 페이지 클릭 시
 * stored XSS 로 admin 세션 탈취 가능 → http/https 만 허용.
 */
const httpsUrl = (max = 2048) =>
  z
    .string()
    .url()
    .max(max)
    .refine((v) => /^https?:\/\//i.test(v), {
      message: "credential_url must use http or https scheme",
    });

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
    credential_url: httpsUrl().nullable(),
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
  credential_url: httpsUrl().nullable().optional(),
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
  credential_url: httpsUrl().nullable().optional(),
  order_index: z.number().int().nonnegative().optional(),
});

export type StudentResumeItemUpdateInput = z.infer<
  typeof StudentResumeItemUpdateInputSchema
>;
