-- B0081 verify URL opaque token 도입 (2026-07-19)
--
-- 목적:
--   - 기존 verify URL: growthcareer.xyz/verify/GC-FTP-1기-003
--   - 문제: predictable + 한글 percent-encoding 노이즈 + PII (기수/순번) 유출 신호
--   - 신규 URL: growthcareer.xyz/verify/kt7f9p2m4x  (10자 opaque nanoid)
--   - serial_no (GC-FTP-1기-003) 는 수료증 UI 표기 자산으로 유지
--
-- 원칙:
--   - verify_token 은 opaque. 형식·순번 유추 불가.
--   - serial_no 는 인쇄물·수료증 이미지 UI 에 계속 표기 (변경 X).
--   - Backward compat: 기존 serial_no 로 verify URL 접근했을 때도 조회 가능
--     (application layer 에서 fallback).
--
-- 마이그레이션 안전성:
--   - 1기 아직 발급 X. certificates row 사실상 0. backfill = 영향 없는 safety net.
--   - additive 컬럼 + unique partial index → 기존 데이터 zero-risk.
--   - NOT NULL 강제는 backfill 후 진행 (기존 row 없어 안전).
--
-- 사전 조건: certificates 테이블 존재 (20260705000000 마이그레이션 이후).
-- 카피 부호 §6.5: em dash / interpunct / 곡선 따옴표 없음.

-- ---------------------------------------------------------------------------
-- 1. verify_token 컬럼 추가
-- ---------------------------------------------------------------------------

alter table public.certificates
  add column if not exists verify_token text;

comment on column public.certificates.verify_token is
  '10자 opaque nanoid (A-Za-z0-9). verify URL 에 사용. serial_no 는 UI 표기 전용.';

-- ---------------------------------------------------------------------------
-- 2. UNIQUE partial index (null 은 허용, 실 값은 유일)
-- ---------------------------------------------------------------------------

create unique index if not exists certificates_verify_token_uidx
  on public.certificates (verify_token)
  where verify_token is not null;

comment on index public.certificates_verify_token_uidx is
  'verify URL 조회 단일 매칭 보장. nanoid 충돌 시 INSERT 실패 → 애플리케이션 retry.';

-- ---------------------------------------------------------------------------
-- 3. 기존 row 백필 (safety net — 실제로는 대상 0)
-- ---------------------------------------------------------------------------
-- 1기 아직 발급 X 라 대상 row 없음. 그러나 어떤 이유로든 남아있는 row 있으면
-- 마이그레이션이 NOT NULL 강제에서 실패하지 않도록 hex 백필.
-- hex 는 16자, 애플리케이션 발급의 10자 nanoid 와 형식 다름 (구분 가능).

update public.certificates
   set verify_token = encode(gen_random_bytes(8), 'hex')
 where verify_token is null;

-- ---------------------------------------------------------------------------
-- 4. NOT NULL 강제 (모든 row 채운 후)
-- ---------------------------------------------------------------------------
-- 향후 INSERT 는 애플리케이션 layer 에서 verify_token 필수 생성.

alter table public.certificates
  alter column verify_token set not null;
