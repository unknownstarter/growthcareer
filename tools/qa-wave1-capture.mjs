#!/usr/bin/env node
/**
 * B0018 Wave 1 QA — 캡처 launcher.
 *
 * preview-broadcast.mjs 를 PREVIEW_USE_START=1 로 호출 → `next start` 사용
 * (사전 빌드 .next/ 필요). 기존 next dev 가 .next/dev/lock 점유 중이거나
 * 죽었을 때 회피 경로.
 *
 * 사용:
 *   pnpm build              # 사전 빌드
 *   node tools/qa-wave1-capture.mjs
 *
 * 출력: docs/screenshots/broadcast/*.png (mobile + desktop × 8 시나리오)
 *   - list-{vp}.png            : 기본 신청자 리스트
 *   - selected-{vp}.png        : 체크박스 3건 선택 상태
 *   - dialog-empty-{vp}.png    : 다중 발송 모달 (빈 제목/본문)
 *   - dialog-filled-{vp}.png   : 다중 발송 모달 (제목 + 본문 입력)
 *   - pii-warning-{vp}.png     : PII 파기 1단계 (warning)
 *   - pii-confirm-{vp}.png     : PII 파기 2단계 (ANONYMIZE 입력 완료)
 *   - cash-receipt-{vp}.png    : 현금영수증 drawer (paid row)
 *   - history-{vp}.png         : 발송 이력 drawer (2건)
 */
process.env.PREVIEW_USE_START = "1";
process.env.PREVIEW_BASE_URL =
  process.env.PREVIEW_BASE_URL ?? "http://localhost:4327";
process.env.PREVIEW_PORT = process.env.PREVIEW_PORT ?? "4327";
await import("./preview-broadcast.mjs");
