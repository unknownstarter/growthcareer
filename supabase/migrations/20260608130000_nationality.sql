-- 국적 컬럼 추가. Step 1 에서 필수로 수집하지만 기존 row 는 채울 수 없으므로 nullable.
-- 향후 운영자 페이지에서 통계 / 비자 매칭 보조 자료로 사용.

alter table applicants
  add column if not exists nationality text;

comment on column applicants.nationality is
  '신청자가 입력한 국적 (자유 텍스트). Step 1 필수 (2026-06-08 이후). 이전 row 는 null.';
