/**
 * Use case — 운영자가 사용자 (instructor / student) 를 invite.
 *
 * 흐름:
 * 1. Supabase Auth admin.inviteUserByEmail → magic link 발송
 * 2. user_profiles row INSERT (lineage: company/student/instructor id)
 * 3. cohort_id 가 있고 role 이 instructor|student 면 cohort_memberships upsert
 *    (role 가드 통과에 필수 — 이게 없으면 로그인해도 LMS/커뮤니티 접근 불가).
 *
 * Sage critical: 이 use case 는 program admin / super_admin server action 안에서만
 * 호출. assertProgramAdmin('fan-to-pro') 1차 가드는 호출자(lms-invite-actions)가 책임.
 * cohort_id 는 호출 action 이 결정 (per-cohort UI 또는 명시 파라미터) — 클라이언트가
 * 임의 cohort 에 자기를 박을 수 없음 (invite 는 운영자만 트리거).
 *
 * 멱등성: 이미 같은 이메일의 user 가 있으면 invite 다시 발송 + profile 생성/갱신 +
 * membership upsert (PK 충돌 no-op). Supabase Auth 의 inviteUserByEmail 은 이미
 * 존재하는 user 에 422 반환 — 그 경우 user 만 조회 후 profile/membership upsert.
 */
import { z } from "zod";
import { getSupabaseAuthAdmin } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-admin-auth";
import {
  insertProfile,
  fetchProfileByEmail,
  updateProfile,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/user-profile-repository";
import { upsertCohortMembership } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-membership-repository";
import {
  assignInstructorReferralCode,
  assignStudentReferralCode,
} from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/referral-repository";

const InputSchema = z.object({
  email: z.string().trim().min(3).email(),
  display_name: z.string().trim().min(1),
  role: z.enum(["super_admin", "instructor", "student"]),
  company_id: z.string().uuid().nullable().optional(),
  student_id: z.string().uuid().nullable().optional(),
  instructor_id: z.string().uuid().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  // cohort_id: 있으면 role(instructor|student) 로 cohort_memberships 생성.
  // super_admin invite 는 cohort 없음 → 생략.
  cohort_id: z.string().uuid().nullable().optional(),
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
      // Mira B0065 M-2 (2026-07-03): user_profiles.role 컬럼 삭제.
      // role 은 program_memberships / cohort_memberships 에 별도 박음.
      // is_super_admin 은 profile 에서 직접 관리.
      await updateProfile(existingProfile.id, {
        display_name: data.display_name,
        phone: data.phone ?? null,
        company_id: data.company_id ?? null,
        student_id: data.student_id ?? null,
        instructor_id: data.instructor_id ?? null,
        is_super_admin: data.role === "super_admin",
      });
    } else {
      await insertProfile({
        id: userId,
        display_name: data.display_name,
        email: data.email,
        phone: data.phone ?? null,
        company_id: data.company_id ?? null,
        student_id: data.student_id ?? null,
        instructor_id: data.instructor_id ?? null,
        is_super_admin: data.role === "super_admin",
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return { status: "error", error: msg };
  }

  // 2b) 레퍼럴 코드 부여 (미부여 시에만, 멱등).
  // super_admin(GCFTP0 노아)은 마이그레이션에서 고정 발급 → 여기서 건드리지 않음.
  // instructor 는 instructors 테이블 코드 부여 (공유 주체 = 강사 마스터 레코드).
  // student invite 는 promote 시점에 이미 부여됨 → student_id 있어도 재발급 X.
  // 실패해도 invite 자체는 성공 처리 (코드는 추후 재부여 가능, 비필수).
  try {
    // 본인 코드의 소유 주체 = person 레코드(students / instructors). user_profiles
    // 코드는 super_admin(노아 GCFTP0, 마이그레이션 고정)만 → invite 로는 부여 안 함.
    // student/instructor 계정은 자기 person 레코드 코드를 씀(한 사람 코드 2개 방지).
    if (data.instructor_id) {
      await assignInstructorReferralCode(data.instructor_id);
    }
    if (data.student_id) {
      await assignStudentReferralCode(data.student_id);
    }
  } catch {
    // 레퍼럴 코드 부여 실패는 invite 를 막지 않음 (best-effort).
  }

  // 3) cohort_memberships — role 가드 통과에 필수.
  // super_admin 은 cohort 무관(글로벌 is_super_admin) → 스킵.
  // 계정+프로필은 위에서 이미 커밋됨. 여기서 실패하면 에러 반환하되,
  // 재초대 시 profile/membership 모두 upsert 라 멱등 복구된다.
  if (data.cohort_id && data.role !== "super_admin") {
    try {
      await upsertCohortMembership({
        user_id: userId,
        cohort_id: data.cohort_id,
        role: data.role,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      return { status: "error", error: `membershipFailed: ${msg}` };
    }
  }

  return { status: "ok", user_id: userId, already_existed: alreadyExisted };
}

function inviteRedirectTo(): string {
  // invite 메일 링크의 redirect — auth/callback 이 PKCE code 교환 후 change-password 로.
  // ADR 0008 §4: 첫 로그인 강제 PW 변경 (must_change_password=true). user_profiles
  // INSERT 시 default true 박힘.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://growthcareer.xyz";
  // locale 은 ko 기본. 외국인 학생 magic link 는 별도 i18n 도입 시 분기.
  const next = encodeURIComponent("/ko/auth/change-password");
  return `${base}/ko/auth/callback?next=${next}`;
}
