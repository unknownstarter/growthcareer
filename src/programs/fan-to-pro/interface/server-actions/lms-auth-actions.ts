"use server";

/**
 * LMS Auth server actions (B0032 Wave 1 Step 2 ADR 0008 적용).
 *
 * 입력 검증 = zod (CLAUDE.md Iris 룰 1: 경계 1회 검증).
 * 외부 호출 (Supabase Auth) = SDK 가 fetch 기반 자체 timeout 없음. 사용자 UI 가
 * 무한 wait 시 새로고침 가능 — 별도 timeout 안 박음.
 * 에러 핸들링 = 경계 레이어 (룰 4): Result union 반환, 내부 throw.
 */

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { resolvePostLoginRedirect } from "@/src/programs/fan-to-pro/infrastructure/auth/post-login-redirect";
import { getLmsUser } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";

const loginSchema = z.object({
  email: z.string().trim().min(3).email(),
  password: z.string().min(8),
  next: z.string().optional(),
  locale: z.string().min(2).max(5).default("ko"),
});

export type LoginResult =
  | { status: "ok"; redirectTo: string }
  | { status: "error"; message: string };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
    locale: formData.get("locale") ?? "ko",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "이메일 또는 비밀번호 형식이 올바르지 않습니다.",
    };
  }

  const { email, password, next, locale } = parsed.data;

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

  // last_login_at 갱신 — 실패해도 로그인은 성공으로 처리.
  await supabase
    .from("user_profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  const user = await getLmsUser();
  if (!user) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "사용자 프로필이 없습니다. 운영자에게 문의해주세요.",
    };
  }

  // must_change_password = true 인 사용자는 무조건 change-password 로.
  if (user.mustChangePassword) {
    return { status: "ok", redirectTo: `/${locale}/auth/change-password` };
  }

  const fallback = await resolvePostLoginRedirect(user, locale);

  // next 의 안전 검증 — open redirect 방어. /[locale]/{auth,fan-to-pro}/ 만.
  const safe = next && isSafeNext(next, locale) ? next : fallback;
  return { status: "ok", redirectTo: safe };
}

function isSafeNext(path: string, locale: string): boolean {
  if (!path.startsWith(`/${locale}/`)) return false;
  const rest = path.slice(`/${locale}`.length);
  return rest.startsWith("/auth/") || rest.startsWith("/fan-to-pro/");
}

const forgotSchema = z.object({
  email: z.string().trim().min(3).email(),
  locale: z.string().min(2).max(5).default("ko"),
});

export type ForgotResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function forgotPasswordAction(
  formData: FormData,
): Promise<ForgotResult> {
  const parsed = forgotSchema.safeParse({
    email: formData.get("email"),
    locale: formData.get("locale") ?? "ko",
  });
  if (!parsed.success) {
    return { status: "error", message: "이메일 형식이 올바르지 않습니다." };
  }

  const supabase = await getSupabaseAuthServer();

  // redirect URL = 현재 origin 기반. callback endpoint 가 PKCE code 교환 후 reset 으로.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "growthcareer.xyz";
  const next = `/${parsed.data.locale}/auth/reset-password`;
  const redirectTo = `${proto}://${host}/${parsed.data.locale}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );

  // 이메일 enumeration 방어 — 존재 여부 노출 X. 항상 ok.
  void error;
  return { status: "ok" };
}

const resetSchema = z
  .object({
    password: z.string().min(10, "비밀번호는 10자 이상이어야 합니다."),
    confirm: z.string().min(10),
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
      message:
        "세션이 만료되었습니다. 비밀번호 재설정 메일 링크를 다시 클릭해주세요.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "비밀번호 변경 실패. 잠시 후 다시 시도해주세요.",
    };
  }

  // user_profiles 에 password_changed_at + must_change_password=false 박음.
  // service_role 로 (sessions 의 anon client 는 self-update 권한 별도 필요).
  const admin = getSupabaseServer();
  if (admin) {
    await admin
      .from("user_profiles")
      .update({
        password_changed_at: new Date().toISOString(),
        must_change_password: false,
      })
      .eq("id", user.id);
  }

  return { status: "ok" };
}

const changeSchema = z
  .object({
    password: z.string().min(10, "비밀번호는 10자 이상이어야 합니다."),
    confirm: z.string().min(10),
  })
  .refine((d) => d.password === d.confirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirm"],
  });

export type ChangeResult =
  | { status: "ok" }
  | { status: "error"; message: string };

/**
 * 첫 로그인 강제 PW 변경 (ADR 0008 §4).
 *
 * old PW 확인 X — 이미 로그인 상태. resetPasswordAction 과 본질 동일하지만 의도
 * 분리 — UX (페이지 카피) + 향후 정책 (강제 변경시 더 강한 룰) 차이 가능.
 */
export async function changePasswordAction(
  formData: FormData,
): Promise<ChangeResult> {
  const parsed = changeSchema.safeParse({
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
      message: "세션이 만료되었습니다. 다시 로그인해주세요.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "비밀번호 변경 실패. 잠시 후 다시 시도해주세요.",
    };
  }

  const admin = getSupabaseServer();
  if (admin) {
    await admin
      .from("user_profiles")
      .update({
        password_changed_at: new Date().toISOString(),
        must_change_password: false,
      })
      .eq("id", user.id);
  }

  return { status: "ok" };
}

export async function logoutAction(locale: string = "ko"): Promise<void> {
  const supabase = await getSupabaseAuthServer();
  await supabase.auth.signOut();
  redirect(`/${locale}/auth/login`);
}
