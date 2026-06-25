/**
 * Student Career Target entity (B0044 LMS Launch Phase 1).
 *
 * ADR 0011 §3. 학생 희망 진로 — 단일 row per student.
 * target_role_category enum + 자유 입력 회사 배열 + 시작일 + self_pitch.
 */
import { z } from "zod";

export const TARGET_ROLE_CATEGORIES = [
  "concert_pd",
  "a_n_r",
  "mgmt",
  "marketing",
  "video",
  "sound",
  "visual_director",
  "stage_manager",
  "music_business",
  "other",
] as const;
export type TargetRoleCategory = (typeof TARGET_ROLE_CATEGORIES)[number];
export const TargetRoleCategorySchema = z.enum(TARGET_ROLE_CATEGORIES);

export const TARGET_ROLE_LABELS: Record<TargetRoleCategory, string> = {
  concert_pd: "공연 PD",
  a_n_r: "A&R",
  mgmt: "매니지먼트",
  marketing: "마케팅",
  video: "영상",
  sound: "음향",
  visual_director: "비주얼 디렉터",
  stage_manager: "스테이지 매니저",
  music_business: "음악 사업",
  other: "기타",
};

export const StudentCareerTargetSchema = z.object({
  student_id: z.string().uuid(),
  target_role_category: TargetRoleCategorySchema.nullable(),
  target_companies: z.array(z.string().trim().min(1).max(100)),
  desired_start_date: z.string().nullable(),
  self_pitch: z.string().max(300).nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type StudentCareerTarget = z.infer<typeof StudentCareerTargetSchema>;

export const StudentCareerTargetUpsertInputSchema = z.object({
  student_id: z.string().uuid(),
  target_role_category: TargetRoleCategorySchema.nullable().optional(),
  // ISO date (YYYY-MM-DD) 또는 null. zod refine 으로 형식 검증.
  target_companies: z
    .array(z.string().trim().min(1).max(100))
    .max(20)
    .optional(),
  desired_start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  self_pitch: z.string().trim().max(300).nullable().optional(),
});

export type StudentCareerTargetUpsertInput = z.infer<
  typeof StudentCareerTargetUpsertInputSchema
>;
