/**
 * Lecture material 업로드 / 다운로드 가드 (ADR 0008 §5~7, B0044 LMS Launch Phase 1).
 *
 * CLAUDE.md §7.4: 모든 LMS server action 첫 줄에 가드 호출 의무.
 * middleware path 차단만 신뢰 금지 (viewer role 사고 2026-06-09 lesson).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  getLmsUser,
  type LmsUser,
} from "@/src/programs/fan-to-pro/infrastructure/auth/lms-session";
import {
  getCohortMembershipRole,
  getCohortProgramId,
} from "@/src/programs/fan-to-pro/infrastructure/auth/cohort-guards";

/**
 * 자료 업로드 가드. (cohortId 또는 session 기반.)
 *
 * 통과: super_admin OR program admin (cohort.program) OR cohort instructor.
 *
 * sessionId 가 주어지면 session.cohort_id == cohortId 검증 추가.
 */
export async function assertCanUploadMaterial(
  cohortId: string,
  sessionId?: string | null,
): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");
  if (user.isSuperAdmin) {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  // program admin?
  const programId = await getCohortProgramId(cohortId);
  if (!programId) throw new Error(`[lms-role] unknownCohort: ${cohortId}`);

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: pm } = await supabase
    .from("program_memberships")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .eq("role", "admin")
    .maybeSingle();
  if (pm) {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  // cohort instructor?
  const cohortRole = await getCohortMembershipRole(user.id, cohortId);
  if (cohortRole === "instructor") {
    await assertSessionMatchesCohort(sessionId, cohortId);
    return user;
  }

  throw new Error(
    `[lms-role] forbidden: user ${user.id} cannot upload material to cohort ${cohortId}.`,
  );
}

async function assertSessionMatchesCohort(
  sessionId: string | null | undefined,
  cohortId: string,
): Promise<void> {
  if (!sessionId) return;
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");
  const { data } = await supabase
    .from("sessions")
    .select("cohort_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data) throw new Error(`[lms-role] unknownSession: ${sessionId}`);
  if (data.cohort_id !== cohortId) {
    throw new Error(
      `[lms-role] sessionCohortMismatch: session=${sessionId} cohort=${cohortId}`,
    );
  }
}

/**
 * 자료 다운로드 가드.
 *
 * 통과: super_admin OR program admin OR cohort member (instructor / student).
 * student 인 경우 material visibility 검증 추가 (RLS 와 동기).
 *
 * @returns { user, material } — 호출자가 file_path / external_url 사용.
 */
export async function assertCanDownloadMaterial(
  materialId: string,
): Promise<{
  user: LmsUser;
  material: {
    id: string;
    cohort_id: string;
    storage_method: "file_upload" | "external_url";
    file_path: string | null;
    file_name: string | null;
    external_url: string | null;
    visibility: "draft" | "scheduled" | "published" | "archived";
    visible_from: string | null;
  };
}> {
  const user = await getLmsUser();
  if (!user) throw new Error("[lms-role] unauthenticated.");

  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("[lms-role] supabaseUnavailable.");

  const { data: material, error: matErr } = await supabase
    .from("lecture_materials")
    .select(
      "id, cohort_id, storage_method, file_path, file_name, external_url, visibility, visible_from",
    )
    .eq("id", materialId)
    .maybeSingle();
  if (matErr) throw new Error(matErr.message);
  if (!material) throw new Error(`[lms-role] unknownMaterial: ${materialId}`);

  if (user.isSuperAdmin) return { user, material: material as never };

  // program admin?
  const programId = await getCohortProgramId(material.cohort_id);
  if (programId) {
    const { data: pm } = await supabase
      .from("program_memberships")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("program_id", programId)
      .eq("role", "admin")
      .maybeSingle();
    if (pm) return { user, material: material as never };
  }

  // cohort member?
  const cohortRole = await getCohortMembershipRole(user.id, material.cohort_id);
  if (!cohortRole) {
    throw new Error(
      `[lms-role] forbidden: user ${user.id} not member of cohort ${material.cohort_id}.`,
    );
  }

  // student 는 visibility 검증 추가.
  if (cohortRole === "student") {
    const vis = material.visibility as string;
    const visibleFrom = material.visible_from as string | null;
    const ok =
      vis === "published" ||
      (vis === "scheduled" &&
        visibleFrom !== null &&
        new Date(visibleFrom).getTime() <= Date.now());
    if (!ok) {
      throw new Error(
        `[lms-role] forbidden: material ${materialId} not visible to student.`,
      );
    }
  }

  return { user, material: material as never };
}
