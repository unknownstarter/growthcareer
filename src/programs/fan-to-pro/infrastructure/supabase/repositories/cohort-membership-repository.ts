/**
 * cohort_memberships repository — invite 흐름에서 role(instructor|student) 부여.
 *
 * 스키마 (20260622000001):
 *   primary key (user_id, cohort_id, role), role in ('instructor','student').
 *   RLS: service_role_all (write) + self_read. 본 repository 는 service_role
 *   client(getSupabaseServer) 로 동작 — RLS 우회. invite use case 내부에서만
 *   호출되고, 그 use case 는 assertProgramAdmin 가드가 걸린 server action 안에서만
 *   실행된다 (lms-invite-actions.ts).
 *
 * 멱등성: PK 가 (user_id, cohort_id, role) 3-tuple 이라 upsert onConflict 로
 *   중복 insert 를 no-op 처리. 재초대해도 안전.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const TABLE = "cohort_memberships";

export type CohortMembershipRole = "instructor" | "student";

export type UpsertCohortMembershipInput = {
  user_id: string; // auth.users.id
  cohort_id: string;
  role: CohortMembershipRole;
};

/**
 * (user_id, cohort_id, role) membership upsert. PK 충돌 시 no-op (멱등).
 * service_role 로 write — 호출자(invite use case)가 assertProgramAdmin 가드 뒤에 있어야 함.
 */
export async function upsertCohortMembership(
  input: UpsertCohortMembershipInput,
): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) throw new Error("supabaseUnavailable");

  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: input.user_id,
        cohort_id: input.cohort_id,
        role: input.role,
      },
      { onConflict: "user_id,cohort_id,role", ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
}
