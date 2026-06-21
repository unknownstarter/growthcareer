/**
 * Supabase Auth — server-side client (ADR 0007 §2~3).
 *
 * server component / server action / route handler 에서 사용. cookie store
 * 를 직접 read/write 해 session 유지.
 *
 * 기존 `infrastructure/supabase/server.ts` (service_role 키, RLS 우회) 와
 * 별개. 본 파일은 anon key + cookie session — 로그인한 사용자 자격으로 동작.
 *
 * service_role 키 사용처:
 *   - server action 의 admin 작업 (invite / role 변경 / 회사 단위 정산 등)
 *   → getSupabaseServer() (기존)
 *
 * anon key + session 사용처:
 *   - 로그인 / 로그아웃 / session 검증 / 본인 profile read
 *   - middleware 에서 role 결정
 *   → getSupabaseAuthServer() / getSupabaseAuthMiddleware() (본 파일)
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 키가 없으면 throw — 로그인 페이지 자체 동작 불가.
 */
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

function requireEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "[supabase-server-auth] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수 누락.",
    );
  }
  return { url, anonKey };
}

/**
 * server component / server action / route handler 에서 호출.
 * cookies() 는 next/headers — server context 외부에선 throw.
 */
export async function getSupabaseAuthServer(): Promise<SupabaseClient> {
  const { url, anonKey } = requireEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // server component 에서 set 호출 시 throw — 무시.
          // session refresh 는 middleware 에서 처리.
        }
      },
    },
  });
}

/**
 * middleware 안에서 호출. NextRequest / NextResponse 의 cookie 를 직접 sync.
 * 호출자가 response 의 cookie 수정을 받아 그대로 반환해야 session refresh 가 동작.
 */
export function getSupabaseAuthMiddleware(
  req: NextRequest,
  res: NextResponse,
): SupabaseClient {
  const { url, anonKey } = requireEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ) {
        for (const { name, value, options } of cookiesToSet) {
          // request 에도 박아야 같은 요청 내 후속 read 가 새 값을 봄.
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        }
      },
    },
  });
}
