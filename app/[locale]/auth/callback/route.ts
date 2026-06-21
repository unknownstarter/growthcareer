/**
 * /[locale]/auth/callback — Supabase 이메일 magic link / PKCE recovery 콜백.
 *
 * ADR 0008 §1 — invite / forgot-password / signup confirm 모두 본 endpoint 로 옴.
 * Supabase 가 PKCE flow 일 때 `?code=` 를 본 endpoint 에서 한 번 교환해야 session
 * 박힘. 본 endpoint 가 교환 후 `next` 로 이동.
 *
 * 매개변수:
 *   ?code=<pkce_code>        — Supabase 자동 부착
 *   ?next=<safe-path>        — 교환 후 이동 path (default: /<locale>/auth/reset-password)
 *
 * 안전:
 *   - next 는 같은 origin 의 path 만 허용 (open redirect 방어).
 *   - /<locale>/auth/* 와 /<locale>/fan-to-pro/* 만 화이트리스트.
 *   - 실패 시 /<locale>/auth/login?error=auth_callback.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthServer } from "@/src/programs/fan-to-pro/infrastructure/auth/supabase-server-auth";

const SAFE_PATH_PREFIXES = ["/auth/", "/fan-to-pro/"];

function isSafeNext(path: string, locale: string): boolean {
  if (!path.startsWith(`/${locale}/`)) return false;
  const rest = path.slice(`/${locale}`.length);
  return SAFE_PATH_PREFIXES.some((p) => rest.startsWith(p));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? `/${locale}/auth/reset-password`;
  const safeNext = isSafeNext(nextRaw, locale)
    ? nextRaw
    : `/${locale}/auth/reset-password`;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/${locale}/auth/login?error=auth_callback`,
    );
  }

  const supabase = await getSupabaseAuthServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/${locale}/auth/login?error=auth_callback`,
    );
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
