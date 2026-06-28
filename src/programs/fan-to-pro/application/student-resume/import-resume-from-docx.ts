"use server";

/**
 * Student Resume — docx import server actions (B0064).
 *
 * 2-step flow:
 *   1) parseResumeDocxAction(input)         — 파일만 파싱 → preview ParsedResume return
 *   2) commitResumeImportAction(input)      — 운영자 확인 후 DB INSERT/upsert
 *
 * 권한: 두 step 모두 assertCanWriteStudentProfile(student_id).
 *   - super_admin / program admin / student-self 통과.
 *   - instructor 는 쓰기 X.
 *
 * 입력 검증: 경계에서 1회만 (zod). 내부 repository 는 신뢰.
 *
 * 비고:
 *   - data URL → Buffer 변환은 본 파일에서만. parser 는 Buffer 입력.
 *   - 5MB cap — docx 는 보통 50~500KB. 그 이상이면 학생 양식 외 (예: 이미지 다수 embed) 가능성.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertCanWriteStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  parseStudentResumeDocx,
  type ParsedResume,
} from "@/src/programs/fan-to-pro/application/student-resume/parse-resume-docx";
import {
  ParsedResumeSchema,
  type ParsedResumeValidated,
} from "@/src/programs/fan-to-pro/application/student-resume/parsed-resume-schema";
import { upsertStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-profile-repository";
import { upsertStudentCareerTarget } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-career-target-repository";
import {
  insertStudentResumeItem,
  fetchStudentResumeItems,
  deleteStudentResumeItem,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-resume-item-repository";

// ---------- 공통 ----------------------------------------------------------

const MAX_DOCX_BYTES = 5 * 1024 * 1024; // 5 MB.

/** docx mime/extension allowlist — strict. */
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * data URL "data:<mime>;base64,..." → { mime, buffer }.
 * 실패 시 throw — 호출자 wrap.
 */
function dataUrlToBuffer(dataUrl: string): { mime: string; buffer: Buffer } {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("invalidDataUrl");
  const mime = m[1];
  const b64 = m[2];
  // Buffer.byteLength check 전에 length 로 cheap pre-check (base64 길이 * 0.75 ≈ bytes).
  if (b64.length * 0.75 > MAX_DOCX_BYTES + 1024) {
    throw new Error("fileTooLarge");
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.byteLength > MAX_DOCX_BYTES) {
    throw new Error("fileTooLarge");
  }
  return { mime, buffer };
}

// ---------- Step 1: parse (preview) ---------------------------------------

const ParseInputSchema = z.object({
  student_id: z.string().uuid(),
  file_data_url: z
    .string()
    .startsWith("data:", "fileMustBeDataUrl")
    .max(MAX_DOCX_BYTES * 2), // base64 expansion ~1.33x, 여유 2x.
});

export type ParseResumeDocxResult =
  | { status: "ok"; parsed: ParsedResume }
  | { status: "error"; error: string };

