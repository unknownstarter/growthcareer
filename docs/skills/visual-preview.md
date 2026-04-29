# Skill: Visual Preview (자체 스크린샷 검증)

> 사용자에게 *"`pnpm dev` 띄우고 확인하세요"* 라고 시키지 말 것.
> 항상 이 스킬로 직접 캡처해서 보여줄 것. — 사용자 명시 요구 (2026-04-27)

## What

- `tools/preview.mjs` — Playwright 기반 헤드리스 스크린샷 도구.
- 모바일(390×844) + 데스크탑(1440×900) 두 뷰포트, fullPage, 2x DPR.
- 기존 dev 서버(`http://localhost:3000`)가 떠 있으면 **자동 재사용**, 아니면 4321 포트에 직접 spawn.
- 사용자가 띄워둔 서버는 절대 죽이지 않음. 우리가 spawn 한 것만 종료.

## When

다음 시점에 **반드시** 실행:
- UI/스타일 변경 후 (디자인 시스템, 컴포넌트, 레이아웃)
- 새 섹션·컴포넌트 추가 후
- Phase 7 (Mira 자체 테스트) 시작 시
- 사용자가 "보여줘" / "확인해" 류 요청을 했을 때

## How

```bash
pnpm preview                          # 기본 (/, /kenterbc) × (mobile, desktop)
pnpm preview --routes=/kenterbc       # 특정 라우트만
PREVIEW_BASE_URL=http://localhost:3000 pnpm preview   # 명시적 base URL
PREVIEW_PORT=5555 pnpm preview        # spawn 시 포트 변경
```

출력: `docs/screenshots/<slug>-<viewport>.png`

캡처 후 `Read` 툴로 PNG 읽어 사용자에게 시각적으로 제시.

## Stack

- `playwright@^1.59` (chromium-headless-shell, ~92MB 1회 다운로드, `~/Library/Caches/ms-playwright/`)
- 헤드리스 Chromium, `colorScheme: dark`, `document.fonts.ready` 대기

## Why this exists

`pnpm dev` 를 사용자에게 시키는 것은 두 가지 비용:
1. 사용자 인지 부하 (작업 컨텍스트 깨짐).
2. 우리(에이전트)가 *"동작은 했다"* 라고 추측하게 만듦 — 직접 확인하지 않은 코드.

이 스킬은 두 비용을 0 으로 만든다. 자체 검증한 결과만 보여준다.

## Failure modes & 대처

- **포트 충돌**: 자동 감지 → 기존 서버 재사용.
- **lock 충돌** (`Another next dev server is already running`): 기존 서버를 무시하고 spawn 시도하면 발생. 현재 도구는 fetch 로 헬스체크 후 spawn 결정 → 발생 안 함.
- **폰트 늦은 로드**: `document.fonts.ready` + 500ms buffer.
- **Playwright 미설치**: `pnpm exec playwright install chromium` 한 번 실행.
