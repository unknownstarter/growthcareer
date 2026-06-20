-- B0031 LMS Wave 0 — DB minimum (ADR 0005 §6 entity invariant 표 반영).
--
-- 신규 6 entity:
--   1) companies            (회사 마스터 — 강사 정산 회사 단위)
--   2) instructors.company_id (FK ADD, ON DELETE SET NULL)
--   3) cohorts              (기수 — 1기, 2기 ...)
--   4) sessions (NEW)       (cohort 안의 강의 회차)
--   5) students             (수강생 — applicant 와 분리, FK lineage)
--   6) attendance (NEW)     (session 별 student 출결)
--
-- 기존 sessions / attendance 와 충돌:
--   - 기존 sessions = 1기 전용 단일 cohort 가정으로 만들어짐 (idx 1~8 unique,
--     date+day_of_week+instructor_id+venue+start_time+end_time).
--   - 기존 attendance = applicant_id FK 로 student 개념 없음.
--   - 1기 강의 시작 전 (2026-06-27) → attendance row 0 가정, sessions row 8
--     (seed). 단, sessions 의 seed (idx/date/day_of_week) 데이터는 보존하고
--     새 sessions 로 backfill.
--
-- 마이그레이션 전략:
--   1) companies + cohorts 신규 생성 (의존성 없음).
--   2) instructors.company_id ADD (FK, nullable).
--   3) sessions 의 기존 row 백업 → drop → 신규 sessions (cohort_id 기반) 생성
--      → 백업으로 backfill.
--   4) attendance 의 기존 (applicant_id 기반) → drop → 신규 attendance
--      (student_id 기반) 생성. 기존 row 0 가정.
--   5) students 신규.
--   6) cohorts 1기 seed.
--   7) RLS enable (정책 없음 = service_role only, RLS 본격 도입은 Wave 4).
--
-- ON DELETE 정책:
--   - cohorts → sessions      : CASCADE (cohort 통째 삭제 시 sessions 도)
--   - cohorts → students      : RESTRICT (학생이 있으면 cohort 삭제 차단)
--   - sessions → attendance   : CASCADE
--   - students → attendance   : CASCADE
--   - applicants → students   : RESTRICT (PII 파기 후에도 student lineage 유지)
--   - instructors → sessions  : SET NULL (강사 변경 가능)
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (필요 시 수동 실행, seed 포함 row 모두 사라짐 주의):
--   drop table if exists public.attendance;       -- new shape
--   drop table if exists public.students;
--   drop table if exists public.sessions;         -- new shape
--   drop table if exists public.cohorts;
--   alter table public.instructors drop column if exists company_id;
--   drop table if exists public.companies;

-- 0. 안전 가드 -------------------------------------------------------------
-- 기존 attendance row 가 있으면 명시적 실패 (수동 데이터 마이그레이션 필요).
do $$
declare
  v_attendance_count integer;
begin
  if exists (select 1 from information_schema.tables
             where table_schema='public' and table_name='attendance') then
    execute 'select count(*) from public.attendance' into v_attendance_count;
    if v_attendance_count > 0 then
      raise exception 'attendance 테이블에 % row 존재. LMS Wave 0 마이그레이션은 row 0 가정 — 수동 마이그레이션 필요.', v_attendance_count;
    end if;
  end if;
end;
$$;

-- 1. companies -------------------------------------------------------------
-- 강사 정산 회사 단위. 1기 강사 3명 → 2개 회사 (이제향=준컴퍼니, Nino+박성철=DEEPI 모회사 등 추후 채움).
-- biz_no / 계좌 정보 nullable — 운영자 in-app 추후 채움 (Wave 3 정산 전 필수).

create table if not exists public.companies (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(trim(name)) >= 1),
  biz_no         text,                            -- 사업자번호 (예: 154-28-02110)
  address        text,
  contact_name   text,
  contact_email  text,
  bank_name      text,
  bank_account   text,
  bank_holder    text,
  vat_issuer     boolean not null default false,  -- true = 세금계산서 발행 (부가세 10%)
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

comment on table public.companies is
  'B0031 강사 정산 회사 마스터. instructors.company_id FK 가 참조.';
