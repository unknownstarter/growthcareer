-- 학교는 선택값으로 전환. 학생이 아닌 신청자 (재직자/타국 거주자/무소속) 도 신청 가능.
-- 기존 not null + check(char_length >= 2) 제거.

alter table applicants
  alter column university drop not null;

-- check constraint 이름은 PostgreSQL 기본 명명 규칙: <table>_<column>_check.
alter table applicants
  drop constraint if exists applicants_university_check;
