-- 노아 룰 (2026-07-04): 학생 프로필에 국적 입력 컬럼 없음. 추가.
--
-- applicants.nationality 는 신청 시 원본. student_profile.nationality 는
-- 학생 본인이 수정 가능한 사본. UI 는 student_profile 우선, 없으면 applicants
-- fallback (이력서 PDF 등).

alter table public.student_profile
  add column if not exists nationality text
    check (nationality is null or char_length(nationality) <= 100);

comment on column public.student_profile.nationality is
  '국적. applicants.nationality 는 신청 원본, 본 컬럼은 학생 수정 가능 사본.';
