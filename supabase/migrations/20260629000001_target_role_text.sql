-- B0064 후속 — 노아 룰 (2026-06-29): "타겟롤 매칭 실패면 원본 데이터 그대로 저장"
--
-- student_career_target.target_role_text 컬럼 추가.
-- enum (target_role_category) 매칭 실패 시 원본 텍스트 보존 — 운영자 수동 정정 X.
-- 매칭 성공 시 enum + text 둘 다 채울 수 있음 (text 가 추가 context).

alter table public.student_career_target
  add column if not exists target_role_text text
    check (target_role_text is null or char_length(target_role_text) <= 200);

comment on column public.student_career_target.target_role_text is
  'B0064 docx import 후속. enum 매칭 실패 시 학생 입력 원본 보존 (예: "공연 PD + A&R 병행"). 200자 cap.';
