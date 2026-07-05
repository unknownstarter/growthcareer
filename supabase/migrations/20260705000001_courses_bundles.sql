-- B0068 courses / bundles 스키마 도입 (ADR 0013).
--
-- 2기+ 멀티 트랙 + 단과반 / 올인원 (bundle) 확장 대비.
-- 기존 shape 절대 보존: applicants / attendance / students.display_name / cohorts.slug.
-- 신규 5 테이블 + 기존 3 테이블 additive nullable 확장.
--
-- 1. courses               (단과반. program 안 sub-과정. slug UNIQUE per program)
-- 2. bundles               (올인원. 여러 course 조합 + 할인)
-- 3. bundle_courses        (M:N)
-- 4. enrollments           (결제 단위. student/applicant 최소 하나 필수)
-- 5. enrollment_courses    (M:N. 결제 = 단과 or 번들 unpack)
-- 6. applicants.enrollment_id (nullable) + applicants.bundle_id (nullable)
-- 7. cohorts.course_id     (nullable — 어떤 course 에 매핑된 cohort 인가)
-- 8. instructors.course_ids uuid[] (nullable — 여러 course 강의 가능)
--
-- RLS 원칙:
--   - courses / bundles / bundle_courses     : public read (status IN ('open','archived')), service_role 전체
--   - enrollments / enrollment_courses       : service_role 전체 + student self (본인 학생 row 만)
--
-- 롤백 SQL (수동):
--   alter table public.instructors   drop column if exists course_ids;
--   alter table public.cohorts       drop column if exists course_id;
--   alter table public.applicants    drop column if exists bundle_id;
--   alter table public.applicants    drop column if exists enrollment_id;
--   drop table if exists public.enrollment_courses;
--   drop table if exists public.enrollments;
--   drop table if exists public.bundle_courses;
--   drop table if exists public.bundles;
--   drop table if exists public.courses;

-- ============================================================================
-- 1. courses
-- ----------------------------------------------------------------------------
-- program 안의 sub-과정. slug 는 program 안에서만 UNIQUE.
-- fan-to-pro/course-slug/ URL 확장 대비. status draft→open→archived.
-- price_krw / session_count 은 nullable (설계 초기 미정 케이스).

create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references public.programs(id) on delete cascade,
  slug          text not null check (char_length(trim(slug)) >= 1),
  title_ko      text not null check (char_length(trim(title_ko)) >= 1),
  title_en      text,
  description   text,
  order_idx     integer not null default 0,
  status        text not null default 'draft'
                  check (status in ('draft','open','archived')),
  price_krw     integer check (price_krw is null or price_krw >= 0),
  session_count integer check (session_count is null or session_count > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (program_id, slug)
);

comment on table public.courses is
  'B0068 ADR 0013 단과반. program 안 sub-과정. 2기+ 멀티 트랙 대비. 1기는 fan-to-pro-1 하나로 backfill.';
comment on column public.courses.slug is
  'B0068 URL segment. program_id 안에서만 UNIQUE — 다른 program 이 같은 slug 사용 OK.';
comment on column public.courses.status is
  'B0068 draft (기획 중) / open (판매 중) / archived (종료 — 히스토리 보관).';

create index if not exists courses_program_idx
  on public.courses (program_id);
create index if not exists courses_status_idx
  on public.courses (status);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. bundles
-- ----------------------------------------------------------------------------
-- 올인원 = 여러 course 조합 + 할인. discount_percent 0~100.
-- price_krw = 할인 후 최종 가격 (개별 sum 아님).

