"use server";

/**
 * LMS student server actions — student 전용.
 *
 * 모든 mutation 첫 줄 assertLmsRole('student') — 본인 데이터만 수정 가능.
 * Wave 4 (B0035) 에서 본격 RLS 정책 + studentId 일치 cross-check 추가 예정.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  fetchLatestSubmissionVersion,
  insertSubmission,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";
import {
  fetchLatestVersion,
  insertConsultation,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/consultation-repository";

// ---------- Assignment Submission ----------

const SubmitSchema = z.object({
  assignment_id: z.string().uuid(),
  body: z.string().trim().nullable().optional(),
  file_path: z.string().trim().nullable().optional(),
  file_size_bytes: z.number().int().nullable().optional(),
  mime_type: z.string().trim().nullable().optional(),
});

export type SubmitResult =
  | { status: "ok"; submission_id: string; version: number }
  | { status: "error"; error: string };

export async function submitAssignmentAction(
  input: unknown,
): Promise<SubmitResult> {
  const user = await assertLmsRole("student");
  if (!user.studentId) return { status: "error", error: "noStudentId" };

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  if (!parsed.data.body && !parsed.data.file_path) {
    return { status: "error", error: "noContent" };
  }

  try {
    const latest = await fetchLatestSubmissionVersion(
      parsed.data.assignment_id,
      user.studentId,
    );
    const next = latest + 1;
    const sub = await insertSubmission({
      assignment_id: parsed.data.assignment_id,
      student_id: user.studentId,
      version: next,
      file_path: parsed.data.file_path ?? null,
      file_size_bytes: parsed.data.file_size_bytes ?? null,
      mime_type: parsed.data.mime_type ?? null,
      body: parsed.data.body ?? null,
    });
    revalidatePath("/lms/student/assignments");
    revalidatePath(`/lms/student/assignments/${parsed.data.assignment_id}`);
    return { status: "ok", submission_id: sub.id, version: next };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

// ---------- Consultation Submission ----------

const ConsultSchema = z.object({
  kind: z.enum(["resume", "cover_letter", "portfolio"]),
  body: z.string().trim().nullable().optional(),
  file_path: z.string().trim().nullable().optional(),
});

export type ConsultSubmitResult =
  | { status: "ok"; consultation_id: string; version: number }
  | { status: "error"; error: string };

export async function submitConsultationAction(
  input: unknown,
): Promise<ConsultSubmitResult> {
  const user = await assertLmsRole("student");
  if (!user.studentId) return { status: "error", error: "noStudentId" };

  const parsed = ConsultSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  if (!parsed.data.body && !parsed.data.file_path) {
    return { status: "error", error: "noContent" };
  }

  try {
    const latest = await fetchLatestVersion(user.studentId, parsed.data.kind);
    const next = latest + 1;
    const c = await insertConsultation({
      student_id: user.studentId,
      kind: parsed.data.kind,
      version: next,
      body: parsed.data.body ?? null,
      file_path: parsed.data.file_path ?? null,
      status: "submitted",
    });
    revalidatePath("/lms/student/consulting");
    revalidatePath(`/lms/student/consulting/${parsed.data.kind}`);
    return { status: "ok", consultation_id: c.id, version: next };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
