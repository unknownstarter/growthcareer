-- B0081 수료증 시스템 (학생 기반 재설계, 2026-07-05)
--
-- 기존 certificates (20260607000000) 는 applicant 기반 spec (B0018 Wave 4 시절).
-- B0081 은 학생 기반 (student_id / cohort_id / kind / file_path / attendance_rate).
-- 기존 데이터 없음 (아직 발급 X). Additive + NOT NULL 완화 로 마이그레이션.
--
-- Sage B0081 검토 결과 (2026-07-05): certificates 컬럼 mismatch 발견.
-- Iris repository / domain entity Certificate 가 참조하는 컬럼 = student_id / cohort_id /
-- kind / file_path / attendance_rate. 실제 DB = applicant_id / type / pdf_path 등.
-- 이 마이그레이션이 매칭 해소.
--
-- 절대 룰:
-- - applicants shape 절대 보존 (ADR 0010): 이 마이그레이션은 applicants 미변경
-- - certificates 기존 데이터 없음 = additive 변경 안전
-- - 카피 부호 §6.5: 슬래시 / 콤마만

-- ---------------------------------------------------------------------------
-- 1. 신규 컬럼 추가 (student 기반)
-- ---------------------------------------------------------------------------

alter table public.certificates
  add column if not exists student_id uuid
    references public.students(id) on delete cascade,
  add column if not exists cohort_id uuid
    references public.cohorts(id) on delete restrict,
  add column if not exists kind text
    check (kind is null or kind in ('completion','performance')),
  add column if not exists file_path text,
  add column if not exists attendance_rate numeric
    check (attendance_rate is null or (attendance_rate >= 0 and attendance_rate <= 100)),
  add column if not exists notes text;

comment on column public.certificates.student_id is
  'B0081 학생 기반 발급. NULL 가능 (기존 applicant 기반 row 는 NULL). 신규 발급은 필수.';
comment on column public.certificates.cohort_id is
  'B0081 발급 대상 기수. cohort completed 후 발급.';
comment on column public.certificates.kind is
  'B0081 수료증 종류. completion (수료증) / performance (공연 참여 확인서).';
comment on column public.certificates.file_path is
  'B0081 PDF 저장 경로. Client-side print 패턴이라 초기 NULL. 향후 서버 렌더 시 채움.';
comment on column public.certificates.attendance_rate is
  'B0081 발급 시점 출석률 스냅샷. 0 to 100. completion 발급 자격 검증용.';

-- ---------------------------------------------------------------------------
-- 2. 기존 NOT NULL 완화 (신규 학생 기반 발급은 applicant_id 등 안 씀)
-- ---------------------------------------------------------------------------

alter table public.certificates
  alter column applicant_id drop not null,
  alter column type drop not null,
  alter column recipient_name_snapshot drop not null;

-- ---------------------------------------------------------------------------
-- 3. issued_by 타입 변경 (text → uuid FK auth.users)
-- ---------------------------------------------------------------------------
-- 기존 데이터 없음 확인 필요. 있으면 이 부분 실패 → 별도 마이그레이션.

do $$
begin
  if not exists (select 1 from public.certificates where issued_by is not null) then
    -- 기존 컬럼 drop 후 재생성 (기존 text → uuid FK)
    alter table public.certificates drop column if exists issued_by;
    alter table public.certificates
      add column issued_by uuid references auth.users(id) on delete set null;
    comment on column public.certificates.issued_by is
      'B0081 발급자 (super_admin user_id). NULL 가능.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. (student_id, kind) UNIQUE - 1 학생 = 1 종류 = 1 수료증 (invariant)
-- ---------------------------------------------------------------------------

create unique index if not exists certificates_student_kind_uidx
  on public.certificates (student_id, kind)
  where student_id is not null and kind is not null;

comment on index public.certificates_student_kind_uidx is
  'B0081 invariant: 1 학생 = 1 종류 = 1 수료증. serial_no 재발급 방지.';

-- ---------------------------------------------------------------------------
-- 5. 인덱스 (조회 최적화)
-- ---------------------------------------------------------------------------

create index if not exists certificates_student_id_idx
  on public.certificates (student_id, issued_at desc)
  where student_id is not null;

create index if not exists certificates_cohort_id_idx
  on public.certificates (cohort_id, issued_at desc)
  where cohort_id is not null;

-- ---------------------------------------------------------------------------
-- 6. RLS 정책 (기존 revoke + service_role only 유지 + 학생 self select 추가)
-- ---------------------------------------------------------------------------

alter table public.certificates enable row level security;

-- 기존 service_role_all (이미 GRANT ALL to service_role. 정책 명시)
drop policy if exists p_certificates_service_role_all on public.certificates;
create policy p_certificates_service_role_all on public.certificates
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- 학생 self select (본인 수료증만 조회)
drop policy if exists p_certificates_student_self_select on public.certificates;
create policy p_certificates_student_self_select on public.certificates
  for select
  to authenticated
  using (
    student_id is not null
    and student_id = (
      select student_id from public.user_profiles where id = auth.uid()
    )
  );

-- super_admin 은 service_role client 로 접근 = 위 service_role_all policy 로 커버.
-- program_admin / instructor 열람은 향후 spec 확장 시 추가.

-- authenticated 는 SELECT 만 (INSERT/UPDATE/DELETE 는 service_role 로 server action)
grant select on public.certificates to authenticated;
