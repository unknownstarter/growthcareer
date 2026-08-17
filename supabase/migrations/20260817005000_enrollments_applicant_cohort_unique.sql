-- M2.5 — enrollments (applicant_id, cohort_id) partial unique index (Phase 2 fix 1, HIGH).
--
-- 배경/문제:
--   markAsEnrolledBatch 가 enrollment 을 upsert 로 쓰려면 onConflict 타겟이 될 unique
--   제약이 필요하다. 또한 운영자 동시 이중호출 / 부분실패 재실행 시 같은
--   (applicant_id, cohort_id) enrollment 이 2개 이상 생기는 race 를 DB 레벨에서 봉쇄.
--   지금까지는 애플리케이션 pre-check 만으로 막았으나 이는 TOCTOU race 에 취약.
--
-- 적용 순서:
--   이 파일 (05000) 은 M3 backfill (20260817010000) 보다 먼저 적용돼야 한다.
--   backfill 이 소급 enrollment 을 넣기 전에 unique 제약을 세워야 소급분도 중복 방지됨.
--
-- 왜 partial (where ... is not null):
--   enrollments 는 student_id 또는 applicant_id 최소 하나만 있으면 됨 (CHECK).
--   applicant_id NULL 인 enrollment (student-only 직접 결제 등 미래 케이스) 은 이 제약
--   대상이 아님. cohort_id NULL (bundle 결제로 cohort 미확정) 도 대상 제외.
--   → 둘 다 NOT NULL 인 "신청자-기수 결제" 에만 중복 금지.
--
-- 멱등: create unique index if not exists. 재실행 안전.
--
-- ⚠️ 적용 전 중복 검사 (수동):
--   같은 (applicant_id, cohort_id) 가 이미 2개 이상이면 인덱스 생성이 실패한다.
--   현재 enrollments 는 죽은 테이블 (row 0) 이므로 충돌 없음. 만약 데이터가 있다면
--   아래로 중복을 먼저 확인/정리한 뒤 적용:
--     select applicant_id, cohort_id, count(*)
--       from public.enrollments
--      where applicant_id is not null and cohort_id is not null
--      group by applicant_id, cohort_id
--      having count(*) > 1;
--
-- 롤백 SQL (수동):
--   drop index if exists public.enrollments_applicant_cohort_uniq;

create unique index if not exists enrollments_applicant_cohort_uniq
  on public.enrollments (applicant_id, cohort_id)
  where applicant_id is not null and cohort_id is not null;

comment on index public.enrollments_applicant_cohort_uniq is
  'Phase 2 fix1: 한 신청자는 한 기수당 enrollment 1개. upsert onConflict 타겟 + 동시 이중호출 race 봉쇄.';
