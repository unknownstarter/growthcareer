-- B0007 신청-입금 분리 (반자동) - 후속 마이그레이션.
-- 범위:
--   1) status enum 에 'refunded' 추가 (기존 6종 -> 7종).
--   2) 입금/취소/환불 audit trail 컬럼 7개 추가.
--   3) refunded 부분 인덱스 1개 추가 (dashboard 가시성 보조).
--
-- 비범위: RLS 정책 변경 없음 (기존 service_role 유지).
--
-- 적용:
--   supabase db push                                  (CLI, 권장)
--   또는 대시보드 SQL editor 에 본 파일 전체 붙여넣기
--
-- 롤백 SQL (필요 시 수동 실행 - 'refunded' row 있으면 backfill 선행):
--   update public.applicants set status = 'cancelled' where status = 'refunded';
--   drop index if exists public.applicants_refunded_at_idx;
--   alter table public.applicants
--     drop column if exists paid_amount_krw,
--     drop column if exists depositor_name_observed,
--     drop column if exists paid_confirmed_by,
--     drop column if exists cancelled_at,
--     drop column if exists cancel_reason,
--     drop column if exists refunded_at,
--     drop column if exists refund_txn_id;
--   alter table public.applicants drop constraint if exists applicants_status_check;
--   alter table public.applicants
--     add constraint applicants_status_check
--       check (status in ('pending','notified','paid','overdue','cancelled','enrolled'));

-- 1. status enum 확장 (refunded 추가) ---------------------------------------
-- 직전 마이그레이션 6종: pending | notified | paid | overdue | cancelled | enrolled
-- 본 마이그레이션:       + refunded

alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in ('pending','notified','paid','overdue','cancelled','enrolled','refunded'));

-- 2. audit trail 컬럼 7개 ---------------------------------------------------
-- 모두 nullable. INSERT 시점 NULL. 운영자 액션 시점에 채움.
-- paid_amount_krw 는 integer (원 단위). 토스뱅크 부분입금/오입금 대비 실제 입금액 기록.
-- depositor_name_observed 는 토스뱅크 알림에 보이는 입금자명. 매칭 검증용 - 폼 name 과
--   다르면 운영자가 dashboard 에서 수동 확인.
-- paid_confirmed_by 는 운영자 식별자. 1기 기준 'noah' 고정 사용.
-- cancel_reason / refund_txn_id 는 자유 텍스트 (운영자 메모 + 토스뱅크 거래 ID).

alter table public.applicants
  add column if not exists paid_amount_krw         integer,
  add column if not exists depositor_name_observed text,
  add column if not exists paid_confirmed_by       text,
  add column if not exists cancelled_at            timestamptz,
  add column if not exists cancel_reason           text,
  add column if not exists refunded_at             timestamptz,
  add column if not exists refund_txn_id           text;

comment on column public.applicants.paid_amount_krw is
  '운영자가 토스뱅크에서 확인한 실제 입금 금액 (원). 부분입금/할인 추적용.';
comment on column public.applicants.depositor_name_observed is
  '토스뱅크 알림에 표시된 입금자명. 폼 name 과의 mismatch 검증용.';
comment on column public.applicants.paid_confirmed_by is
  '입금 확인을 토글한 운영자 식별자. 1기는 단일 운영자(noah) 고정.';
comment on column public.applicants.cancelled_at is
  '운영자가 cancelled 토글한 시각. (grace 만료 일괄 / 신청자 요청 / 미입금 등)';
comment on column public.applicants.cancel_reason is
  '취소 사유 짧은 메모 (예: grace_expired / applicant_requested / no_payment).';
comment on column public.applicants.refunded_at is
  '환불 완료를 토글한 시각. paid 또는 cancelled 상태에서만 진입.';
comment on column public.applicants.refund_txn_id is
  '환불 거래 식별자 (토스뱅크 거래 ID 또는 운영자 자유 입력).';

-- 3. 인덱스 -----------------------------------------------------------------
-- refunded 는 비교적 드물고 회계용 lookup 시 created_at desc 만으로 충분 가능하나,
-- dashboard 의 "환불 처리분" 필터를 빠르게 만들기 위해 partial index 추가.
-- 1기 30명 기준 인덱스 크기 영향 무시 가능.

create index if not exists applicants_refunded_at_idx
  on public.applicants (refunded_at desc)
  where status = 'refunded';

-- 4. RLS --------------------------------------------------------------------
-- 변경 없음. 기존 service_role 전용 정책 유지.
