"use server";

/**
 * LMS Auth server actions (B0032 Wave 1 Step 1).
 *
 * 입력 검증 = zod (CLAUDE.md Iris 룰 1: 경계 1회 검증).
 * 외부 호출 (Supabase Auth) = timeout / retry 정책 (룰 3): Supabase SDK 가 fetch
 * 기반 — 자체 timeout 없음. 로그인 폼은 client side 인터랙티브라 별도 timeout
 * 박지 않음 (사용자 UI 가 무한 wait 시 새로고침 가능).
 * 에러 핸들링 = 경계 레이어 (룰 4): Result union 반환, 내부 throw.
 */

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";

const loginSchema = z.object({
  email: z.string().trim().min(3).email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export type LoginResult =
  | { status: "ok"; redirectTo: string }
  | { status: "error"; message: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "이메일 또는 비밀번호 형식이 올바르지 않습니다." };
  }

  const { email, password, next } = parsed.data;

  const supabase = await getSupabaseAuthServer();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: "이메일 또는 비밀번호가 일치하지 않습니다.",
    };
  }

  // last_login_at 갱신은 실패해도 로그인은 성공으로 처리 (UX 우선).
  await supabase
    .from("user_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  // role 조회 후 redirect 결정. next 가 있으면 우선 (단 안전 검증).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (!profile?.role) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "사용자 프로필이 없습니다. 운영자에게 문의해주세요.",
    };
  }

  const dashboardByRole: Record<string, string> = {
    super_admin: "/lms/admin/dashboard",
    instructor: "/lms/instructor/dashboard",
    student: "/lms/student/dashboard",
  };

  const fallback = dashboardByRole[profile.role] ?? "/lms";

  // next 의 안전 검증 — open redirect 방어. /lms/ 로 시작하는 경로만 허용.
  const redirectTo =
    next && next.startsWith("/lms/") && !next.startsWith("/lms/login")
      ? next
      : fallback;

  return { status: "ok", redirectTo };
}

const forgotSchema = z.object({
  email: z.string().trim().min(3).email(),
});

export type ForgotResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function forgotPasswordAction(
  formData: FormData,
): Promise<ForgotResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: "이메일 형식이 올바르지 않습니다." };
  }

  const supabase = await getSupabaseAuthServer();

  // redirect URL 은 현재 origin 기반 — 운영/preview/local 환경별 자동 적응.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "growthcareer.xyz";
  const redirectTo = `${proto}://${host}/lms/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo,
  });

  if (error) {
    // 이메일 enumeration 방어 — 존재 여부 노출 X. 항상 ok.
    return { status: "ok" };
  }
  return { status: "ok" };
}

const resetSchema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirm: z.string().min(8),
  })
  .refine((d) => d.password === d.confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirm"],
  });

export type ResetResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function resetPasswordAction(
  formData: FormData,
): Promise<ResetResult> {
  const parsed = resetSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    };
  }

  const supabase = await getSupabaseAuthServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "세션이 만료되었습니다. 비밀번호 재설정 메일 링크를 다시 클릭해주세요.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { status: "error", message: "비밀번호 변경 실패. 잠시 후 다시 시도해주세요." };
  }

  await supabase
    .from("user_profiles")
    .update({ password_changed_at: new Date().toISOString() })
    .eq("id", user.id);

  return { status: "ok" };
}

export async function logoutAction(): Promise<void> {
  const supabase = await getSupabaseAuthServer();
  await supabase.auth.signOut();
  redirect("/lms/login");
}
