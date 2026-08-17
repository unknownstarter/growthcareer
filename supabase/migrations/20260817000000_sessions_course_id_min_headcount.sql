-- Phase 1a — course 정규화 SoT 배선 준비 (Sophia Phase 0 설계, 태스크 #19~24).
--
-- 배경/문제:
--   현재 "이 cohort/session 이 어떤 course 인가" 의 grain 이 cohorts.course_id (기수 단위)
--   하나뿐. 2기부터는 한 cohort 안에 여러 course (a-r / sound) 가 병존하므로 cohort 단위
--   매핑으로는 session 단위 course 를 표현할 수 없음. → session 이 진짜 grain.
--   sessions.course_id 를 도입해 cohort.course_id 를 대체(deprecate)한다.
--
-- 본 마이그레이션 (additive only, NOT NULL 승격은 M2 = 다음 배포):
--   1. sessions.course_id uuid ADD (nullable, references courses(id) on delete restrict)
--   2. 1기 sessions backfill → fan-to-pro-1 course (cohort slug 'b628b909')
--   3. 2기 sessions backfill → day_of_week 매핑 (토=sound, 일=a-r) — sessions 있으면, 없으면 no-op
--   4. courses.min_headcount int NOT NULL default 10 ADD (제네릭 정원 판정이 로드할 필드)
--   5. cohorts.course_id deprecate (삭제 X — comment 로 legacy 명시)
--
-- 안전 원칙 (§7.4):
--   - additive only. 기존 shape 절대 보존. 기존 컬럼 drop / rename X.
--   - 멱등 (if not exists / where ... is null / on conflict). 재실행 안전.
--   - UUID 하드코딩 X — 전부 slug subquery (program 스코프).
--   - 1기 (b628b909 cohort / fan-to-pro-1 course, archived) 데이터는 안 건드림 (course_id 채우기만).
--   - sessions.course_id 는 이번엔 nullable. backfill 검증(전 row 채워짐 확인) 후
--     다음 배포에서 NOT NULL + on delete restrict 유지로 승격 (M2). 지금 승격 X.
--
-- 롤백 SQL (수동):
--   alter table public.courses  drop column if exists min_headcount;
--   -- cohorts.course_id deprecate comment 되돌리기:
--   comment on column public.cohorts.course_id is
--     'B0068 ADR 0013 cohort 가 진행하는 course. NULL = 레거시 (course 개념 도입 전 cohort).';
--   -- sessions.course_id backfill 되돌리기 (drop 전 값 비우기):
--   update public.sessions set course_id = null;
--   drop index if exists public.sessions_course_idx;
--   alter table public.sessions drop column if exists course_id;

-- ============================================================================
-- 1. sessions.course_id ADD (nullable)
-- ----------------------------------------------------------------------------
-- session 단위 course grain. on delete restrict — course 를 지우려면 먼저 session 을
-- 다른 course 로 옮기거나 지워야 함 (감사 추적 / 정합성). 이번엔 nullable:
-- backfill 이 전 row 를 채우는지 검증 후 M2 에서 NOT NULL 승격.

alter table public.sessions
  add column if not exists course_id uuid references public.courses(id) on delete restrict;

comment on column public.sessions.course_id is
  'Phase 1a 이 회차가 속한 course (session 단위 grain). NULL = 아직 backfill 전 (M2 에서 NOT NULL 승격 예정). cohorts.course_id 를 대체 — 한 cohort 안 여러 course 병존(2기 a-r/sound) 표현.';

create index if not exists sessions_course_idx
  on public.sessions (course_id)
  where course_id is not null;

-- ============================================================================
-- 2. 1기 sessions backfill → fan-to-pro-1 course
-- ----------------------------------------------------------------------------
-- 1기 cohort (slug 'b628b909') 의 모든 session 을 fan-to-pro-1 course 로 매핑.
-- course_id 가 아직 NULL 인 것만 (멱등). UUID 하드코딩 X — slug subquery (program 스코프).

update public.sessions s
   set course_id = (
     select co.id
       from public.courses co
       join public.programs p on p.id = co.program_id
      where co.slug = 'fan-to-pro-1'
        and p.slug = 'fan-to-pro'
      limit 1
   )
 where s.course_id is null
   and s.cohort_id = (
     select c.id from public.cohorts c where c.slug = 'b628b909' limit 1
   );

-- ============================================================================
-- 3. 2기 sessions backfill → day_of_week 매핑 (토=sound, 일=a-r)
-- ----------------------------------------------------------------------------
-- 2기 cohort (slug 'fantopro2') 의 session 이 이미 seed 됐다면 day_of_week 로 course 매핑:
--   saturday → sound (음향 감독 단과반)
--   sunday   → a-r   (A&R 단과반)
-- 2기 sessions 가 아직 없으면 이 UPDATE 는 0 row → no-op (안전).
-- day_of_week 가 NULL 인 2기 보강 session 은 여기서 매핑 안 됨 → course_id NULL 유지
-- (M2 NOT NULL 승격 전에 운영자/후속 슬라이스가 채워야 함 — 아래 §5 노아 확인 항목).

update public.sessions s
   set course_id = (
     select co.id
       from public.courses co
       join public.programs p on p.id = co.program_id
      where co.slug = 'sound'
        and p.slug = 'fan-to-pro'
      limit 1
   )
 where s.course_id is null
   and s.day_of_week = 'saturday'
   and s.cohort_id = (
     select c.id from public.cohorts c where c.slug = 'fantopro2' limit 1
   );

update public.sessions s
   set course_id = (
     select co.id
       from public.courses co
       join public.programs p on p.id = co.program_id
      where co.slug = 'a-r'
        and p.slug = 'fan-to-pro'
      limit 1
   )
 where s.course_id is null
   and s.day_of_week = 'sunday'
   and s.cohort_id = (
     select c.id from public.cohorts c where c.slug = 'fantopro2' limit 1
   );

-- ============================================================================
-- 4. courses.min_headcount ADD
-- ----------------------------------------------------------------------------
-- course 개설 최소 정원. 제네릭 개설/정원 판정이 이 필드를 로드 (하드코딩 10 대체).
-- 기존 course row (fan-to-pro-1 / a-r / sound) 는 default 10 으로 채워짐.
-- cohorts.min_to_open (기수 단위) 와 별개 — course 단위 최소 정원.

alter table public.courses
  add column if not exists min_headcount integer not null default 10
    check (min_headcount > 0);

comment on column public.courses.min_headcount is
  'Phase 1a course 개설 최소 정원. 제네릭 정원/개설 판정이 로드 (하드코딩 대체). default 10. cohorts.min_to_open(기수 단위) 와 별개 course 단위 값.';

-- ============================================================================
-- 5. cohorts.course_id DEPRECATE (삭제 X — comment 만)
-- ----------------------------------------------------------------------------
-- session 단위 course grain (sessions.course_id) 이 SoT. cohorts.course_id 는
-- 1기 legacy 호환용으로만 남김 (showcase repository 가 여전히 SELECT — 삭제하면
-- 회귀). 2기+ 는 이 컬럼 사용 금지 (한 cohort 안 여러 course 라 단일 매핑 불가).

comment on column public.cohorts.course_id is
  'DEPRECATED (Phase 1a). 1기 legacy only — 2기+ 사용 금지. session 단위 course grain 은 sessions.course_id 가 SoT. 이 컬럼은 삭제하지 않음 (cohort-showcase repository 가 SELECT 중, 호환 유지). 한 cohort 안 여러 course 병존은 표현 불가.';
