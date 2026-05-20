-- 동의 항목 3분리.
-- - consent (기존)      : 개인정보 수집·이용 동의 (필수, 폼 체크박스 1번)
-- - consent_attendance  : 출석 약속 + 환불·수료 규정 확인 (필수, 폼 체크박스 2번)
-- - consent_content_use : 영상·이미지 활용 (수강 신청 완료 시 자동 true 간주 — 회색 안내로 고지)
--
-- 기존 row 는 backfill 로 모두 true (기존 가입자는 한 번에 동의한 것으로 간주).
-- 향후 분쟁 시 운영진에게 통보 → 얼굴 후처리/블러 처리 약속을 동의 문구에 명문화.

alter table public.applicants
  add column if not exists consent_attendance boolean,
  add column if not exists consent_content_use boolean;

-- 기존 row backfill (consent 동의했으니 일관성 유지)
update public.applicants
  set consent_attendance  = coalesce(consent_attendance, consent),
      consent_content_use = coalesce(consent_content_use, consent)
  where consent_attendance is null
     or consent_content_use is null;

-- 이후 INSERT 는 NOT NULL + true 강제
alter table public.applicants
  alter column consent_attendance  set not null,
  alter column consent_attendance  set default false,
  alter column consent_content_use set not null,
  alter column consent_content_use set default false;

alter table public.applicants
  add constraint applicants_consent_attendance_true
    check (consent_attendance = true);

-- consent_content_use 는 CHECK 강제 안 함 — 수강 신청 시점에 자동 true 박지만
-- 향후 사용자가 "철회" 신청 시 false 로 업데이트할 수 있어야 함.
