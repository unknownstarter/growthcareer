-- B0032 LMS Wave 1 Step 2 — Program 모듈화 (ADR 0008).
--
-- 신규 4 테이블 + 기존 3 테이블 확장:
--   1) programs                     (마스터 — fan-to-pro 등)
--   2) program_memberships          (user × program × 'admin')
--   3) cohort_memberships           (user × cohort × 'instructor'|'student')
--   4) cohorts.program_id           (FK, NOT NULL backfill)
--   5) cohorts.slug                 (text UNIQUE)
--   6) cohorts.accepts_signup_now   (boolean default false)
--   7) instructors.program_id       (FK, nullable backfill)
--   8) user_profiles.is_super_admin (boolean default false)
--   9) user_profiles.must_change_password (boolean default true)
--  10) user_profiles.role           (drop NOT NULL — deprecated by memberships)
--
-- RLS 정책 (programs / program_memberships / cohort_memberships):
--   - service_role : 전체 (server action invite/관리)
--   - self_read    : 본인 membership row 만 (instructor/student surface 에서 본인 cohort 확인)
--   - programs     : 모두 read (fan-to-pro 만 존재, 광고지면 X)
--
-- 본격 RLS (cohort/student/session/attendance 등 cohort_id 보유 entity) 는
-- 별도 마이그레이션 20260622000002_lms_rls_policies.sql 에서.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (수동):
--   alter table public.user_profiles drop column if exists must_change_password;
--   alter table public.user_profiles drop column if exists is_super_admin;
--   alter table public.instructors   drop column if exists program_id;
--   drop index if exists cohorts_slug_unique;
--   alter table public.cohorts       drop column if exists accepts_signup_now;
--   alter table public.cohorts       drop column if exists slug;
--   alter table public.cohorts       drop column if exists program_id;
--   drop table if exists public.cohort_memberships;
--   drop table if exists public.program_memberships;
--   drop table if exists public.programs;

-- 1. programs --------------------------------------------------------------
-- 마스터. slug = URL segment ('fan-to-pro'). status = active/paused/archived.

create table if not exists public.programs (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null check (char_length(trim(slug)) >= 1),
  name       text not null check (char_length(trim(name)) >= 1),
  status     text not null default 'active'
               check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

comment on table public.programs is
  'B0032 ADR 0008 program 마스터. slug 가 URL segment 로 직접 노출 (/fan-to-pro 등).';

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- Fan to Pro 시드.
insert into public.programs (slug, name, status)
  values ('fan-to-pro', 'Fan to Pro', 'active')
  on conflict (slug) do nothing;

-- 2. program_memberships ---------------------------------------------------
-- super_admin 외 program 단위 admin. instructor/student 는 cohort_memberships 로.

create table if not exists public.program_memberships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  role       text not null check (role in ('admin')),
  created_at timestamptz not null default now(),

  primary key (user_id, program_id, role)
);

comment on table public.program_memberships is
  'B0032 program 단위 권한. role=admin (program 별 운영자). super_admin 은 user_profiles.is_super_admin true.';

create index if not exists program_memberships_program_idx
  on public.program_memberships (program_id);

-- 3. cohort_memberships ----------------------------------------------------
-- cohort 단위 instructor + student. 1 user 가 여러 cohort 에 동시 활동 가능.

create table if not exists public.cohort_memberships (
  user_id    uuid not null references auth.users(id) on delete cascade,
  cohort_id  uuid not null references public.cohorts(id) on delete cascade,
  role       text not null check (role in ('instructor','student')),
  created_at timestamptz not null default now(),

  primary key (user_id, cohort_id, role)
);

comment on table public.cohort_memberships is
  'B0032 cohort 단위 권한. role=instructor (해당 cohort 강사) / student (해당 cohort 학생).';

create index if not exists cohort_memberships_cohort_idx
  on public.cohort_memberships (cohort_id);
create index if not exists cohort_memberships_user_idx
  on public.cohort_memberships (user_id);

-- 4. cohorts 확장 (program_id + slug + accepts_signup_now) -----------------
-- backfill: 기존 cohorts row 모두 fan-to-pro 에 귀속.

alter table public.cohorts
  add column if not exists program_id uuid references public.programs(id);

update public.cohorts
   set program_id = (select id from public.programs where slug = 'fan-to-pro' limit 1)
 where program_id is null;

alter table public.cohorts alter column program_id set not null;

-- slug: 8자 hex (nanoid 대체 — gen_random_bytes 4 → hex 8). reserved word 충돌 회피.
-- 충돌 매우 적음 (62^8 보단 작지만 16^8 = 42억 + cohort 수 ~수십).

alter table public.cohorts add column if not exists slug text;

-- 기존 row backfill — 임시 placeholder. 운영자가 추후 in-app 으로 의미있는 slug 로 변경 가능.
do $$
declare
  v_cohort record;
  v_slug text;
  v_tries int;
  v_reserved text[] := array['admin','apply','auth','login','logout','student','instructor','dashboard','api'];
