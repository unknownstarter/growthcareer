-- B0069 Slice 1 — applicants.previous_applicant_id 신설 (1기 재지원 인식).
--
-- Why: 1기 신청자가 2기에 재지원하는 흐름을 인식. 회원가입 없이 이메일 매칭
-- 만으로 "이 사람은 1기 때 신청했었다" 를 서버가 파악. 운영자 리스트 "이력"
-- 컬럼에 badge 로 노출 (1기 수료생 / 1기 신청 / 신규).
--
-- Design decision (Iris):
--   - Option A: previous_applicant_id 컬럼 (uuid FK)                   ← 채택
--   - Option B: metadata jsonb (has_previous / previous_status ...)   ← 조회 편의 낮음
--   - Option C: 이메일 자체 재검색 (컬럼 없음, view 로 join)          ← 매 조회마다 seq scan
--
-- A 채택 이유:
--   1) INSERT 시점 1회 lookup → 이후 JOIN 편함 (SELECT applicants a
--      LEFT JOIN applicants prev ON prev.id = a.previous_applicant_id).
--   2) 감사 명확 — 어떤 특정 row 가 previous 인지 링크로 못박음. 이메일 변경
--      (오타 정정 / rebind) 시에도 링크 유지.
--   3) 다른 metadata (previous_status, previous_cohort_id) 는 JOIN 으로 얻음.
--      중복 저장 X → single source of truth.
--
-- 매칭 규칙 (submit-application 에서 실행):
--   - 신규 신청 이메일과 완전 일치하는 applicants row 중 가장 최근 것
--   - status IN ('paid','enrolled','notified','pending','overdue','cancelled','refunded')
--     — next_cohort_interest 는 매칭 대상 X (그 자체가 대기 상태)
--   - 자기 자신은 아직 INSERT 되기 전이므로 자동 제외
--
-- 롤백 SQL:
--   drop index if exists applicants_previous_idx;
--   alter table public.applicants drop column if exists previous_applicant_id;

alter table public.applicants
  add column if not exists previous_applicant_id uuid
    references public.applicants(id) on delete set null;

comment on column public.applicants.previous_applicant_id is
  'B0069 1기 재지원 인식. 이메일 매칭된 이전 applicant row 링크 (있으면). NULL = 신규 지원자.';

create index if not exists applicants_previous_idx
  on public.applicants (previous_applicant_id)
  where previous_applicant_id is not null;
