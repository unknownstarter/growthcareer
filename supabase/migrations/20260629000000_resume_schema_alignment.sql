-- B0063 — 잡코리아 이력서 정합. type enum 2종 추가 + website_url 컬럼.
--
-- 노아 결정 (2026-06-29): 정합성 우선. 디테일 sub-field 분리 X.
--   - student_resume_item.type CHECK constraint 에 'activity' (기타활동) + 'skill' (활용능력) 추가.
--   - student_profile.website_url 컬럼 추가 — 홈페이지 / SNS / 포트폴리오 link 1개.
--
-- 추가 안 함 (description free text 로 충분):
--   - 학력 학점 / 소재지
--   - 경력 부서 / 직위
--   - 자격증 등급 / 비고
--   - 활용능력 숙련도
--
-- 호환성:
--   - additive only. 기존 row 영향 0.
--   - 기존 RLS 정책 (sri_*, sp_*) 신규 컬럼/enum 값에도 그대로 적용 (cascade 없음).
--   - check constraint 갱신은 기존 type 값 6 종 (education~project) 보존.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백:
--   alter table public.student_profile drop column if exists website_url;
--
--   -- student_resume_item.type 은 enum 축소 시 기존 row 가 위반할 수 있으므로
--   -- 'activity' / 'skill' row 가 존재하면 먼저 정리 또는 type 변경 후 축소.
--   alter table public.student_resume_item
--     drop constraint if exists student_resume_item_type_check;
--   alter table public.student_resume_item
--     add constraint student_resume_item_type_check
--     check (type in ('education','experience','certification','award','language','project'));

-- 1) student_resume_item.type CHECK constraint 갱신 -----------------------
-- activity = 기타활동 (동아리 / 봉사 / 대외활동)
-- skill    = 활용능력 (워드 / 파포 / 디자인 툴 / 음향 장비 등)

alter table public.student_resume_item
  drop constraint if exists student_resume_item_type_check;

alter table public.student_resume_item
  add constraint student_resume_item_type_check
  check (type in (
    'education',
    'experience',
    'certification',
    'award',
    'language',
    'project',
    'activity',
    'skill'
  ));

comment on column public.student_resume_item.type is
  'B0063 잡코리아 이력서 정합. education / experience / certification / award / language / project / activity (기타활동) / skill (활용능력).';

-- 2) student_profile.website_url 컬럼 추가 ------------------------------
-- 홈페이지 / SNS / 포트폴리오 link 1개. http/https only (zod 가 scheme 강제).
-- 2048자 cap — credential_url 과 동일.

alter table public.student_profile
  add column if not exists website_url text
    check (website_url is null or (
      char_length(website_url) <= 2048
      and website_url ~ '^https?://'
    ));

comment on column public.student_profile.website_url is
  'B0063 홈페이지 / SNS / 포트폴리오 link. http/https only. 잡코리아 이력서 양식 정합.';
