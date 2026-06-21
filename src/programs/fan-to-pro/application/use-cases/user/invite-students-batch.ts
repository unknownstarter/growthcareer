/**
 * Use case — cohort 의 모든 student 일괄 invite.
 *
 * 흐름:
 * 1. students 조회 (status='active') + applicants join 으로 email 추출
 * 2. 각 학생마다 inviteUser 호출 (role=student, student_id 박음)
 * 3. 결과 집계
 *
 * 멱등 — 이미 invite 된 학생은 already_existed=true 반환, 재발송으로 처리.
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { inviteUser } from "@/src/programs/fan-to-pro/application/use-cases/user/invite-user";

export type BatchInviteResult =
  | {
      status: "ok";
      total: number;
      invited: number;
      already_existed: number;
      failures: Array<{ email: string; error: string }>;
    }
  | { status: "error"; error: string };

export async function inviteStudentsBatch(input: {
  cohort_id: string;
}): Promise<BatchInviteResult> {
  const supabase = getSupabaseServer();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // student → applicant join 으로 email 가져옴.
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, display_name, applicant_id, applicants(email, phone, redacted_at)",
    )
    .eq("cohort_id", input.cohort_id)
    .eq("status", "active");
  if (error) return { status: "error", error: error.message };

  const rows = (data ?? []) as Array<{
    id: string;
    display_name: string;
    applicants?: { email?: string; phone?: string; redacted_at?: string | null } | null;
  }>;

  let invited = 0;
  let alreadyExisted = 0;
  const failures: Array<{ email: string; error: string }> = [];

  for (const r of rows) {
    const email = r.applicants?.email ?? null;
    const phone = r.applicants?.phone ?? null;
    const redacted = r.applicants?.redacted_at ?? null;

    if (!email) {
      failures.push({ email: "(unknown)", error: "missingEmail" });
      continue;
    }
    if (redacted) {
      failures.push({ email, error: "applicantRedacted" });
      continue;
    }

    const result = await inviteUser({
      email,
      display_name: r.display_name,
      role: "student",
      student_id: r.id,
      phone,
    });

    if (result.status === "ok") {
      if (result.already_existed) alreadyExisted += 1;
      else invited += 1;
    } else {
      failures.push({ email, error: result.error });
    }
  }

  return {
    status: "ok",
    total: rows.length,
    invited,
    already_existed: alreadyExisted,
    failures,
  };
}