comment on column public.companies.vat_issuer is
  'true = 세금계산서 발행 사업자 (부가세 10% 가산). false = 원천징수 3.3% 소득세.';

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- 2. instructors.company_id FK ADD -----------------------------------------
-- 기존 강사 row (이제향/Nino/박성철) 의 company_id 는 NULL 로 시작 → in-app 채움.

alter table public.instructors
  add column if not exists company_id uuid references public.companies(id) on delete set null;

comment on column public.instructors.company_id is
  '강사 소속 회사. NULL 가능 (개인 강사). Wave 3 정산 전 채워야 회사 단위 정산 가능.';

create index if not exists instructors_company_idx
  on public.instructors (company_id);

-- 3. cohorts ---------------------------------------------------------------
-- 기수 (1기, 2기, ...). 상태 머신 (ADR 0005 §6):
--   draft → open → enrollment_closed → in_progress → completed
--                                                  → cancelled (정원 미달)
--
-- min_to_open / capacity / starts_on / ends_on / ceremony_on 모두 인프라 레벨 가드.

create table if not exists public.cohorts (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(trim(name)) >= 1),
  starts_on       date not null,
  ends_on         date not null,
  ceremony_on     date,
  capacity        integer not null default 30 check (capacity > 0),
  min_to_open     integer not null default 20 check (min_to_open > 0),
  status          text not null default 'draft'
                    check (status in ('draft','open','enrollment_closed','in_progress','completed','cancelled')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  check (min_to_open <= capacity),
  check (starts_on < ends_on)
);

comment on table public.cohorts is
  'B0031 기수 마스터. 1기 = 2026-06-27 ~ 2026-07-19 + 수료식 7/25.';

drop trigger if exists cohorts_set_updated_at on public.cohorts;
create trigger cohorts_set_updated_at
  before update on public.cohorts
  for each row execute function public.set_updated_at();

-- 4. sessions 폐기 + 재생성 -----------------------------------------------
-- 기존 sessions (idx/date/day_of_week 기반, cohort 개념 없음) 의 seed 데이터를
-- 임시 백업 → drop → 새 sessions (cohort_id + starts_at/ends_at timestamptz) 생성
-- → 1기 cohort row 의 id 로 backfill.

create temporary table if not exists _legacy_sessions_backup as
  select * from public.sessions;

-- attendance FK 가 sessions(id) 를 참조하므로 attendance 먼저 drop.
drop table if exists public.attendance;

drop table if exists public.sessions;

create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  instructor_id   uuid references public.instructors(id) on delete set null,

  title           text not null check (char_length(trim(title)) >= 1),
  location        text,                                       -- venue
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  idx             smallint,                                   -- cohort 안의 회차 번호 (optional)
  day_of_week     text check (day_of_week is null or day_of_week in ('saturday','sunday')),
  topic           text,
  notes           text,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','in_progress','ended','cancelled')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  check (starts_at < ends_at),
  unique (cohort_id, idx)
);

comment on table public.sessions is
  'B0031 cohort 안의 강의 회차. (cohort_id, idx) UNIQUE — cohort 내 회차 번호 충돌 방지.';
comment on column public.sessions.idx is
  'cohort 안의 회차 번호 (1~N). nullable — 보강 세션은 idx 없이 일정만.';

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

create index if not exists sessions_cohort_starts_idx
  on public.sessions (cohort_id, starts_at);
create index if not exists sessions_instructor_idx
  on public.sessions (instructor_id);

-- 5. students --------------------------------------------------------------
-- applicants 와 분리 — paid/enrolled applicant 만 promote.
-- applicant_id UNIQUE → 1 applicant 는 1 student 만 (cohort 재수강 시 새 applicant).
-- PII 파기 후에도 student lineage 유지 위해 applicant_id FK 는 RESTRICT.

create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null unique references public.applicants(id) on delete restrict,
  cohort_id       uuid not null references public.cohorts(id) on delete restrict,

  display_name    text not null check (char_length(trim(display_name)) >= 1),
  status          text not null default 'active'
                    check (status in ('active','withdrawn','completed')),
  promoted_at     timestamptz not null default now(),
  withdrawn_at    timestamptz,
  completed_at    timestamptz,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.students is
  'B0031 수강생. applicant 중 paid → promote. PII 파기 후에도 display_name 보존 (수료증 lineage).';
