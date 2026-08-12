-- LMS 인앱 커뮤니티 MVP. community_posts + community_comments + RLS.
--
-- 스코프 B: program 알럼나이 통합.
--   글은 program_id(fan-to-pro) 단위로 공유. 판정 = 유저가 해당 program 소속
--   cohort membership 하나라도 있으면 read/write (수료 cohort 포함).
--   진입 라우트는 기존 [cohortSlug]/student/community 유지, 내용은 program 전체 통합.
--
-- announcements (20260628000001) 를 레퍼런스로 동형 확장:
--   - 네이밍/트리거(set_updated_at)/RLS 4종(service_role/super_admin/program admin/member).
--   - announcements 는 cohort_id 단위 + 학생 read-only.
--   - community 는 program_id 단위 + alumni write 개방 (본인 글만 수정/soft-delete).
--
-- MVP 제외: 카테고리, 대댓글, 실시간. pinned 로 공지 상단 고정만. 댓글 1-depth 플랫.
-- soft-delete: status 'published' | 'hidden'.
--
-- 적용 (Sage 검토 후):
--   supabase db push
--
-- 롤백:
--   drop table if exists public.community_comments cascade;
--   drop table if exists public.community_posts cascade;
--   drop function if exists public.community_sync_comment_count();

-- 1. community_posts -------------------------------------------------------

create table if not exists public.community_posts (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references public.programs(id) on delete cascade,
  created_by    uuid references auth.users(id) on delete set null,

  title         text check (title is null or char_length(trim(title)) between 1 and 200),
  body          text not null check (char_length(trim(body)) between 1 and 5000),
  pinned        boolean not null default false,
  status        text not null default 'published'
                  check (status in ('published', 'hidden')),
  comment_count integer not null default 0 check (comment_count >= 0),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

comment on table public.community_posts is
  '인앱 커뮤니티 글. program 단위 알럼나이 통합. status=hidden = soft-delete. comment_count = denormalize (트리거 유지).';
comment on column public.community_posts.program_id is
  '스코프 B 판정 축. fan-to-pro program 의 cohort membership 보유자만 read/write.';
comment on column public.community_posts.created_by is
  '작성자 auth.users.id. on delete set null (계정 삭제해도 글은 보존, 작성자만 익명화).';

-- 목록 쿼리: program 내 pinned 우선 + 최신순.
create index if not exists community_posts_list_idx
  on public.community_posts (program_id, pinned desc, created_at desc);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

-- 2. community_comments ----------------------------------------------------

create table if not exists public.community_comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.community_posts(id) on delete cascade,
  created_by    uuid references auth.users(id) on delete set null,

  body          text not null check (char_length(trim(body)) between 1 and 2000),
  status        text not null default 'published'
                  check (status in ('published', 'hidden')),

  created_at    timestamptz not null default now()
);

comment on table public.community_comments is
  '커뮤니티 댓글. 1-depth 플랫. post 삭제 시 cascade. status=hidden = soft-delete.';

create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

-- 3. comment_count denormalize 트리거 -------------------------------------
-- published 댓글 수만 카운트. INSERT / soft-delete(status 전환) / DELETE 반영.
-- 트리거로 유지 = server action 누락 방지 (정합성 우선).

create or replace function public.community_sync_comment_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then
      update public.community_posts
         set comment_count = comment_count + 1
       where id = new.post_id;
    end if;

  elsif tg_op = 'DELETE' then
    if old.status = 'published' then
      update public.community_posts
         set comment_count = greatest(comment_count - 1, 0)
       where id = old.post_id;
    end if;

  elsif tg_op = 'UPDATE' then
    -- published -> hidden : 감소. hidden -> published : 증가.
    if old.status = 'published' and new.status <> 'published' then
      update public.community_posts
         set comment_count = greatest(comment_count - 1, 0)
       where id = new.post_id;
    elsif old.status <> 'published' and new.status = 'published' then
      update public.community_posts
         set comment_count = comment_count + 1
       where id = new.post_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists community_comments_sync_count on public.community_comments;
create trigger community_comments_sync_count
  after insert or update or delete on public.community_comments
  for each row execute function public.community_sync_comment_count();

-- ==========================================================================
-- RLS: community_posts
-- ==========================================================================
-- announcements 4종 패턴 + alumni write 개방 (스코프 B 판정).
--
-- 판정 sub-select (alumni = program 소속):
--   exists (
--     select 1 from cohort_memberships cm
--       join cohorts c on c.id = cm.cohort_id
--      where cm.user_id = auth.uid()
--        and c.program_id = community_posts.program_id
--   )
-- cohort_memberships.self_read (auth.uid()=user_id) + cohorts.lms_member_cohort
-- 정책이 이미 존재 → authenticated 세션에서 본 sub-select 판정 가능.

alter table public.community_posts enable row level security;

revoke all on public.community_posts from anon, authenticated;
grant all on public.community_posts to service_role;
-- alumni 가 직접 write → announcements 와 달리 insert/update 도 authenticated 에 grant.
-- Sage BLOCK 반영: update 는 컬럼 레벨로 제한. comment_count / pinned / program_id /
-- created_by / created_at 는 authenticated 가 직접 못 건드림 (RLS 는 컬럼 단위 제한 불가라
-- GRANT 로 차단). pinned 토글 · comment_count 갱신은 오직 service_role server action 경유.
grant select on public.community_posts to authenticated;
grant insert on public.community_posts to authenticated;
grant update (title, body, status) on public.community_posts to authenticated;

