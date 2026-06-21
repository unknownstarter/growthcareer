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

-- 5. materials -------------------------------------------------------------
-- 학생/강사 read 는 published 만. draft 는 super_admin / program admin 만.

grant select on public.materials to authenticated;

drop policy if exists lms_super_admin_all on public.materials;
create policy lms_super_admin_all on public.materials
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

drop policy if exists lms_member_published on public.materials;
create policy lms_member_published on public.materials
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = materials.cohort_id
    )
  );

-- 6. announcements ---------------------------------------------------------

grant select on public.announcements to authenticated;

drop policy if exists lms_super_admin_all on public.announcements;
create policy lms_super_admin_all on public.announcements
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

drop policy if exists lms_member_published on public.announcements;
create policy lms_member_published on public.announcements
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = announcements.cohort_id
    )
  );

-- 7. assignments -----------------------------------------------------------

grant select on public.assignments to authenticated;

drop policy if exists lms_super_admin_all on public.assignments;
create policy lms_super_admin_all on public.assignments
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

drop policy if exists lms_member_cohort on public.assignments;
create policy lms_member_cohort on public.assignments
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = assignments.cohort_id
    )
  );

-- 8. submissions -----------------------------------------------------------

grant select on public.submissions to authenticated;

drop policy if exists lms_super_admin_all on public.submissions;
create policy lms_super_admin_all on public.submissions
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

drop policy if exists lms_instructor_cohort on public.submissions;
create policy lms_instructor_cohort on public.submissions
  for select
  using (
    exists (
      select 1 from public.students s
       join public.cohort_memberships cm
         on cm.cohort_id = s.cohort_id and cm.user_id = auth.uid()
        and cm.role = 'instructor'
       where s.id = submissions.student_id
    )
  );

drop policy if exists lms_self_student on public.submissions;
create policy lms_self_student on public.submissions
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.student_id = submissions.student_id
    )
  );

-- 9. feedback --------------------------------------------------------------

grant select on public.feedback to authenticated;

drop policy if exists lms_super_admin_all on public.feedback;
create policy lms_super_admin_all on public.feedback
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

drop policy if exists lms_instructor_cohort on public.feedback;
create policy lms_instructor_cohort on public.feedback
  for select
  using (
    exists (
      select 1 from public.submissions sub
       join public.students s on s.id = sub.student_id
       join public.cohort_memberships cm
         on cm.cohort_id = s.cohort_id and cm.user_id = auth.uid()
        and cm.role = 'instructor'
       where sub.id = feedback.submission_id
    )
  );

drop policy if exists lms_self_student on public.feedback;
create policy lms_self_student on public.feedback
  for select
  using (
    exists (
      select 1 from public.submissions sub
       join public.user_profiles up
         on up.id = auth.uid() and up.student_id = sub.student_id
       where sub.id = feedback.submission_id
    )
  );

-- 10. consultations --------------------------------------------------------

grant select on public.consultations to authenticated;

drop policy if exists lms_super_admin_all on public.consultations;
create policy lms_super_admin_all on public.consultations
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

drop policy if exists lms_instructor_cohort on public.consultations;
create policy lms_instructor_cohort on public.consultations
  for select
  using (
    exists (
      select 1 from public.students s
       join public.cohort_memberships cm
         on cm.cohort_id = s.cohort_id and cm.user_id = auth.uid()
        and cm.role = 'instructor'
       where s.id = consultations.student_id
    )
  );

drop policy if exists lms_self_student on public.consultations;
create policy lms_self_student on public.consultations
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.student_id = consultations.student_id
    )
  );

-- 11. consultation_reviews -------------------------------------------------

grant select on public.consultation_reviews to authenticated;

drop policy if exists lms_super_admin_all on public.consultation_reviews;
create policy lms_super_admin_all on public.consultation_reviews
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

drop policy if exists lms_instructor_cohort on public.consultation_reviews;
create policy lms_instructor_cohort on public.consultation_reviews
  for select
  using (
    exists (
      select 1 from public.consultations con
       join public.students s on s.id = con.student_id
       join public.cohort_memberships cm
         on cm.cohort_id = s.cohort_id and cm.user_id = auth.uid()
        and cm.role = 'instructor'
       where con.id = consultation_reviews.consultation_id
    )
  );

drop policy if exists lms_self_student on public.consultation_reviews;
create policy lms_self_student on public.consultation_reviews
  for select
  using (
    exists (
      select 1 from public.consultations con
       join public.user_profiles up
         on up.id = auth.uid() and up.student_id = con.student_id
       where con.id = consultation_reviews.consultation_id
    )
  );

-- 12. certificates ---------------------------------------------------------

grant select on public.certificates to authenticated;

drop policy if exists lms_super_admin_all on public.certificates;
create policy lms_super_admin_all on public.certificates
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

drop policy if exists lms_self_student on public.certificates;
create policy lms_self_student on public.certificates
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.student_id = certificates.student_id
    )
  );

-- 13. events ---------------------------------------------------------------
-- cohort_id null = 전체 사용자 visible.

grant select on public.events to authenticated;

drop policy if exists lms_super_admin_all on public.events;
create policy lms_super_admin_all on public.events
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

drop policy if exists lms_member_cohort on public.events;
create policy lms_member_cohort on public.events
  for select
  using (
    events.cohort_id is null
    or exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid() and cm.cohort_id = events.cohort_id
    )
  );

-- 14. companies / instructors ---------------------------------------------
-- 운영자 전용. instructor 본인 회사 / 자기 정보 read 는 별도 self 정책.

grant select on public.companies to authenticated;
grant select on public.instructors to authenticated;

drop policy if exists lms_super_admin_all on public.companies;
create policy lms_super_admin_all on public.companies
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

drop policy if exists lms_self_company on public.companies;
create policy lms_self_company on public.companies
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.company_id = companies.id
    )
  );

drop policy if exists lms_super_admin_all on public.instructors;
create policy lms_super_admin_all on public.instructors
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

drop policy if exists lms_self_instructor on public.instructors;
create policy lms_self_instructor on public.instructors
  for select
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.instructor_id = instructors.id
    )
  );