comment on column public.students.display_name is
  'PII 파기 시점에 applicants.name 이 [redacted] 되어도 student 화면 표시용으로 보존. promote 시점에 스냅샷.';

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create index if not exists students_cohort_idx
  on public.students (cohort_id);

-- 6. attendance (new shape) -----------------------------------------------
-- session 별 student 출결. UNIQUE(session_id, student_id) — 1 (session, student) 은 1 mark.

create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.sessions(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  status          text not null default 'present'
                    check (status in ('present','late','absent','excused')),
  late_minutes    smallint check (late_minutes is null or late_minutes >= 0),
  marked_by       text,
  marked_at       timestamptz not null default now(),
  notes           text,

  updated_at      timestamptz,

  unique (session_id, student_id)
);

comment on table public.attendance is
  'B0031 session × student 출결. status: present/late/absent/excused. (session_id, student_id) UNIQUE.';

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();

create index if not exists attendance_session_idx
  on public.attendance (session_id);
create index if not exists attendance_student_idx
  on public.attendance (student_id);

-- 7. 1기 cohort seed + sessions backfill ----------------------------------
-- 1기: 2026-06-27 ~ 2026-07-19, 수료식 7/25, capacity 30, min_to_open 20.

insert into public.cohorts (name, starts_on, ends_on, ceremony_on, capacity, min_to_open, status)
  values
    ('1기', '2026-06-27', '2026-07-19', '2026-07-25', 30, 20, 'open')
  on conflict do nothing;

-- 기존 sessions seed 를 1기 cohort 로 backfill. starts_at/ends_at 는 14:00~16:00 KST 가정
-- (운영자 in-app 으로 정확한 시간 + venue + instructor 채움).
-- KST = UTC+9 → 14:00 KST = 05:00 UTC, 16:00 KST = 07:00 UTC.

insert into public.sessions (cohort_id, idx, day_of_week, starts_at, ends_at, title)
  select
    c.id,
    b.idx,
    b.day_of_week,
    (b.date::text || ' 05:00:00+00')::timestamptz,  -- 14:00 KST
    (b.date::text || ' 07:00:00+00')::timestamptz,  -- 16:00 KST
    '1기 ' || b.idx || '회차'
  from _legacy_sessions_backup b
  cross join (select id from public.cohorts where name = '1기' limit 1) c
  on conflict (cohort_id, idx) do nothing;

-- 백업 instructor_id / venue / start_time / end_time / topic 도 보존 (옵션).
-- 백업 row 가 있다면 새 sessions 의 같은 idx 행에 채워넣음.

update public.sessions s
   set instructor_id = b.instructor_id,
       location      = b.venue,
       topic         = b.topic,
       starts_at     = case
                         when b.start_time is not null
                         then (b.date::text || ' ' || b.start_time::text || '+09')::timestamptz
                         else s.starts_at
                       end,
       ends_at       = case
                         when b.end_time is not null
                         then (b.date::text || ' ' || b.end_time::text || '+09')::timestamptz
                         else s.ends_at
                       end
  from _legacy_sessions_backup b
 where s.idx = b.idx
   and exists (select 1 from public.cohorts c where c.id = s.cohort_id and c.name = '1기');

-- 8. RLS + 권한 -----------------------------------------------------------
-- Wave 0 = admin only (service_role 전용). 정책 없음 = anon/authenticated 모두 차단.
-- RLS 본격 도입은 Wave 4 (B0035).

alter table public.companies   enable row level security;
alter table public.cohorts     enable row level security;
alter table public.sessions    enable row level security;
alter table public.students    enable row level security;
alter table public.attendance  enable row level security;

revoke all on public.companies   from anon, authenticated;
revoke all on public.cohorts     from anon, authenticated;
revoke all on public.sessions    from anon, authenticated;
revoke all on public.students    from anon, authenticated;
revoke all on public.attendance  from anon, authenticated;

grant all on public.companies    to service_role;
grant all on public.cohorts      to service_role;
grant all on public.sessions     to service_role;
grant all on public.students     to service_role;
grant all on public.attendance   to service_role;
