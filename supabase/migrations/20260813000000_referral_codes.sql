-- B00XX 레퍼럴 코드 시스템 데이터 계층 (2026-08-13)
--
-- 목적:
--   - 유저(student / instructor / super_admin)마다 공유용 본인 코드 발급.
--   - 신청자가 친구 추천으로 입력한 코드(추천인의 본인 코드)를 추적.
--   - 보상 = 할인/크레딧 수동 적용. 시스템은 코드 생성 + 추적만. 지급 로직 없음.
--
-- 컬럼 두 종류:
--   1) referral_code    (본인 코드) 6자 A-Z0-9 대문자. 공유용. per-table UNIQUE.
--                        students / instructors / user_profiles 3테이블 통틀어 유일
--                        (입력 코드로 추천인 조회 시 cross-table 모호성 회피).
--   2) referred_by_code (입력 코드) 신청/등록 시 입력한 추천인의 referral_code.
--                        applicants / students 에 추가. UNIQUE 아님(1 추천인 다수 피추천).
--
-- 노아 본인 코드 = 'GCFTP0' 고정 (super_admin user_profile, is_super_admin=true).
--
-- 마이그레이션 안전성:
--   - 전부 additive nullable 컬럼 → 기존 row / 라이브 신청 흐름 zero-risk.
--   - applicants 는 라이브 모집 테이블 (§7.4). nullable 컬럼만 추가, 제약 없음.
--   - referral_code UNIQUE 는 partial (not-null 만) → 미부여 row 다수 허용.
--   - 백필은 built-in 함수만 사용 (gen_random_bytes 대신 문자셋 인덱싱).
--
-- 사전 조건:
--   - applicants (20260429000000)
--   - instructors (20260607000000)
--   - students (20260621000000)
--   - user_profiles + is_super_admin (20260622000000 / 20260622000001)
--
-- 카피 부호 §6.5: em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 없음.

-- ---------------------------------------------------------------------------
-- 1. 본인 코드 컬럼 (referral_code) + per-table partial UNIQUE
-- ---------------------------------------------------------------------------

alter table public.students
  add column if not exists referral_code text;
alter table public.instructors
  add column if not exists referral_code text;
alter table public.user_profiles
  add column if not exists referral_code text;

comment on column public.students.referral_code is
  '본인 공유용 레퍼럴 코드 6자 A-Z0-9. students/instructors/user_profiles 통틀어 유일.';
comment on column public.instructors.referral_code is
  '본인 공유용 레퍼럴 코드 6자 A-Z0-9. students/instructors/user_profiles 통틀어 유일.';
comment on column public.user_profiles.referral_code is
  '본인 공유용 레퍼럴 코드 6자 A-Z0-9. 노아 = GCFTP0 고정. 3테이블 통틀어 유일.';

-- per-table partial UNIQUE (not-null 만 유일, 대소문자 구분). cross-table 유일성은
-- 애플리케이션 생성 헬퍼 + 백필 plpgsql 이 보장 (DB 제약으로는 3테이블 cross-unique
-- 를 걸 수 없어 생성 시점에 3테이블 조회로 회피).
create unique index if not exists students_referral_code_uidx
  on public.students (referral_code)
  where referral_code is not null;
create unique index if not exists instructors_referral_code_uidx
  on public.instructors (referral_code)
  where referral_code is not null;
create unique index if not exists user_profiles_referral_code_uidx
  on public.user_profiles (referral_code)
  where referral_code is not null;

-- ---------------------------------------------------------------------------
-- 2. 입력 코드 컬럼 (referred_by_code) — UNIQUE 아님
-- ---------------------------------------------------------------------------

alter table public.applicants
  add column if not exists referred_by_code text;
alter table public.students
  add column if not exists referred_by_code text;

comment on column public.applicants.referred_by_code is
  '신청 시 입력한 추천인의 referral_code. UNIQUE 아님. 추적/할인 수동 적용용.';
comment on column public.students.referred_by_code is
  'promote 시 applicants.referred_by_code 승계. UNIQUE 아님.';

