-- B0018 Wave 1 T1 운영자 페이지 확장 (Phase 2) 신규 8개 테이블.
--
-- 범위:
--   1) instructors / sessions / attendance / applicant_notes / messages_log /
--      performances / certificates / cash_receipts 신규 테이블.
--   2) applicants 에 redacted_at timestamptz 컬럼 추가 (PII anonymize 트래킹).
--   3) 모든 신규 테이블 RLS enable + service_role 전용 권한 회수.
--   4) PII 일괄 anonymize 헬퍼 함수 anonymize_applicants_past_retention().
--   5) seed: 강사 3명 (이제향/Nino/박성철) + 회차 8개 (토 4 + 일 4).
--
-- 비범위:
--   - applicants 의 기존 컬럼 변경 없음 (status enum 등).
--   - 강사 PII (phone/bank/resident_no/business_no) commit 0. 운영자 in-app 으로 추후 채움.
--   - 회차의 venue/start_time/end_time/instructor_id 도 운영자 추후 채움 (idx/date/day_of_week 만 seed).
--   - pgcrypto 컬럼 단계 암호화는 후속 마이그레이션 대상. 1기는 평문 수용.
--
-- 외부 연동 대비 (모두 nullable, 추후 자동 채워짐 가정):
--   - cash_receipts.hometax_receipt_no  : 홈택스 발급 번호.
--   - certificates.pdf_path             : Vercel Blob URL (Wave 4 PDF 모듈).
--   - performances.confirmation_issued_at: 유니온 픽처스 참여확인서 발급 시점.
--   - instructors.business_no / resident_no: 세금 모드 분기용.
--
-- ON DELETE 정책:
--   PII 파기를 soft anonymize 로 처리 → applicants 는 row 삭제되지 않음.
--   따라서 attendance/applicant_notes/messages_log/performances/certificates/cash_receipts
--   의 applicant_id FK 는 RESTRICT (기본) 로 둠. instructor_id 는 sessions 에서 RESTRICT.
--   sessions <- attendance 는 회차 통째 재배정 시나리오 위해 CASCADE.
--
-- 적용:
--   supabase db push                                       (CLI, 권장)
--   또는 대시보드 SQL editor 에 본 파일 전체 붙여넣기.
--
-- 롤백 SQL (필요 시 수동 실행, seed 포함 row 모두 사라짐 주의):
--   drop function if exists public.anonymize_applicants_past_retention();
--   drop table if exists public.cash_receipts;
--   drop table if exists public.certificates;
--   drop table if exists public.performances;
--   drop table if exists public.messages_log;
--   drop table if exists public.applicant_notes;
--   drop table if exists public.attendance;
--   drop table if exists public.sessions;
--   drop table if exists public.instructors;
--   alter table public.applicants drop column if exists redacted_at;

-- 0. applicants PII 파기 컬럼 ----------------------------------------------
-- 노아 Wave 1 결정 4 (soft anonymize). PII anonymize 완료 시점을 기록.
-- NULL = 아직 미파기. timestamptz = 일괄 anonymize 실행 시각.

alter table public.applicants
  add column if not exists redacted_at timestamptz;

comment on column public.applicants.redacted_at is
  'PII anonymize 실행 시각. NOT NULL 이면 name/email/phone/address/birthdate 가 [redacted] 또는 NULL 로 덮어쓰임 (anonymize_applicants_past_retention 함수 참조).';

create index if not exists applicants_redacted_at_idx
  on public.applicants (redacted_at)
  where redacted_at is null;

-- 1. instructors -----------------------------------------------------------
-- 강사 마스터. 1기 3명 seed. 정산용 계좌/세금 정보는 운영자가 추후 in-app 채움.

