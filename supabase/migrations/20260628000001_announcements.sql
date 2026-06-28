-- B0061 announcements 테이블 신설.
--
-- entity (announcement.ts) + admin/announcements page 이미 구현됨.
-- 누락된 테이블 + RLS 정책 (4종 — service_role / super_admin / program admin / cohort member).
--
-- 적용:
--   supabase db push (또는 dashboard SQL editor).
--
-- 롤백:
--   drop table if exists public.announcements cascade;

create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts(id) on delete cascade,
  created_by    uuid references auth.users(id),

  title         text not null check (char_length(trim(title)) between 1 and 200),
  body          text not null check (char_length(body) between 1 and 5000),
  pinned        boolean not null default false,
  status        text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at  timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz,

  -- published 시 published_at 의무.
  constraint announcements_published_requires_at check (
    status <> 'published' or published_at is not null
  )
);

comment on table public.announcements is
  'B0061 공지 — cohort 단위. published_at <= now 일 때만 학생 visible.';

create index if not exists announcements_cohort_idx
  on public.announcements(cohort_id, created_at desc);
create index if not exists announcements_published_idx
  on public.announcements(cohort_id, status, published_at desc)
  where status = 'published';

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- RLS ----------------------------------------------------------------------

alter table public.announcements enable row level security;

revoke all on public.announcements from anon, authenticated;
grant all on public.announcements to service_role;
grant select on public.announcements to authenticated;

-- service_role : 전체
drop policy if exists service_role_all on public.announcements;
create policy service_role_all on public.announcements
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin : 전체
drop policy if exists ann_super_admin_all on public.announcements;
create policy ann_super_admin_all on public.announcements
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

-- program admin : 본인 program 의 cohort
drop policy if exists ann_program_admin_all on public.announcements;
create policy ann_program_admin_all on public.announcements
  for all
  using (
    exists (
      select 1
        from public.program_memberships pm
        join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = announcements.cohort_id
    )
  )
  with check (
    exists (
      select 1
        from public.program_memberships pm
        join public.cohorts c on c.program_id = pm.program_id
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and c.id = announcements.cohort_id
    )
  );

-- cohort member (student / instructor) : SELECT only, published 만
drop policy if exists ann_cohort_member_read on public.announcements;
create policy ann_cohort_member_read on public.announcements
  for select
  using (
    exists (
      select 1 from public.cohort_memberships cm
       where cm.user_id = auth.uid()
         and cm.cohort_id = announcements.cohort_id
         and (
           cm.role = 'instructor'
           or (
             cm.role = 'student'
             and announcements.status = 'published'
             and announcements.published_at is not null
             and announcements.published_at <= now()
           )
         )
    )
  );
