-- M3 — 1기 enrollment 소급 생성 (Phase 2c, 태스크 #19~24, ADR 0013 배선).
--
-- 배경/문제:
--   enrollments / enrollment_courses 는 지금까지 죽은 테이블 (INSERT 0). Phase 2b 부터
--   markAsEnrolledBatch 가 실 SoT 로 배선됐지만 그건 2기+ 신규 전환분만 채운다.
--   1기 (cohort slug 'b628b909') 는 이미 enrolled 로 마감된 과거 데이터 → 앱코드 경로가
--   안 탐. 단일 SoT (enrollments 가 실 수강의 진실) 유지를 위해 여기서 소급 생성.
--
-- 노아 결정:
--   - 소급 생성 (단일 SoT). before/after 출석률 불변 검증은 Phase 3 (집계 붙을 때).
--     지금은 데이터만 채움.
--   - 1기 = fan-to-pro-1 이라는 단일 course. enrollment_courses 는 course 1개 row.
--
-- 소급 대상:
--   1기 students (public.students where cohort_id = b628b909 cohort).
--   students 는 applicant paid → promote 된 실 수강생 (applicant_id NOT NULL UNIQUE).
--   → enrollment 은 (applicant_id, student_id, cohort_id) 로 생성. bundle_id NULL (단과).
--
-- 안전 원칙 (§7.4):
--   - additive only. 기존 shape / 컬럼 절대 안 건드림. 신규 row INSERT 만.
--   - 멱등: where not exists (같은 applicant_id + cohort_id enrollment 이미 있으면 skip).
--     재실행 안전. enrollment_courses 는 pk (enrollment_id, course_id) + on conflict do nothing.
--   - UUID 하드코딩 X — 전부 slug subquery (cohort slug / course slug + program 스코프).
--   - 부분 재실행 안전: enrollment 이 이미 있으면 enrollment_courses 만 보강 (아래 §2).
--
-- 롤백 SQL (수동):
--   -- 이 마이그레이션이 만든 1기 enrollment_courses 먼저 삭제 (FK).
--   delete from public.enrollment_courses ec
--    using public.enrollments e,
--          public.cohorts c
--    where ec.enrollment_id = e.id
--      and e.cohort_id = c.id
--      and c.slug = 'b628b909';
--   -- 그다음 1기 enrollment 삭제 (이 마이그레이션이 만든 것만: student_id + applicant_id 둘 다 채워진 소급분).
--   delete from public.enrollments e
--    using public.cohorts c
--    where e.cohort_id = c.id
--      and c.slug = 'b628b909'
--      and e.student_id is not null
--      and e.applicant_id is not null;

-- ============================================================================
-- 1. 1기 students → enrollments 소급 생성 (멱등)
-- ----------------------------------------------------------------------------
-- 대상: cohort 'b628b909' 의 student 중, 아직 그 cohort 의 enrollment 이 없는 applicant.
-- status='paid' (이미 입금 확인 + 수강 완료된 과거 데이터).
-- purchased_at = 실 결제시각 우선 (applicants.payment_confirmed_at), NULL 이면 students.created_at
--   fallback (Phase 2 fix4). 실 결제시각이 정확한 lineage — 소급이라도 가능하면 진짜 시각을 씀.

insert into public.enrollments
  (student_id, applicant_id, cohort_id, bundle_id, status, purchased_at, notes)
select
  s.id                                    as student_id,
  s.applicant_id                          as applicant_id,
  s.cohort_id                             as cohort_id,
  null                                    as bundle_id,
  'paid'                                  as status,
  coalesce(a.payment_confirmed_at, s.created_at) as purchased_at,
  'M3 backfill: 1기 소급 생성 (fan-to-pro-1 단과)' as notes
from public.students s
join public.cohorts c on c.id = s.cohort_id
left join public.applicants a on a.id = s.applicant_id
where c.slug = 'b628b909'
  and not exists (
    select 1
      from public.enrollments e
     where e.cohort_id = s.cohort_id
       and e.applicant_id = s.applicant_id
  );

-- ============================================================================
-- 2. enrollment_courses 소급 (fan-to-pro-1 course join)
-- ----------------------------------------------------------------------------
-- 1기 enrollment (위에서 만든 것 + 혹시 기존에 있던 것) 각각에 fan-to-pro-1 course row 부착.
-- course slug subquery (program 'fan-to-pro' 스코프). on conflict do nothing (pk 중복 skip).
-- 대상 enrollment = cohort 'b628b909' 소급분 (student_id + applicant_id 둘 다 채워진 것).

insert into public.enrollment_courses (enrollment_id, course_id, completed_at)
select
  e.id                                    as enrollment_id,
  (
    select co.id
      from public.courses co
      join public.programs p on p.id = co.program_id
     where co.slug = 'fan-to-pro-1'
       and p.slug = 'fan-to-pro'
     limit 1
  )                                       as course_id,
  null                                    as completed_at
from public.enrollments e
join public.cohorts c on c.id = e.cohort_id
where c.slug = 'b628b909'
  and e.student_id is not null
  and e.applicant_id is not null
  -- course subquery 가 NULL 이면 (fan-to-pro-1 미존재) row 생성 안 함.
  and exists (
    select 1
      from public.courses co
      join public.programs p on p.id = co.program_id
     where co.slug = 'fan-to-pro-1'
       and p.slug = 'fan-to-pro'
  )
on conflict (enrollment_id, course_id) do nothing;

-- ============================================================================
-- 3. 검증 노트 (수동 실행용 — 마이그레이션엔 부작용 없음)
-- ----------------------------------------------------------------------------
-- 적용 후 아래로 확인 (Phase 3 집계 붙기 전 데이터 sanity):
--   select count(*) from public.enrollments e
--     join public.cohorts c on c.id = e.cohort_id where c.slug = 'b628b909';
--   -- => 1기 students 수와 일치해야 함.
--   select count(*) from public.enrollment_courses ec
--     join public.enrollments e on e.id = ec.enrollment_id
--     join public.cohorts c on c.id = e.cohort_id where c.slug = 'b628b909';
--   -- => 위와 동일 (1기 = 단과 1 course 이므로 enrollment 당 ec 1개).
