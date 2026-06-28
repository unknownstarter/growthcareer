-- B0057 학생 사진 + 파일 cap 상향.
--
-- 노아 요청 (2026-06-28):
--   1) student_profile 에 사진 (원티드 패턴) — student_profile.photo_path 추가.
--      별도 private bucket 'student-photos' (5MB cap, image/* MIME).
--   2) career-documents bucket cap 상향 (10MB → 50MB) — 포트폴리오 PDF/PPT/ZIP 대응.
--      허용 MIME 도 확장 (ppt, docx 는 이미 있음 — zip 변형 추가).
--
-- 호환성:
--   - student_profile: 컬럼 가산만 (nullable). 기존 RLS 그대로 적용.
--   - student-photos bucket: 신규 (service_role only — server action 만 접근).
--   - career-documents bucket: 기존 정책 그대로 + cap/MIME 만 수정.
--
-- 적용:
--   supabase db push
--   또는 dashboard SQL Editor 에 본 파일 전체 붙여넣기.
--
-- 롤백:
--   alter table public.student_profile
--     drop column if exists photo_path,
--     drop column if exists photo_uploaded_at;
--   update storage.buckets set file_size_limit = 10485760 where id = 'career-documents';
--   -- bucket 자체 삭제 시 데이터 함께 사라짐 — 운영 중 X.
--   -- drop policy if exists sp_photos_service_role_all on storage.objects;
--   -- delete from storage.buckets where id = 'student-photos';

-- 1. student_profile 컬럼 가산 ---------------------------------------------

alter table public.student_profile
  add column if not exists photo_path text,
  add column if not exists photo_uploaded_at timestamptz;

comment on column public.student_profile.photo_path is
  'B0057 student-photos bucket 내 path. {student_id}.{jpg|png|webp}. signed URL 5분 발급.';
comment on column public.student_profile.photo_uploaded_at is
  'B0057 사진 업로드 시각 — cache busting 용 (signed URL 와 별개로 UI 갱신 트리거).';

-- 2. student-photos bucket -------------------------------------------------
-- private (public=false). 5MB cap. image/jpeg|png|webp.
-- 클라이언트 측 canvas 리사이즈 (UI 책임) → 5MB 안에 들어옴.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  false,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3. student-photos Storage policies ---------------------------------------
-- service_role 만 직접 access. 학생/운영자는 server action 의 signed URL 로만.

drop policy if exists sp_photos_service_role_select on storage.objects;
create policy sp_photos_service_role_select on storage.objects
  for select
  using (
    bucket_id = 'student-photos'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists sp_photos_service_role_insert on storage.objects;
create policy sp_photos_service_role_insert on storage.objects
  for insert
  with check (
    bucket_id = 'student-photos'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists sp_photos_service_role_update on storage.objects;
create policy sp_photos_service_role_update on storage.objects
  for update
  using (
    bucket_id = 'student-photos'
    and auth.jwt() ->> 'role' = 'service_role'
  );

drop policy if exists sp_photos_service_role_delete on storage.objects;
create policy sp_photos_service_role_delete on storage.objects
  for delete
  using (
    bucket_id = 'student-photos'
    and auth.jwt() ->> 'role' = 'service_role'
  );

-- 4. career-documents bucket cap 상향 (10MB → 50MB) ------------------------
-- 포트폴리오 = PDF / 큰 PPTX / 이미지 압축 ZIP 등 다 들어와야 함.
-- 이력서·자기소개서는 application-level 에서 별도 cap (5MB) 적용.

update storage.buckets
   set file_size_limit = 52428800, -- 50 MiB
       allowed_mime_types = array[
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- docx
         'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- pptx
         'application/vnd.ms-powerpoint', -- ppt (legacy)
         'application/zip',
         'application/x-zip-compressed',
         'image/jpeg',
         'image/png',
         'image/webp'
       ]
 where id = 'career-documents';
