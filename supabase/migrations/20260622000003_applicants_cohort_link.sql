-- B0032 LMS Wave 1 hotfix #2 — applicants × cohort 연결.
--
-- 비즈니스 모델 (best practice):
--   applicants = 모든 기수의 인재풀 (모집 → 입금 → 학생 promote 의 funnel root).
--   pending/notified/paid/overdue/cancelled/enrolled/refunded 모두 영구 보존.
--   다음 기수 모집 시 notified/cancelled 이전 cohort applicants = 우선 outreach 대상.
--
-- 본 마이그레이션:
--   1) applicants.cohort_id 컬럼 추가 (nullable → backfill → NOT NULL)
--   2) 기존 26명 → 1기 cohort 로 backfill (현재 유일 active cohort)
--   3) (cohort_id, status) 복합 인덱스 — funnel KPI 쿼리 최적화
--
-- 안전 패턴:
--   nullable ADD → UPDATE backfill → NOT NULL SET (zero-downtime)
--
-- ON DELETE 정책:
--   cohort 삭제 시 applicants 는 SET NULL (인재풀 보존 — 어느 cohort 였는지만 잃음).
--   단 운영 상 cohort 삭제는 거의 없음 — cohort.status='cancelled' 로 종결.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (수동):
--   drop index if exists applicants_cohort_status_idx;
--   alter table public.applicants drop column if exists cohort_id;

-- 0. 안전 가드 -------------------------------------------------------------
-- cohorts 테이블에 활성 cohort 가 정확히 1개 있어야 backfill 안전.
-- 0개면 fail (cohort 먼저 생성). 2개 이상이면 fail (수동 매핑 필요).

do $$
declare
  v_cohort_count integer;
begin
  if not exists (select 1 from information_schema.tables
                 where table_schema='public' and table_name='cohorts') then
    raise exception 'cohorts 테이블이 없음 — LMS Wave 0 마이그레이션 먼저 적용 필요.';
  end if;

  select count(*) into v_cohort_count
    from public.cohorts
   where status in ('open', 'enrollment_closed', 'in_progress');

  if v_cohort_count = 0 then
    raise exception 'backfill 가능한 활성 cohort 가 없음. 1기 cohort 먼저 생성 필요.';
  end if;

  if v_cohort_count > 1 then
    raise exception 'backfill 대상 활성 cohort 가 % 개. 본 마이그레이션은 단일 cohort 가정. 수동 매핑 필요.', v_cohort_count;
  end if;
end;
$$;

-- 1. applicants.cohort_id 컬럼 ADD (nullable) ------------------------------

alter table public.applicants
  add column if not exists cohort_id uuid references public.cohorts(id) on delete set null;

comment on column public.applicants.cohort_id is
  'B0032 cohort 귀속 — 이 신청자가 어느 기수에 신청했는지. NULL 가능 (cohort 삭제 시 SET NULL). 신규 신청은 active cohort 자동 매칭.';

-- 2. 기존 row 전체 backfill ------------------------------------------------
-- 현재 prod 의 26명 applicants 는 모두 1기 (현재 유일 active cohort) 신청자.

update public.applicants
   set cohort_id = (
     select id from public.cohorts
      where status in ('open', 'enrollment_closed', 'in_progress')
      order by starts_on desc
      limit 1
   )
 where cohort_id is null;

-- 3. NOT NULL 강제 --------------------------------------------------------
-- backfill 후 모든 row 가 cohort_id 보유 — 이후 신청은 submit-application 가 active cohort 자동 매칭.

alter table public.applicants alter column cohort_id set not null;

-- 4. 인덱스 ---------------------------------------------------------------
-- cohort 별 funnel KPI 쿼리 ("1기 paid 몇 명?") 가 가장 빈번한 패턴.

create index if not exists applicants_cohort_status_idx
  on public.applicants (cohort_id, status);

create index if not exists applicants_cohort_created_idx
  on public.applicants (cohort_id, created_at desc);

-- 5. 1기 cohort 가 신청 가능 표시 보장 -------------------------------------
-- B0032 Step 2 마이그레이션 시 accepts_signup_now=false default 로 들어감 →
-- 신청 폼 submit-application 가 자동 매칭 실패 → 신청 불가 사고 방지.
-- 본 마이그레이션 시점에 활성 cohort (1기) 의 accepts_signup_now 를 true 강제.
-- 모집 마감 후엔 운영자가 dashboard 에서 toggle.

update public.cohorts
   set accepts_signup_now = true
 where status = 'open'
   and accepts_signup_now is not true;
