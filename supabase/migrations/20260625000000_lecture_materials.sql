-- B0044 LMS Launch Phase 1 — lecture_materials (강의 자료).
--
-- ADR 0011 §2. cohort_id × session_id (nullable, 자유 자료 OK) × 파일 또는 외부 링크 XOR.
--
-- Storage bucket: lecture-materials (private, 100MB file_size_limit, all MIME 허용).
-- Sage CRIT-4 fix (2026-06-26): 1GB → 100MB. Vercel Server Action bodySizeLimit
-- 정합. Wave 2 에 signed upload URL (client direct) 전환 시 재상향 검토.
-- 강사/admin upload + cohort member download. 다운로드는 server action 통해
-- service_role 로 signed URL 발급 (TTL = 5 분).
--
-- 권한 모델 (RLS, 4 정책 / table — ADR 0011 §5.6.6):
--   - service_role : 전체 (server action 정상 경로)
--   - super_admin  : 전체
--   - program admin: 본인 program 의 cohort
--   - cohort member: 본인 cohort 자료 SELECT (visibility 'published' 또는 scheduled-due)
--
-- 1차 가드 = server action assertCanUploadMaterial / assertCanDownloadMaterial.
-- RLS 는 2차 방어선 (CLAUDE.md §7.4 — viewer role 사고 2026-06-09 lesson).
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 (수동):
--   drop table if exists public.lecture_materials cascade;
--   delete from storage.buckets where id = 'lecture-materials';

-- 1. lecture_materials ----------------------------------------------------

create table if not exists public.lecture_materials (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  session_id      uuid references public.sessions(id) on delete set null,
  week_number     int check (week_number is null or week_number between 1 and 20),

  title           text not null check (char_length(trim(title)) between 1 and 200),
  description     text check (description is null or char_length(description) <= 1000),

  storage_method  text not null check (storage_method in ('file_upload', 'external_url')),

  -- file_upload 모드 일 때 채워짐. {cohort_id}/{material_id}.{ext} 패턴.
  file_path       text,
  file_name       text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes between 0 and 104857600),
  mime_type       text,

  -- external_url 모드 일 때 채워짐.
  external_url    text,

  visibility      text not null default 'published'
                    check (visibility in ('draft', 'scheduled', 'published', 'archived')),
  visible_from    timestamptz,

  uploaded_by     uuid references auth.users(id),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  -- XOR — file_upload XOR external_url.
  constraint lm_storage_xor check (
    (storage_method = 'file_upload'
      and file_path is not null
      and char_length(trim(file_path)) > 0
      and external_url is null)
    or
    (storage_method = 'external_url'
      and external_url is not null
      and char_length(trim(external_url)) > 0
      and file_path is null)
  ),

  -- scheduled 일 때 visible_from 의무.
  constraint lm_scheduled_requires_from check (
    visibility <> 'scheduled' or visible_from is not null
  )
);

comment on table public.lecture_materials is
  'B0044 강의 자료. ADR 0011 §2. 강사 또는 admin upload, cohort member download. file_upload XOR external_url.';
comment on column public.lecture_materials.session_id is
  'NULL 허용 — 자유 자료 (회차 미연결). 회차 자료면 sessions FK.';
comment on column public.lecture_materials.week_number is
  'session_id null 일 때 fallback (1~20 안전 범위). UI 정렬 / 필터용.';
comment on column public.lecture_materials.visibility is
  'draft → scheduled → published → archived. scheduled 는 visible_from 까지 학생 비가시.';
comment on column public.lecture_materials.file_path is
  'Storage path. {cohort_id}/{material_id}.{ext} 패턴. 사용자 입력 file_name 은 path 에 사용 X (sanitize).';

create index if not exists lecture_materials_cohort_idx
  on public.lecture_materials(cohort_id, created_at desc);
create index if not exists lecture_materials_session_idx
  on public.lecture_materials(session_id) where session_id is not null;
create index if not exists lecture_materials_visibility_idx
  on public.lecture_materials(visibility) where visibility in ('scheduled', 'published');

drop trigger if exists lecture_materials_set_updated_at on public.lecture_materials;
create trigger lecture_materials_set_updated_at
  before update on public.lecture_materials
  for each row execute function public.set_updated_at();

-- 2. RLS ------------------------------------------------------------------

alter table public.lecture_materials enable row level security;

revoke all on public.lecture_materials from anon, authenticated;

grant all on public.lecture_materials to service_role;
grant select on public.lecture_materials to authenticated;

-- service_role : 전체.
drop policy if exists service_role_all on public.lecture_materials;
create policy service_role_all on public.lecture_materials
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin : 전체.
drop policy if exists lm_super_admin_all on public.lecture_materials;
create policy lm_super_admin_all on public.lecture_materials
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

-- program admin : 본인 program 의 cohort.
drop policy if exists lm_program_admin_all on public.lecture_materials;
create policy lm_program_admin_all on public.lecture_materials
  for all
  using (
    exists (
      select 1
        from public.program_memberships pm
        join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = lecture_materials.cohort_id
    )
  )
  with check (
    exists (
      select 1
        from public.program_memberships pm
        join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = lecture_materials.cohort_id
    )
  );

-- cohort member (student / instructor) : SELECT only.
-- student 는 visibility = 'published' 또는 'scheduled' AND visible_from <= now() 일 때만.
-- instructor 는 visibility 무관 (draft 까지 read OK — 본인 cohort 인 한).
drop policy if exists lm_cohort_member_read on public.lecture_materials;
create policy lm_cohort_member_read on public.lecture_materials
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid()
         and cm.cohort_id = lecture_materials.cohort_id
         and (
           cm.role = 'instructor'
           or (
             cm.role = 'student'
             and (
               lecture_materials.visibility = 'published'
               or (
                 lecture_materials.visibility = 'scheduled'
                 and lecture_materials.visible_from is not null
                 and lecture_materials.visible_from <= now()
               )
             )
           )
         )
    )
  );

-- 3. Storage bucket -------------------------------------------------------
-- lecture-materials bucket. private (public=false). 100MB cap. 모든 MIME 허용.
-- Sage CRIT-4 fix (2026-06-26): 1GB → 100MB. Vercel Server Action bodySizeLimit
-- 정합. Wave 2 에 client direct upload (signed upload URL) 전환 시 재상향.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lecture-materials',
  'lecture-materials',
  false,
  104857600,   -- 100 MB
  null         -- 모든 MIME 허용 (강의 자료는 형식 다양)
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. Storage RLS ----------------------------------------------------------
-- service_role 만 직접 access. authenticated user 의 직접 read/write 차단.
-- (학생 / 강사 / 운영자는 server action 통해 signed URL 받아 접근.)

drop policy if exists lm_storage_service_role_select on storage.objects;
create policy lm_storage_service_role_select on storage.objects
  for select
  using (
    bucket_id = 'lecture-materials'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists lm_storage_service_role_insert on storage.objects;
create policy lm_storage_service_role_insert on storage.objects
  for insert
  with check (
    bucket_id = 'lecture-materials'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists lm_storage_service_role_update on storage.objects;
create policy lm_storage_service_role_update on storage.objects
  for update
  using (
    bucket_id = 'lecture-materials'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists lm_storage_service_role_delete on storage.objects;
create policy lm_storage_service_role_delete on storage.objects
  for delete
  using (
    bucket_id = 'lecture-materials'
    and auth.jwt() ->> 'role' = 'service_role'
  );