begin
  for v_cohort in select id from public.cohorts where slug is null loop
    v_tries := 0;
    loop
      v_slug := substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
      v_tries := v_tries + 1;
      -- reserved word 또는 collision 시 재시도. 10회 시도 후엔 prefix 추가.
      exit when v_slug <> all(v_reserved)
        and not exists (select 1 from public.cohorts where slug = v_slug);
      if v_tries > 10 then
        v_slug := 'c' || v_slug;
        exit;
      end if;
    end loop;
    update public.cohorts set slug = v_slug where id = v_cohort.id;
  end loop;
end;
$$;

alter table public.cohorts alter column slug set not null;

create unique index if not exists cohorts_slug_unique on public.cohorts (slug);

alter table public.cohorts
  add column if not exists accepts_signup_now boolean not null default false;

comment on column public.cohorts.program_id is
  'B0032 program 귀속. fan-to-pro 의 cohort 만 — 다른 program 추가 시 program_id 분기.';
comment on column public.cohorts.slug is
  'B0032 ADR 0008 URL segment. 8자 hex (외부 추측 곤란). UNIQUE.';
comment on column public.cohorts.accepts_signup_now is
  'B0032 마케팅 페이지에서 현재 모집 중 표시 여부. 운영자 in-app 으로 토글.';

create index if not exists cohorts_program_idx on public.cohorts (program_id);

-- 5. instructors.program_id ------------------------------------------------
-- 강사 program 귀속. NULL 가능 (multi-program 강사) — 단 1기 backfill 은 fan-to-pro.

alter table public.instructors
  add column if not exists program_id uuid references public.programs(id) on delete set null;

update public.instructors
   set program_id = (select id from public.programs where slug = 'fan-to-pro' limit 1)
 where program_id is null;

comment on column public.instructors.program_id is
  'B0032 강사 program 귀속. NULL = 모든 program 공통. fan-to-pro 1기는 backfill 됨.';

create index if not exists instructors_program_idx on public.instructors (program_id);

-- 6. user_profiles 확장 (is_super_admin + must_change_password) ------------
-- 기존 role 컬럼은 deprecated — backward-compat 만 유지.
-- super_admin 분기는 is_super_admin = true 로 이전.
-- 첫 로그인 강제 PW 변경 = must_change_password.

alter table public.user_profiles
  add column if not exists is_super_admin boolean not null default false;

alter table public.user_profiles
  add column if not exists must_change_password boolean not null default true;

-- 기존 role='super_admin' user 는 is_super_admin true + 첫 PW 변경 면제 (이미 활동 중).
update public.user_profiles
   set is_super_admin = true,
       must_change_password = false
 where role = 'super_admin';

-- 기존 role='instructor'/'student' 는 이미 PW 설정한 경우만 면제. password_changed_at 있으면 면제.
update public.user_profiles
   set must_change_password = false
 where role in ('instructor','student')
   and password_changed_at is not null;

-- role 컬럼 deprecate — NOT NULL 풀음. 새 invite 는 cohort_memberships 로.
-- 기존 row 의 role 값은 backfill 후 점진 정리 (Wave 4 에서 column drop 검토).
alter table public.user_profiles alter column role drop not null;

comment on column public.user_profiles.is_super_admin is
  'B0032 ADR 0008 글로벌 super_admin (노아). program 무관 전체 access.';
comment on column public.user_profiles.must_change_password is
  'B0032 ADR 0008 첫 로그인 강제 PW 변경 flag. invite 직후 true, change-password 페이지에서 false.';
comment on column public.user_profiles.role is
  'B0032 DEPRECATED — program_memberships + cohort_memberships 로 이전. 기존 row 호환만 유지.';

create index if not exists user_profiles_is_super_admin_idx
  on public.user_profiles (is_super_admin)
  where is_super_admin = true;

-- 7. RLS + 권한 -----------------------------------------------------------

alter table public.programs            enable row level security;
alter table public.program_memberships enable row level security;
alter table public.cohort_memberships  enable row level security;

revoke all on public.programs            from anon, authenticated;
revoke all on public.program_memberships from anon, authenticated;
revoke all on public.cohort_memberships  from anon, authenticated;

grant all    on public.programs            to service_role;
grant all    on public.program_memberships to service_role;
grant all    on public.cohort_memberships  to service_role;

grant select on public.programs            to authenticated;
grant select on public.program_memberships to authenticated;
grant select on public.cohort_memberships  to authenticated;

-- programs: 모두 read OK (fan-to-pro 만 존재, 광고지면 X).
drop policy if exists service_role_all on public.programs;
create policy service_role_all on public.programs
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists self_read on public.programs;
create policy self_read on public.programs
  for select
  using (true);

-- program_memberships: 본인 row 만.
drop policy if exists service_role_all on public.program_memberships;
create policy service_role_all on public.program_memberships
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists self_read on public.program_memberships;
create policy self_read on public.program_memberships
  for select
  using (auth.uid() = user_id);

-- cohort_memberships: 본인 row 만.
drop policy if exists service_role_all on public.cohort_memberships;
create policy service_role_all on public.cohort_memberships
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists self_read on public.cohort_memberships;
create policy self_read on public.cohort_memberships
  for select
  using (auth.uid() = user_id);