export async function parseResumeDocxAction(
  input: unknown,
): Promise<ParseResumeDocxResult> {
  const parsed = ParseInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { student_id, file_data_url } = parsed.data;

  try {
    await assertCanWriteStudentProfile(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  let buffer: Buffer;
  let mime: string;
  try {
    const decoded = dataUrlToBuffer(file_data_url);
    buffer = decoded.buffer;
    mime = decoded.mime;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "decodeFailed",
    };
  }

  // mime allowlist — docx 만. 학생이 .doc (구버전) 또는 .pdf 올리면 reject.
  if (mime !== DOCX_MIME) {
    return { status: "error", error: "unsupportedFileType" };
  }

  const result = await parseStudentResumeDocx(buffer);
  return result;
}

// ---------- Step 2: commit (DB INSERT/upsert) -----------------------------

const CommitInputSchema = z.object({
  student_id: z.string().uuid(),
  parsed: ParsedResumeSchema,
  mode: z.enum(["replace", "append"]),
});

export type CommitResumeImportResult =
  | {
      status: "ok";
      profile_updated: boolean;
      career_target_updated: boolean;
      items_deleted: number;
      items_inserted: number;
    }
  | { status: "error"; error: string };

export async function commitResumeImportAction(
  input: unknown,
): Promise<CommitResumeImportResult> {
  const valid = CommitInputSchema.safeParse(input);
  if (!valid.success) return { status: "error", error: "invalidInput" };

  const { student_id, parsed, mode } = valid.data;

  try {
    await assertCanWriteStudentProfile(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const result = await applyParsedResume(student_id, parsed, mode);
    revalidatePath(`/ko/fan-to-pro/admin/students/${student_id}`);
    revalidatePath(`/en/fan-to-pro/admin/students/${student_id}`);
    return { status: "ok", ...result };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "commitFailed",
    };
  }
}

/**
 * parsed → DB upsert orchestration.
 *
 * 트랜잭션 경계: 본 함수가 하나의 논리 트랜잭션. Supabase JS client 가 multi-table
 * transaction 미지원 — best-effort 직렬 처리. 중간 실패 시 부분 적용 가능 (수용).
 * (개선 후보: RPC 로 wrap. 일회성 운영 import 라 ROI 낮음.)
 */
async function applyParsedResume(
  studentId: string,
  parsed: ParsedResumeValidated,
  mode: "replace" | "append",
) {
  let profile_updated = false;
  let career_target_updated = false;
  let items_deleted = 0;
  let items_inserted = 0;

  // 1. profile — non-null 필드만 upsert (upsertStudentProfile 는 미지정 컬럼 보존).
  const profilePatch = stripNulls({
    student_id: studentId,
    name_ko: parsed.profile.name_ko,
    name_en: parsed.profile.name_en,
    phone: parsed.profile.phone,
    birth_date: parsed.profile.birth_date,
    gender: parsed.profile.gender,
    visa_type: parsed.profile.visa_type,
    months_in_korea: parsed.profile.months_in_korea,
    website_url: parsed.profile.website_url,
  });
  if (Object.keys(profilePatch).length > 1) {
    // student_id 외에 1개 이상 있을 때만 update.
    await upsertStudentProfile(profilePatch as never);
    profile_updated = true;
  }

  // 2. career_target — 회사 배열 / 직무 / 시작일 / pitch.
  // stripNulls 가 빈 배열을 떼므로 target_companies 는 별도 처리.
  const targetBase = stripNulls({
    student_id: studentId,
    target_role_category: parsed.career_target.target_role_category,
    target_role_text: parsed.career_target.target_role_text,
    desired_start_date: parsed.career_target.desired_start_date,
    self_pitch: parsed.career_target.self_pitch,
  }) as Record<string, unknown>;
  // mode=replace 이고 빈 배열이어도 의도적으로 비우는 신호 → 그대로 전달.
  // mode=append 이고 빈 배열이면 기존 보존 (upsert 의 default behavior).
  if (mode === "replace" || parsed.career_target.target_companies.length > 0) {
    targetBase.target_companies = parsed.career_target.target_companies;
  }
  if (Object.keys(targetBase).length > 1) {
    await upsertStudentCareerTarget(targetBase as never);
    career_target_updated = true;
  }

  // 3. resume_items.
  if (mode === "replace") {
    const existing = await fetchStudentResumeItems(studentId);
    for (const row of existing) {
      await deleteStudentResumeItem(row.id, studentId);
      items_deleted++;
    }
  }

  // append 시 order_index = 기존 max + 1 부터 부여 (충돌 방지).
  let nextOrder = 0;
  if (mode === "append") {
    const existing = await fetchStudentResumeItems(studentId);
    nextOrder =
      existing.reduce((m, r) => Math.max(m, r.order_index), -1) + 1;
  }

  for (const item of parsed.resume_items) {
    await insertStudentResumeItem({
      student_id: studentId,
      type: item.type,
      title: item.title,
      organization: item.organization,
      start_date: item.start_date,
      end_date: item.end_date,
      description: item.description,
      credential_url: item.credential_url,
      order_index: nextOrder++,
    });
    items_inserted++;
  }

  return {
    profile_updated,
    career_target_updated,
    items_deleted,
    items_inserted,
  };
}

/** null/undefined 필드 제거. student_id 는 보존. */
function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "student_id") {
      out[k] = v;
      continue;
    }
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
