-- applicants.status 확장 — confirmation_notice 추가 (사전 확인 안내 단계).
--
-- 비자 미보유 (기타/없음) 또는 외국 전화번호 신청자는 payment guide 전에
-- "사전 확인 안내" (오프라인 출석 가능 + 공연 프로젝트 유급참여 불가 확인) 를
-- 먼저 보낸다. 흐름: pending -> confirmation_notice -> notified -> paid -> enrolled.
--
-- additive: 기존 status 값 (pending/notified/paid/overdue/cancelled/enrolled/
-- refunded/next_cohort_interest) 전부 보존. + confirmation_notice 만 추가.
-- 멱등: check 제약을 drop 후 재생성 (drop constraint if exists).
--
-- XOR 제약 (applicants_status_cohort_xor, 20260622000006) 은 손대지 않음.
-- confirmation_notice 는 일반 cohort 귀속 status 라
-- (status <> 'next_cohort_interest' and cohort_id is not null) 분기를 만족.
--
-- 롤백 (수동):
--   alter table public.applicants drop constraint if exists applicants_status_check;
--   alter table public.applicants
--     add constraint applicants_status_check
--       check (status in (
--         'pending','notified','paid','overdue','cancelled','enrolled',
--         'refunded','next_cohort_interest'
--       ));

alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in (
      'pending',
      'confirmation_notice',
      'notified',
      'paid',
      'overdue',
      'cancelled',
      'enrolled',
      'refunded',
      'next_cohort_interest'
    ));
