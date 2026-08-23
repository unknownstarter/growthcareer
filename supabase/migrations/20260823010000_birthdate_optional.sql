-- birthdate 를 선택값으로 전환 (NOT NULL 제거).
--
-- 이유:
--  1) 신청 폼에서 생년월일은 선택 항목이다 (어드민 표시용일 뿐, 수료증/자격 판정
--     /나이 게이트 등 필수 용도가 전혀 없음). NOT NULL 이면 미입력 시 INSERT 가
--     터져 신청 자체가 실패한다 — "생일 안 썼다고 신청 실패" 는 말이 안 됨
--     (2026-08-23 라이브 폼 마찰 개선 중 발견).
--  2) 이미 anonymize_applicants_past_retention() 이 birthdate = null 로 덮어쓰므로
--     NOT NULL 제약과 모순이었다 (보존기간 만료 익명화가 실패할 수 있던 잠재 버그도 해소).
--
-- university/address 는 앞선 마이그레이션(20260608120000, 20260818000000)에서 이미 nullable.
-- 이로써 폼이 채우는 컬럼 중 필수 DB 제약은 name/email/phone/nationality/visa 만 남는다.

alter table public.applicants alter column birthdate drop not null;
