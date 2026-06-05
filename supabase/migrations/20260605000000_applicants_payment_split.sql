-- B0007 신청-입금 분리 (반자동 모델, spec rev 2).
-- 범위: status enum 확장 + 입금 deadline/확인/안내발송 추적 컬럼 5개 + 인덱스 2개.
-- 비범위: 운영자 액션(T8) 가 쓰는 paid_amount_krw / depositor_name_observed /
--         cancelled_at / refund_txn_id 등 풀 스키마는 별도 마이그레이션에서 추가.
--         본 파일은 사용자 지시 (단순화 5컬럼) 에 정렬.
--
-- 적용:
--   supabase db push                               (CLI, 권장)
--   또는 대시보드 SQL editor 에 본 파일 전체 붙여넣기
--
-- 롤백 SQL (필요 시 수동 실행):
--   alter table public.applicants
--     drop column if exists payment_due_at,
--     drop column if exists payment_confirmed_at,
--     drop column if exists notified_at,
--     drop column if exists reminder_count,
--     drop column if exists last_reminder_at;
--   drop index if exists public.applicants_notified_at_idx;
--   alter table public.applicants drop constraint if exists applicants_status_check;
--   alter table public.applicants
--     add constraint applicants_status_check
--       check (status in ('pending','contacted','paid','enrolled','cancelled'));
--   -- 이 시점에 status='notified' / 'overdue' row 있으면 복구 전에 backfill 필요.

-- 1. status enum 확장 -------------------------------------------------------
-- 기존: pending | contacted | paid | enrolled | cancelled
-- 변경: pending | notified | paid | overdue | cancelled | enrolled
-- 'contacted' 는 본 프로젝트에서 한 번도 사용된 적 없음 (운영자 페이지 없었음).
-- 잔존 row 가 있다면 backfill 로 'notified' 매핑. 없으면 no-op.

update public.applicants
  set status = 'notified'
  where status = 'contacted';

alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in ('pending','notified','paid','overdue','cancelled','enrolled'));

-- 2. 입금 추적 컬럼 5개 -----------------------------------------------------
-- 모두 nullable. INSERT 시점에는 NULL, 운영자 토글 또는 cohort 마감 작업 시 채움.
-- reminder_count 만 NOT NULL default 0 → 운영자 페이지가 안전하게 증가 가능.

alter table public.applicants
  add column if not exists payment_due_at      timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists notified_at         timestamptz,
  add column if not exists reminder_count      smallint not null default 0,
  add column if not exists last_reminder_at    timestamptz;

comment on column public.applicants.payment_due_at is
  '입금 deadline. 개별 신청자 단위 (운영자가 안내 발송 시 +Xd) 또는 cohort 마감일.';
comment on column public.applicants.payment_confirmed_at is
  '운영자가 토스뱅크 입금을 확인하고 dashboard 에서 paid 토글한 시각.';
comment on column public.applicants.notified_at is
  '운영자가 카톡/SMS/이메일 안내 발송 후 dashboard 에서 발송 완료 토글한 시각.';
comment on column public.applicants.reminder_count is
  '리마인드 메시지 누적 발송 횟수. 운영자가 동일 신청자에게 발송 토글 재클릭 시 +1.';
comment on column public.applicants.last_reminder_at is
  '가장 최근 리마인드 발송 시각. dashboard 색상 강조 정렬 키.';

-- 3. 인덱스 -----------------------------------------------------------------
-- status: 기존 applicants_status_idx 가 이미 존재 (베이스 마이그레이션 §2). 재생성 불필요.
-- notified_at: 운영자 페이지 필터 (status='notified' 정렬 + 리마인드 대상 lookup) 용.
--              partial index → notified 인 row 만 색인 → 인덱스 크기 최소.

create index if not exists applicants_notified_at_idx
  on public.applicants (notified_at desc)
  where status = 'notified';

-- 4. RLS --------------------------------------------------------------------
-- 변경 없음. 기존 service_role 전용 정책 유지.
-- 운영자 페이지도 server actions → service_role 키로 접근.
