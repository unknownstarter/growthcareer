-- B0039 applicants.status 확장 — next_cohort_interest 추가 + cohort_id nullable.
--
-- 1기 모집 마감 (2026-06-22 00:00 KST) 이후 동일한 신청 폼으로 들어오는 submission 은
-- status='next_cohort_interest' + cohort_id=NULL 로 저장 → 다음 기수 모집 시 활용.
--
-- 1) status enum 확장: + 'next_cohort_interest'
-- 2) cohort_id NOT NULL → nullable
-- 3) cohort_id × status XOR check 추가 — 일반 status 는 cohort_id 필수, next_cohort_interest 는 NULL
-- 4) 인덱스 추가 — (status='next_cohort_interest', created_at desc) partial index
--
-- 롤백 (수동):
--   alter table public.applicants drop constraint if exists applicants_status_cohort_xor;
--   alter table public.applicants alter column cohort_id set not null;
--   alter table public.applicants drop constraint if exists applicants_status_check;
--   alter table public.applicants
--     add constraint applicants_status_check
--       check (status in ('pending','notified','paid','overdue','cancelled','enrolled','refunded'));
--   drop index if exists applicants_next_cohort_interest_idx;

-- 1. status enum 확장 -------------------------------------------------------

alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in (
      'pending',
      'notified',
      'paid',
      'overdue',
      'cancelled',
      'enrolled',
      'refunded',
      'next_cohort_interest'
    ));

-- 2. cohort_id nullable 전환 ------------------------------------------------
-- 기존 모든 row 는 cohort_id 있음 (20260622000003 backfill). next_cohort_interest 는 NULL 허용.

alter table public.applicants
  alter column cohort_id drop not null;

-- 3. status × cohort_id XOR check ------------------------------------------
-- 일반 status (pending/notified/paid/overdue/cancelled/enrolled/refunded) 는 cohort_id 필수.
-- next_cohort_interest 는 cohort_id 가 NULL 이어야 함 (다음 기수 cohort row 가 아직 없음).

alter table public.applicants
  add constraint applicants_status_cohort_xor
    check (
      (status = 'next_cohort_interest' and cohort_id is null)
      or (status <> 'next_cohort_interest' and cohort_id is not null)
    );

comment on constraint applicants_status_cohort_xor on public.applicants is
  'B0039 status=next_cohort_interest 은 cohort_id NULL / 그 외는 cohort_id NOT NULL';

-- 4. partial index — 다음 기수 인터레스트 lookup 빠르게 ---------------------

create index if not exists applicants_next_cohort_interest_idx
  on public.applicants (created_at desc)
  where status = 'next_cohort_interest';