create table if not exists public.instructors (
  id              uuid primary key default gen_random_uuid(),

  name            text not null check (char_length(trim(name)) >= 1),
  day             text not null check (day in ('saturday','sunday')),
  phone           text,
  email           text,

  -- 정산 정보
  bank_name       text,
  bank_account    text,
  bank_holder     text,
  tax_mode        text not null
                    check (tax_mode in ('withholding_3_3','tax_invoice')),
  business_no     text,  -- tax_mode='tax_invoice' 시
  resident_no     text,  -- tax_mode='withholding_3_3' 시 (1기 평문, 추후 pgcrypto)

  -- 강사료 룰
  base_fee_krw      integer not null check (base_fee_krw >= 0),
  bonus_thirty_krw  integer check (bonus_thirty_krw is null or bonus_thirty_krw >= 0),

  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.instructors is
  'B0018 1기 강사 마스터. service_role 전용 RLS.';
comment on column public.instructors.tax_mode is
  'withholding_3_3 = 개인 (원천징수 3.3%) / tax_invoice = 사업자 (세금계산서).';
comment on column public.instructors.base_fee_krw is
  '20명+ 기준 기본 강사료. 25/30명 보너스는 bonus_thirty_krw 또는 별도 계산.';

drop trigger if exists instructors_set_updated_at on public.instructors;
create trigger instructors_set_updated_at
  before update on public.instructors
  for each row execute function public.set_updated_at();

-- 2. sessions --------------------------------------------------------------
-- 8회차 강의 스케줄. idx 1~8 유니크. day_of_week 는 토/일 반 분리.

create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  idx             smallint not null unique check (idx between 1 and 8),
  date            date not null,
  day_of_week     text not null check (day_of_week in ('saturday','sunday')),
  instructor_id   uuid references public.instructors(id) on delete restrict,
  venue           text,
  start_time      time,
  end_time        time,
  topic           text,
  notes           text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.sessions is
  'B0018 8회차 강의 스케줄. idx 1~8 유니크 (토/일 반 통합 회차 번호).';

drop trigger if exists sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- 3. attendance ------------------------------------------------------------
-- 회차별 신청자 출결. 디폴트 present (노아 결정 12, 디폴트 출석 + 결석자만 토글).
-- late_minutes 30 이상 = 운영자가 결석으로 판단 (애플리케이션 레이어).

create table if not exists public.attendance (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references public.applicants(id) on delete restrict,
  session_id      uuid not null references public.sessions(id) on delete cascade,
  attended        boolean not null default true,
  late_minutes    smallint check (late_minutes is null or late_minutes >= 0),
  note            text,
  recorded_by     text not null default 'noah',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz,

  unique (applicant_id, session_id)
);

comment on table public.attendance is
  'B0018 회차별 출결. 디폴트 attended=true, 결석자만 false 토글. UNIQUE(applicant_id, session_id).';

drop trigger if exists attendance_set_updated_at on public.attendance;
create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function public.set_updated_at();

create index if not exists attendance_session_applicant_idx
  on public.attendance (session_id, applicant_id);

-- 4. applicant_notes -------------------------------------------------------
-- applicants.notes 단일 컬럼을 대체할 시간순 노트 로그.

create table if not exists public.applicant_notes (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid not null references public.applicants(id) on delete restrict,
  body            text not null check (char_length(trim(body)) >= 1),
  created_by      text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.applicant_notes is
  'B0018 신청자별 운영자 메모. applicants.notes 의 시간순 후속 테이블.';

drop trigger if exists applicant_notes_set_updated_at on public.applicant_notes;
create trigger applicant_notes_set_updated_at
  before update on public.applicant_notes
  for each row execute function public.set_updated_at();

create index if not exists applicant_notes_applicant_created_idx
  on public.applicant_notes (applicant_id, created_at desc);

-- 5. messages_log ----------------------------------------------------------
-- 모든 발송 audit. broadcast 도 포함 (노아 결정 6, 이메일 BCC only).

create table if not exists public.messages_log (
  id              uuid primary key default gen_random_uuid(),
  applicant_id    uuid references public.applicants(id) on delete restrict,
  channel         text not null
                    check (channel in ('email','sms','kakao_channel','kakao_alimtalk')),
  direction       text not null
                    check (direction in ('individual','broadcast')),
  template_id     text,
  subject         text,
  body_excerpt    text,
  sent_at         timestamptz not null default now(),
  sent_by         text,
  recipient_count smallint not null default 1 check (recipient_count >= 1),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

comment on table public.messages_log is
  'B0018 발송 audit. direction=broadcast 면 applicant_id NULL 가능 (운영자 BCC 일괄 발송 1 row).';
comment on column public.messages_log.body_excerpt is
  '본문 앞 200자 정도. 전체 본문은 저장 X (PII 최소화).';

drop trigger if exists messages_log_set_updated_at on public.messages_log;
create trigger messages_log_set_updated_at
  before update on public.messages_log
  for each row execute function public.set_updated_at();

create index if not exists messages_log_applicant_sent_idx
  on public.messages_log (applicant_id, sent_at desc);

-- 6. performances ----------------------------------------------------------
-- 공연 매칭 + 일당 + 유니온 픽처스 참여확인서 발급 트래킹.

create table if not exists public.performances (
  id                       uuid primary key default gen_random_uuid(),
  applicant_id             uuid not null references public.applicants(id) on delete restrict,
  event_name               text not null check (char_length(trim(event_name)) >= 1),
  event_date               date not null,
  role                     text,
  daily_fee_krw            integer not null check (daily_fee_krw >= 0),
  paid_at                  timestamptz,
  confirmation_issued_at   timestamptz,
  notes                    text,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz
);

comment on table public.performances is
  'B0018 수료생 공연 매칭. confirmation_issued_at 채워지면 유니온 픽처스 참여확인서 발급 완료.';

drop trigger if exists performances_set_updated_at on public.performances;
create trigger performances_set_updated_at
  before update on public.performances
  for each row execute function public.set_updated_at();

create index if not exists performances_applicant_idx
  on public.performances (applicant_id);

-- 7. certificates ----------------------------------------------------------
-- 수료증 + 공연 참여확인서. PII 파기 후에도 발급 사실/이름 스냅샷 유지.

create table if not exists public.certificates (
  id                        uuid primary key default gen_random_uuid(),
  applicant_id              uuid not null references public.applicants(id) on delete restrict,
  type                      text not null check (type in ('completion','performance')),
  serial_no                 text not null unique,
  issued_at                 timestamptz not null default now(),
  issued_by                 text,
  pdf_path                  text,
  recipient_name_snapshot   text not null check (char_length(trim(recipient_name_snapshot)) >= 1),
  cohort_label              text not null default '1기',

  created_at                timestamptz not null default now(),
  updated_at                timestamptz
);

comment on table public.certificates is
  'B0018 수료증/참여확인서 발급. recipient_name_snapshot 으로 PII 파기 후에도 발급 사실 유지.';
comment on column public.certificates.serial_no is
  '일련번호 (예: FTP-2026-1-001). 발급 주체 별로 충돌 없도록 prefix 포함.';
comment on column public.certificates.pdf_path is
  'Vercel Blob URL. Wave 4 의 PDF 모듈이 채움. 본 마이그레이션 시점엔 NULL OK.';

drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at
  before update on public.certificates
  for each row execute function public.set_updated_at();

create index if not exists certificates_applicant_idx
  on public.certificates (applicant_id);

-- 8. cash_receipts ---------------------------------------------------------
-- 현금영수증 발급 audit (노아 결정 1, 2 - 자진발급 + 홈택스 수동).

create table if not exists public.cash_receipts (
  id                  uuid primary key default gen_random_uuid(),
  applicant_id        uuid not null references public.applicants(id) on delete restrict,
  amount_krw          integer not null check (amount_krw >= 0),
  issued_at           timestamptz not null default now(),
  issued_by           text,
  hometax_receipt_no  text,
  notes               text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

comment on table public.cash_receipts is
  'B0018 현금영수증 자진발급 audit. hometax_receipt_no 는 운영자가 홈택스에서 발급 후 수동 입력.';
comment on column public.cash_receipts.hometax_receipt_no is
  '홈택스 발급 번호. 1기 수동 입력, 추후 API 연동 시 자동 채움.';

drop trigger if exists cash_receipts_set_updated_at on public.cash_receipts;
create trigger cash_receipts_set_updated_at
  before update on public.cash_receipts
  for each row execute function public.set_updated_at();

create index if not exists cash_receipts_applicant_idx
  on public.cash_receipts (applicant_id);

-- 9. RLS + 권한 -----------------------------------------------------------
-- 모든 신규 테이블 service_role 전용 (applicants 와 동일 패턴).

alter table public.instructors      enable row level security;
alter table public.sessions         enable row level security;
alter table public.attendance       enable row level security;
alter table public.applicant_notes  enable row level security;
alter table public.messages_log     enable row level security;
alter table public.performances     enable row level security;
alter table public.certificates     enable row level security;
alter table public.cash_receipts    enable row level security;

-- 정책 명시 없음 → anon / authenticated select/insert/update/delete 모두 거부.
-- service_role 만 RLS 우회 (서버 액션 전용).

revoke all on public.instructors      from anon, authenticated;
revoke all on public.sessions         from anon, authenticated;
revoke all on public.attendance       from anon, authenticated;
revoke all on public.applicant_notes  from anon, authenticated;
revoke all on public.messages_log     from anon, authenticated;
revoke all on public.performances     from anon, authenticated;
revoke all on public.certificates     from anon, authenticated;
revoke all on public.cash_receipts    from anon, authenticated;

grant all on public.instructors       to service_role;
grant all on public.sessions          to service_role;
grant all on public.attendance        to service_role;
grant all on public.applicant_notes   to service_role;
grant all on public.messages_log      to service_role;
grant all on public.performances      to service_role;
grant all on public.certificates      to service_role;
grant all on public.cash_receipts     to service_role;

-- 10. PII 일괄 anonymize 헬퍼 ---------------------------------------------
-- 노아 Wave 1 결정 3, 4, 5 - 종강 +6개월 후 soft anonymize, 운영자 수동 트리거.
-- 조건: status 가 enrolled/cancelled/refunded 중 하나이고
--       payment_confirmed_at 또는 cancelled_at 또는 refunded_at 중 하나가 6개월 이전,
--       그리고 아직 redacted_at IS NULL.
-- 동작: name/email/phone/address 를 '[redacted]' 로, birthdate 는 NULL 로 덮어쓰고
--       redacted_at 을 now() 로 기록.
-- 반환: 처리된 row 수.

create or replace function public.anonymize_applicants_past_retention()
returns table (anonymized_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with target as (
    select id
    from public.applicants
    where redacted_at is null
      and status in ('enrolled','cancelled','refunded')
      and (
        (payment_confirmed_at is not null and payment_confirmed_at < now() - interval '6 months')
        or (cancelled_at is not null and cancelled_at < now() - interval '6 months')
        or (refunded_at  is not null and refunded_at  < now() - interval '6 months')
      )
  ), updated as (
    update public.applicants a
       set name        = '[redacted]',
           email       = '[redacted]',
           phone       = '[redacted]',
           address     = '[redacted]',
           birthdate   = null,
           redacted_at = now()
      from target
     where a.id = target.id
    returning a.id
  )
  select count(*)::integer into v_count from updated;

  return query select v_count;
end;
$$;

comment on function public.anonymize_applicants_past_retention is
  'B0018 PII 파기 헬퍼. 운영자 페이지 [일괄 anonymize] 액션에서 호출. 6개월 경과 + status 종료 + 미파기 row 만 처리.';

revoke all on function public.anonymize_applicants_past_retention() from public, anon, authenticated;
grant execute on function public.anonymize_applicants_past_retention() to service_role;

-- 11. seed: 강사 3명 -------------------------------------------------------
-- 노아 결정 8 (tax_mode 컬럼 추가). PII 정보 commit 0 → 운영자 in-app 으로 추후 채움.
-- base_fee_krw 는 1기 계약서 §7 의 20명+ 기준 250만원 가정 (운영자 추후 in-app 조정 가능).
-- tax_mode 는 NOT NULL → 임시 'withholding_3_3' 으로 seed. 사업자 강사 확정 시 in-app 수정.

insert into public.instructors (name, day, tax_mode, base_fee_krw)
  values
    ('이제향',     'saturday', 'withholding_3_3', 2500000),
    ('Nino',       'sunday',   'withholding_3_3', 2500000),
    ('박성철',     'sunday',   'withholding_3_3', 2500000)
  on conflict do nothing;

-- 12. seed: sessions 8회 --------------------------------------------------
-- 토요일반: 6/27, 7/4, 7/11, 7/18 (idx 1, 3, 5, 7)
-- 일요일반: 6/28, 7/5, 7/12, 7/19 (idx 2, 4, 6, 8)
-- venue/start_time/end_time/instructor_id 는 운영자 추후 in-app 채움.

insert into public.sessions (idx, date, day_of_week)
  values
    (1, '2026-06-27', 'saturday'),
    (2, '2026-06-28', 'sunday'),
    (3, '2026-07-04', 'saturday'),
    (4, '2026-07-05', 'sunday'),
    (5, '2026-07-11', 'saturday'),
    (6, '2026-07-12', 'sunday'),
    (7, '2026-07-18', 'saturday'),
    (8, '2026-07-19', 'sunday')
  on conflict (idx) do nothing;
