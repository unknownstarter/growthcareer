-- B0044 LMS Launch Phase 1 — student career profile (3 테이블).
--
-- ADR 0011 §3 + Echo C 결정: 3 테이블 구성.
--   1) student_profile          — 학생 PII (단일 row per student)
--   2) student_career_target    — 희망 진로 (단일 row per student)
--   3) student_resume_item      — 학력 / 경력 / 자격증 / 수상 / 어학 / 프로젝트 (polymorphic 다중 row)
--
-- 권한 모델 (RLS, ADR 0011 §5.6.6):
--   - service_role : 전체 (server action 정상 경로)
--   - super_admin  : 전체
--   - program admin: 본인 program 의 student
--   - instructor   : 본인 cohort 학생 SELECT 만
--   - student-self : 본인 row RW
--
-- 1차 가드 = server action assertCanWriteStudentProfile / assertCanReadStudentProfile.
-- RLS 는 2차 방어선.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor.
--
-- 롤백 (수동):
--   drop table if exists public.student_resume_item cascade;
--   drop table if exists public.student_career_target cascade;
--   drop table if exists public.student_profile cascade;

-- 1. student_profile ------------------------------------------------------

create table if not exists public.student_profile (
  student_id  uuid primary key references public.students(id) on delete cascade,

  name_ko     text check (name_ko is null or char_length(trim(name_ko)) between 1 and 100),
  name_en     text check (name_en is null or char_length(trim(name_en)) between 1 and 100),
  phone       text check (phone is null or char_length(trim(phone)) between 4 and 30),
  birth_year  int  check (birth_year is null or (birth_year between 1940 and 2020)),
  gender      text check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  visa_type   text check (visa_type is null or char_length(trim(visa_type)) between 1 and 30),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

comment on table public.student_profile is
  'B0044 학생 기본 PII. 본인 입력 + 운영자 / 강사 read. 단일 row per student.';

drop trigger if exists student_profile_set_updated_at on public.student_profile;
create trigger student_profile_set_updated_at
  before update on public.student_profile
  for each row execute function public.set_updated_at();

-- 2. student_career_target ------------------------------------------------

create table if not exists public.student_career_target (
  student_id            uuid primary key references public.students(id) on delete cascade,

  target_role_category  text check (target_role_category is null or target_role_category in (
    'concert_pd', 'a_n_r', 'mgmt', 'marketing', 'video', 'sound',
    'visual_director', 'stage_manager', 'music_business', 'other'
  )),
  target_companies      text[] not null default '{}',
  desired_start_date    date,
  self_pitch            text check (self_pitch is null or char_length(self_pitch) <= 300),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

comment on table public.student_career_target is
  'B0044 학생 희망 진로. 단일 row per student.';

drop trigger if exists student_career_target_set_updated_at on public.student_career_target;
create trigger student_career_target_set_updated_at
  before update on public.student_career_target
  for each row execute function public.set_updated_at();

-- 3. student_resume_item --------------------------------------------------

create table if not exists public.student_resume_item (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(id) on delete cascade,

  type            text not null check (type in (
    'education', 'experience', 'certification', 'award', 'language', 'project'
  )),
  title           text not null check (char_length(trim(title)) between 1 and 200),
  organization    text check (organization is null or char_length(trim(organization)) between 1 and 200),
  start_date      date,
  end_date        date,
  description     text check (description is null or char_length(description) <= 1000),
  credential_url  text check (credential_url is null or credential_url ~ '^https?://'),
  order_index     int not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  constraint resume_item_date_order check (
    start_date is null or end_date is null or start_date <= end_date
  )
);

comment on table public.student_resume_item is
  'B0044 학생 이력 polymorphic — education / experience / certification / award / language / project. 다중 row per student.';

create index if not exists student_resume_item_student_idx
  on public.student_resume_item(student_id, type, order_index);

drop trigger if exists student_resume_item_set_updated_at on public.student_resume_item;
create trigger student_resume_item_set_updated_at
  before update on public.student_resume_item
  for each row execute function public.set_updated_at();

-- 4. RLS — 3 테이블 동일 패턴 -------------------------------------------

-- student_profile
alter table public.student_profile enable row level security;
revoke all on public.student_profile from anon, authenticated;
grant all on public.student_profile to service_role;
grant select, insert, update, delete on public.student_profile to authenticated;

drop policy if exists service_role_all on public.student_profile;
create policy service_role_all on public.student_profile
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists sp_super_admin_all on public.student_profile;
create policy sp_super_admin_all on public.student_profile
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  );

drop policy if exists sp_program_admin_all on public.student_profile;
create policy sp_program_admin_all on public.student_profile
  for all
  using (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_profile.student_id
    )
  )
  with check (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_profile.student_id
    )
  );

drop policy if exists sp_instructor_read on public.student_profile;
create policy sp_instructor_read on public.student_profile
  for select
  using (
    exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_profile.student_id
    )
  );

drop policy if exists sp_student_self on public.student_profile;
create policy sp_student_self on public.student_profile
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_profile.student_id
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_profile.student_id
    )
  );

-- student_career_target
alter table public.student_career_target enable row level security;
revoke all on public.student_career_target from anon, authenticated;
grant all on public.student_career_target to service_role;
grant select, insert, update, delete on public.student_career_target to authenticated;

drop policy if exists service_role_all on public.student_career_target;
create policy service_role_all on public.student_career_target
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists sct_super_admin_all on public.student_career_target;
create policy sct_super_admin_all on public.student_career_target
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  );

drop policy if exists sct_program_admin_all on public.student_career_target;
create policy sct_program_admin_all on public.student_career_target
  for all
  using (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_career_target.student_id
    )
  )
  with check (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_career_target.student_id
    )
  );

drop policy if exists sct_instructor_read on public.student_career_target;
create policy sct_instructor_read on public.student_career_target
  for select
  using (
    exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_career_target.student_id
    )
  );

drop policy if exists sct_student_self on public.student_career_target;
create policy sct_student_self on public.student_career_target
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_career_target.student_id
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_career_target.student_id
    )
  );

-- student_resume_item
alter table public.student_resume_item enable row level security;
revoke all on public.student_resume_item from anon, authenticated;
grant all on public.student_resume_item to service_role;
grant select, insert, update, delete on public.student_resume_item to authenticated;

drop policy if exists service_role_all on public.student_resume_item;
create policy service_role_all on public.student_resume_item
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists sri_super_admin_all on public.student_resume_item;
create policy sri_super_admin_all on public.student_resume_item
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  );

drop policy if exists sri_program_admin_all on public.student_resume_item;
create policy sri_program_admin_all on public.student_resume_item
  for all
  using (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_resume_item.student_id
    )
  )
  with check (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_resume_item.student_id
    )
  );

drop policy if exists sri_instructor_read on public.student_resume_item;
create policy sri_instructor_read on public.student_resume_item
  for select
  using (
    exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_resume_item.student_id
    )
  );

drop policy if exists sri_student_self on public.student_resume_item;
create policy sri_student_self on public.student_resume_item
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_resume_item.student_id
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_resume_item.student_id
    )
  );
