-- 분석 이벤트 원장 (raw event log).
-- 목적: view / scroll / click / start_apply / completed_apply 를 GA4 와 별개로
-- 우리 DB 에도 적재해 "지금 몇 명이 들어오는지" 를 직접 집계한다.
--
-- 프라이버시: 익명 session_id (클라 생성 랜덤) 만 저장. 이름/이메일 등 PII 없음.
-- completed_apply 도 applicant PII 를 넣지 않고 "완료됐다"는 사실 + 익명 세션만 기록.
-- RLS: anon/authenticated 전면 차단. 서버 라우트(/api/track)의 service_role 만 insert
--      (service_role 은 RLS 우회). 즉 클라이언트는 직접 이 테이블을 못 읽고 못 쓴다.

create table if not exists public.analytics_events (
  id            bigint generated always as identity primary key,
  event_name    text not null,          -- view_recruit_2gi / scroll_recruit_2gi / click_apply_cta_in_recruit_2gi / start_apply / completed_apply
  screen        text,                   -- recruit_2gi
  object        text,                   -- 클릭 대상 (apply_cta, instructor_link 등)
  session_id    text,                   -- 익명 클라 세션 (localStorage gc_sid)
  path          text,                   -- 이벤트 발생 경로
  referrer      text,                   -- document.referrer
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  scroll_depth  int,                    -- scroll 이벤트용 (25/50/75/100)
  user_agent    text,                   -- 디바이스/인앱웹뷰 구분용 (표준 분석 범위)
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_screen_time_idx
  on public.analytics_events (screen, created_at desc);
create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id);

-- RLS 켜고 정책은 만들지 않음 = anon/authenticated 전면 차단.
-- service_role (서버 /api/track) 만 RLS 우회로 insert. 클라 직접 접근 불가.
alter table public.analytics_events enable row level security;
