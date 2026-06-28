/**
 * Parsed Resume — zod 검증 schema (B0064).
 *
 * `parse-resume-docx.ts` 출력 객체를 commit 직전에 다시 한 번 zod 로 검증.
 * 이유: client → server action 으로 넘어가는 parsed payload 의 무결성 보장.
 * 파싱 단계는 best-effort 라 모든 필드가 entity invariant 를 만족한다는 보장 X.
 */
import { z } from "zod";
import {
  STUDENT_GENDERS,
  MIN_MONTHS_IN_KOREA,
  MAX_MONTHS_IN_KOREA,
} from "@/src/programs/fan-to-pro/domain/entities/student-profile";
import {
  TARGET_ROLE_CATEGORIES,
} from "@/src/programs/fan-to-pro/domain/entities/student-career-target";
import { RESUME_ITEM_TYPES } from "@/src/programs/fan-to-pro/domain/entities/student-resume-item";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((v) => /^https?:\/\//i.test(v), {
    message: "url must use http or https",
  });

export const ParsedResumeProfileSchema = z.object({
  name_ko: z.string().trim().min(1).max(100).nullable(),
  name_en: z.string().trim().min(1).max(100).nullable(),
  phone: z.string().trim().min(4).max(30).nullable(),
  birth_date: isoDate.nullable(),
  gender: z.enum(STUDENT_GENDERS).nullable(),
  visa_type: z.string().trim().min(1).max(30).nullable(),
  months_in_korea: z
    .number()
    .int()
    .min(MIN_MONTHS_IN_KOREA)
    .max(MAX_MONTHS_IN_KOREA)
    .nullable(),
  website_url: httpsUrl.nullable(),
});

export const ParsedResumeCareerTargetSchema = z.object({
  target_role_category: z.enum(TARGET_ROLE_CATEGORIES).nullable(),
  target_role_text: z.string().trim().min(1).max(200).nullable(),
  target_companies: z.array(z.string().trim().min(1).max(100)).max(20),
  desired_start_date: isoDate.nullable(),
  self_pitch: z.string().trim().max(300).nullable(),
});

export const ParsedResumeItemSchema = z
  .object({
    type: z.enum(RESUME_ITEM_TYPES),
    title: z.string().trim().min(1).max(200),
    organization: z.string().trim().min(1).max(200).nullable(),
    start_date: isoDate.nullable(),
    end_date: isoDate.nullable(),
    description: z.string().trim().max(1000).nullable(),
    credential_url: httpsUrl.nullable(),
  })
  .refine(
    (d) =>
      !d.start_date ||
      !d.end_date ||
      new Date(d.start_date).getTime() <= new Date(d.end_date).getTime(),
    { message: "start_date must be <= end_date" },
  );

export const ParsedResumeSchema = z.object({
  profile: ParsedResumeProfileSchema,
  career_target: ParsedResumeCareerTargetSchema,
  resume_items: z.array(ParsedResumeItemSchema).max(200),
  warnings: z.array(z.string()).max(200),
});

export type ParsedResumeValidated = z.infer<typeof ParsedResumeSchema>;
