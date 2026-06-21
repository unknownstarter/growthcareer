-- B0033 LMS Wave 2 — entities (materials, announcements, assignments,
-- submissions, feedback, consultations, consultation_reviews, certificates,
-- events).
--
-- 본 마이그레이션은 ADR 0005 §6 invariant 표를 반영. 모든 테이블 RLS enable +
-- service_role 만 권한 (본격 RLS 정책은 Wave 4 / B0035 에서 instructor / student
-- 본인 스코프 정책 추가).
--
-- ON DELETE 정책 원칙:
--   - cohort → 자식 테이블 : CASCADE (cohort 통째 삭제 시 자료/공지/과제/이벤트도)
--   - instructor → 자료/피드백 : SET NULL (강사 변경 가능, lineage 유지)
--   - student → submissions/consultations/certificates : CASCADE (학생 자퇴 시 깨끗)
--   - assignment → submissions : CASCADE
--   - submission → feedback : CASCADE
--   - consultation → reviews : CASCADE
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL editor 에 본 파일 전체 붙여넣기.

-- 1. materials -------------------------------------------------------------
-- 강의 자료. cohort 단위 + session 단위 (optional) 둘 다 지원.
-- Supabase Storage bucket 'lms-materials' 의 path 를 file_path 에 저장.

create table if not exists public.materials (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_id      uuid references public.sessions(id) on delete set null,
  uploaded_by     uuid references public.instructors(id) on delete set null,

  title           text not null check (char_length(trim(title)) >= 1),
  description     text,
  file_path       text not null check (char_length(trim(file_path)) >= 1),
  file_size_bytes integer,
  mime_type       text,

  status          text not null default 'draft'
                    check (status in ('draft','published','archived')),
  published_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.materials is
  'B0033 강의 자료. status=published 인 row 만 학생에게 visible.';
comment on column public.materials.file_path is
  'Supabase Storage bucket lms-materials 의 path. signed URL 로 다운로드.';

drop trigger if exists materials_set_updated_at on public.materials;
create trigger materials_set_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create index if not exists materials_cohort_idx on public.materials (cohort_id);
create index if not exists materials_session_idx on public.materials (session_id);
create index if not exists materials_status_idx on public.materials (status);

-- 2. announcements ---------------------------------------------------------
-- 공지. cohort 전체 발송. student 타깃은 Wave 4 (B0035) 에 added.

create table if not exists public.announcements (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  created_by      uuid,  -- user_profiles.id (super_admin or instructor)

  title           text not null check (char_length(trim(title)) >= 1),
  body            text not null check (char_length(trim(body)) >= 1),
  pinned          boolean not null default false,
  status          text not null default 'draft'
                    check (status in ('draft','published','archived')),
  published_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.announcements is
  'B0033 공지. cohort 단위 발송. pinned=true 면 학생 dashboard 최상단.';

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create index if not exists announcements_cohort_idx on public.announcements (cohort_id);

-- 3. assignments -----------------------------------------------------------
-- 과제. cohort 단위 또는 session 단위.

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_id      uuid references public.sessions(id) on delete set null,
  created_by      uuid,

  title           text not null check (char_length(trim(title)) >= 1),
  description     text not null,
  due_at          timestamptz not null,

  status          text not null default 'open'
                    check (status in ('open','closed','archived')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  check (due_at > created_at)
);

comment on table public.assignments is
  'B0033 과제. due_at 후엔 closed (선택적 자동 마감).';

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

create index if not exists assignments_cohort_idx on public.assignments (cohort_id);

-- 4. submissions -----------------------------------------------------------
-- 과제 제출. (student_id, assignment_id, version) UNIQUE — 재제출 시 version 단조 증가.

create table if not exists public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  version         smallint not null default 1 check (version >= 1),

  file_path       text,                             -- Supabase Storage path (nullable for text-only)
  file_size_bytes integer,
  mime_type       text,
  body            text,                             -- 텍스트 제출 (file_path 또는 body 둘 중 하나 필수)

  status          text not null default 'submitted'
                    check (status in ('draft','submitted','reviewed')),
  submitted_at    timestamptz not null default now(),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  unique (assignment_id, student_id, version),
  check (file_path is not null or body is not null)
);

comment on table public.submissions is
  'B0033 과제 제출. version 으로 재제출 추적. file_path 또는 body 중 하나 필수.';

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
  before update on public.submissions
  for each row execute function public.set_updated_at();

create index if not exists submissions_assignment_idx on public.submissions (assignment_id);
create index if not exists submissions_student_idx on public.submissions (student_id);

-- 5. feedback --------------------------------------------------------------
-- 강사 → 학생 제출물 review.

create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  submission_id   uuid not null references public.submissions(id) on delete cascade,
  instructor_id   uuid references public.instructors(id) on delete set null,

  body            text not null check (char_length(trim(body)) >= 1),
  score           smallint check (score is null or (score >= 0 and score <= 100)),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.feedback is
  'B0033 강사 피드백. score nullable — 정성 피드백 only 가능.';

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute function public.set_updated_at();

create index if not exists feedback_submission_idx on public.feedback (submission_id);

-- 6. consultations ---------------------------------------------------------
-- 학생이 이력서/자소서/포폴 업로드 → 강사 review 받음.

create table if not exists public.consultations (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  kind            text not null check (kind in ('resume','cover_letter','portfolio')),
  version         smallint not null default 1 check (version >= 1),

  file_path       text,                             -- Storage path
  body            text,                             -- 직접 입력 텍스트

  status          text not null default 'drafted'
                    check (status in ('drafted','submitted','reviewed','closed')),
  submitted_at    timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  unique (student_id, kind, version),
  check (file_path is not null or body is not null)
);

comment on table public.consultations is
  'B0033 컨설팅 자료. kind=resume/cover_letter/portfolio. version 단조 증가.';

drop trigger if exists consultations_set_updated_at on public.consultations;
create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

create index if not exists consultations_student_idx on public.consultations (student_id);
create index if not exists consultations_status_idx on public.consultations (status);

-- 7. consultation_reviews --------------------------------------------------
-- 강사 → 컨설팅 review.

create table if not exists public.consultation_reviews (
  id                uuid primary key default gen_random_uuid(),
  consultation_id   uuid not null references public.consultations(id) on delete cascade,
  instructor_id     uuid references public.instructors(id) on delete set null,

  body              text not null check (char_length(trim(body)) >= 1),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz
);

comment on table public.consultation_reviews is
  'B0033 컨설팅 review. 노아 결정 보류: 모든 강사 풀 vs 배정 강사만.';

drop trigger if exists consultation_reviews_set_updated_at on public.consultation_reviews;
create trigger consultation_reviews_set_updated_at
  before update on public.consultation_reviews
  for each row execute function public.set_updated_at();

create index if not exists consultation_reviews_consultation_idx
  on public.consultation_reviews (consultation_id);

-- 8. certificates ----------------------------------------------------------
-- 수료증 + 공연 참여 확인서. (student_id, kind) UNIQUE.

create table if not exists public.certificates (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete restrict,
  kind            text not null check (kind in ('completion','performance')),

  serial_no       text not null unique,             -- 수료증 고유 번호 (운영자 발급)
  issued_at       timestamptz not null default now(),
  issued_by       uuid,                             -- user_profiles.id (super_admin)
  file_path       text,                             -- 생성된 PDF Storage path

  attendance_rate numeric(5,2) check (attendance_rate is null or (attendance_rate >= 0 and attendance_rate <= 100)),
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  unique (student_id, kind)
);

comment on table public.certificates is
  'B0033 수료증. kind=completion (Dropdown 발급) / performance (Union Pictures 발급).';

drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

create index if not exists certificates_student_idx on public.certificates (student_id);

-- 9. events ----------------------------------------------------------------
-- 캘린더 이벤트 (수료식 / 보강 / 행사 등). cohort 단위 또는 전체.

create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid references public.cohorts(id) on delete cascade,

  title           text not null check (char_length(trim(title)) >= 1),
  description     text,
  location        text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,

  status          text not null default 'scheduled'
                    check (status in ('scheduled','completed','cancelled')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  check (starts_at < ends_at)
);

comment on table public.events is
  'B0033 캘린더 이벤트. cohort 단위 (cohort_id 채움) 또는 전체 (cohort_id null).';

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create index if not exists events_cohort_starts_idx on public.events (cohort_id, starts_at);

-- 10. RLS + 권한 -----------------------------------------------------------
-- Wave 2 = service_role only. instructor/student 본인 스코프 정책은 Wave 4.

alter table public.materials               enable row level security;
alter table public.announcements           enable row level security;
alter table public.assignments             enable row level security;
alter table public.submissions             enable row level security;
alter table public.feedback                enable row level security;
alter table public.consultations           enable row level security;
alter table public.consultation_reviews    enable row level security;
alter table public.certificates            enable row level security;
alter table public.events                  enable row level security;

revoke all on public.materials               from anon, authenticated;
revoke all on public.announcements           from anon, authenticated;
revoke all on public.assignments             from anon, authenticated;
revoke all on public.submissions             from anon, authenticated;
revoke all on public.feedback                from anon, authenticated;
revoke all on public.consultations           from anon, authenticated;
revoke all on public.consultation_reviews    from anon, authenticated;
revoke all on public.certificates            from anon, authenticated;
revoke all on public.events                  from anon, authenticated;

grant all on public.materials                to service_role;
grant all on public.announcements            to service_role;
grant all on public.assignments              to service_role;
grant all on public.submissions              to service_role;
grant all on public.feedback                 to service_role;
grant all on public.consultations            to service_role;
grant all on public.consultation_reviews     to service_role;
grant all on public.certificates             to service_role;
grant all on public.events                   to service_role;
