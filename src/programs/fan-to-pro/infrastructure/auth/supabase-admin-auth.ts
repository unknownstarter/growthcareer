/**
 * Supabase Auth admin client — server-side, service_role 키.
 *
 * `supabase.auth.admin.*` API 사용. 사용자 invite / 계정 삭제 / role 변경 등
 * 운영자 전용 작업. 절대 client 노출 금지 — server action 안에서만 호출.
 *
 * 환경 변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 키 누락 시 null 반환. 호출자가 invite 실패 처리.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseAuthAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
