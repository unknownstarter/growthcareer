"use server";

/**
 * LMS invite server actions — super_admin 전용.
 *
 * 모든 mutation 첫 줄에 assertLmsRole('super_admin') — CLAUDE.md §7.4
 * "운영자 페이지 server action 에 assertAdmin() 누락 금지" 룰을 LMS 에도 적용.
 */
import { revalidatePath } from "next/cache";
import { assertLmsRole } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
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

export async function inviteSingleUserAction(input: {
  email: string;
  display_name: string;
  role: "instructor" | "student";
  student_id?: string | null;
  instructor_id?: string | null;
  company_id?: string | null;
  phone?: string | null;
}): Promise<InviteUserResult> {
  await assertLmsRole("super_admin");
  const result = await inviteUser(input);
  if (result.status === "ok") {
    revalidatePath("/lms/admin/students");
    revalidatePath("/lms/admin/instructors");
  }
  return result;
}

export async function inviteStudentsBatchAction(input: {
  cohort_id: string;
}): Promise<BatchInviteResult> {
  await assertLmsRole("super_admin");
  const result = await inviteStudentsBatch(input);
  if (result.status === "ok") {
    revalidatePath("/lms/admin/students");
  }
  return result;
}

export async function inviteInstructorsBatchAction(): Promise<BatchInstructorInviteResult> {
  await assertLmsRole("super_admin");
  const result = await inviteInstructorsBatch();
  if (result.status === "ok") {
    revalidatePath("/lms/admin/instructors");
  }
  return result;
}
