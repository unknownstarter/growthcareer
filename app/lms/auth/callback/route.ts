/**
 * /lms/auth/callback — Supabase 이메일 magic link / PKCE recovery 콜백.
 *
 * resetPasswordForEmail 의 redirectTo 는 `/lms/reset-password` 로 직접 보내지만,
 * Supabase 가 PKCE flow 일 때는 `?code=` 를 콜백 endpoint 에서 한 번 교환해야
 * session 이 박힘. 본 endpoint 가 그 교환을 처리한 뒤 reset 페이지로 보냄.
 *
 * 매개변수:
 *   ?code=<pkce_code>        — Supabase 가 redirect URL 에 자동 부착
 *   ?next=<reset-or-other>   — 교환 후 이동할 path (default: /lms/reset-password)
 *
 * 실패 시 /lms/login?error=auth_callback 로.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/lms/reset-password";

  // next 안전 검증 — open redirect 방어. /lms/ 로 시작하는 경로만 허용.
  const safeNext = next.startsWith("/lms/") ? next : "/lms/reset-password";

  if (!code) {
    return NextResponse.redirect(`${origin}/lms/login?error=auth_callback`);
  }

  const supabase = await getSupabaseAuthServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/lms/login?error=auth_callback`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
