-- B0069 / ADR 0016 Phase 1: cohorts 확장 (전시용 컬럼) + cohort-thumbnails Storage.
--
-- 목적:
--   /cohorts/[showcaseSlug] 공개 라우트 도입 + LMS 라우팅용 nanoid slug 는 그대로.
--   기존 shape 절대 보존 (§7.4). additive only. 기존 라이브 데이터/RLS 영향 X.
--
-- 신규 컬럼:
--   1) cohorts.showcase_slug   text UNIQUE nullable. human-readable (fan-to-pro-1 등)
--   2) cohorts.hero_stat       jsonb nullable. 대표 지표 (수료 인원 / 취업률 등)
--   3) cohorts.thumbnail_path  text nullable. Storage bucket 경로
--
-- 신규 Storage bucket:
--   4) cohort-thumbnails       public read (2MB, png/jpeg/webp)
--                              service_role write only
--
-- 롤백 SQL (수동):
--   alter table public.cohorts drop constraint if exists cohorts_showcase_slug_not_reserved;
--   drop index if exists cohorts_showcase_slug_idx;
--   alter table public.cohorts drop column if exists thumbnail_path;
--   alter table public.cohorts drop column if exists hero_stat;
--   alter table public.cohorts drop column if exists showcase_slug;
--   drop policy if exists cohort_thumbnails_service_role_write on storage.objects;
--   drop policy if exists cohort_thumbnails_public_read on storage.objects;
--   delete from storage.buckets where id = 'cohort-thumbnails';

-- ============================================================================
-- 1. cohorts 확장 (전시용 3 컬럼)
-- ============================================================================

alter table public.cohorts
  add column if not exists showcase_slug  text,
  add column if not exists hero_stat      jsonb,
  add column if not exists thumbnail_path text;

comment on column public.cohorts.showcase_slug is
  'B0069 ADR 0016 human-readable slug for /cohorts/[slug] 공개 라우트. LMS 라우팅은 기존 nanoid slug 그대로.';
comment on column public.cohorts.hero_stat is
  'B0069 cohort 대표 지표. { label, value, denominator, definition, audit_date }. JSONB 로 스키마 확장 여지.';
comment on column public.cohorts.thumbnail_path is
  'B0069 Storage bucket 경로. 예: cohort-thumbnails/fan-to-pro-1.jpg. public read.';

-- showcase_slug UNIQUE (nullable → partial unique index).
create unique index if not exists cohorts_showcase_slug_unique
  on public.cohorts (showcase_slug)
  where showcase_slug is not null;

-- Reserved word 충돌 방지 CHECK.
-- 상단 라우트 세그먼트와 겹치면 라우팅 충돌 (예: /cohorts/admin, /cohorts/apply).
alter table public.cohorts
  drop constraint if exists cohorts_showcase_slug_not_reserved;
alter table public.cohorts
  add constraint cohorts_showcase_slug_not_reserved
  check (
    showcase_slug is null
    or showcase_slug not in (
      'admin','apply','auth','waitlist','outcomes','stories',
      'cohorts','faculty','partners','blog','tracks','courses','bundles',
      'api','login','logout','dashboard','student','instructor'
    )
  );

-- ============================================================================
-- 2. Backfill: fan-to-pro 1기 cohort to showcase_slug='fan-to-pro-1'
-- ----------------------------------------------------------------------------
-- 조건: fan-to-pro 프로그램 + course_id = fan-to-pro-1 course.
--   (courses migration 20260705000001 에서 course_id 가 backfill 되어 있음)
-- 안전장치: showcase_slug IS NULL 이고 대상 cohort 1개만 있을 것으로 가정.
--   여러 개면 이후 운영자가 어드민에서 개별 지정.
--
-- hero_stat 은 placeholder (audit 전). 실제 수치는 Wave 2 콘텐츠 작업에서 갱신.

update public.cohorts c
   set showcase_slug = 'fan-to-pro-1',
       hero_stat = jsonb_build_object(
         'label', '수료 인원',
         'value', 0,
         'denominator', 0,
         'definition', 'paid AND attendance >= 75% AND cohort completed',
         'audit_date', null
       )
 where c.showcase_slug is null
   and c.program_id = (select id from public.programs where slug = 'fan-to-pro' limit 1)
   and c.course_id  = (
     select co.id
       from public.courses co
       join public.programs p on p.id = co.program_id
      where co.slug = 'fan-to-pro-1'
        and p.slug = 'fan-to-pro'
      limit 1
   )
   and not exists (
     select 1 from public.cohorts c2
      where c2.showcase_slug = 'fan-to-pro-1'
   );

-- ============================================================================
-- 3. Storage bucket: cohort-thumbnails
-- ----------------------------------------------------------------------------
-- public read (전시용 이미지) + service_role write only.
-- 2MB / png-jpeg-webp 허용.

insert into storage.buckets (
  id,
  name,
  public,
  avif_autodetection,
  file_size_limit,
  allowed_mime_types
)
values (
  'cohort-thumbnails',
  'cohort-thumbnails',
  true,
  false,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do nothing;

-- Public read policy. 마케팅 페이지에서 anon 로 GET.
drop policy if exists cohort_thumbnails_public_read on storage.objects;
create policy cohort_thumbnails_public_read on storage.objects
  for select
  using (bucket_id = 'cohort-thumbnails');

-- service_role 전용 write. 어드민 업로드는 server action → service_role 로.
-- anon / authenticated 는 write 불가.
drop policy if exists cohort_thumbnails_service_role_write on storage.objects;
create policy cohort_thumbnails_service_role_write on storage.objects
  for all
  using (
    bucket_id = 'cohort-thumbnails'
    and auth.jwt() ->> 'role' = 'service_role'
  )
  with check (
    bucket_id = 'cohort-thumbnails'
    and auth.jwt() ->> 'role' = 'service_role'
  );
