-- B0032 LMS Wave 1 hotfix #3 - finance 확장: cohort_expenses + tax_filings.
--
-- 노아 사업 형태 (시나리오 B):
--   학원 미등록 일반 과세 사업자 (Dropdown / 사업자번호 154-28-02110).
--   매출 = 수강료 (applicants.paid_amount_krw 합). 부가세 10% 포함 표시 가격.
--   매입 = 강사료 / 강의장 / 행사 / 자료 / 광고 등 (cohort_expenses).
--
-- 본 마이그레이션:
--   1) cohort_expenses - cohort 별 비용 entry (CRUD)
--   2) tax_filings     - 세무 신고 일정 + 상태 (CRUD)
--   3) 1기 비용 + 2026 세무 일정 seed.
--
-- 안전:
--   - 신규 table → RLS enable 의무 (CLAUDE.md §7.4).
--   - super_admin + service_role 만 접근. program admin 도 super_admin guard 안에서.
--   - 영수증 URL 은 텍스트 (Supabase Storage 통합은 별도 작업).
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (수동):
--   drop trigger if exists cohort_expenses_set_updated_at on public.cohort_expenses;
--   drop trigger if exists tax_filings_set_updated_at on public.tax_filings;
--   drop table if exists public.cohort_expenses;
--   drop table if exists public.tax_filings;

-- 1. cohort_expenses -------------------------------------------------------

create table if not exists public.cohort_expenses (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  category text not null check (category in (
    'instructor_fee',    -- 강사료 (외주비)
    'venue_rental',      -- 임차료 (강의장)
    'event',             -- 회의비 / 행사비 (네트워킹 파티 등)
    'materials',         -- 소모품비 / 자료비
    'marketing',         -- 영업판촉비 / 광고선전비 (광고, 친구 추천)
    'other'              -- 기타
  )),
  description text not null,
  amount_krw int not null check (amount_krw >= 0),
  vat_krw int not null default 0 check (vat_krw >= 0),
  total_krw int generated always as (amount_krw + vat_krw) stored,
  status text not null default 'planned' check (status in (
    'planned',           -- 예정
    'committed',         -- 확정 (계약/주문)
    'paid',              -- 지급 완료
    'reimbursed',        -- 환급 (취소 시 환수)
    'cancelled'          -- 취소
  )),
  vendor_name text,
  vendor_biz_no text,
  invoice_number text,
  invoice_issued_at date,
  paid_at date,
  paid_via text,
  receipt_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cohort_expenses_cohort_idx
  on public.cohort_expenses (cohort_id, category, status);

comment on table public.cohort_expenses is
  'B0032 cohort 단위 비용 entry. 일반 과세 사업자 회계: amount = 부가세 별도, vat = 부가세 (10%), total = generated. status=paid 합산이 손익 계산용.';

-- 2. tax_filings -----------------------------------------------------------

create table if not exists public.tax_filings (
  id uuid primary key default gen_random_uuid(),
  filing_type text not null check (filing_type in (
    'vat_q1',              -- 부가세 1기 (1-6월)
    'vat_q2',              -- 부가세 2기 (7-12월)
    'vat_predeclaration',  -- 부가세 예정신고
    'income_tax',          -- 종합소득세
    'withholding_report'   -- 원천징수 지급명세서
  )),
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status text not null default 'pending' check (status in (
    'pending',             -- 예정
    'in_progress',         -- 진행 중
    'filed',               -- 신고 완료
    'paid',                -- 납부 완료
    'not_applicable'       -- 해당 없음
  )),
  filing_amount_krw int,
  filed_at date,
  paid_at date,
  reference_no text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tax_filings_due_idx
  on public.tax_filings (due_date, status);

comment on table public.tax_filings is
  'B0032 세무 신고 일정 + 상태. filing_type 별 due_date 추적. 노아 = Dropdown 일반 과세 사업자 (154-28-02110), 학원 미등록.';

-- 3. RLS -------------------------------------------------------------------

alter table public.cohort_expenses enable row level security;
alter table public.tax_filings enable row level security;

drop policy if exists cohort_expenses_super_admin on public.cohort_expenses;
create policy cohort_expenses_super_admin on public.cohort_expenses
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_super_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_super_admin = true
    )
  );

drop policy if exists tax_filings_super_admin on public.tax_filings;
create policy tax_filings_super_admin on public.tax_filings
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_super_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_super_admin = true
    )
  );

-- service_role 은 RLS bypass (별도 정책 불필요) - server action 에서 사용.

-- 4. updated_at trigger ---------------------------------------------------

drop trigger if exists cohort_expenses_set_updated_at on public.cohort_expenses;
create trigger cohort_expenses_set_updated_at
  before update on public.cohort_expenses
  for each row execute function public.set_updated_at();

drop trigger if exists tax_filings_set_updated_at on public.tax_filings;
create trigger tax_filings_set_updated_at
  before update on public.tax_filings
  for each row execute function public.set_updated_at();

