-- LMS 내부 티켓 관리 (2026-07-10, 노아 지시)
--
-- super_admin 개인 사용. 2기 launch 준비 + 1기 수료식 티켓 15~20개 규모.
-- 심플 = Notion 스타일 (리스트 + 상세 페이지 + body_md 토글).
--
-- 롤백:
--   drop table if exists public.tickets;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  phase int not null check (phase between 1 and 4),
  ticket_no text not null unique,
  title text not null,
  body_md text,
  status text not null default 'backlog'
    check (status in ('backlog','in_progress','done','blocked','deferred')),
  priority text not null default 'P1'
    check (priority in ('P0','P1','P2')),
  owner text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tickets is
  '2026-07-10 노아 지시. LMS 내부 티켓 관리 (super_admin only).';

create index if not exists tickets_phase_status_idx
  on public.tickets (phase, status, priority);

create index if not exists tickets_status_due_idx
  on public.tickets (status, due_date)
  where status in ('backlog','in_progress');

-- updated_at 자동 갱신
create or replace function public.set_tickets_updated_at()
returns trigger as $trg$
begin
  new.updated_at = now();
  return new;
end;
$trg$ language plpgsql;

drop trigger if exists tickets_updated_at on public.tickets;
create trigger tickets_updated_at
  before update on public.tickets
  for each row execute function public.set_tickets_updated_at();

-- RLS: super_admin only + service_role
alter table public.tickets enable row level security;

revoke all on public.tickets from anon, authenticated;
grant select, insert, update on public.tickets to authenticated;
grant all on public.tickets to service_role;

drop policy if exists tickets_service_role_all on public.tickets;
create policy tickets_service_role_all on public.tickets
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists tickets_super_admin_all on public.tickets;
create policy tickets_super_admin_all on public.tickets
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_super_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and is_super_admin = true
    )
  );
