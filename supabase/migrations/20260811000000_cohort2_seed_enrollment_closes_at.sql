-- 2기 배선 (Slice O). cohort별 시각 기반 모집 마감 디커플 + 2기 시드.
--
-- 배경/문제:
--   /fan-to-pro/2 지원 폼이 submitApplication → applicants insert 하는데, 전역
--   program-config.isEnrollmentClosed() (cutoffAt=2026-06-22, 1기 날짜라 과거) 를 봐서
--   모든 2기 신청을 status='next_cohort_interest' (waitlist) 로 오분류. 또한 2기
--   cohort/courses/bundle 이 DB 에 status=open 으로 없어서 pending 신청/LMS 연결 불가.
--   → 1기와 일정이 커플됨. 이걸 cohort별 독립 시각 기반으로 디커플 + 2기 시드.
--
-- 본 마이그레이션:
--   1. cohorts.enrollment_closes_at 컬럼 추가 (기수별 모집 마감 시각, 시각 기반 자동 판정 §7.4)
--   2. 2기 cohort 시드 (status='open', enrollment_closes_at='2026-08-31 00:00 KST')
--   3. 2기 courses 시드 (a-r / sound, status='open', 550,000원)
--   4. 2기 bundle 시드 (all-in-one, status='open', 990,000원) + bundle_courses
--
-- 안전 원칙 (§7.4):
--   - additive only. 기존 shape 절대 보존.
--   - 멱등 (ON CONFLICT DO NOTHING / WHERE NOT EXISTS). 재실행 안전.
--   - 1기 (fan-to-pro-1 course, archived / '1기' cohort) 는 절대 안 건드림.
--
-- 롤백 SQL (수동):
--   delete from public.bundle_courses
--     where bundle_id in (select id from public.bundles
--                          where slug='all-in-one'
--                            and program_id=(select id from public.programs where slug='fan-to-pro'));
--   delete from public.bundles
--     where slug='all-in-one'
--       and program_id=(select id from public.programs where slug='fan-to-pro');
--   delete from public.courses
--     where slug in ('a-r','sound')
--       and program_id=(select id from public.programs where slug='fan-to-pro');
--   delete from public.cohorts where slug='fantopro2';
--   alter table public.cohorts drop column if exists enrollment_closes_at;

-- ============================================================================
-- 1. cohorts.enrollment_closes_at
-- ----------------------------------------------------------------------------
-- 기수별 모집 마감 시각 (시각 기반 자동 판정, §7.4). NULL = 마감 시각 미설정
-- (열려 있으면 계속 신청 가능). submit-application 이 now() 와 비교해 pending vs
-- next_cohort_interest 분기. 전역 program-config.isEnrollmentClosed (1기 날짜) 대체.

alter table public.cohorts
  add column if not exists enrollment_closes_at timestamptz;

comment on column public.cohorts.enrollment_closes_at is
  '기수별 모집 마감 시각 (시각 기반 자동 판정, §7.4). NULL = 마감 시각 미설정(계속 신청 가능). now() >= 이 값이면 신규 신청은 next_cohort_interest 로 분류.';

-- ============================================================================
-- 2. 2기 cohort 시드
-- ----------------------------------------------------------------------------
-- status='open', accepts_signup_now=true → fetchSignupOpenCohort 매칭.
-- enrollment_closes_at = 2026-08-31 00:00 KST (8/30 자정 = 8/30 → 8/31 전환).
-- starts_on 2026-09-05, ends_on 2026-09-27 (4주 주말, content.ts schedule 과 일치).
-- ceremony_on 은 미확정 → NULL. min_to_open 10, capacity 30 (content 최소 10명).
-- slug = 'fantopro2' (8자 alphanumeric, reserved word 아님, LMS 라우팅용).
-- showcase_slug = 'fan-to-pro-2' (공개 라우트용, /cohorts/fan-to-pro-2 대비).

insert into public.cohorts (
  name,
  starts_on,
  ends_on,
  ceremony_on,
  capacity,
  min_to_open,
  status,
  program_id,
  slug,
  accepts_signup_now,
  enrollment_closes_at,
  showcase_slug
)
select
  '2기',
  date '2026-09-05',
  date '2026-09-27',
  null,
  30,
  10,
  'open',
  p.id,
  'fantopro2',
  true,
  timestamptz '2026-08-31 00:00:00+09:00',
  'fan-to-pro-2'
from public.programs p
where p.slug = 'fan-to-pro'
  and not exists (
    select 1 from public.cohorts c where c.slug = 'fantopro2'
  );

-- ============================================================================
-- 3. 2기 courses 시드 (단과 2과정)
-- ----------------------------------------------------------------------------
-- slug 는 지원 폼이 submit 하는 selected_course_slugs 값과 정확히 일치해야 함
-- (content.ts apply.courses: 'a-r', 'sound'). status='open' 이라야 submit-application
-- 의 course 조회 (program_id + slug + status=open) 가 매칭됨.
-- price_krw 550,000 / session_count 4 (content curriculum 4주). title_ko/en.

insert into public.courses (
  program_id, slug, title_ko, title_en, description, order_idx, status, price_krw, session_count
)
select p.id, 'a-r', 'A&R 단과반', 'A&R Course',
  'K-pop A&R 실무 4주. 뮤직 비즈니스, 음반 기획, 캐스팅, 비주얼 디렉팅.',
  1, 'open', 550000, 4
from public.programs p
where p.slug = 'fan-to-pro'
on conflict (program_id, slug) do nothing;

insert into public.courses (
  program_id, slug, title_ko, title_en, description, order_idx, status, price_krw, session_count
)
select p.id, 'sound', '음향 감독 단과반', 'Sound Director Course',
  'K-pop 라이브 사운드 4주. 백스테이지, IEM, 토크백, 대형 PA 실무 체험.',
  2, 'open', 550000, 4
from public.programs p
where p.slug = 'fan-to-pro'
on conflict (program_id, slug) do nothing;

-- ============================================================================
-- 4. 2기 bundle 시드 (올인원) + bundle_courses
-- ----------------------------------------------------------------------------
-- slug='all-in-one'. price_krw 990,000 (단과 2개 sum 1,100,000 대비 110,000 할인).
-- discount_percent 10 (표시용). status='open'.
-- 지원 폼은 bundle_slug 를 직접 submit 하지 않음 (selection_mode='all_in_one' 로만
-- 구분, ADR 0019 간이 정책 B). 운영자가 어드민에서 결제/매핑 확인. bundle row 는
-- LMS/정산/향후 정식 enrollment 경로 대비 시드.

insert into public.bundles (
  program_id, slug, title_ko, title_en, description, price_krw, discount_percent, status
)
select p.id, 'all-in-one', '전 과정 패키지', 'Full Package',
  'A&R 과 음향 감독 두 단과를 모두 포함한 풀 트랙. 실제 공연 프로젝트 참여.',
  990000, 10, 'open'
from public.programs p
where p.slug = 'fan-to-pro'
on conflict (program_id, slug) do nothing;

-- bundle_courses: all-in-one → a-r, sound 연결. 멱등 (PK bundle_id+course_id).
insert into public.bundle_courses (bundle_id, course_id, order_idx)
select b.id, c.id, c.order_idx
from public.bundles b
join public.programs p on p.id = b.program_id and p.slug = 'fan-to-pro'
join public.courses c on c.program_id = p.id and c.slug in ('a-r', 'sound')
where b.slug = 'all-in-one'
on conflict (bundle_id, course_id) do nothing;
