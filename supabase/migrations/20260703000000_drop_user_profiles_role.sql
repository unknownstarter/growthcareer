-- Mira B0065 M-2 (2026-07-03): user_profiles.role deprecated 컬럼 삭제.
--
-- ADR 0008 이후 role 결정 = is_super_admin OR program_memberships OR cohort_memberships.
-- user_profiles.role 은 fallback 만 유지되던 상태 — 삭제 안전.
--
-- 삭제 전 확인 (수동 rollback 필요 시):
--   select id, email, role, is_super_admin from public.user_profiles;
--
-- 롤백 (수동):
--   alter table public.user_profiles add column role text;

alter table public.user_profiles
  drop column if exists role;

comment on table public.user_profiles is
  'B0065 M-2 정리 후: role 컬럼 삭제. 권한 결정 = is_super_admin / program_memberships / cohort_memberships 3 계층.';
