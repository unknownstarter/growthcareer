-- B0018 Wave 2 T5 강사료 정산 audit 테이블.
--
-- 범위:
--   1) instructor_payouts 신규 테이블 (1 row = 1 강사 1 기수 정산 1건).
--   2) RLS enable + service_role 전용.
--   3) UNIQUE (instructor_id, cohort_label) → 동일 기수 중복 정산 차단.
--
-- 비범위:
--   - 분할 지급 (계약서 §5-3) 의 2 row 패턴은 cohort_label 에 suffix
--     (예 '1기-mid', '1기-final') 로 운영자 in-app 처리. 본 마이그레이션은
--     단일 정산 기본형만 보장.
--   - 강사료 보너스 (계약서 §4-1 30명 만석) 의 base_fee_krw 자동 승격은
--     application layer (calculateInstructorFee) 가 담당. 본 테이블은 결과만 저장.
--
-- 정산 정책 (계약서 §4 / §5):
--   - 20명 미만        → 정산 row 생성 X (개강 보류 → 차기 기수 이연).
--   - 20명 이상        → base 2,500,000.
--   - 30명 만석        → base 3,000,000.
--   - 사이 (21~29명)   → base 2,500,000 (2단계만, 세분 차등 없음).
--
--   tax_mode:
--     withholding_3_3  → tax = base × 0.033, net = base - tax.
--                        예 250만 → 82,500 차감 → 2,417,500.
--                        예 300만 → 99,000 차감 → 2,901,000.
--     tax_invoice      → tax = base × 0.10  (VAT 가산), net = base + tax.
--                        예 250만 → +250,000 → 2,750,000.
--                        예 300만 → +300,000 → 3,300,000.
--
-- ON DELETE 정책:
--   instructor_id 는 RESTRICT (강사 row 삭제 시 정산 이력 보존 강제).
--
-- 적용:
--   supabase db push
--
-- 롤백 (필요 시 수동):
--   drop table if exists public.instructor_payouts;

create table if not exists public.instructor_payouts (
  id                          uuid primary key default gen_random_uuid(),
  instructor_id               uuid not null references public.instructors(id) on delete restrict,
  cohort_label                text not null default '1기' check (char_length(trim(cohort_label)) >= 1),

  -- 정산 금액 (모두 KRW integer)
  base_fee_krw                integer not null check (base_fee_krw >= 0),
  tax_krw                     integer not null check (tax_krw >= 0),
  net_krw                     integer not null check (net_krw >= 0),

  -- 스냅샷 (강사 row 의 정보가 추후 바뀌어도 정산 시점 값 보존)
  enrolled_count_snapshot     smallint not null check (enrolled_count_snapshot >= 0),
  tax_mode_snapshot           text not null
                                check (tax_mode_snapshot in ('withholding_3_3','tax_invoice')),

  -- 지급 상태
  paid_at                     timestamptz,   -- NULL = 정산 기록만, NOT NULL = 실제 송금 완료
  paid_by                     text,          -- 운영자 ID
  notes                       text,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz,

  unique (instructor_id, cohort_label)
);

comment on table public.instructor_payouts is
  'B0018 Wave 2 강사료 정산 audit. UNIQUE(instructor_id, cohort_label) 로 동일 기수 중복 정산 차단. paid_at NULL = 정산 기록만, NOT NULL = 송금 완료.';
comment on column public.instructor_payouts.base_fee_krw is
  '정산 시점 기준 강사료 base (20명+ = 250만, 30명 만석 = 300만).';
comment on column public.instructor_payouts.tax_krw is
  'tax_mode_snapshot 별 세금. withholding_3_3 = base*0.033 차감, tax_invoice = base*0.10 가산.';
comment on column public.instructor_payouts.net_krw is
  '실지급액. withholding_3_3 = base - tax, tax_invoice = base + tax.';
comment on column public.instructor_payouts.enrolled_count_snapshot is
  '정산 시점 수강생 수 (status=enrolled). 20 미만이면 row 자체가 생성되지 않음.';

drop trigger if exists instructor_payouts_set_updated_at on public.instructor_payouts;
create trigger instructor_payouts_set_updated_at
  before update on public.instructor_payouts
  for each row execute function public.set_updated_at();

create index if not exists instructor_payouts_instructor_cohort_idx
  on public.instructor_payouts (instructor_id, cohort_label);

create index if not exists instructor_payouts_paid_at_idx
  on public.instructor_payouts (paid_at);

-- RLS + 권한 ----------------------------------------------------------------
alter table public.instructor_payouts enable row level security;

revoke all on public.instructor_payouts from anon, authenticated;
grant all on public.instructor_payouts to service_role;
