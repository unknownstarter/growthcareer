/**
 * Supabase Auth — browser client (ADR 0007 §2~3).
 *
 * client component 에서 사용. createBrowserClient (ssr 패키지) 가 cookie
 * sync 를 자동 처리해 server 와 session 일관.
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * 키가 없으면 throw — Auth client 는 키 없이 동작 X (server.ts 의 fallback
 * 패턴과 다름. browser side 는 키 없으면 로그인 자체 불가).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[supabase-browser] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경 변수 누락.",
    );
  }

  cached = createBrowserClient(url, anonKey);
  return cached;
}
