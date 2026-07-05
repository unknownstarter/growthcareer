-- B0068 Slice 2c — applicants.course_id 신설.
--
-- Why: 2기 신청 flow 에서 course_slug 로 신청 시 어떤 course 를 지원했는지
-- applicants row 에 직접 저장. enrollment_id 는 아직 nullable (결제 승격 후
-- 채워짐). 조회 편의 + 통계 (course 별 신청자 수) 를 위해 별도 컬럼 유지.
--
-- Design decision (Iris):
--   - Option A: applicants.course_id 신설  ← 채택
--   - Option B: enrollments.course_id 로만 조회 (승격 필수)  ← 신청 시점에 조회 불가
--   - Option C: metadata jsonb  ← 인덱스/조회 비효율
--
-- 기존 1기 신청자 : course_id NULL 유지 → cohort_id 로 매핑 (변경 없음, 회귀 X).
-- 2기 신청자      : course_id 채워짐 (단과) 또는 bundle_id 채워짐 (올인원).
--                  둘 다 NULL 이면 fallback (기존 1기 방식).
--
-- 롤백 SQL:
--   drop index if exists applicants_course_idx;
--   alter table public.applicants drop column if exists course_id;

alter table public.applicants
  add column if not exists course_id uuid
    references public.courses(id) on delete set null;

comment on column public.applicants.course_id is
  'B0068 Slice 2c 신청 시점의 course 선택 (단과). 올인원은 NULL + bundle_id 채움.';

create index if not exists applicants_course_idx
  on public.applicants (course_id)
  where course_id is not null;
