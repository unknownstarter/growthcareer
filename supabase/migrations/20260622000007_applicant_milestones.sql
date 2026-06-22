-- B0042 applicant_milestones — 수강생 운영 마일스톤 (가이드 발송 / 첨삭 완료 / etc).
--
-- applicant 기준 status enum (pending/paid/...) 와 별개로 운영자가 click 으로 켰다 껐다
-- 하는 "단계 체크" 표시. 향후 다음 기수에도 재활용.
--
-- 1기 한정 milestone types:
--   - 'guide_sent'      — 첫 수업 안내 (cohortKickoff) 이메일 발송 완료
--   - 'feedback_done'   — 이력서/자소서/포폴 첨삭 완료
--
-- 출석 (attendance) 은 별도 entity (sessions × students × attendance row). 본 테이블 X.

create table if not exists public.applicant_milestones (
  applicant_id   uuid not null references public.applicants(id) on delete cascade,
  milestone_type text not null
                   check (char_length(trim(milestone_type)) >= 1 and char_length(milestone_type) <= 60),
  marked_at      timestamptz not null default now(),
  marked_by      text,
  notes          text,
  primary key (applicant_id, milestone_type)
);

comment on table public.applicant_milestones is
  'B0042 applicant 별 운영 milestone (status enum 외 추가 단계). 운영자 click 토글 — INSERT/DELETE 로 set/unset.';
comment on column public.applicant_milestones.milestone_type is
  '운영 단계 식별자 (guide_sent / feedback_done / ...). 향후 자유 추가.';
comment on column public.applicant_milestones.marked_at is
  '마지막 토글 시각 (INSERT default now). 해제하면 row 삭제 (history 안 보존).';
comment on column public.applicant_milestones.marked_by is
  '토글한 운영자 식별자 (현재 단일 운영자 → noah 고정).';

create index if not exists applicant_milestones_applicant_idx
  on public.applicant_milestones (applicant_id);

-- RLS
alter table public.applicant_milestones enable row level security;
revoke all on public.applicant_milestones from anon, authenticated;
grant all on public.applicant_milestones to service_role;

drop policy if exists service_role_all on public.applicant_milestones;
create policy service_role_all on public.applicant_milestones
  for all
  using (auth.jwt() ->> 'role' = 'service_role')
  with check (auth.jwt() ->> 'role' = 'service_role');
