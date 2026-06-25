-- B0044 LMS Launch Phase 1 — student_notes (운영 코멘트).
--
-- ADR 0011 §5.5. 운영자 / 강사가 학생 관리용 메모 작성.
-- 학생 본인은 안 봄 (private operational note — feedback 첨삭 entity 와 분리).
--
-- 권한 모델 (RLS):
--   - service_role : 전체
--   - super_admin  : 전체
--   - program admin: 본인 program 의 student 의 notes 전체
--   - instructor   : 본인 cohort 학생 notes SELECT + 본인 작성 row UPDATE/DELETE
--   - student      : read X / write X (학생 본인은 안 봄)
--
-- 1차 가드 = server action assertCanWriteStudentNote / assertCanReadStudentNote.
-- 학생 접근 명시적 차단 (RLS 정책 부재 = 차단).
--
-- 1기 운영: 강사 access 1기 NO → 강사 코멘트는 운영자가 카톡 받아서 대신 입력.
--   author_role = 'admin', body 안에 "[강사 X 의견] ..." prefix.
-- 2기+: 강사 self-input 활성화 (author_role = 'instructor').

-- 1. student_notes ---------------------------------------------------------

create table if not exists public.student_notes (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.students(id) on delete cascade,

  author_id    uuid not null references auth.users(id),
  author_role  text not null check (author_role in ('super_admin', 'admin', 'instructor')),

  body         text not null check (char_length(trim(body)) between 1 and 2000),
  is_pinned    boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz
);

comment on table public.student_notes is
  'B0044 운영 코멘트. 학생 본인 안 봄 (private). super_admin / program admin / cohort instructor 만 read+write.';
comment on column public.student_notes.author_role is
  '작성 시점 role snapshot. user_profiles.role 가 추후 바뀌어도 audit 보존.';
comment on column public.student_notes.is_pinned is
  '상단 고정 (중요 메모). 학생 detail 페이지 timeline 위 pinned 섹션.';

create index if not exists student_notes_student_idx
  on public.student_notes(student_id, created_at desc);
create index if not exists student_notes_pinned_idx
  on public.student_notes(student_id) where is_pinned = true;

drop trigger if exists student_notes_set_updated_at on public.student_notes;
create trigger student_notes_set_updated_at
  before update on public.student_notes
  for each row execute function public.set_updated_at();

-- 2. RLS -----------------------------------------------------------------
-- 학생 본인 정책 없음 = 학생 접근 차단.

alter table public.student_notes enable row level security;

revoke all on public.student_notes from anon, authenticated;

grant all on public.student_notes to service_role;
grant select, insert, update, delete on public.student_notes to authenticated;

drop policy if exists service_role_all on public.student_notes;
create policy service_role_all on public.student_notes
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists sn_super_admin_all on public.student_notes;
create policy sn_super_admin_all on public.student_notes
  for all
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  )
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_super_admin = true)
  );

drop policy if exists sn_program_admin_all on public.student_notes;
create policy sn_program_admin_all on public.student_notes
  for all
  using (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm on pm.program_id = c.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and s.id = student_notes.student_id
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
         and s.id = student_notes.student_id
    )
  );

-- instructor : SELECT 본인 cohort 학생 notes 전체.
drop policy if exists sn_instructor_read on public.student_notes;
create policy sn_instructor_read on public.student_notes
  for select
  using (
    exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_notes.student_id
    )
  );

-- instructor : INSERT (본인이 author).
drop policy if exists sn_instructor_insert on public.student_notes;
create policy sn_instructor_insert on public.student_notes
  for insert
  with check (
    author_id = auth.uid()
    and author_role = 'instructor'
    and exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_notes.student_id
    )
  );

-- instructor : UPDATE / DELETE 본인 author row 만.
drop policy if exists sn_instructor_update_own on public.student_notes;
create policy sn_instructor_update_own on public.student_notes
  for update
  using (
    author_id = auth.uid()
    and exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_notes.student_id
    )
  )
  with check (
    author_id = auth.uid()
  );

drop policy if exists sn_instructor_delete_own on public.student_notes;
create policy sn_instructor_delete_own on public.student_notes
  for delete
  using (
    author_id = auth.uid()
    and exists (
      select 1
        from public.cohort_memberships cm
        join public.students s on s.cohort_id = cm.cohort_id
       where cm.user_id = auth.uid()
         and cm.role = 'instructor'
         and s.id = student_notes.student_id
    )
  );

-- 학생 정책 명시적 부재 = 학생 접근 차단.
