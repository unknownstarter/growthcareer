"use server";

/**
 * Lecture Material — list query server action (B0044).
 *
 * Wave 1: 두 모드.
 *   - mode='admin'    — 운영자/강사 view. 모든 visibility.
 *   - mode='student'  — 학생 view. visibility='published' OR scheduled-due 만.
 *
 * 권한:
 *   - mode='admin'    : assertCanUploadMaterial(cohort_id)
 *   - mode='student'  : cohort_memberships role=student OR instructor 확인 후
 *                       fetchVisibleLectureMaterialsByCohort 호출
 */
import { z } from "zod";
import {
  assertCanUploadMaterial,
  getLmsUser,
  getCohortMembershipRole,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  getLectureMaterialsByCohortCached,
  getVisibleLectureMaterialsByCohortCached,
} from "@/src/programs/fan-to-pro/application/queries/cache/cached-materials";
import type { LectureMaterial } from "@/src/programs/fan-to-pro/domain/entities/lecture-material";

const InputSchema = z.object({
  cohort_id: z.string().uuid(),
  mode: z.enum(["admin", "student"]),
});

export type ListMaterialsResult =
  | { status: "ok"; materials: LectureMaterial[] }
  | { status: "error"; error: string };

export async function listLectureMaterialsAction(
  input: unknown,
): Promise<ListMaterialsResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const { cohort_id, mode } = parsed.data;

  try {
    if (mode === "admin") {
      await assertCanUploadMaterial(cohort_id);
      const materials = await getLectureMaterialsByCohortCached(cohort_id);
      return { status: "ok", materials };
    }

    // student mode — cohort_memberships 확인 (student / instructor 둘 다 가시).
    const user = await getLmsUser();
    if (!user) return { status: "error", error: "unauthenticated" };
    if (!user.isSuperAdmin) {
      const role = await getCohortMembershipRole(user.id, cohort_id);
      if (!role) {
        return { status: "error", error: "forbidden" };
      }
    }
    const materials = await getVisibleLectureMaterialsByCohortCached(cohort_id);
    return { status: "ok", materials };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
