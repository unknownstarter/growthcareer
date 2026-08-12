/**
 * Use case — 모든 instructor 일괄 invite + 지정 cohort 의 강사 membership 부여.
 *
 * 흐름:
 * 1. instructors 조회 (email 보유한 강사만)
 * 2. 각 강사마다 inviteUser 호출 (role=instructor, instructor_id + company_id +
 *    cohort_id 박음). cohort_id 로 cohort_memberships(role=instructor) 생성 →
 *    해당 cohort 의 instructor surface + 커뮤니티(스코프 B) 접근 가능.
 *
 * cohort_id 는 호출 action 이 결정 (운영자가 UI 에서 cohort 선택). 강사는 여러
 * cohort 에 배정될 수 있으므로, 각 cohort 마다 이 batch 를 호출 = 멱등 upsert.
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

export async function inviteInstructorsBatch(input: {
  cohort_id: string;
}): Promise<BatchInstructorInviteResult> {
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
      cohort_id: input.cohort_id,
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
