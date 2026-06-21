/**
 * Use case — 모든 instructor 일괄 invite.
 *
 * 흐름:
 * 1. instructors 조회 (email 보유한 강사만)
 * 2. 각 강사마다 inviteUser 호출 (role=instructor, instructor_id + company_id 박음)
 */
import { fetchInstructorsLms } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/instructor-lms-repository";
import { inviteUser } from "@/src/programs/fan-to-pro/application/use-cases/user/invite-user";

export type BatchInstructorInviteResult =
  | {
      status: "ok";
      total: number;
      invited: number;
      already_existed: number;
      failures: Array<{ email: string; error: string }>;
    }
  | { status: "error"; error: string };

export async function inviteInstructorsBatch(): Promise<BatchInstructorInviteResult> {
  let instructors;
  try {
    instructors = await fetchInstructorsLms();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }

  let invited = 0;
  let alreadyExisted = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const r of instructors) {
    if (!r.email) {
      failures.push({ email: "(unknown)", error: "missingEmail" });
      continue;
    }

    const result = await inviteUser({
      email: r.email,
      display_name: r.name,
      role: "instructor",
      instructor_id: r.id,
      company_id: r.company_id,
      phone: r.phone,
    });

    if (result.status === "ok") {
      if (result.already_existed) alreadyExisted += 1;
      else invited += 1;
    } else {
      failures.push({ email: r.email, error: result.error });
    }
  }

  return {
    status: "ok",
    total: instructors.length,
    invited,
    already_existed: alreadyExisted,
    failures,
  };
}
