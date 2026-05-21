-- 동의 항목 재정의:
--   consent_attendance (출석 약속 + 환불 정책 포괄)
--     → consent_operations (운영·환불 정책 확인) 으로 이름·의미 변경.
--   "출석률 90% 이상 = 공연 참여 자격" 정책을 페이지·내부 운영에서 제거.
--   공연 참여는 전원 디폴트, 공연 참여 확인서만 우수 학습자 추가 보상.
--
-- 동시에:
--   - consent_marketing (선택, 마케팅 정보 수신 동의) 추가.
--   - visa 허용 옵션에 D-10(구직), E-7(특정활동) 추가.

-- 1) consent_attendance → consent_operations 리네임 + 제약 갱신
alter table public.applicants
  rename column consent_attendance to consent_operations;

do $$
begin
  alter table public.applicants
    drop constraint applicants_consent_attendance_true;
exception when undefined_object then null;
end $$;

alter table public.applicants
  add constraint applicants_consent_operations_true
    check (consent_operations = true);

-- 2) consent_marketing 추가 (선택 동의 — null 허용 안 함, default false)
alter table public.applicants
  add column if not exists consent_marketing boolean not null default false;

-- 3) visa CHECK 갱신 — D-10, E-7 추가
do $$
declare
  visa_constraint_name text;
begin
  select conname into visa_constraint_name
  from pg_constraint
  where conrelid = 'public.applicants'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%visa%';

  if visa_constraint_name is not null then
    execute format('alter table public.applicants drop constraint %I', visa_constraint_name);
  end if;
end $$;

alter table public.applicants
  add constraint applicants_visa_check
    check (visa in ('D-2','D-4','D-10','E-7','F-2','F-4','F-6','기타/없음'));
