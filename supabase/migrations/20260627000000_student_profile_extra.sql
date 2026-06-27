-- B0052 student_profile 추가 정보 — birth_date + months_in_korea.
--
-- 노아 요청 (2026-06-27): 1기 출석체크 시 추가 정보를 받을 수 있도록.
--   - birth_date         : 생년월일 정확 (기존 birth_year 는 연도만)
--   - months_in_korea    : 한국 거주 개월수 (외국인 학생 비자 기간 + 한국어 능력 가늠)
--
-- 호환성:
--   - 기존 birth_year 컬럼 그대로 유지. drop 하지 않음.
--   - 폼 / repository / entity 는 양쪽 모두 다룸. birth_date 우선, birth_year 는 derived.
--
-- 권한:
--   - 기존 RLS 정책 그대로 적용 (사파이어 student_profile 의 sp_super_admin_all /
--     sp_program_admin_all / sp_student_self_*). 신규 컬럼은 동일 보호.
--   - 생년월일은 PII. service_role 만 우회 가능.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에서 직접 실행 (단일 ALTER 라 안전).
--
-- 롤백:
--   alter table public.student_profile drop column if exists birth_date;
--   alter table public.student_profile drop column if exists months_in_korea;

alter table public.student_profile
  add column if not exists birth_date date,
  add column if not exists months_in_korea int
    check (months_in_korea is null or (months_in_korea between 0 and 1200));

comment on column public.student_profile.birth_date is
  'B0052 생년월일 정확. 기존 birth_year 컬럼과 공존 — 호환성 위해 양쪽 채움 권장. PII.';
comment on column public.student_profile.months_in_korea is
  'B0052 한국 거주 개월수 (0 ~ 1200 = 0년 ~ 100년). 외국인 학생 비자 기간 추적 + 한국어 능력 가늠. NULL 허용 (한국 국적은 비워둠).';
