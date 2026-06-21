# Lessons Learned

사고 직후 RCA + 재발 방지 패턴 박제. 형식: `YYYY-MM-DD-<slug>.md`.

## 작성 룰

1. **사고 직후 7일 내 작성**. 기억이 흐려지기 전.
2. 필수 섹션: **무슨 일이 있었나** / **왜 일어났나** / **어떻게 막을까**
3. "어떻게 막을까" 의 모든 항목은 **반드시 CLAUDE.md 룰 / 에이전트 prompt / settings.json hook / 새 skill** 중 하나로 역반영. 미반영 lesson 은 사고로 간주.
4. 본 README 의 인덱스 표에 한 줄 추가 + 역반영 상태 체크박스.

## 인덱스

| 날짜 | 사고 / lesson | 역반영 위치 | 상태 |
|---|---|---|---|
| 2026-06-04 | [pnpm preview 가 docs/screenshots/ 를 wipe](./2026-06-04-preview-wipes-screenshots.md) | `tools/preview.mjs` clearOutDirFiles + memory `feedback_preview_wipes_screenshots` | ✅ |
| 2026-06-09 | [Sage 검토 결과 전 production 배포](./2026-06-09-sage-review-skipped.md) | CLAUDE.md §2 phase 9 prerequisite + §7.4 / memory `feedback_sage_block_before_deploy` | ✅ |
| 2026-06-09 | [Basic Auth logout/timeout 본질적 한계](./2026-06-09-basic-auth-logout-limitations.md) | middleware realm rotation / memory `feedback_basic_auth_limitations` / BACKLOG B0029 | ✅ |
| 2026-06-09 | [vercel CLI 과다 호출로 일일 quota 도달](./2026-06-09-vercel-cli-overuse.md) | CLAUDE.md §7 git push default 룰 / memory `feedback_vercel_cli_overuse` | ✅ |
| 2026-06-22 | [SSG 정적 빌드 캐시로 마감 자동 전환 누락](./2026-06-22-ssg-cache-blocks-deadline-transition.md) | `dynamic = "force-dynamic"` hotfix + CLAUDE.md §7 시간 기반 페이지 룰 박제 | ✅ |

## 다음 사고 발생 시

1. `YYYY-MM-DD-<incident-slug>.md` 작성 (위 3 섹션 + 관련 박제 링크)
2. 본 README 인덱스 표 갱신
3. 역반영 위치 명시. 없으면 만들기 (CLAUDE.md 룰 추가 / agent prompt / hooks)
4. 역반영 후 ✅ 체크. 미완은 ❌ — 다음 세션 시작 시 우선 처리
