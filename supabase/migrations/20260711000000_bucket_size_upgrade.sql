-- B0067 Signed Upload URL slice 1 — bucket size upgrade.
--
-- 배경 (2026-07-11):
--   Vercel Server Action bodySizeLimit (실질 4.5MB, config 로 상향해도 100MB 상한)
--   때문에 강의 자료 = 100MB, 이력서/포트폴리오 = 50MB 로 제한돼 있었음. 강사가
--   실제 강의 녹화 mp4 / 대용량 PPTX 를 올리려 하면 실패. B0067 Iris slice 1 에서
--   client direct upload (Supabase signed upload URL) 방식 도입 — Vercel 우회.
--
-- 변경:
--   1) lecture-materials: 100MB (104857600) → 500MB (524288000)
--   2) career-documents:  이미 50MB (52428800) 유지 — 상향 불필요 (스펙 목표 = 50MB)
--
-- 왜 500MB (500 * 1024 * 1024 = 524288000)?
--   - 1기 실제 upload 자료 통계: 최대 300MB PPTX (강의 슬라이드 + 임베드 영상).
--   - 안전 마진 + 향후 강의 녹화 mp4 대응.
--   - Supabase Storage 는 기본 5TB/버킷. 500MB per file 은 충분히 안전.
--
-- Client direct upload 구현 세부:
--   - server action `create-signed-upload-url.ts` (신규 2개) 가
--     `createSignedUploadUrl(path)` 로 token 발급.
--   - client 가 signed URL 로 PUT 직접. Vercel Function 우회.
--   - 완료 후 finalize server action 이 Storage 확인 + DB row INSERT.
--
-- Sage 검토 대상:
--   - Storage RLS 무변경 확인 — service_role only 유지. signed upload URL 은 별도
--     endpoint (token 인증) 라 authenticated 정책 추가 불필요.
--   - path traversal 방어는 server (create-signed action) 에서 fileName sanitize.
--   - MIME 재검증은 finalize action 에서 (career 만 — bucket-level whitelist 있음).
--
-- 롤백 (수동, prod 에서 문제 발생 시):
--   update storage.buckets set file_size_limit = 104857600 where id = 'lecture-materials';
--   -- career-documents 는 변경 없음.

-- 1. lecture-materials cap 상향 ---------------------------------------------

update storage.buckets
   set file_size_limit = 524288000  -- 500 MB
 where id = 'lecture-materials';

-- 2. career-documents 는 이미 50MB — no-op ---------------------------------
-- (20260628000000_student_photo_and_caps.sql 에서 이미 52428800 = 50MB 로 상향됨.)

-- 3. 확인 쿼리 (수동 실행용, 마이그레이션엔 no-op) --------------------------
-- select id, file_size_limit from storage.buckets where id in ('lecture-materials','career-documents');
