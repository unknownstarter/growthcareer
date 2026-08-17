-- 주소(거주 지역)는 선택값으로 전환 (2기 신청 폼). 도시/구 수준만 적어도 되게 하고,
-- 미입력 시 null 저장. 스키마(domain/application.ts)에서 address 를 optional 로 relax 한 것과 짝.
-- 기존 not null + check(char_length(trim) >= 2) 제거.
--
-- 회귀 안전:
--   1기 폼은 항상 address 값을 채워 전송 → 여전히 정상 저장 (relax 는 완화 방향).
--   anonymize_applicants_past_retention 은 address 를 '[redacted]' (비-null) 로 덮어쓰므로 무관.

alter table applicants
  alter column address drop not null;

-- check constraint 이름은 PostgreSQL 기본 명명 규칙: <table>_<column>_check.
alter table applicants
  drop constraint if exists applicants_address_check;