create table if not exists public.bundles (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.programs(id) on delete cascade,
  slug             text not null check (char_length(trim(slug)) >= 1),
  title_ko         text not null check (char_length(trim(title_ko)) >= 1),
  title_en         text,
  description      text,
  price_krw        integer check (price_krw is null or price_krw >= 0),
  discount_percent numeric check (discount_percent is null
                                   or (discount_percent >= 0 and discount_percent <= 100)),
  status           text not null default 'draft'
                     check (status in ('draft','open','archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (program_id, slug)
);

comment on table public.bundles is
  'B0068 ADR 0013 올인원 (여러 course 묶음 + 할인). fan-to-pro-full 등.';
comment on column public.bundles.price_krw is
  'B0068 할인 후 최종 가격. 개별 course price sum 이 아님.';
comment on column public.bundles.discount_percent is
  'B0068 표시용 할인률 (%). price_krw 와 정합성은 어드민 책임.';

create index if not exists bundles_program_idx
  on public.bundles (program_id);
create index if not exists bundles_status_idx
  on public.bundles (status);

drop trigger if exists bundles_set_updated_at on public.bundles;
create trigger bundles_set_updated_at
  before update on public.bundles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. bundle_courses (M:N)
-- ----------------------------------------------------------------------------
-- bundle 이 어떤 course 를 포함하는가. order_idx 로 표시 순서.
-- ON DELETE CASCADE — bundle 삭제 시 join row 도 삭제. course 삭제 시 join row 삭제
-- (bundle 은 남지만 course 가 사라지면 정합성 유지 위해 join 도 제거).

create table if not exists public.bundle_courses (
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_idx integer not null default 0,

  primary key (bundle_id, course_id)
);

comment on table public.bundle_courses is
  'B0068 ADR 0013 bundle × course M:N. order_idx 는 bundle 안 노출 순서.';

create index if not exists bundle_courses_course_idx
  on public.bundle_courses (course_id);

-- ============================================================================
-- 4. enrollments
-- ----------------------------------------------------------------------------
-- 결제 단위. student 승격 전 (applicant 단계) 에도 record 가능하도록 둘 다 nullable + CHECK.
-- bundle_id nullable — 단과 결제면 NULL. cohort_id nullable — bundle 결제로 여러 cohort 가능.
-- status: pending → paid → (refunded|cancelled).

create table if not exists public.enrollments (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid references public.students(id) on delete set null,
  applicant_id         uuid references public.applicants(id) on delete set null,
  cohort_id            uuid references public.cohorts(id) on delete restrict,
  bundle_id            uuid references public.bundles(id) on delete set null,
  purchase_amount_krw  integer check (purchase_amount_krw is null or purchase_amount_krw >= 0),
  purchased_at         timestamptz,
  status               text not null default 'pending'
                         check (status in ('pending','paid','refunded','cancelled')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- 최소 하나는 붙어야 함. 둘 다 null 이면 orphan row.
  check (student_id is not null or applicant_id is not null)
);

comment on table public.enrollments is
  'B0068 ADR 0013 결제 단위. student 승격 전 (applicant) 에도 pending 으로 생성 가능.';
comment on column public.enrollments.bundle_id is
  'B0068 올인원 결제면 채워짐. 단과 결제는 NULL — enrollment_courses 에 course 1개만 join.';

create index if not exists enrollments_student_idx    on public.enrollments (student_id);
create index if not exists enrollments_applicant_idx  on public.enrollments (applicant_id);
create index if not exists enrollments_cohort_idx     on public.enrollments (cohort_id);
create index if not exists enrollments_bundle_idx     on public.enrollments (bundle_id);
create index if not exists enrollments_status_idx     on public.enrollments (status);

drop trigger if exists enrollments_set_updated_at on public.enrollments;
create trigger enrollments_set_updated_at
  before update on public.enrollments
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. enrollment_courses (M:N)
-- ----------------------------------------------------------------------------
-- enrollment 에 포함된 course. 단과 결제면 1개, 번들 결제면 bundle_courses unpack.
-- ON DELETE RESTRICT for course_id — course 삭제 전에 join 먼저 제거해야 함 (감사 추적).

create table if not exists public.enrollment_courses (
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete restrict,
  completed_at  timestamptz,

  primary key (enrollment_id, course_id)
);

comment on table public.enrollment_courses is
  'B0068 ADR 0013 결제된 course. bundle 결제면 bundle_courses 를 여기로 unpack. completed_at 은 학생별 수료 시각.';

create index if not exists enrollment_courses_course_idx
  on public.enrollment_courses (course_id);

-- ============================================================================
-- 6. applicants 확장 (enrollment_id + bundle_id)
-- ----------------------------------------------------------------------------
-- applicant 가 어떤 결제 (enrollment) / 번들 을 신청했는지 링크. 둘 다 nullable.
-- 기존 신청자 (1기) 는 NULL 유지 → 회귀 X.

alter table public.applicants
  add column if not exists enrollment_id uuid references public.enrollments(id) on delete set null,
  add column if not exists bundle_id     uuid references public.bundles(id)     on delete set null;

comment on column public.applicants.enrollment_id is
  'B0068 신청과 연결된 결제 (enrollment). NULL = 기존 1기 방식 (cohort 로만 매칭).';
comment on column public.applicants.bundle_id is
  'B0068 신청 시점의 번들 선택. 단과 신청은 NULL — enrollments.bundle_id 로 결정됨.';

create index if not exists applicants_enrollment_idx
  on public.applicants (enrollment_id)
  where enrollment_id is not null;
create index if not exists applicants_bundle_idx
  on public.applicants (bundle_id)
  where bundle_id is not null;

-- ============================================================================
-- 7. cohorts 확장 (course_id)
-- ----------------------------------------------------------------------------
-- 어떤 course 에 해당하는 cohort 인가. 1기 backfill 은 fan-to-pro-1 course 로 매핑.

alter table public.cohorts
  add column if not exists course_id uuid references public.courses(id) on delete set null;

comment on column public.cohorts.course_id is
  'B0068 ADR 0013 cohort 가 진행하는 course. NULL = 레거시 (course 개념 도입 전 cohort).';

create index if not exists cohorts_course_idx
  on public.cohorts (course_id)
  where course_id is not null;

-- ============================================================================
-- 8. instructors.course_ids
-- ----------------------------------------------------------------------------
-- 강사가 담당 가능한 course 목록. 여러 course 동시 강의 가능 (array).
-- FK 아님 — 배열 원소는 courses.id 여야 함 (어드민 UI 에서 검증).

alter table public.instructors
  add column if not exists course_ids uuid[];

comment on column public.instructors.course_ids is
  'B0068 ADR 0013 강사가 담당 가능한 course.id 배열. NULL = 미지정. 관계 무결성은 어드민 UI 책임.';

-- ============================================================================
-- 9. Fan to Pro 1기 backfill — course + cohort 매핑
-- ----------------------------------------------------------------------------
-- 1기 = fan-to-pro-1 이라는 course 로 seed. status='archived' (이미 마감).
-- 노아 확인 필요: 실제 1기 cohort slug 를 아래 UPDATE 에 넣을지 여부.
-- 지금은 program 안 모든 legacy cohort 를 fan-to-pro-1 로 매핑 (course_id IS NULL 인 것만).

insert into public.courses (program_id, slug, title_ko, title_en, description, order_idx, status, price_krw, session_count)
select
  p.id,
  'fan-to-pro-1',
  'K-pop 공연 실무 4주',
  'K-Pop Live Production 4 Weeks',
  '1기 K-pop 공연 실무 4주 과정. 총 8회 16시간 (토요일과 일요일 각 2시간).',
  1,
  'archived',
  800000,
  8
from public.programs p
where p.slug = 'fan-to-pro'
on conflict (program_id, slug) do nothing;

update public.cohorts c
   set course_id = (
     select co.id
       from public.courses co
       join public.programs p on p.id = co.program_id
      where co.slug = 'fan-to-pro-1'
        and p.slug = 'fan-to-pro'
      limit 1
   )
 where c.course_id is null
   and c.program_id = (select id from public.programs where slug = 'fan-to-pro' limit 1);

-- ============================================================================
-- 10. RLS + 권한
-- ============================================================================

alter table public.courses            enable row level security;
alter table public.bundles            enable row level security;
alter table public.bundle_courses     enable row level security;
alter table public.enrollments        enable row level security;
alter table public.enrollment_courses enable row level security;

revoke all on public.courses            from anon, authenticated;
revoke all on public.bundles            from anon, authenticated;
revoke all on public.bundle_courses     from anon, authenticated;
revoke all on public.enrollments        from anon, authenticated;
revoke all on public.enrollment_courses from anon, authenticated;

grant all on public.courses            to service_role;
grant all on public.bundles            to service_role;
grant all on public.bundle_courses     to service_role;
grant all on public.enrollments        to service_role;
grant all on public.enrollment_courses to service_role;

-- courses / bundles / bundle_courses: 판매 페이지 노출 위해 anon read (open/archived 만).
grant select on public.courses        to anon, authenticated;
grant select on public.bundles        to anon, authenticated;
grant select on public.bundle_courses to anon, authenticated;

-- courses policies
drop policy if exists service_role_all on public.courses;
create policy service_role_all on public.courses
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists public_read_open_or_archived on public.courses;
create policy public_read_open_or_archived on public.courses
  for select
  using (status in ('open','archived'));

-- bundles policies
drop policy if exists service_role_all on public.bundles;
create policy service_role_all on public.bundles
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists public_read_open_or_archived on public.bundles;
create policy public_read_open_or_archived on public.bundles
  for select
  using (status in ('open','archived'));

-- bundle_courses policies — bundle status 를 따라 노출 (open/archived 인 bundle 의 course 만).
drop policy if exists service_role_all on public.bundle_courses;
create policy service_role_all on public.bundle_courses
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists public_read_via_bundle on public.bundle_courses;
create policy public_read_via_bundle on public.bundle_courses
  for select
  using (
    exists (
      select 1 from public.bundles b
       where b.id = bundle_courses.bundle_id
         and b.status in ('open','archived')
    )
    and exists (
      select 1 from public.courses c
       where c.id = bundle_courses.course_id
         and c.status in ('open','archived')
    )
  );

-- enrollments: service_role 전체 + student self read (본인 승격된 student row 만).
-- applicant 단계 결제는 service_role 만 (신청자에게는 안 보임).
drop policy if exists service_role_all on public.enrollments;
create policy service_role_all on public.enrollments
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists student_self_read on public.enrollments;
create policy student_self_read on public.enrollments
  for select
  to authenticated
  using (
    student_id is not null
    and exists (
      select 1
        from public.students s
        join public.cohort_memberships cm
          on cm.cohort_id = s.cohort_id
         and cm.role = 'student'
       where s.id = enrollments.student_id
         and cm.user_id = auth.uid()
    )
  );

-- enrollment_courses: enrollments 정책을 따라감.
drop policy if exists service_role_all on public.enrollment_courses;
create policy service_role_all on public.enrollment_courses
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists student_self_read on public.enrollment_courses;
create policy student_self_read on public.enrollment_courses
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.enrollments e
        join public.students s on s.id = e.student_id
        join public.cohort_memberships cm
          on cm.cohort_id = s.cohort_id
         and cm.role = 'student'
       where e.id = enrollment_courses.enrollment_id
         and cm.user_id = auth.uid()
    )
  );
