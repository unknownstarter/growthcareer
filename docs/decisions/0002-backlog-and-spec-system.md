# ADR 0002 — Backlog & Spec 시스템

**Date**: 2026-06-04
**Status**: Accepted (구조 결정) · Pending (구현 셋업 — 슬래시 커맨드, Aria 인테이크 보강은 다음 차례)
**Deciders**: 사용자(noah) + Aria(PM)

---

## Context

이 프로젝트엔 **영구 백로그 시스템이 없다.**

확인 결과:
- 프로젝트 `.claude/skills/` 비어있음
- 유저 레벨 `~/.claude/skills/` 에 task-master 류 스킬 없음
- `BACKLOG.md`, `ROADMAP.md`, `TODO.md` 없음
- Linear / Jira / Github Issues 미사용
- 가지고 있는 forward-looking 문서: `prd/fan-to-pro.md` (PRD) 만
- 가지고 있는 backward-looking: `CHANGELOG.md`, `docs/decisions/`, `docs/lessons/`, `docs/research/`
- harness 의 `TaskCreate`/`TaskList` 는 **세션 단위 휘발성** — 영구 백로그 아님

→ 사용자가 머릿속에 들고 있는 "할 일들" 이 어디에도 박혀있지 않음. 미팅 결과·아이디어·구현 후보가 흩어진 채로 잊혀짐.

### 추가 컨텍스트 — CLAUDE.md 12단계 워크플로우와의 연결

CLAUDE.md 는 모든 작업이 12단계 사이클을 따른다고 정의:

```
1 리서치 (Echo)
2 학습 (Echo + 도메인)
3 이해 (Aria + Sophia)
4 설계 (Sophia)
5 플랜 (Aria)
6 구현 (Luna/Iris/Nova)
7 자체테스트 (Mira)
8 리뷰 (Mira + Sophia)
9 배포 (Vera)
10 RCA (Sage + Mira)
11 유사사례 (Echo)
12 재발 방지 (Aria)
```

즉 사용자가 "할 일" 을 던지면 → 1-5단계가 spec 을 만들고 → 그 spec 이 백로그 entry 가 된다. **백로그 = 1-5단계의 산출물.**

문제: 모든 raw 아이디어에 풀 1-5단계 돌리면 시간·토큰이 폭발. 가벼운 capture 와 깊은 spec 의 *2단 인테이크* 가 필요.

---

## Decision

### 1. 2-Tier 인테이크

| Tier | 입력 비용 | 산출물 | 언제 |
|---|---|---|---|
| **T1 — Capture** | 1줄 메모 | `docs/tasks/BACKLOG.md` 의 raw 섹션 | 머릿속에 떠오를 때마다 즉시 |
| **T2 — Spec** | 12단계 1-5단계 풀로 (Echo→Sophia→Aria) | `docs/specs/<slug>.md` + BACKLOG entry 상태 = `specced` | T1 항목을 Now/Next 로 promote 할 때 |

→ T1 은 dump 장. promote 시점에만 비로소 리서치·설계·리스크가 박힌다. promote 결정자 = **사용자 또는 Aria**.

### 2. 파일 레이아웃

```
docs/
  tasks/
    BACKLOG.md          ← 단일 인덱스 파일. Now/Next/Later/Raw 4섹션.
  specs/
    <slug>.md           ← 각 항목의 spec 본문. 항목당 1파일.
    .gitkeep
```

### 3. `BACKLOG.md` 구조

```markdown
# Backlog

> Owner: Aria · Last reviewed: YYYY-MM-DD

## Now  (이번 주 — 작업 중이거나 다음 시작)
- [<id>] <title> · status · owner · → docs/specs/<slug>.md

## Next  (이번 달 — 곧 시작)
- [<id>] <title> · status · → spec

## Later  (언젠가 — 보류·아이디어·장기)
- [<id>] <title> · status · note (왜 보류인지)

## Raw  (T1 dump — 아직 분류·spec 안 됨)
- <id> · <title> · YYYY-MM-DD captured
```

ID 는 단순 증가 정수 (B0001, B0002...). slug 는 kebab-case.

### 4. Spec 문서 템플릿 (T2 산출물)

