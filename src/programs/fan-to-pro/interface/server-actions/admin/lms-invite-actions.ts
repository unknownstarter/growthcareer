"use server";

/**
 * LMS invite server actions — program admin / super_admin 전용 (ADR 0008 §5).
 *
 * 모든 mutation 첫 줄에 assertProgramAdmin('fan-to-pro') — CLAUDE.md §7.4
 * "운영자 페이지 server action 에 assertAdmin() 누락 금지" 룰을 LMS 에도 적용.
 * super_admin 도 통과 (글로벌). program admin 도 통과 (fan-to-pro).
 */
import { revalidatePath } from "next/cache";
import { assertProgramAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import {
  inviteUser,
  type InviteUserResult,
} from "@/src/programs/fan-to-pro/application/use-cases/user/invite-user";
import {
  inviteStudentsBatch,
  type BatchInviteResult,
} from "@/src/programs/fan-to-pro/application/use-cases/user/invite-students-batch";
import {
  inviteInstructorsBatch,
  type BatchInstructorInviteResult,
} from "@/src/programs/fan-to-pro/application/use-cases/user/invite-instructors-batch";

// 새 admin path. 옛 /lms/admin/* 가 사라지면 자연 무효.
const NEW_BASE = "/ko/fan-to-pro/admin";

export async function inviteSingleUserAction(input: {
  email: string;
  display_name: string;
  role: "instructor" | "student";
  student_id?: string | null;
  instructor_id?: string | null;
  company_id?: string | null;
  phone?: string | null;
  // cohort_id: 있으면 cohort_memberships(role) 생성 → role 가드 통과.
  // 운영자만 이 action 을 트리거하고 cohort_id 를 결정하므로 위조 불가.
  cohort_id?: string | null;
}): Promise<InviteUserResult> {
  await assertProgramAdmin("fan-to-pro");
  const result = await inviteUser(input);
  if (result.status === "ok") {
    revalidatePath(`${NEW_BASE}/students`);
    revalidatePath(`${NEW_BASE}/instructors`);
  }
  return result;
}

export async function inviteStudentsBatchAction(input: {
  cohort_id: string;
}): Promise<BatchInviteResult> {
  await assertProgramAdmin("fan-to-pro");
  const result = await inviteStudentsBatch(input);
  if (result.status === "ok") {
    revalidatePath(`${NEW_BASE}/students`);
  }
  return result;
}

export async function inviteInstructorsBatchAction(input: {
  cohort_id: string;
}): Promise<BatchInstructorInviteResult> {
  await assertProgramAdmin("fan-to-pro");
  const result = await inviteInstructorsBatch(input);
  if (result.status === "ok") {
    revalidatePath(`${NEW_BASE}/instructors`);
  }
  return result;
}