-- service_role : 전체
drop policy if exists service_role_all on public.community_posts;
create policy service_role_all on public.community_posts
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin : 전체
drop policy if exists cp_super_admin_all on public.community_posts;
create policy cp_super_admin_all on public.community_posts
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

-- program admin : 본인 program 의 글 전체 (read/write/moderate).
drop policy if exists cp_program_admin_all on public.community_posts;
create policy cp_program_admin_all on public.community_posts
  for all
  using (
    exists (
      select 1 from public.program_memberships pm
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and pm.program_id = community_posts.program_id
    )
  )
  with check (
    exists (
      select 1 from public.program_memberships pm
       where pm.user_id = auth.uid()
         and pm.role = 'admin'
         and pm.program_id = community_posts.program_id
    )
  );

-- alumni (student/instructor) : 소속 program 의 글 read.
--   published 만 (hidden = moderator 만 봄). 단 본인 글은 hidden 이어도 read (아래 self 정책).
drop policy if exists cp_alumni_read on public.community_posts;
create policy cp_alumni_read on public.community_posts
  for select
  using (
    status = 'published'
    and exists (
      select 1 from public.cohort_memberships cm
       join public.cohorts c on c.id = cm.cohort_id
      where cm.user_id = auth.uid()
        and c.program_id = community_posts.program_id
    )
  );

-- alumni : 본인 글은 status 무관 read (hidden 확인용).
drop policy if exists cp_alumni_self_read on public.community_posts;
create policy cp_alumni_self_read on public.community_posts
  for select
  using (created_by = auth.uid());

-- alumni : write (INSERT). created_by 는 반드시 자기 자신. pinned=false 강제.
--   소속 program 이어야 함.
drop policy if exists cp_alumni_insert on public.community_posts;
create policy cp_alumni_insert on public.community_posts
  for insert
  with check (
    created_by = auth.uid()
    and pinned = false
    and status = 'published'
    and exists (
      select 1 from public.cohort_memberships cm
       join public.cohorts c on c.id = cm.cohort_id
      where cm.user_id = auth.uid()
        and c.program_id = community_posts.program_id
    )
  );

-- alumni : 본인 글만 update. moderator 전용 필드(pinned) 는 alumni 가 못 켬,
--   hide 는 본인 글 self soft-delete 만 (published -> hidden).
--   USING = 수정 대상 본인 글. WITH CHECK = 수정 후에도 본인 소유 + pinned=false.
drop policy if exists cp_alumni_update on public.community_posts;
create policy cp_alumni_update on public.community_posts
  for update
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and pinned = false
  );

-- ==========================================================================
-- RLS: community_comments
-- ==========================================================================
-- 판정 = 댓글이 달린 post 의 program 소속 여부 (post 조인).

alter table public.community_comments enable row level security;

revoke all on public.community_comments from anon, authenticated;
grant all on public.community_comments to service_role;
-- Sage BLOCK 반영: 댓글 update 도 컬럼 레벨 제한. post_id / created_by / created_at 차단,
-- body/status(self-edit + soft-delete) 만 허용.
grant select on public.community_comments to authenticated;
grant insert on public.community_comments to authenticated;
grant update (body, status) on public.community_comments to authenticated;

-- service_role : 전체
drop policy if exists service_role_all on public.community_comments;
create policy service_role_all on public.community_comments
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin : 전체
drop policy if exists cc_super_admin_all on public.community_comments;
create policy cc_super_admin_all on public.community_comments
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

-- program admin : 본인 program 글의 댓글 전체 (moderate).
drop policy if exists cc_program_admin_all on public.community_comments;
create policy cc_program_admin_all on public.community_comments
  for all
  using (
    exists (
      select 1
        from public.community_posts p
        join public.program_memberships pm
          on pm.program_id = p.program_id
         and pm.user_id = auth.uid()
         and pm.role = 'admin'
       where p.id = community_comments.post_id
    )
  )
  with check (
    exists (
      select 1
        from public.community_posts p
        join public.program_memberships pm
          on pm.program_id = p.program_id
         and pm.user_id = auth.uid()
         and pm.role = 'admin'
       where p.id = community_comments.post_id
    )
  );

-- alumni : 소속 program 글의 published 댓글 read.
drop policy if exists cc_alumni_read on public.community_comments;
create policy cc_alumni_read on public.community_comments
  for select
  using (
    status = 'published'
    and exists (
      select 1
        from public.community_posts p
        join public.cohort_memberships cm on cm.user_id = auth.uid()
        join public.cohorts c on c.id = cm.cohort_id and c.program_id = p.program_id
       where p.id = community_comments.post_id
         and p.status = 'published'
    )
  );

-- alumni : 본인 댓글은 status 무관 read.
drop policy if exists cc_alumni_self_read on public.community_comments;
create policy cc_alumni_self_read on public.community_comments
  for select
  using (created_by = auth.uid());

-- alumni : write (INSERT). created_by = 자기. published post 에만. 소속 program.
drop policy if exists cc_alumni_insert on public.community_comments;
create policy cc_alumni_insert on public.community_comments
  for insert
  with check (
    created_by = auth.uid()
    and status = 'published'
    and exists (
      select 1
        from public.community_posts p
        join public.cohort_memberships cm on cm.user_id = auth.uid()
        join public.cohorts c on c.id = cm.cohort_id and c.program_id = p.program_id
       where p.id = community_comments.post_id
         and p.status = 'published'
    )
  );

-- alumni : 본인 댓글만 update (self soft-delete published -> hidden).
drop policy if exists cc_alumni_update on public.community_comments;
create policy cc_alumni_update on public.community_comments
  for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
