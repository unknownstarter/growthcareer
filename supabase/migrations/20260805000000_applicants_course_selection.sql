-- 2기 신청 멀티 단과 선택 저장 (간이 정책 B, ADR 0019 §7).
-- 1기(B0068)는 단일 course_id/bundle_id 만 썼으나, 2기는 단과 2개(A&R, 음향) 중
-- 여러 개 또는 올인원 선택 가능. 정식 enrollment 경로(enrollment_courses)는 후순위라,
-- 우선 신청 시점 선택을 raw 로 저장하고 운영자가 어드민에서 확인(수동 결제 안내).
--
-- 추가 컬럼 (둘 다 nullable = 1기 row 및 기존 동작 무영향, 회귀 X):
--   selected_course_slugs : 선택한 과정 slug 배열. 올인원 = 두 단과 slug 모두,
--                           단과 = 선택한 slug 들. 예 {a-r,sound} 또는 {a-r}.
--   selection_mode        : 'all_in_one' | 'single'. 같은 slug 배열이라도 가격이
--                           다르므로(올인원 990,000 vs 단과 550,000×n) 구분 필요.

alter table public.applicants
  add column if not exists selected_course_slugs text[],
  add column if not exists selection_mode text;

comment on column public.applicants.selected_course_slugs is
  '2기 신청 선택 과정 slug 배열 (간이 정책 B, ADR 0019). NULL = 1기 또는 미선택.';
comment on column public.applicants.selection_mode is
  '2기 신청 선택 모드: all_in_one | single. NULL = 1기 또는 미선택.';

-- 값 무결성 가드 (선택 시에만). 1기 NULL 은 통과.
alter table public.applicants
  drop constraint if exists applicants_selection_mode_check;
alter table public.applicants
  add constraint applicants_selection_mode_check
  check (selection_mode is null or selection_mode in ('all_in_one', 'single'));