-- 5. 1기 비용 seed --------------------------------------------------------
-- 노아 데이터 (시나리오 B 기준):
--   강사료 5,000,000 + VAT 500,000 (강사 회사 1명, 사내 1명 무비용)
--   강의장 600,000 + VAT 60,000 (마포구 4주 8회)
--   네트워킹 파티 500,000 + VAT 50,000 (7/25 수료식)
--   자료 / 소모품 100,000 (영수증 후 확정)
--
-- INSERT 중복 방지: 이미 같은 description 의 1기 row 가 있으면 skip.

do $$
declare
  v_cohort_id uuid;
begin
  select id into v_cohort_id from public.cohorts
   where status in ('open', 'enrollment_closed', 'in_progress')
   order by starts_on desc
   limit 1;

  if v_cohort_id is null then
    raise notice 'cohort 없음 - expenses seed skip.';
    return;
  end if;

  -- 강사료 (회사 1명, 외주비)
  if not exists (
    select 1 from public.cohort_expenses
     where cohort_id = v_cohort_id and category = 'instructor_fee'
  ) then
    insert into public.cohort_expenses
      (cohort_id, category, description, amount_krw, vat_krw, status, vendor_name, notes)
    values
      (v_cohort_id, 'instructor_fee', '1기 강사료 (외부 강사 회사 / 4주 8회 분)',
       5000000, 500000, 'planned',
       '강사 회사 (미입력)',
       '회사명 + 사업자번호 + 세금계산서 발행처 확정 후 update. 사내 강사 1명은 비용 X.');
  end if;

  -- 강의장 (임차료)
  if not exists (
    select 1 from public.cohort_expenses
     where cohort_id = v_cohort_id and category = 'venue_rental'
  ) then
    insert into public.cohort_expenses
      (cohort_id, category, description, amount_krw, vat_krw, status, vendor_name, notes)
    values
      (v_cohort_id, 'venue_rental', '강의장 대관료 (마포구 4주 8회 분)',
       600000, 60000, 'planned',
       '강의장 (미입력)',
       '확정 강의장 + 사업자번호 + 세금계산서 발급처 확정 후 update.');
  end if;

  -- 네트워킹 파티 (회의비/행사비)
  if not exists (
    select 1 from public.cohort_expenses
     where cohort_id = v_cohort_id and category = 'event'
  ) then
    insert into public.cohort_expenses
      (cohort_id, category, description, amount_krw, vat_krw, status, vendor_name, notes)
    values
      (v_cohort_id, 'event', '네트워킹 파티 (7/25 수료식 식음료 / 장소)',
       500000, 50000, 'planned',
       '식음료 / 장소 (미입력)',
       '카드매출전표 또는 현금영수증 (지출증빙용) 보관 의무.');
  end if;

  -- 자료 / 소모품
  if not exists (
    select 1 from public.cohort_expenses
     where cohort_id = v_cohort_id and category = 'materials'
  ) then
    insert into public.cohort_expenses
      (cohort_id, category, description, amount_krw, vat_krw, status, vendor_name, notes)
    values
      (v_cohort_id, 'materials', '자료 / 소모품 (인쇄, 명찰, 펜 등 추정치)',
       100000, 0, 'planned',
       '미입력',
       '실 지출 시 영수증 보관 + 정확한 금액으로 update.');
  end if;
end $$;

-- 6. 2026 세무 신고 일정 seed --------------------------------------------
-- 노아 = 일반 과세 사업자, 학원 미등록.
-- - 부가세: 1기 (1-6월) 7/25 까지, 2기 (7-12월) 익년 1/25 까지.
-- - 종합소득세: 익년 5/31 까지.
-- - 원천징수 지급명세서: 강사 사업소득 3.3% 원천징수 시 익년 3/10 까지.
--   (강사 회사 세금계산서 발행 시 원천징수 X → not_applicable 로 변경.)

insert into public.tax_filings
  (filing_type, period_start, period_end, due_date, status, notes)
values
  ('vat_q1',
   '2026-01-01', '2026-06-30', '2026-07-25', 'pending',
   '1기 강좌 매출 (6/27 ~ 6/30 분). 7월 매출은 2기에 귀속.'),
  ('vat_q2',
   '2026-07-01', '2026-12-31', '2027-01-25', 'pending',
   '1기 강좌 매출 잔여 (7/1 ~ 7/19) + 수료식 (7/25) 매출 + 종강 후 매출.'),
  ('income_tax',
   '2026-01-01', '2026-12-31', '2027-05-31', 'pending',
   '종합소득세 (사업소득). 부가세 별도 매출 - 비용 - 기본공제 = 과세표준.'),
  ('withholding_report',
   '2026-01-01', '2026-12-31', '2027-03-10', 'pending',
   '강사 사업소득 원천징수 3.3% 지급명세서. 강사 회사가 세금계산서 발행 시 적용 X (not_applicable 로 변경).')
on conflict do nothing;
