-- B0032 LMS Wave 1 Step 1 — Supabase Auth 도입 + user_profiles.
--
-- 신규 인증 시스템 (ADR 0007 §2~3):
--   /lms/* = Supabase Auth + role (super_admin / instructor / student)
--   기존 /admin/* = Basic Auth (변경 X)
--
-- user_profiles = auth.users 의 1:1 보강 테이블.
--   - id (uuid, FK auth.users)
--   - role enum (super_admin / instructor / student)
--   - display_name / email / phone
--   - company_id / student_id / instructor_id (role 별 lineage)
--   - password_changed_at / last_login_at
--
-- ON DELETE 정책:
--   - auth.users → user_profiles : CASCADE (계정 삭제 시 profile 도)
--   - companies  → user_profiles : SET NULL (회사 삭제해도 profile 살림)
--   - students   → user_profiles : SET NULL
--   - instructors → user_profiles : SET NULL
--
-- RLS:
--   - service_role : 전체 권한 (server action 에서 사용)
--   - self_read    : 본인 profile read (Step 3/4 의 instructor/student 활용)
--   - 그 외 정책 (instructor 본인 cohort 학생, student 본인 데이터) 은 Wave 4 (B0035) 에서 본격.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL editor 에 본 파일 전체 붙여넣기.
--
-- 노아 super_admin 계정 생성 (마이그레이션 적용 후 manual):
--   1) Supabase Dashboard → Authentication → Users → Add user → 이메일 + PW
--   2) 또는 /lms/forgot-password 흐름으로 본인 PW 설정
--   3) SQL Editor 에서:
--        insert into public.user_profiles (id, role, display_name, email)
--        values ('<auth.users.id>', 'super_admin', '노아', '<이메일>');
--
-- 롤백 SQL (필요 시 수동):
--   drop policy if exists service_role_all on public.user_profiles;
--   drop policy if exists self_read on public.user_profiles;
--   drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
--   drop table if exists public.user_profiles;

-- 1. user_profiles ---------------------------------------------------------

create table if not exists public.user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  role                  text not null check (role in ('super_admin', 'instructor', 'student')),

  display_name          text not null check (char_length(trim(display_name)) >= 1),
  email                 text not null check (char_length(trim(email)) >= 3),
  phone                 text,

  -- role 별 lineage. role 과 일치하는 칼럼만 채워짐. 비일치 시 application
  -- 레벨에서 거절 (use case 가드). DB invariant 는 nullable + FK 만.
  company_id            uuid references public.companies(id)   on delete set null,
  student_id            uuid references public.students(id)    on delete set null,
  instructor_id         uuid references public.instructors(id) on delete set null,

  password_changed_at   timestamptz,
  last_login_at         timestamptz,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

comment on table public.user_profiles is
  'B0032 LMS 인증 사용자 프로필. auth.users 의 metadata 보강 (role + lineage).';
comment on column public.user_profiles.role is
  'super_admin (노아) / instructor (강사) / student (수강생). middleware 가 /lms/* 분기에 사용.';
comment on column public.user_profiles.company_id is
  'role=instructor 일 때 채워짐. instructor 의 회사 소속 (정산 단위).';
comment on column public.user_profiles.student_id is
  'role=student 일 때 채워짐. students 테이블 FK.';
comment on column public.user_profiles.instructor_id is
  'role=instructor 일 때 채워짐. instructors 테이블 FK.';

create index if not exists user_profiles_role_idx
  on public.user_profiles (role);
create index if not exists user_profiles_email_idx
  on public.user_profiles (email);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- 2. RLS -------------------------------------------------------------------
-- Wave 1 Step 1 = service_role + self_read 만. 본격 RLS 는 Wave 4 (B0035).

alter table public.user_profiles enable row level security;

revoke all on public.user_profiles from anon, authenticated;

grant all on public.user_profiles to service_role;
grant select on public.user_profiles to authenticated;

-- service_role 전체 권한 — server action 에서 admin 작업 (invite / role 변경 등).
drop policy if exists service_role_all on public.user_profiles;
create policy service_role_all on public.user_profiles
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- 본인 profile read — instructor/student surface 에서 본인 정보 조회.
drop policy if exists self_read on public.user_profiles;
create policy self_read on public.user_profiles
  for select
  using (auth.uid() = id);
