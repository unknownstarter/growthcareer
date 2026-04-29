-- Kenter Bootcamp · applicants 테이블
-- 신청 폼 제출 → 서버 액션이 service_role 키로 직접 INSERT.
-- 클라이언트 anon 키는 어떤 row 도 못 읽음 (RLS enabled, no policies).

create extension if not exists "pgcrypto";

-- 1. 테이블 -----------------------------------------------------------------
create table if not exists public.applicants (
  id          uuid primary key default gen_random_uuid(),

  -- Step 1
  name        text not null check (char_length(trim(name)) >= 2),
  email       text not null,
  phone       text not null,

  -- Step 2
  birthdate   date not null,
  university  text not null check (char_length(trim(university)) >= 2),
  visa        text not null check (visa in ('D-2','D-4','F-2','F-4','F-6','기타/없음')),
  address     text not null check (char_length(trim(address)) >= 2),
  consent     boolean not null check (consent = true),

  -- Operations
  source      text not null default 'kenterbc-landing',
  status      text not null default 'pending'
                check (status in ('pending','contacted','paid','enrolled','cancelled')),
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.applicants is
  'Kenter Bootcamp 신청자. 서버 액션(service_role)만 INSERT/SELECT 가능.';

-- 2. 인덱스 -----------------------------------------------------------------
create index if not exists applicants_email_idx       on public.applicants (lower(email));
create index if not exists applicants_created_at_idx  on public.applicants (created_at desc);
create index if not exists applicants_status_idx      on public.applicants (status);

-- 3. updated_at 트리거 ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists applicants_set_updated_at on public.applicants;
create trigger applicants_set_updated_at
  before update on public.applicants
  for each row execute function public.set_updated_at();

-- 4. RLS --------------------------------------------------------------------
alter table public.applicants enable row level security;
-- 정책 없음 → anon / authenticated 는 select/insert/update/delete 모두 거부.
-- service_role 만 RLS 우회 (서버 액션 전용).

-- 5. 권한 회수 (방어적) ------------------------------------------------------
revoke all on public.applicants from anon, authenticated;
grant  all on public.applicants to service_role;
