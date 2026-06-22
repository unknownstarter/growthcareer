-- 1기 cohort_expenses 에 Cowork (DEEPI) 마케팅 수수료 entry 추가.
--
-- 약정:
--   결제 인원당 수강료 12% (수강료 = VAT 포함 880,000원 기준).
--   현재 paid 10명 (6/22 11명 → 6/23 환불 1명 → 10명).
--
-- 산정:
--   10명 × 880,000원 × 12% = 1,056,000원
--
-- VAT 처리:
--   본 entry 의 amount_krw 는 운영자가 Cowork 에 송금하는 금액. Cowork 측이 세금계산서 발행 시
--   별도 매입 VAT 처리. amount_krw 만 보관 (vat_krw=0).
--
-- 카테고리: 'marketing' (영업판촉비 / 광고선전비 — 파트너 마케팅 수수료 포함).
-- 환불자 차감 여부 약정 미확정 (현재 10명 기준 가정). 정산 시 약정 확인 후 update.
--
-- INSERT 중복 방지: 이미 1기 의 marketing + 'Cowork' 키워드 row 가 있으면 skip.

do $$
declare
  v_cohort_id uuid;
  v_paid_count int;
  v_amount int;
begin
  -- 1기 cohort id 찾기 (가장 최신 활성 cohort).
  select id into v_cohort_id from public.cohorts
   where status in ('open', 'enrollment_closed', 'in_progress')
   order by starts_on desc
   limit 1;

  if v_cohort_id is null then
    raise notice 'cohort 없음 — Cowork 수수료 seed skip.';
    return;
  end if;

  -- 결제 인원 (status='paid' 또는 'enrolled'). refunded 는 환불자라 차감 대상.
  select count(*) into v_paid_count from public.applicants
   where cohort_id = v_cohort_id
     and status in ('paid', 'enrolled');

  v_amount := v_paid_count * 880000 * 12 / 100;

  -- 중복 방지.
  if exists (
    select 1 from public.cohort_expenses
     where cohort_id = v_cohort_id
       and category = 'marketing'
       and description ilike '%Cowork%'
  ) then
    raise notice 'Cowork 수수료 entry 이미 있음 — skip.';
    return;
  end if;

  insert into public.cohort_expenses
    (cohort_id, category, description, amount_krw, vat_krw, status, vendor_name, notes)
  values
    (v_cohort_id,
     'marketing',
     format('Cowork (DEEPI) 마케팅 수수료 / 결제 인원 %s명 × 880,000 × 12%%', v_paid_count),
     v_amount,
     0,
     'planned',
     'Cowork / DEEPI',
     '약정: 결제 인원당 수강료 12%. 환불자 차감 여부 약정 미확정 (현재 paid 인원 기준 계산). ' ||
     '정산 시점 약정 (월별 / cohort 종료 후) 확인 필요. ' ||
     '인원 변경 시 (추가 환불 등) 운영자가 수동 update 또는 신규 entry 추가.');

  raise notice 'Cowork 수수료 entry insert: % 명 × 880,000 × 12%% = % 원',
    v_paid_count, v_amount;
end $$;
