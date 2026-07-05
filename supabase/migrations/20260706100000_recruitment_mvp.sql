-- B0072 Recruitment MVP (Simplified v3) — Sage PASS (CRIT 0 + HIGH 0).
--
-- 3 신규 테이블 + 7 RLS policy + 1 RPC.
--   1) job_postings          — 공개 JD (in-line 회사 정보)
--   2) student_applications  — 학생 원클릭 지원 트래킹
--   3) recruitment_email_log — 이메일 outbox
--   4) apply_to_job_atomic() — SECURITY DEFINER RPC (S-9 + S-9b defense)
--
-- 절대 룰:
--   - 회사는 플랫폼 계정 없음 (v5 오버엔지니어링 폐기).
--   - student_applications.status = 2-value 만 ('applied' / 'withdrawn').
--   - RPC 는 p_student_id 인자 없음. auth.uid() 로 함수 안 조회 (impersonation 방어).
--   - GRANT EXECUTE ... TO authenticated 만. anon 절대 금지.
--   - student_applications 는 authenticated 에 UPDATE grant 없음 (withdrawn 전이는 service_role only).
--
-- 방어선 2차 (RLS):
--   - job_postings: anon/authenticated SELECT (status='open' + closes_at 유효만), super_admin FOR ALL.
--   - student_applications: student self SELECT (전체 상태) + INSERT (status='applied' 강제) + super_admin SELECT.
--   - recruitment_email_log: service_role only. authenticated SELECT 도 금지.
--
-- 적용:
--   supabase db push
--
-- 롤백 (수동):
--   drop function if exists public.apply_to_job_atomic;
--   drop table if exists public.recruitment_email_log;
--   drop table if exists public.student_applications;
--   drop table if exists public.job_postings;

-- 1. job_postings ----------------------------------------------------------

create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id),
  slug text not null unique,
  title text not null,
  company_name text not null,
  company_logo_path text,
  role_category text not null,
  employment_type text not null check (
    employment_type in ('full_time', 'part_time', 'internship', 'contract', 'freelance')
  ),
  location text,
  remote_ok boolean not null default false,
  description text not null,
  requirements text,
  benefits text,
  salary_range text,
  contact_email text not null,
  company_retention_period text,
  published_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  view_count integer not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.job_postings is
  'B0072 채용 공고. 회사 정보는 in-line (v5 companies_partners 폐기).';
comment on column public.job_postings.slug is
  '8자 nanoid alphanumeric. URL 노출용. UNIQUE.';
comment on column public.job_postings.contact_email is
  '회사 담당자 email. 비회원 지원용 + 원클릭 지원 시 이메일 발송 대상.';
comment on column public.job_postings.company_retention_period is
  'K-PIPA 제17조 4항목 중 보유기간. 회사 온보딩 시 입력 (S-1b fix).';
comment on column public.job_postings.status is
  'draft (super_admin only) -> open (published_at 채워짐) -> closed.';

create index if not exists idx_job_postings_status_published
  on public.job_postings (status, published_at desc);
create index if not exists idx_job_postings_program_status
  on public.job_postings (program_id, status);

-- updated_at trigger — 기존 set_updated_at() 재사용.
drop trigger if exists job_postings_set_updated_at on public.job_postings;
create trigger job_postings_set_updated_at
  before update on public.job_postings
  for each row execute function public.set_updated_at();

-- 2. student_applications --------------------------------------------------

create table if not exists public.student_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  job_posting_id uuid not null references public.job_postings(id) on delete cascade,
  applied_at timestamptz not null default now(),
  student_message text,
  email_sent_at timestamptz,
  status text not null default 'applied' check (status in ('applied', 'withdrawn')),
  constraint student_applications_student_posting_uk unique (student_id, job_posting_id)
);

comment on table public.student_applications is
  'B0072 학생 원클릭 지원 트래킹. status = applied / withdrawn 2-value only (v5 6-value 폐기).';
comment on column public.student_applications.status is
  'applied (INSERT default) 또는 withdrawn (service_role server action 전이만).';
comment on column public.student_applications.email_sent_at is
  'outbox 발송 완료 시각. NULL = pending 또는 retrying.';

create index if not exists idx_student_applications_student
  on public.student_applications (student_id, applied_at desc);
create index if not exists idx_student_applications_posting
  on public.student_applications (job_posting_id);

-- 3. recruitment_email_log -------------------------------------------------

