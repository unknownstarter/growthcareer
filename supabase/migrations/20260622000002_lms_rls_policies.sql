-- B0032 LMS Wave 1 Step 2 — RLS 정책 보강 (ADR 0008 §7).
--
-- 모든 LMS entity (cohort_id 보유) 에 role 기반 정책 추가:
--   - super_admin (user_profiles.is_super_admin=true) : 전체 access
--   - admin (program_memberships role='admin')         : 해당 program 의 cohort 만
--   - instructor (cohort_memberships role='instructor'): 해당 cohort 만
--   - student (cohort_memberships role='student')      : 본인 row 만
--
-- service_role 은 RLS bypass — server action 에서 사용.
--
-- 본 정책은 *방어선 2차* (server action 의 assertSuperAdmin/assertCohortRole 가 1차).
-- 직접 supabase client (authenticated user) 가 raw SQL 던져도 RLS 가 차단.
--
-- ON 정책 대상 (cohort_id 보유 entity):
--   - cohorts                  : program_id 기준
--   - sessions                 : cohort_id 기준
--   - students                 : cohort_id 기준
--   - attendance               : student.cohort_id 기준 (조인)
--   - materials                : cohort_id 기준
--   - announcements            : cohort_id 기준
--   - assignments              : cohort_id 기준
--   - submissions              : student.cohort_id 기준 (조인)
--   - feedback                 : submission.student.cohort_id 기준 (조인)
--   - consultations            : student.cohort_id 기준 (조인)
--   - consultation_reviews     : consultation.student.cohort_id 기준 (조인)
--   - certificates             : student.cohort_id 기준 (조인)
--   - events                   : cohort_id 기준 (null cohort_id = 전체)
--   - companies                : super_admin / program admin 만 (cohort 무관)
--   - instructors              : super_admin / program admin 만 (cohort 무관)
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (수동, 정책 단위):
--   drop policy if exists lms_super_admin_all on public.cohorts;
--   drop policy if exists lms_admin_program on public.cohorts;
--   drop policy if exists lms_member_cohort on public.cohorts;
--   ... (entity 별 반복)

-- 0. helper view -----------------------------------------------------------
-- RLS 정책 안에서 반복되는 sub-select 를 stable view 로. (선택 — RLS 정책 안에
-- 직접 sub-select 넣어도 동작하지만 가독성과 plan 안정성을 위해.)
-- 단 view 는 RLS bypass 안 되므로 user_profiles / cohort_memberships /
-- program_memberships 모두 self_read 정책으로 본인 row read 가능해야 함.

-- 1. cohorts ---------------------------------------------------------------
-- super_admin: 전체.
-- program admin: 해당 program 의 cohort.
-- cohort member (instructor/student): 해당 cohort.

grant select on public.cohorts to authenticated;

drop policy if exists lms_super_admin_all on public.cohorts;
create policy lms_super_admin_all on public.cohorts
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

drop policy if exists lms_admin_program on public.cohorts;
create policy lms_admin_program on public.cohorts
  for select
  using (
    exists (
      select 1 from public.program_memberships pm
       where pm.user_id = auth.uid()
         and pm.program_id = cohorts.program_id
         and pm.role = 'admin'
    )
  );

drop policy if exists lms_member_cohort on public.cohorts;
create policy lms_member_cohort on public.cohorts
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = cohorts.id
    )
  );

-- 2. sessions --------------------------------------------------------------

grant select on public.sessions to authenticated;

drop policy if exists lms_super_admin_all on public.sessions;
create policy lms_super_admin_all on public.sessions
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

drop policy if exists lms_admin_program on public.sessions;
create policy lms_admin_program on public.sessions
  for select
  using (
    exists (
      select 1 from public.program_memberships pm
       join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = sessions.cohort_id
    )
  );

drop policy if exists lms_member_cohort on public.sessions;
create policy lms_member_cohort on public.sessions
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = sessions.cohort_id
    )
  );

-- 3. students --------------------------------------------------------------

grant select on public.students to authenticated;

drop policy if exists lms_super_admin_all on public.students;
create policy lms_super_admin_all on public.students
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

drop policy if exists lms_admin_program on public.students;
create policy lms_admin_program on public.students
  for select
  using (
    exists (
      select 1 from public.program_memberships pm
       join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = students.cohort_id
    )
  );

-- instructor: 본인 cohort 의 학생 read.
drop policy if exists lms_instructor_cohort on public.students;
create policy lms_instructor_cohort on public.students
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid()
         and cm.cohort_id = students.cohort_id
         and cm.role = 'instructor'
    )
  );

-- student: 본인 row 만 (user_profiles.student_id 로 lineage).
drop policy if exists lms_self_student on public.students;
create policy lms_self_student on public.students
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.student_id = students.id
    )
  );

-- 4. attendance ------------------------------------------------------------

grant select on public.attendance to authenticated;

drop policy if exists lms_super_admin_all on public.attendance;
create policy lms_super_admin_all on public.attendance
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

drop policy if exists lms_instructor_cohort on public.attendance;
create policy lms_instructor_cohort on public.attendance
  for select
  using (
    exists (
      select 1 from public.students s
       join public.cohort_memberships cm
         on cm.cohort_id = s.cohort_id and cm.user_id = auth.uid()
        and cm.role = 'instructor'
       where s.id = attendance.student_id
    )
  );

drop policy if exists lms_self_student on public.attendance;
create policy lms_self_student on public.attendance
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.student_id = attendance.student_id
    )
  );


-- ---------------------------------------------------------------------------
-- Wave 2 entity (materials / announcements / assignments / submissions /
-- feedback / consultations / consultation_reviews / certificates / events)
-- 의 RLS 정책은 해당 entity 마이그레이션과 같이 박는다 (B0033 Wave 2).
-- ---------------------------------------------------------------------------
