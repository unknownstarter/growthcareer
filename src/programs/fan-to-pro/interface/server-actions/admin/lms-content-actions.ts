"use server";

/**
 * LMS content server actions — materials / announcements / assignments.
 * super_admin 전용 (Wave 4 에서 instructor 권한 추가 예정).
 */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  insertMaterial,
  updateMaterialStatus,
  deleteMaterial,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/material-repository";
import {
  insertAnnouncement,
  updateAnnouncementStatus,
  deleteAnnouncement,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/announcement-repository";
import { insertAssignment } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/assignment-repository";

// ---------- Materials ----------

const MaterialInsertSchema = z.object({
  cohort_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  file_path: z.string().trim().min(1),
  file_size_bytes: z.number().int().nullable().optional(),
  mime_type: z.string().trim().nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export type ContentResult =
  | { status: "ok"; id: string }
  | { status: "error"; error: string };

export async function createMaterialAction(
  input: unknown,
): Promise<ContentResult> {
  const user = await assertLmsRole("super_admin");
  const parsed = MaterialInsertSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    const m = await insertMaterial({
      ...parsed.data,
      uploaded_by: user.instructorId, // super_admin 은 보통 null
    });
    revalidatePath("/lms/admin/materials");
    return { status: "ok", id: m.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function publishMaterialAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await updateMaterialStatus(input.id, "published");
    revalidatePath("/lms/admin/materials");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function archiveMaterialAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await updateMaterialStatus(input.id, "archived");
    revalidatePath("/lms/admin/materials");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function deleteMaterialAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await deleteMaterial(input.id);
    revalidatePath("/lms/admin/materials");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

// ---------- Announcements ----------

const AnnouncementSchema = z.object({
  cohort_id: z.string().uuid(),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  pinned: z.boolean().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function createAnnouncementAction(
  input: unknown,
): Promise<ContentResult> {
  const user = await assertLmsRole("super_admin");
  const parsed = AnnouncementSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    const a = await insertAnnouncement({
      ...parsed.data,
      created_by: user.id,
    });
    revalidatePath("/lms/admin/announcements");
    return { status: "ok", id: a.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function publishAnnouncementAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await updateAnnouncementStatus(input.id, "published");
    revalidatePath("/lms/admin/announcements");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function archiveAnnouncementAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await updateAnnouncementStatus(input.id, "archived");
    revalidatePath("/lms/admin/announcements");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

export async function deleteAnnouncementAction(input: {
  id: string;
}): Promise<{ status: "ok" } | { status: "error"; error: string }> {
  await assertLmsRole("super_admin");
  try {
    await deleteAnnouncement(input.id);
    revalidatePath("/lms/admin/announcements");
    return { status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}

// ---------- Assignments ----------

const AssignmentSchema = z.object({
  cohort_id: z.string().uuid(),
  session_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  due_at: z.string().trim().min(1), // ISO timestamptz
});

export async function createAssignmentAction(
  input: unknown,
): Promise<ContentResult> {
  const user = await assertLmsRole("super_admin");
  const parsed = AssignmentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };
  try {
    const a = await insertAssignment({
      ...parsed.data,
      created_by: user.id,
    });
    revalidatePath("/lms/admin/consultations");
    return { status: "ok", id: a.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }
}
