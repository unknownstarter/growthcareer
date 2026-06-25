"use server";

/**
 * Lecture Material — external_url 저장 server action (B0044).
 *
 * 운영자/강사가 Google Drive / YouTube / Notion 등 외부 link 로 자료 등록.
 *
 * 권한: assertCanUploadMaterial(cohortId, sessionId?).
 *
 * SSRF 방어 (save-external-url career 와 동일 패턴):
 *   - scheme http/https 만
 *   - private IP / loopback / link-local 금지
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertCanUploadMaterial } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  LectureMaterialVisibilitySchema,
  MIN_WEEK_NUMBER,
  MAX_WEEK_NUMBER,
} from "@/src/programs/fan-to-pro/domain/entities/lecture-material";
import { insertLectureMaterial } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";

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
function safeExternalUrl(value: string): string | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (PRIVATE_IP_PREFIXES.some((p) => host === p || host.startsWith(p))) return null;
    if (host === "localhost") return null;
    if (host.startsWith("172.")) {
      const second = Number(host.split(".")[1]);
      if (Number.isFinite(second) && second >= 16 && second <= 31) return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

const InputSchema = z
  .object({
    cohort_id: z.string().uuid(),
    session_id: z.string().uuid().nullable().optional(),
    week_number: z
      .number()
      .int()
      .min(MIN_WEEK_NUMBER)
      .max(MAX_WEEK_NUMBER)
      .nullable()
      .optional(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).nullable().optional(),
    external_url: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine((v) => safeExternalUrl(v) !== null, {
        message: "url scheme must be http or https with a public hostname",
      }),
    visibility: LectureMaterialVisibilitySchema.optional(),
    visible_from: z.string().nullable().optional(),
  })
  .refine(
    (m) => m.visibility !== "scheduled" || !!m.visible_from,
    { message: "visibility=scheduled requires visible_from" },
  );

export type SaveMaterialExternalUrlResult =
  | { status: "ok"; material_id: string }
  | { status: "error"; error: string };

export async function saveMaterialExternalUrlAction(
  input: unknown,
): Promise<SaveMaterialExternalUrlResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const data = parsed.data;

  let uploadedBy: string;
  try {
    const u = await assertCanUploadMaterial(data.cohort_id, data.session_id ?? null);
    uploadedBy = u.id;
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "forbidden",
    };
  }

  try {
    const row = await insertLectureMaterial({
      cohort_id: data.cohort_id,
      session_id: data.session_id ?? null,
      week_number: data.week_number ?? null,
      title: data.title,
      description: data.description ?? null,
      storage_method: "external_url",
      external_url: data.external_url,
      visibility: data.visibility ?? "published",
      visible_from: data.visible_from ?? null,
      uploaded_by: uploadedBy,
    });

    revalidatePath("/ko/fan-to-pro/admin/materials");
    revalidatePath("/en/fan-to-pro/admin/materials");

    return { status: "ok", material_id: row.id };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