create table if not exists public.recruitment_email_log (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.student_applications(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body_template_key text not null,
  body_snapshot text,
  attachments jsonb not null default '[]'::jsonb,
  delivery_status text not null default 'pending' check (
    delivery_status in ('pending', 'sent', 'failed', 'retrying')
  ),
  sent_at timestamptz,
  error_message text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.recruitment_email_log is
  'B0072 이메일 outbox. service_role only. authenticated / anon SELECT 금지.';
comment on column public.recruitment_email_log.body_template_key is
  'outbox worker 가 렌더할 template 식별자 (예: recruitment.application.v1). RPC 는 key 만 전달, PII 최소화.';
comment on column public.recruitment_email_log.body_snapshot is
  '발송 시점 렌더된 최종 body. K-PIPA 파기 대상 — Wave 2 retention cron (default sent + 3y) 예정.';
comment on column public.recruitment_email_log.attachments is
  'jsonb [{ doc_type, storage_method, external_url?, file_path? }].';

create index if not exists idx_recruitment_email_status
  on public.recruitment_email_log (delivery_status, created_at)
  where delivery_status in ('pending', 'retrying');
create index if not exists idx_recruitment_email_application
  on public.recruitment_email_log (application_id);

-- 4. RLS 활성화 ------------------------------------------------------------

alter table public.job_postings enable row level security;
alter table public.student_applications enable row level security;
alter table public.recruitment_email_log enable row level security;

-- 5. GRANT / REVOKE --------------------------------------------------------
-- job_postings: anon + authenticated SELECT (RLS 로 status='open' 필터).
-- super_admin write 는 RLS 통해서만. authenticated INSERT/UPDATE/DELETE grant X.

revoke all on public.job_postings from anon, authenticated;
grant select on public.job_postings to anon, authenticated;
grant all on public.job_postings to service_role;

-- student_applications: authenticated 는 SELECT + INSERT 만.
-- UPDATE / DELETE grant 없음 = withdrawn 전이도 service_role server action 을 거침.
-- anon 완전 차단.

revoke all on public.student_applications from anon, authenticated;
grant select, insert on public.student_applications to authenticated;
grant all on public.student_applications to service_role;

-- recruitment_email_log: service_role only. anon / authenticated 완전 차단 (SELECT 도 X).

revoke all on public.recruitment_email_log from anon, authenticated;
grant all on public.recruitment_email_log to service_role;

-- 6. Policies --------------------------------------------------------------

-- 6.1 job_postings ---------------------------------------------------------
-- service_role 전체.
drop policy if exists service_role_all on public.job_postings;
create policy service_role_all on public.job_postings
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- 공개 read: status='open' + closes_at 유효.
drop policy if exists p_job_postings_public_read on public.job_postings;
create policy p_job_postings_public_read on public.job_postings
  for select
  to anon, authenticated
  using (
    status = 'open'
    and (closes_at is null or closes_at > now())
  );

-- super_admin: 전체 (draft / closed 포함).
drop policy if exists p_job_postings_super_admin_all on public.job_postings;
create policy p_job_postings_super_admin_all on public.job_postings
  for all
  to authenticated
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

-- 6.2 student_applications -------------------------------------------------
-- service_role 전체.
drop policy if exists service_role_all on public.student_applications;
create policy service_role_all on public.student_applications
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- super_admin read (전체 지원 이력).
drop policy if exists p_stu_apps_super_admin_read on public.student_applications;
create policy p_stu_apps_super_admin_read on public.student_applications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles up
       where up.id = auth.uid() and up.is_super_admin = true
    )
  );

-- 학생 self SELECT (status 무관, 본인 지원 이력 전체).
drop policy if exists p_stu_apps_student_select on public.student_applications;
create policy p_stu_apps_student_select on public.student_applications
  for select
  to authenticated
  using (
    student_id = (select student_id from public.user_profiles where id = auth.uid())
  );

-- 학생 self INSERT: student_id = 본인, status='applied' 강제.
-- (RPC apply_to_job_atomic 는 SECURITY DEFINER 로 RLS bypass 하므로 이 policy 는
--  raw insert 시도 차단용 방어선 2차.)
drop policy if exists p_stu_apps_student_insert on public.student_applications;
create policy p_stu_apps_student_insert on public.student_applications
  for insert
  to authenticated
  with check (
    student_id = (select student_id from public.user_profiles where id = auth.uid())
    and status = 'applied'
  );

-- 6.3 recruitment_email_log ------------------------------------------------
drop policy if exists service_role_all on public.recruitment_email_log;
create policy service_role_all on public.recruitment_email_log
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');

-- 7. apply_to_job_atomic RPC (S-9 + S-9b defense) --------------------------
-- SECURITY DEFINER + SET search_path = public.
-- p_student_id 인자 없음. auth.uid() 로 함수 안 조회 → 클라이언트가 타인 student_id
-- 위조 불가 (impersonation 원천 차단).

create or replace function public.apply_to_job_atomic(
  p_job_posting_id uuid,
  p_student_message text,
  p_email_recipient text,
  p_email_subject text,
  p_email_body_template_key text,
  p_email_attachments jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_application_id uuid;
begin
  -- auth.uid() 로 본인 student_id 조회 (S-9b: 클라이언트가 위조 불가).
  select student_id into v_student_id
    from public.user_profiles where id = auth.uid();

  if v_student_id is null then
    raise exception 'notStudent';
  end if;

  -- 자격 재검증 (defense in depth).
  if not exists (
    select 1 from public.students
     where id = v_student_id and status = 'active'
  ) then
    raise exception 'notEligible';
  end if;

  -- job_posting status='open' + closes_at 유효 검증.
  if not exists (
    select 1 from public.job_postings
     where id = p_job_posting_id
       and status = 'open'
       and (closes_at is null or closes_at > now())
  ) then
    raise exception 'postingClosed';
  end if;

  -- 중복 지원 방지 (UNIQUE constraint 로도 방어되나 명확한 에러 코드).
  if exists (
    select 1 from public.student_applications
     where student_id = v_student_id and job_posting_id = p_job_posting_id
  ) then
    raise exception 'alreadyApplied';
  end if;

  -- student_applications INSERT.
  insert into public.student_applications (
    student_id, job_posting_id, status, student_message
  ) values (
    v_student_id, p_job_posting_id, 'applied', p_student_message
  ) returning id into v_application_id;

  -- recruitment_email_log INSERT (같은 트랜잭션).
  insert into public.recruitment_email_log (
    application_id, recipient_email, subject, body_template_key,
    attachments, delivery_status
  ) values (
    v_application_id, p_email_recipient, p_email_subject, p_email_body_template_key,
    p_email_attachments, 'pending'
  );

  return v_application_id;
end;
$$;

comment on function public.apply_to_job_atomic is
  'B0072 원클릭 지원 원자적 처리 (S-9 + S-9b defense). p_student_id 인자 없음 = auth.uid() 로 내부 조회.';

-- GRANT EXECUTE 는 authenticated 만. anon 절대 금지.
revoke all on function public.apply_to_job_atomic from public, anon;
grant execute on function public.apply_to_job_atomic to authenticated;
