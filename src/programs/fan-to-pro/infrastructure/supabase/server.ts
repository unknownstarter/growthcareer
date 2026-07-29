/**
 * Re-export 브리지 (Task #12).
 * 실제 구현은 `@/src/shared/supabase/server` 로 승격됨.
 * fan-to-pro 호출처(78곳) 무변경을 위해 named re-export 유지.
 */
export { getSupabaseServer } from "@/src/shared/supabase/server";
