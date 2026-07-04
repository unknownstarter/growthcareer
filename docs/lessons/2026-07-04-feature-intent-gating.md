# 2026-07-04 — Feature Intent Gating 부재로 UX·데이터 사고 반복

> 노아 지적 (2026-07-04): "왜 이 기능·권한이 있어야 하는지 먼저 고민하고 만들어야 해. 내가 시켜도 그 고민을 하고 나한테 피드백을 주던가 해야지 무조건 내가 하는 말대로 하다간 전체 서비스가 망가질 수 있어."

## 무슨 일이 있었나

지난 2주 (2026-06-20 ~ 2026-07-04) 동안 노아 지시를 그대로 코딩만 하고 "왜?" 를 안 물어봐서 발생한 UX·데이터 사고 8건.

| # | 사례 | 노아가 뭐라 지시 | 내가 뭘 안 물어봤나 | 결과 |
|---|---|---|---|---|
| 1 | 2026-06-28 학생 dashboard 부재 | "post-login redirect 넣어줘" | "로그인 후 학생이 뭘 보고 싶어할까?" | PW 변경 후 **404** — 노아 격노 |
| 2 | 2026-06-27 attendance cell cycle | "출석체크 UI" | "운영자가 강의장에서 빠르게 mark 하는 흐름은?" | 노아 = "드롭다운 아래로" 재요청 |
| 3 | 2026-06-29 docx 양식 표 기반 | "잡코리아 양식으로" | "학생이 워드 어떤 버전으로 열까?" | 셀 텍스트 세로로 깨짐 → v2 재작성 |
| 4 | 2026-06-28 test noah paid 상태 | "테스트 학생 추가" | "실 데이터와 test 데이터 섞이면?" | 매트릭스에 test noah 표시, 노아가 발견 |
| 5 | 2026-06-28 학생 dashboard "KPI" 용어 | 요약 표에 그렇게 씀 | "학생 입장에서 KPI 가 의미 있나?" | 노아 = "이해가 안 가" |
| 6 | 2026-07-04 nationality 컬럼 부재 | (부재를 몰랐음) | "국적은 학생이 편집할 수 있어야 하지 않나?" | 노아가 직접 발견 |
| 7 | 2026-06-29 resume PDF 8→10 섹션 | activity/skill 추가 | "1페이지 넘어가면 안 되는데?" | 미리 확인 안 함, Iris 가 보고 |
| 8 | 2026-07-04 withdrawn 학생 매트릭스 표시 | test noah 취소 처리 | "취소한 학생 = 자동 제외되어야?" | 노아가 발견 후 fix |

## 왜 일어났나

- **"시키는 대로" 모드**: 노아 요구 = 즉시 코딩. tradeoff / 사용자 여정 / edge case / 회귀 위험 안 그려봄.
- **시스템 프롬프트에 이미 룰이 있었으나 반복 위반**: "For exploratory questions ... respond in 2-3 sentences with a recommendation and the main tradeoff. Don't implement until the user agrees." 이 룰이 있지만 지시가 명확해 보이면 gating 을 건너뛰는 경향.
- **완료 우선 편향**: 빠르게 실행해서 결과 보여주려는 욕구가 사용자 입장 고민을 압도.
- **회고 없이 다음 작업**: 사고 발생하면 fix 만 하고 "왜 그런 실수를 했지?" 회고 없이 다음 작업으로 넘어감.

## 어떻게 막을까

### Rule 1 — CLAUDE.md §2.5 신설 (feature intent gating 의무)

새 기능 / schema 변경 / UX 결정 요청 받으면 **즉시 코딩 X**. 다음 4 질문 답 후 노아 확인:

1. **왜 필요한가** (1문장): 어떤 사용자 pain 을 해결하나
2. **누가 어떤 상황에** (사용자 여정 3~5줄): role × 진입 경로 × 다음 액션
3. **edge case**: 빠뜨리는 case 없나 (빈 상태 / 실패 / 회귀 / 권한 X 시)
4. **다른 곳 영향**: 이 변경으로 회귀 위험 어디에?

→ 3~5줄로 노아한테 확인 → **승인 후 구현**.

### Rule 2 — 예외 (gating 없이 진행 OK)

- typo / 부호 fix (§6.5)
- 명확한 버그 fix (typecheck error / 404 / null pointer)
- Sage / Mira / lesson 이 이미 지정한 fix
- 노아가 명시적으로 "그냥 해" 라고 말한 경우

### Rule 3 — 자체 점검 마커

응답 안 다음 마커 중 하나 필수:
- `[gating]` — 확인 요청 중 (아직 코딩 X)
- `[skip-gating: bugfix]` — 명확한 버그 fix
- `[skip-gating: approved]` — 노아가 이미 승인
- `[skip-gating: user-said-just-do]` — "그냥 해"

없으면 룰 위반으로 간주.

### Rule 4 — 사고 반복 시 lesson 갱신

같은 패턴 사고 3회 반복 시 본 lesson 재검토 + Rule 강화. 룰이 실효 없으면 hook (settings.json) 으로 강제.

## 역반영 상태

- [x] CLAUDE.md §2.5 룰 신설 (본 lesson 과 함께 이번 commit)
- [x] docs/lessons/README.md 인덱스 갱신
- [ ] settings.json hook — 향후 강제 필요 시 (feature 관련 tool call 전 확인)
- [x] 메모리 저장 — `feedback_feature_intent_gating`

## 관련 사고 (이 lesson 이 커버하는 8건)

각 lesson 별도 박제 안 함 — 본 lesson 이 통합 회고. 개별 사고 세부는 위 표 + git log 로 추적.

## 배운 것 한 줄

**"빨리 만드는 것" 보다 "왜 만드는지 확인" 이 서비스 품질에 훨씬 큰 영향.**
