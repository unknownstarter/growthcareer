-- B0034 Career Documents Wave A+ — 이력서/자기소개서/포트폴리오 단일 최신본.
--
-- 1 student × 3 doc_type (resume / cover_letter / portfolio) — 단일 최신본만 보관.
-- 포맷은 external_url 또는 file_upload 둘 중 하나 (XOR — check constraint 강제).
-- 파일 업로드 시 Supabase Storage 의 career-documents bucket 에 저장.
--
-- 권한 모델 (RLS, service_role 외 — 방어선 2차):
--   - super_admin (user_profiles.is_super_admin=true): 전체
--   - program admin (program_memberships role='admin'): 본인 program 의 cohort 의 student
--   - student-self (user_profiles.student_id = students.id): 본인 row 만
--
-- 1차 가드는 server action 의 assertCanAccessStudentCareer(student_id) — RLS 는 2차.
-- (CLAUDE.md §7.4 — viewer role 사고 2026-06-09 lesson 의 박제 적용)
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (수동):
--   drop table if exists public.student_career_documents;
--   delete from storage.buckets where id = 'career-documents';

-- 1. student_career_documents ---------------------------------------------

create table if not exists public.student_career_documents (
  student_id        uuid not null references public.students(id) on delete cascade,
  doc_type          text not null check (doc_type in ('resume', 'cover_letter', 'portfolio')),

  storage_method    text not null check (storage_method in ('external_url', 'file_upload')),

  -- external_url 모드 일 때 채워짐.
  external_url      text,

  -- file_upload 모드 일 때 채워짐. {student_id}/{doc_type}.{ext} 패턴.
  file_path         text,
  file_name         text,                    -- 사용자가 업로드한 원본 파일명 (표시용)
  file_size_bytes   integer check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type         text,

  notes             text check (notes is null or char_length(notes) <= 500),

  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),

  primary key (student_id, doc_type),

  -- XOR — storage_method 가 external_url 이면 external_url 만, file_upload 면 file_path 만.
  constraint career_doc_storage_xor check (
    (storage_method = 'external_url'
      and external_url is not null
      and char_length(trim(external_url)) > 0
      and file_path is null)
    or
    (storage_method = 'file_upload'
      and file_path is not null
      and char_length(trim(file_path)) > 0
      and external_url is null)
  )
);

comment on table public.student_career_documents is
  'B0034 학생 career 문서 — 이력서/자기소개서/포트폴리오 단일 최신본. external_url 또는 file_upload XOR.';
comment on column public.student_career_documents.doc_type is
  'resume / cover_letter / portfolio. 학생 1명 당 각 타입 최대 1개.';
comment on column public.student_career_documents.storage_method is
  'external_url = Notion/Google Doc 등 외부 링크. file_upload = Supabase Storage career-documents bucket.';
comment on column public.student_career_documents.file_path is
  'Storage path. {student_id}/{doc_type}.{ext} 패턴. 사용자 입력 file_name 은 path 에 사용 X (sanitize).';
comment on column public.student_career_documents.file_name is
  '업로드 당시 사용자 파일명 (표시용). path 에는 사용 X.';

create index if not exists student_career_documents_student_idx
  on public.student_career_documents (student_id);

-- updated_at 자동 갱신 trigger.
drop trigger if exists student_career_documents_set_updated_at
  on public.student_career_documents;
create trigger student_career_documents_set_updated_at
  before update on public.student_career_documents
  for each row execute function public.set_updated_at();

-- 2. RLS ------------------------------------------------------------------

alter table public.student_career_documents enable row level security;

revoke all on public.student_career_documents from anon, authenticated;

grant all    on public.student_career_documents to service_role;
grant select, insert, update, delete on public.student_career_documents to authenticated;

-- service_role 전체 (server action 의 정상 경로).
drop policy if exists service_role_all on public.student_career_documents;
create policy service_role_all on public.student_career_documents
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin: 전체.
drop policy if exists career_super_admin_all on public.student_career_documents;
create policy career_super_admin_all on public.student_career_documents
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

-- program admin: 본인 program 의 cohort 에 속한 student 의 row.
drop policy if exists career_program_admin_all on public.student_career_documents;
create policy career_program_admin_all on public.student_career_documents
  for all
  using (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm
          on pm.program_id = c.program_id
         and pm.user_id = auth.uid()
         and pm.role = 'admin'
       where s.id = student_career_documents.student_id
    )
  )
  with check (
    exists (
      select 1
        from public.students s
        join public.cohorts c on c.id = s.cohort_id
        join public.program_memberships pm
          on pm.program_id = c.program_id
         and pm.user_id = auth.uid()
         and pm.role = 'admin'
       where s.id = student_career_documents.student_id
    )
  );

-- student-self: user_profiles.student_id 가 매칭되는 본인 row.
drop policy if exists career_self_student on public.student_career_documents;
create policy career_self_student on public.student_career_documents
  for all
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_career_documents.student_id
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid()
         and up.student_id = student_career_documents.student_id
    )
  );

-- 3. Storage bucket -------------------------------------------------------
-- career-documents bucket. private (public=false). authenticated 직접 access X.
-- 다운로드는 server action 이 service_role 로 signed URL 발급 (1h TTL).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'career-documents',
  'career-documents',
  false,
  10485760, -- 10 MiB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. Storage policies -----------------------------------------------------
-- service_role 만 직접 access. authenticated user 의 직접 read/write 전면 차단.
-- (학생/운영자는 server action 통해 signed URL 받아 접근.)

drop policy if exists career_documents_service_role_select on storage.objects;
create policy career_documents_service_role_select on storage.objects
  for select
  using (
    bucket_id = 'career-documents'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists career_documents_service_role_insert on storage.objects;
create policy career_documents_service_role_insert on storage.objects
  for insert
  with check (
    bucket_id = 'career-documents'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists career_documents_service_role_update on storage.objects;
create policy career_documents_service_role_update on storage.objects
  for update
  using (
    bucket_id = 'career-documents'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists career_documents_service_role_delete on storage.objects;
create policy career_documents_service_role_delete on storage.objects
  for delete
  using (
    bucket_id = 'career-documents'
    and auth.jwt() ->> 'role' = 'service_role'
  );
