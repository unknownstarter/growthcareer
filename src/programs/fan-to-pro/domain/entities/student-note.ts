/**
 * Student Note entity (B0044 LMS Launch Phase 1).
 *
 * ADR 0011 §5.5. 운영 코멘트 — 학생 본인 안 봄 (private operational note).
 *
 * 작성자: super_admin / program admin / cohort instructor.
 * author_role 은 작성 시점 snapshot (추후 role 바뀌어도 audit 보존).
 *
 * 1기 운영: 강사 입력 X → 운영자 (노아) 가 카톡 받아서 대신 입력
 *           (author_role = 'admin', body 안에 "[강사 X 의견] ..." prefix).
 * 2기+: 강사 self-input 활성화 (author_role = 'instructor').
 */
import { z } from "zod";

export const STUDENT_NOTE_AUTHOR_ROLES = [
  "super_admin",
  "admin",
  "instructor",
] as const;
export type StudentNoteAuthorRole =
  (typeof STUDENT_NOTE_AUTHOR_ROLES)[number];
export const StudentNoteAuthorRoleSchema = z.enum(STUDENT_NOTE_AUTHOR_ROLES);

export const STUDENT_NOTE_MAX_BODY = 2000;

export const StudentNoteSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  author_id: z.string().uuid(),
  author_role: StudentNoteAuthorRoleSchema,
  body: z.string().min(1).max(STUDENT_NOTE_MAX_BODY),
  is_pinned: z.boolean(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type StudentNote = z.infer<typeof StudentNoteSchema>;

export const StudentNoteCreateInputSchema = z.object({
  student_id: z.string().uuid(),
  body: z.string().trim().min(1).max(STUDENT_NOTE_MAX_BODY),
  is_pinned: z.boolean().optional(),
});

export type StudentNoteCreateInput = z.infer<
  typeof StudentNoteCreateInputSchema
>;

export const StudentNoteUpdateInputSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(1).max(STUDENT_NOTE_MAX_BODY).optional(),
  is_pinned: z.boolean().optional(),
});

export type StudentNoteUpdateInput = z.infer<
  typeof StudentNoteUpdateInputSchema
>;