```markdown
# Spec — <slug>

**Backlog ID**: B0000
**Date**: YYYY-MM-DD
**Lead**: Aria
**Status**: specced | approved | in-progress | done

## Why
사용자 가치 · 제약 · 비즈니스 임팩트

## Problem
Aria + Sophia 가 정의한 정확한 문제

## Options
Sophia 가 본 설계 옵션 2-3개 (각각 장단점)

## Recommended
선택한 옵션 + 이유

## Feasibility
개발 가능성: easy / medium / hard + 근거

## Risks
잠재 리스크 + 완화책 (Sage 코멘트 가능)

## Effort
러프 작업량: hours / days

## Done When
검증 기준 — Mira 가 검사할 항목

## Open Questions
사용자 결정 필요 항목

## Sources
Echo 가 모은 외부 자료
```

### 5. Aria 의 인테이크 책임 (CLAUDE.md / agent prompt 보강 필요)

Aria 는 다음을 자동 수행한다:
- 사용자가 새 할 일 언급 → T1 인테이크 (raw 섹션에 1줄 추가, ID 부여)
- 사용자가 "이거 spec 만들어" / "promote 해" 요청 → T2 디스패치 (Echo → Sophia → Aria 순)
- 작업 완료 시 BACKLOG entry → CHANGELOG 이관 + spec status = done

이 책임 부여는 `.claude/agents/aria.md` 보강으로 별도 시행 (Pending).

### 6. (향후) 슬래시 커맨드 / 스킬화

다음 4개 슬래시 커맨드를 `.claude/skills/task-master.md` 로 박제 가능 — *지금은 아니고* 향후:

```
/intake "<title>"         T1 인테이크
/spec <id>                T2 디스패치 (Echo → Sophia → Aria)
/promote <id> now|next|later
/done <id>                BACKLOG → CHANGELOG 이관
```

수동 운영이 일주일 이상 익숙해진 후 패턴 굳어지면 스킬화. 너무 일찍 자동화하면 워크플로우가 굳기 전에 박제됨.

---

## Consequences

### Positive

- 머릿속 할 일이 영구 저장됨 (휘발 방지)
- 사용자가 "회의 내용 복붙" 같은 dump 를 안전하게 받을 그릇 생김 (이게 본 결정의 직접 트리거)
- 1-5단계 워크플로우가 *어떤 산출물* 을 만드는지 명확 — spec 문서
- raw → specced → in-progress → done 의 상태 흐름이 보임
- ADR / lesson / spec / research 가 같은 레벨의 문서 체계로 정리됨 (모두 `docs/` 하위 의미있는 위치)

### Negative

- 새 문서 폴더 2개 추가 (`docs/tasks/`, `docs/specs/`)
- markdown 만으로는 *모바일 / 외부 협업자 / 한 화면에 다 묶어보기* 불가
- → 이게 사용자가 다음에 논의하고 싶다고 한 **운영 어드민** 의 필요성으로 이어짐 (별도 결정으로 보류 중)

### Open

- **운영 어드민 ADR (0003 예정)** — 본 ADR 의 markdown 기반 spec 본문은 *유지* 하되, 백로그 *메타* (id, title, status, lane) 는 Supabase 로 옮기고 어드민 UI 에서 관리하는 하이브리드 방향이 유력. 별도 ADR 로 결정.
- **Aria.md 보강** — 위 5번의 책임을 prompt 에 박는 작업. Pending.
- **CHANGELOG 자동 이관 규칙** — done 시 CHANGELOG entry 가 어느 섹션(Added/Changed/Fixed)으로 가는지의 매핑 룰. Aria 가 spec 의 Why·Recommended 를 보고 분류. 추후 정형화 가능.

---

## Related

- CLAUDE.md — 12단계 표준 워크플로우 (`§2`)
- `.claude/agents/aria.md` — Aria 페르소나 (인테이크 책임 추가 필요)
- `docs/decisions/0001-stack-and-design-decisions.md` — 1차 결정
- `docs/research/cowork-partnership-tracking.md` — 본 시스템의 첫 사용처 (코워크 트래킹 = 첫 spec 후보)