-- 추천인 코드 조회 인덱스 (어드민 추적: 이 코드로 누가 추천받았나).
create index if not exists applicants_referred_by_code_idx
  on public.applicants (referred_by_code)
  where referred_by_code is not null;
create index if not exists students_referred_by_code_idx
  on public.students (referred_by_code)
  where referred_by_code is not null;

-- ---------------------------------------------------------------------------
-- 3. 코드 생성 함수 (6자 A-Z0-9) + cross-table 유일성 백필
-- ---------------------------------------------------------------------------

-- 6자 랜덤 A-Z0-9 (36 문자셋). O/I/0 제외 안 함 (GCFTP0 의 0 호환).
create or replace function public.gen_referral_code()
returns text language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * 36)::int, 1);
  end loop;
  return result;
end;
$$;

comment on function public.gen_referral_code() is
  '6자 A-Z0-9 랜덤 레퍼럴 코드 생성. 유일성은 호출측(백필 loop / 앱 헬퍼)이 보장.';

-- cross-table 유일 코드 하나 뽑기: 3테이블 통틀어 안 겹치는 코드 반환.
-- reserved (예: GCFTP0) 도 제외.
create or replace function public.gen_unique_referral_code()
returns text language plpgsql as $$
declare
  candidate text;
  attempts int := 0;
begin
  loop
    candidate := public.gen_referral_code();
    exit when
      candidate <> 'GCFTP0'
      and not exists (select 1 from public.students      where referral_code = candidate)
      and not exists (select 1 from public.instructors   where referral_code = candidate)
      and not exists (select 1 from public.user_profiles where referral_code = candidate);
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'gen_unique_referral_code: 100회 재시도 후 실패 (문자셋 소진?)';
    end if;
  end loop;
  return candidate;
end;
$$;

comment on function public.gen_unique_referral_code() is
  '3테이블(students/instructors/user_profiles) 통틀어 유일한 6자 코드 반환. GCFTP0 제외. 충돌 시 최대 100회 재시도.';

-- ---------------------------------------------------------------------------
-- 4. 노아 GCFTP0 고정 (super_admin) — 백필 random 대상에서 제외
-- ---------------------------------------------------------------------------
-- is_super_admin=true 이면서 아직 코드 없는 profile 에 GCFTP0 부여.
-- (super_admin 이 여러 명이면 최초 1명만 GCFTP0. 실 데이터는 노아 1명.)

update public.user_profiles
   set referral_code = 'GCFTP0'
 where is_super_admin = true
   and referral_code is null
   and id = (
     select id from public.user_profiles
      where is_super_admin = true and referral_code is null
      order by created_at asc
      limit 1
   );

-- ---------------------------------------------------------------------------
-- 5. 기존 row 백필 (cross-table 유일성 보장)
-- ---------------------------------------------------------------------------
-- students (약 10) → instructors (약 3) → 나머지 user_profiles 순으로 부여.
-- 각 row 마다 gen_unique_referral_code() 호출 → 이미 부여된 코드 즉시 반영되므로
-- loop 안에서도 cross-table 유일 유지. GCFTP0 은 함수가 제외 + 이미 노아 소유.

do $$
declare
  r record;
begin
  for r in select id from public.students where referral_code is null loop
    update public.students set referral_code = public.gen_unique_referral_code()
     where id = r.id;
  end loop;

  for r in select id from public.instructors where referral_code is null loop
    update public.instructors set referral_code = public.gen_unique_referral_code()
     where id = r.id;
  end loop;

  for r in select id from public.user_profiles where referral_code is null loop
    update public.user_profiles set referral_code = public.gen_unique_referral_code()
     where id = r.id;
  end loop;
end;
$$;

-- 주의: referral_code 는 NOT NULL 강제 안 함. going-forward 신규 row 는 앱 계층
-- (promote / invite) 에서 코드 부여. 백필 누락분(예: 미래 seed)도 안전하게 nullable.
