"use server";

/**
 * Career document — external_url 저장 server action.
 *
 * 권한: assertCanAccessStudentCareer(studentId) — super_admin / program admin /
 *       student-self 셋 중 하나 통과.
 *
 * 동작:
 *   1) 권한 가드.
 *   2) zod 검증.
 *   3) 기존 storage_method=file_upload 였으면 Storage 파일 삭제 (orphan 방지).
 *   4) upsert (storage_method='external_url').
 *   5) revalidate.
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanAccessStudentCareer } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  CareerDocTypeSchema,
  type CareerDocType,
} from "@/src/programs/fan-to-pro/domain/entities/career-document";
import {
  fetchCareerDocument,
  upsertCareerDocumentExternalUrl,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/career-document-repository";
import { deleteCareerFile } from "@/src/programs/fan-to-pro/infrastructure/supabase/storage/career-documents-storage";

/**
 * SSRF 방어 — Sage H-2 (B0034).
 *
 * 운영자가 학생 등록 URL 을 "열기" 클릭하는 경로 가드:
 * - scheme 은 http / https 만 허용 (file://, javascript:, data: 차단)
 * - hostname 이 IP literal 이면 거부 (RFC1918 / loopback / link-local
 *   metadata endpoint 차단 — AWS 169.254.169.254 등)
 */
const PRIVATE_IP_PREFIXES = [
  "10.",
  "127.",
  "169.254.",
  "192.168.",
  "0.",
  "::1",
  "fe80:",
  "fc",
  "fd",
];
const PRIVATE_IPV4_172 = (host: string) => {
  if (!host.startsWith("172.")) return false;
  const second = Number(host.split(".")[1]);
  return Number.isFinite(second) && second >= 16 && second <= 31;
};

function safeExternalUrl(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (PRIVATE_IP_PREFIXES.some((p) => host === p || host.startsWith(p))) return null;
    if (PRIVATE_IPV4_172(host)) return null;
    if (host === "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const InputSchema = z.object({
  student_id: z.string().uuid(),
  doc_type: CareerDocTypeSchema,
  external_url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((v) => safeExternalUrl(v) !== null, {
      message: "url scheme must be http or https with a public hostname",
    }),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type SaveExternalUrlResult =
  | { status: "ok" }
  | { status: "error"; error: string };

export async function saveCareerExternalUrlAction(
  input: unknown,
): Promise<SaveExternalUrlResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { student_id, doc_type, external_url, notes } = parsed.data;

  try {
    await assertCanAccessStudentCareer(student_id);
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    // 기존이 file_upload 였으면 Storage 파일 정리 (orphan 방지).
    const existing = await fetchCareerDocument(student_id, doc_type);
    if (existing?.storage_method === "file_upload" && existing.file_path) {
      try {
        await deleteCareerFile(existing.file_path);
      } catch {
        // Storage 삭제 실패는 비치명 — DB 우선. 운영자에 알림 정도.
      }
    }

    await upsertCareerDocumentExternalUrl({
      student_id,
      doc_type,
      external_url,
      notes: notes ?? null,
    });

    revalidateCareerPaths(student_id, doc_type);
    return { status: "ok" };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}

function revalidateCareerPaths(
  studentId: string,
  _docType: CareerDocType,
): void {
  // admin surface 의 student detail 페이지.
  revalidatePath(`/ko/fan-to-pro/admin/students/${studentId}`);
  revalidatePath(`/ko/fan-to-pro/admin/students/${studentId}/career`);
  // student surface 의 career — cohortSlug 모르니 broad revalidate.
  // wildcard layout 단위 revalidate 는 next 가 자체 처리.
}
