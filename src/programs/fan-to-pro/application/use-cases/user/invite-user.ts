/**
 * Use case — 운영자가 사용자 (instructor / student) 를 invite.
 *
 * 흐름:
 * 1. Supabase Auth admin.inviteUserByEmail → magic link 발송
 * 2. user_profiles row INSERT (role + lineage)
 *
 * Sage critical: 이 use case 는 super_admin server action 안에서만 호출.
 * assertLmsRole('super_admin') 1차 가드는 호출자가 책임.
 *
 * 멱등성: 이미 같은 이메일의 user 가 있으면 invite 다시 발송 + profile 생성/갱신.
 * Supabase Auth 의 inviteUserByEmail 은 이미 존재하는 user 에 422 반환 — 그
 * 경우 user 만 조회 후 profile 만 upsert.
 */
import { z } from "zod";
import { getSupabaseAuthAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-admin-auth";
import {
  insertProfile,
  fetchProfileByEmail,
  updateProfile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/user-profile-repository";

const InputSchema = z.object({
  email: z.string().trim().min(3).email(),
  display_name: z.string().trim().min(1),
  role: z.enum(["super_admin", "instructor", "student"]),
  company_id: z.string().uuid().nullable().optional(),
  student_id: z.string().uuid().nullable().optional(),
  instructor_id: z.string().uuid().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
});

export type InviteUserInput = z.infer<typeof InputSchema>;
export type InviteUserResult =
  | { status: "ok"; user_id: string; already_existed: boolean }
  | { status: "error"; error: string };

export async function inviteUser(input: unknown): Promise<InviteUserResult> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const data = parsed.data;

  const admin = getSupabaseAuthAdmin();
  if (!admin) return { status: "error", error: "supabaseAdminUnavailable" };

  // 1) auth.users 에 invite 발송. 이미 존재하면 422.
  let userId: string | null = null;
  let alreadyExisted = false;

  const redirectTo = inviteRedirectTo();

  const { data: inviteData, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo,
      data: {
        role: data.role,
        display_name: data.display_name,
      },
    });

  if (inviteErr) {
    // 이미 존재하는 사용자 — 기존 user_id 조회.
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (listErr) return { status: "error", error: listErr.message };
    const existing = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!existing) {
      return { status: "error", error: inviteErr.message };
    }
    userId = existing.id;
    alreadyExisted = true;
  } else {
    userId = inviteData.user?.id ?? null;
  }

  if (!userId) return { status: "error", error: "noUserIdAfterInvite" };

  // 2) user_profiles upsert.
  const existingProfile = await fetchProfileByEmail(data.email);
  try {
    if (existingProfile) {
      await updateProfile(existingProfile.id, {
        role: data.role,
        display_name: data.display_name,
        phone: data.phone ?? null,
        company_id: data.company_id ?? null,
        student_id: data.student_id ?? null,
        instructor_id: data.instructor_id ?? null,
      });
    } else {
      await insertProfile({
        id: userId,
        role: data.role,
        display_name: data.display_name,
        email: data.email,
        phone: data.phone ?? null,
        company_id: data.company_id ?? null,
        student_id: data.student_id ?? null,
        instructor_id: data.instructor_id ?? null,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }

  return { status: "ok", user_id: userId, already_existed: alreadyExisted };
}

function inviteRedirectTo(): string {
  // invite 메일 링크의 redirect 처는 reset-password (학생/강사가 첫 PW 설정).
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthcareer.xyz";
  return `${base}/lms/reset-password`;
}
