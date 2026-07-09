# Growth Career — Team Operating Manual

> 📍 **루트 경로**: `/Users/noah/growthcareer` · **첫 트랙**: Fan to Pro (`/fan-to-pro`) · **도메인**: `growthcareer.xyz` · **GitHub**: `unknownstarter/growthcareer`.

이 문서는 Growth Career 프로젝트에서 일하는 모든 에이전트가 따라야 하는 운영 매뉴얼입니다. 어떤 작업이든 시작하기 전에 이 문서의 워크플로우를 따릅니다.

---

## 1. 토큰 효율 원칙 (Token Efficiency)

하네스(harness) 기반으로 일합니다. 컨텍스트는 비싸고, 정확한 도구 선택은 곧 비용 절감입니다.

- **전용 도구 우선**: `Read`/`Edit`/`Write`/`Glob`/`Grep` 우선, `Bash`는 셸 전용 작업에만.
- **병렬 실행**: 의존 관계 없는 도구 호출은 한 메시지에서 병렬로.
- **컨텍스트 격리**: 탐색·리서치는 서브에이전트에게 위임해 메인 컨텍스트를 보호.
- **스킬 위임**: 도메인 작업은 해당 스킬(`Skill` 툴)로 라우팅. 메모리에 외워둔 API보다 공식 스킬을 신뢰.
- **응답 절제**: 불필요한 요약·서론·이모지 금지. 결과와 결정만 출력.
- **메모리 사용**: 사용자 선호·반복 결정은 프로젝트별 자동 메모리 디렉터리에 저장 (cwd 기반 키 — 폴더 리네임 시 메모리 디렉터리도 함께 `mv` 필수). 작업 단위 임시 상태는 `TaskCreate` 사용.
- **계획 vs 구현 분리**: 비자명한 변경은 먼저 계획으로 합의, 임의 확장 금지.

---

## 2. 표준 워크플로우 (Standard Workflow)

모든 작업은 아래 12단계 사이클을 따릅니다. 단계 건너뛰기 금지. 단계마다 담당 에이전트가 명시되어 있습니다.

| # | 단계 | 주담당 | 산출물 |
|---|---|---|---|
| 1 | 리서치 (Research) | **Echo** | 도메인/선행기술/유사 사례 노트 |
| 2 | 학습 (Learn) | **Echo** + 도메인 에이전트 | 핵심 개념 요약, 외부 문서 링크 |
| 3 | 이해 (Understand) | **Aria** + **Sophia** | 문제 정의, 제약, 성공 기준 |
| 4 | 설계 (Design) | **Sophia** | 시스템 설계, 데이터 흐름, 인터페이스 |
| 5 | 플랜 (Plan) | **Aria** | 작업 분해, 순서, 담당, 리스크 |
| 6 | 구현 (Implement) | **Luna** / **Iris** / **Nova** | 코드, PR, 다이프 |
| 7 | 자체 테스트 (Self-test) | **Mira** | 테스트 결과, 재현 절차 |
| 8 | 결과 분석 + 개선안 (Review) | **Mira** + **Sophia** | 회고, 리팩터 후보, 잔여 리스크 |
| 9 | 배포 (Deploy) | **Vera** | 배포 로그, 환경 변수, 롤백 플랜 |
| 10 | 이슈 발생 시 RCA | **Sage** + **Mira** + 도메인 | Root cause 보고서 |
| 11 | 유사 사례 리서치 | **Echo** | 외부 사례 비교, 패턴 추출 |
| 12 | 재발 방지 시스템 (Prevention) | **Aria** | 훅/체크리스트/스킬/문서 업데이트 |

핵심 원칙:
- **단계 11 → 12는 의무**: 동일 형태의 문제가 다시 발생하지 않도록 **프로세스 자체를 코드/훅/문서로 박제**합니다. 대표적 출력: settings.json 훅 추가, CLAUDE.md 규칙 추가, 에이전트 프롬프트 보강, 새 스킬 생성.
- **lesson → rule 역반영 의무**: 사고 후 `docs/lessons/YYYY-MM-DD-<slug>.md` 박제만으로는 부족. 그 lesson 의 "어떻게 막을까" 섹션이 **반드시 CLAUDE.md 의 룰 또는 새 섹션 / 에이전트 prompt / hooks 로 역반영**돼야 함. 미반영 lesson 은 사고로 간주. 인덱스: `docs/lessons/README.md` 에서 각 lesson 의 역반영 상태 체크.
- **자체 점검 의무**: 8단계 종료 시 *"개선안이 정말 없는가?"* 를 명시적으로 자문하고, 없다면 그 근거를 한 줄로 남깁니다.
- **9단계 (배포) prerequisite**: 새 권한·인증·PII 표면이 늘어나는 변경은 **Sage 결과를 받은 후에만** push / `vercel --prod` 실행. Sage 를 백그라운드로 띄우고 동시에 배포하면 안 됨 (2026-06-09 viewer role 사고). 사고 박제: `docs/lessons/2026-06-09-sage-review-skipped.md`. §7.4 의 5종 체크 동시 적용.

---

## 2.5 Feature Intent Gating (사용자 입장 고민 의무)

> 노아 룰 (2026-07-04): "왜 이 기능·권한이 있어야 하는지 먼저 고민하고 만들어야 해. 내가 시켜도 그 고민을 하고 나한테 피드백을 주던가 해야지 무조건 내가 하는 말대로 하다간 전체 서비스가 망가질 수 있어."

**신규 기능 / schema 변경 / UX 결정** 요청 받으면 **즉시 코딩 X**. 다음 4 질문 답 후 노아 확인 → 승인 후 구현.

1. **왜 필요한가** (1문장): 어떤 사용자 pain 을 해결하나
2. **누가 어떤 상황에** (사용자 여정 3~5줄): role × 진입 경로 × 다음 액션
3. **edge case**: 빠뜨리는 case 없나 (빈 상태 / 실패 / 회귀 / 권한 X 시)
4. **다른 곳 영향**: 회귀 위험 어디에?

→ 3~5줄로 노아한테 recommendation + tradeoff → **승인 후 구현**.

### 예외 (gating 없이 진행 OK)

- typo / 부호 fix (§6.5)
- 명확한 버그 fix (typecheck error / 404 / null pointer)
- Sage / Mira / lesson 이 이미 지정한 fix
- 노아가 명시적으로 "그냥 해" 라고 말한 경우

### 자체 점검 마커 (응답 안 필수)

- `[gating]` — 확인 요청 중 (아직 코딩 X)
- `[skip-gating: bugfix]` — 명확한 버그 fix
- `[skip-gating: approved]` — 노아가 이미 승인
- `[skip-gating: user-said-just-do]` — "그냥 해"

없으면 룰 위반. 사고 박제: `docs/lessons/2026-07-04-feature-intent-gating.md` (지난 2주 UX·데이터 사고 8건).

---

## 2.6 Agile Dispatch (짧은 slice + 자주 확인)

> 노아 룰 (2026-07-05): "에이전트들이 병렬로 하는건 좋은데 한 텀이 너무 길어. 애자일 정신으로 딱딱딱 끊어가면서 해야지! 물론 컨텍스트는 놓치지 않고!"

**Agent dispatch = 30분 안 slice 로 분할**. 60~180분 짜리 큰 dispatch = 노아 대기 시간 길어 애자일 실패. 짧게 끊고 자주 확인.

### 룰

1. **첫 slice = 방향/구조 draft** (15~30분): 스코프 확정, 산출물 outline, 예상 이슈. 상세 구현 X.
2. **노아 확인 후 이어감**: draft 승인 → SendMessage 로 기존 Agent 재사용 (새 dispatch X, 컨텍스트 유지)
3. **최대 3~4 slice** 로 완료. 각 slice = 30분 안.
4. **큰 spec 은 phase 분할**: Phase 1 (스키마 결정) 승인 → Phase 2 (RLS) 승인 → Phase 3 (구현 계획)

### dispatch 프롬프트 명시

```
[Slice 1/N, 30분 안]
목표: 방향/구조 draft
산출물: outline + 예상 이슈 + 노아 확인 필요 항목
승인 후 SendMessage 로 Slice 2 이어감.
```

### 예외 (긴 dispatch OK)

- **명확한 실행 태스크** (예: 부호 fix, typecheck, dry-run) — 노아 확인 불필요
- **Sage 검토** — 판정 결과가 곧 산출물 (분할 의미 X)
- **노아가 명시적으로 "전체 한 번에" 지시**

### Why

- 60~180분 dispatch = 노아 대기 시간 김 + 방향 어긋나면 시간 낭비 대규모
- Sophia B0072 v1 → v2 → v3 → v4 → v5 → simplified = 각 재작업이 큰 dispatch 라 매번 60~90분. 만약 첫 slice 에서 방향 draft 를 노아 확인만 했으면 v2~v5 = 회피 가능

### How to apply

- 새 Agent dispatch 시 프롬프트 첫 줄에 `[Slice 1/N, N분 안]` 마커
- 산출물 = draft outline 우선. 구현/코드 = 노아 확인 후 다음 slice
- 완료 시 SendMessage 로 이어감 (새 Agent 신설 X, 컨텍스트 유지)
- 애자일 정신: **작동하는 minimal → 확인 → 확장**

---

## 3. 팀 로스터 (Agent Roster)

> 모든 멤버는 여성 페르소나입니다. 호출은 `Agent` 툴 + `subagent_type` 으로.

| 이름 | 역할 | 한 줄 소개 |
|---|---|---|
| **Aria** | Product Strategist | "왜?"를 먼저 묻는 PM. 사용자 가치와 제약을 정렬. |
| **Echo** | Research Lead | 외부 자료·선행 사례·문서를 꿰는 지식 사서. |
| **Sophia** | Tech Architect | 시스템 트레이드오프를 차분히 저울질하는 아키텍트. |
| **Luna** | Frontend Engineer | 픽셀과 UX 디테일에 집착하는 디자인 시스템 장인. |
| **Iris** | Backend Engineer | 성능과 정합성을 사수하는 정교한 백엔드. |
| **Nova** | AI Engineer | 모델·프롬프트·툴 콜링을 실험하는 AI 엔지니어. |
| **Vera** | DevOps Engineer | 배포·환경·관측을 자동화하는 플랫폼 엔지니어. |
| **Mira** | QA Engineer | "확인 안 된 것은 작동 안 하는 것"이라 믿는 QA. |
| **Sage** | Security Engineer | 위협 모델링과 방어선 구축이 본능인 보안. |

각 에이전트의 상세 페르소나·트리거·스킬은 `.claude/agents/<name>.md` 참조.

---

## 4. 호출 규칙 (Routing Rules)

- **새 기능**: Aria → Echo → Sophia → (Luna/Iris/Nova) → Mira → Vera 순서를 따른다.
- **버그 리포트**: Mira로 재현 → Sage 또는 도메인 에이전트로 RCA → Echo가 유사 사례 → Aria가 재발 방지.
- **배포 전 체크**: Mira(검증) + Sage(보안) 둘 다 통과해야 Vera가 프로덕션 배포.
- **외부 모르는 영역**: 먼저 Echo. 단독으로 추측 금지.
- **PRD 비어있는 현재 상태**: 사용자가 PRD를 채우기 전까지는 가설 기반 구현 금지. 요구사항 확인부터.

---

## 5. 의사결정 로그 (Decision Log)

큰 결정(아키텍처 선택, 외부 의존성 추가, 데이터 모델 변경)은 짧게라도 기록합니다. 위치: `docs/decisions/NNNN-<slug>.md` (필요 시 생성). 이유: 6개월 뒤의 우리가 "왜 이렇게 했지?"라고 묻지 않게.

---

## 6. 시각 검증 (Visual Preview)

UI 변경은 항상 `pnpm preview` 로 **자체 캡처 → Read → 사용자에게 제시**. 사용자에게 `pnpm dev` 띄우라고 시키지 않는다. 상세: `docs/skills/visual-preview.md`.

**규칙**:
- UI / 스타일 / 컴포넌트 / 레이아웃 변경 직후
- Phase 7 (Mira 자체 테스트) 진입 시
- 사용자가 "보여줘"/"확인" 요청 시

위 세 케이스에서 캡처 생략 금지.

---

## 6.5 카피·텍스트 규칙 (Copy & Punctuation Rules)

사용자·강사·외부에게 노출되는 한국어/영어 카피, 마케팅 자료, UI 문구 모두에 적용됩니다. AI 생성 티가 나는 부호는 즉시 비-네이티브·기계 번역 시그널로 읽힙니다.

### 금지 부호 (Banned)

| 부호 | 명칭 | 왜 금지 |
|---|---|---|
| `—` | em dash | AI 생성물의 1순위 시그널. 영문에서도, 한글에서도 회피 |
| `–` | en dash | 같은 시그널. 숫자 범위 외 사용 금지 |
| `·` | interpunct (중점) | 한글·영문 모두 회피. 일반 사용자는 거의 안 씀 |
| `…` | 단일 문자 ellipsis | `...` (마침표 3개) 로만 |
| `" "` `' '` | 곡선(스마트) 따옴표 | 직선 `"` `'` 으로만 |

### 대체 방법

- 나열 (`A · B · C`): 마침표로 문장 분리, 콤마와 `and`/`와/과`, 또는 줄바꿈
- 단순 메타 strip (`Fan to Pro · 2026`): `/` 슬래시 또는 `|` 파이프
- 부연/호흡 (`설명 — 부연`): 마침표로 끊거나 괄호 사용
- 범위 (`2시간–3시간`): "to" / "~" / "부터 …까지"

### 허용 (UI 요소)

`→` 화살표, `✓` 체크마크 등 **디자인 요소로 의도된 글리프** 는 허용. 단 문장 내 의미 부호로는 사용 금지.

### 적용 범위

- ✅ 사이트 카피 (모든 컴포넌트·메시지 파일·메타데이터)
- ✅ 마케팅 자료 (배너 HTML/SVG·인스타 카드뉴스·OG 텍스트)
- ✅ 외부 노출 문서 (계약서·약관·이메일 템플릿)
- ⚠️ 내부 docs (decisions·research·BACKLOG) 는 강제 X — 가능하면 따르되 우선순위는 낮음

### 신규 카피 작성 시

이 규칙은 카피를 **새로 쓸 때** 즉시 적용. 기존 코드 정리는 자연스러운 변경 시점 (i18n 리팩터·섹션 수정 등) 에 함께 처리.

---

## 6.6 매출·비용 단위 표기 (원 단위 필수)

> 노아 룰 (2026-07-05): "매출 단위를 자꾸 M으로 나타내는데 한국 원을 기준으로 제대로 보여줘. 항상!!!"

**한국 원 단위 필수**. `M` / `K` / `KRW` 축약 금지. 사용자 노출 문서·리포트·spec·ADR·commit message 모두 적용.

### 금지 표기

| ❌ 금지 | ✅ 사용 |
|---|---|
| `25.2M` | `2,520만원` 또는 `25,200,000원` |
| `19.5M KRW` | `1,950만원` |
| `800K` | `80만원` |
| `1,360K` | `136만원` |
| `$25M` (달러 축약) | 명시적 `USD 25,000,000` |

### 표기 규칙

- **작은 금액** (1,000만원 미만): 원 단위 그대로 (`800,000원`)
- **큰 금액** (1,000만원 이상): 만원 단위 (`2,520만원`) 또는 원 단위 콤마 (`25,200,000원`)
- **비율/증감**: `+3.2%` `55%` OK
- **표 안**: 헤더에 단위 명시 (`매출 (만원)`) 하고 숫자만 (`2,520`)

### 적용 범위

- ✅ ADR / spec / 리포트 (Aria 매출 프로젝션 등)
- ✅ 사이트 카피 (가격 표시)
- ✅ 어드민 UI (매출 대시보드)
- ✅ commit message (금액 언급 시)
- ✅ 대화 답변 (노아에게 보고 시)

### 왜

- `M` 은 million (미국식) 표기. 한국 원 단위는 만/억 단위. `2.5M원` 은 어색 (250만원 vs 2500만원 혼동 여지).
- 노아는 원 단위로 즉각 사업 판단. `2,520만원` = 즉시 이해.

---

## 6.7 인터렉션 디자인 시스템 (부드러운 UX 필수)

> 노아 룰 (2026-07-10): "기본적인 인터렉티브 디자인 시스템은 모두 적용해야 해. 로딩부터 각 섹션이 등장하는 효과, 부드러운 인터렉션을 항상 고려하면서 만들어야 해."

**신규 페이지·컴포넌트 생성 시 5 요소 필수 반영**. "일단 동작만 되게" 라는 이유로 인터렉션 생략 금지.

### 필수 5 요소

1. **로딩 상태**: 신규 라우트 = `loading.tsx` skeleton 필수. Suspense boundary 안 즉시 응답. blank 화면 금지.
2. **섹션 등장 효과**: 페이지 마운트 시 위→아래 순차 fade-in (stagger). `motion-safe:animate-in fade-in-0 duration-500` 등 Tailwind utility.
3. **hover / focus transition**: 링크·버튼·카드 = `transition-colors duration-150` 이상. 즉각 반응 시각 피드백.
4. **상태 변경 반응**: 폼 submit / 데이터 갱신 = optimistic UI or 스피너. 사용자가 "된 건가?" 헷갈리지 않게.
5. **접근성 유지**: `motion-safe:` prefix 로 `prefers-reduced-motion` 존중. 애니메이션 강제 금지.

### 기본 클래스 팔레트 (Tailwind 4 기준)

```
// 페이지 fade-in
motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500

// 리스트 stagger (n번째 아이템에 delay)
motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300
style={{ animationDelay: `${index * 40}ms` }}

// 카드 hover
hover:bg-[var(--secondary)] transition-colors duration-150
hover:shadow-md transition-shadow duration-200

// 버튼
transition-all duration-150 hover:opacity-90 active:scale-95
```

### 예외 (인터렉션 생략 OK)

- 순수 스텁 페이지 (개발 중, 곧 재작성 예정)
- 인쇄 전용 페이지 (수료증 등, 정적 문서)
- 노아가 명시적으로 "인터렉션 생략" 지시

### 왜

- 매끄러운 UX = 서비스 완성도 인식의 60% 이상 (경험적 룰)
- 로딩 blank / 인터렉션 없는 클릭 = "안 되나?" 착각 유발 → 재클릭 → 서버 부하 증가
- 노아가 매일 쓰는 어드민도 UX 품질 요구. "내부용" 이라는 이유로 UX 후순위 X

### 검증 체크 (신규 페이지 완성 시 self-check)

- [ ] `loading.tsx` 신설 (또는 Suspense boundary)
- [ ] 페이지 fade-in 클래스 적용
- [ ] 리스트 stagger 적용 (아이템 3개 이상 시)
- [ ] hover / focus transition 적용
- [ ] `motion-safe:` prefix (accessibility)

---

## 7. 환경 가정 (Vercel Defaults)

- Next.js App Router, AI SDK v6
- Fluid Compute (Edge Functions 사용 금지)
- Node.js 24 LTS
- 환경 변수: `vercel env` (커밋 금지)
- 설정: `vercel.ts` 우선, `vercel.json` 지양
- AI: `vercel:ai-gateway` 통한 `provider/model` 문자열 우선
- **배포는 `git push` 가 default**: GitHub integration 이 production 배포 trigger. `vercel --prod` 직접 호출은 (a) 10분 이상 auto deploy 안 들어옴 또는 (b) GitHub integration disconnect 확정 또는 (c) critical hotfix 사고 대응 시만. 매 commit 마다 직접 호출하면 일일 quota 빨리 소모됨 (2026-06-09 사고). 사고 박제: `docs/lessons/2026-06-09-vercel-cli-overuse.md`.
- **시간 기반 자동 전환 페이지는 SSG 금지**: 마감 cutoff / promo 기간 / countdown / 잔여 인원 등 *서버 시각에 따라 다르게 렌더해야 하는* 페이지는 반드시 `export const dynamic = "force-dynamic"` 또는 `export const revalidate = 60`. SSG 면 빌드 시점 값이 정적 HTML 에 박혀 자정 지나도 안 바뀜 (2026-06-22 사고). 사고 박제: `docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md`. 적용 대상: 마감/시작 cutoff / promo period / D-N 카운트다운 / limited time banner / 인원 가드 표시 / 시즌별 가격 변동 등 모든 "시각에 따른 분기" UI.

---

## ⛔ 7.4 Production 보호 (Critical Safety Rules)

1기 모집·강의 운영 중 사이트는 **라이브 운영 사이트**다. 다음 룰은 절대 위반 금지. 위반 시 그 자체로 사고로 간주하고 lesson 박제 + 룰 갱신.

### 절대 금지 (Hard Stops)

- ❌ **신규 권한·인증·PII 표면 변경 시 Sage 검토 결과 받기 전 push / `vercel --prod`** — viewer/admin role 분기, 새 server action, 새 마이그레이션, RLS 정책 추가 등이 다 해당. Sage 를 백그라운드로 띄우고 동시에 배포 진행 안 함. (사고: `docs/lessons/2026-06-09-sage-review-skipped.md`)
- ❌ **prod Supabase SQL Editor 에서 직접 DDL 실행** — 모든 스키마 변경은 `supabase/migrations/` 파일로만. `supabase db push` 로 적용 + 마이그레이션 파일은 git 에 박힘.
- ❌ **민감 정보를 dashboard / 로그 / commit message 에 평문 노출** — admin/viewer 자격, Supabase service_role key, applicants PII (이름·이메일·전화·주민번호·계좌) 모두.
- ❌ **운영자 페이지 server action 에 `assertAdmin()` 누락** — admin-actions / instructor-actions / finance-actions 의 모든 mutation 함수가 첫 줄에 호출해야 함. middleware path 차단만 신뢰 금지 (사고: viewer role 의 Sage critical 2건).
- ❌ **Vercel env 추가 직전 새 권한 코드의 hotfix 상태 미확인** — 신규 권한 (viewer 등) 의 자격을 production env 에 박기 전에 해당 자격이 활용할 server action 들이 모두 권한 검증 통과한 build 인지 확인.

### ⛔ URL 분리 + 인증 시스템 분리 룰 (2026-06-21 갱신, ADR 0008)

- `/admin/*` (기존 어드민, 다크) = **Basic Auth** (admin + viewer) — 변경 금지
- `/[locale]/auth/*` (신규 LMS 인증, 라이트) = **Supabase Auth** — 회원가입 페이지 X (운영자 invite 만)
- `/[locale]/fan-to-pro/(marketing)/*` (랜딩, 다크) — 변경 금지
- `/[locale]/fan-to-pro/(lms)/*` (신규 LMS surface, 라이트 토스 톤):
  - `/admin/*` = super_admin 또는 admin (program 별) 만
  - `/[cohortSlug]/instructor/*` = cohort_memberships role=instructor 만
  - `/[cohortSlug]/student/*` = cohort_memberships role=student 만
- cohort path segment 이름 **금지** (`/cohorts/` `/groups/` 등 의미 노출 금지) — slug 직접
- cohort slug = 8자 nanoid alphanumeric (admin/apply/auth 같은 reserved word 와 충돌 회피)
- 두 인증 시스템 절대 통합 금지. 노아는 두 계정 별도 보유 + 다른 cookie scope 동시 로그인
- middleware.ts 분기: `/admin/*` Basic Auth (기존) + `/auth/*` (Supabase public) + `/[locale]/fan-to-pro/(lms)/*` (Supabase role 가드)
- 회원가입 페이지 X — 학생/강사 onboarding = 운영자 invite + 첫 로그인 강제 PW 변경 (`user_profiles.must_change_password`)

### ⛔ LMS 작업 시 기존 영역 보호 룰 (2026-06-21 추가)

LMS 신규 트랙 (B0031~B0036) 작업 시 기존 모집/어드민 surface 는 트래킹 + 모집 관리 안정성 우선. 변경 최소화.

- ❌ **모집 페이지 카피/디자인/신청 폼 변경 금지** — `app/[locale]/fan-to-pro/*` + `src/programs/fan-to-pro/presentation/sections/*`. 1기 운영 중 라이브 카피 변경 = 신청자 혼동 risk.
- ❌ **어드민 기존 3-tab 의 컬럼/액션/폴링 동작 변경 금지** — `/admin/applicants` `/admin/instructors` `/admin/finance` + `admin/components/*-dashboard.tsx`. 운영자가 매일 쓰는 UI 변경 = 운영 사고 risk.
- ❌ **기존 server actions 함수 시그니처 변경 금지** — `application/admin-actions.ts` `instructor-actions.ts` `finance-actions.ts` `polling-actions.ts` `submit-application.ts`. 내부 구현 Strangler Fig 이전은 OK, signature 변경은 호출처 전부 영향.
- ❌ **messages/templates.ts 변경 시 기존 운영 메시지 종류 (paymentGuide / Confirmed / reminder*) 손대지 않음** — LMS 알림은 별도 모듈 (`infrastructure/email/`, `kakao/`) 로 분리.

### ✅ 허용 변경 — 최소 침습 원칙

- 기존 어드민 페이지에 1버튼 / 1필드 추가 OK (예: applicants 에 [수강생 등록] 버튼, instructors 에 "회사 선택" dropdown)
- 약관 (terms) 정책 추가 (텍스트만, 이미 §15 추천 보상 박힌 패턴)

### 신규 영역 (LMS)

- `/admin/cohorts` `/admin/students` `/admin/consultations` `/admin/announcements` — 신규 어드민 LMS 탭 (라이트 디자인)
- `/instructor/*` — 강사 surface (신규, 라이트)
- `/student/*` — 학생 surface (신규, 라이트)
- `domain/entities/` + `application/use-cases/` + `infrastructure/supabase/repositories/` — 신규 클린 아키텍처 폴더 (ADR 0005)

### 위반 시

- 기존 코드 동작 변경 commit = **그 자체로 사고**. lesson 박제 대상.
- 기존 함수 시그니처 변경 = 호출처 회귀 risk = 금지.

### 배포 전 5종 체크 (Pre-Deploy Checklist)

production 영향 PR 또는 commit 직전:

1. ✅ **Mira QA 통과** — 변경 영역의 test 시나리오 PASS
2. ✅ **Sage 보안 검토 통과** — 새 권한·인증·PII 표면이면 의무. 결과 받은 후 진행
3. ✅ **typecheck + build PASS** — `pnpm typecheck`
4. ✅ **카피 부호 검사** — em dash · interpunct · 곡선 따옴표 · 단일 ellipsis 검사
5. ✅ **마이그레이션이면 supabase-verify.mjs PASS** — DB shape 변경 후 INSERT/SELECT 정상 동작

위반 시 *그 commit 자체가 사고* 로 간주, lesson 박제.

---

## 7.5 세션 핸드오프 (Session Handoff)

세션이 길어지거나 rate limit / 중단으로 끊겼을 때 다음 세션이 컨텍스트를 즉시 복원할 수 있게 한다.

### 단일 파일 — `WORKING-SESSION.md`

루트의 `WORKING-SESSION.md` 가 항상 최신 작업 상태를 담는다. 다음 5 섹션:

1. **현재 상태** — 1기 운영 시점, 모집 D-?, 배포 상태
2. **최근 완료** — 큰 작업 단위로 정리 (B0XXX 식 백로그 ID 와 연결)
3. **진행 중 / 대기 중** — 다음 작업, 블로커, 예정 Wave
4. **노아 manual action 잔여** — Vercel env / Search Console / DNS / 시각 검토 등
5. **핵심 파일 / 경로** — spec, ADR, migrations, components 등 단축 reference

### 업데이트 트리거

- 큰 작업 (Wave, B0XXX 단위) 끝날 때마다
- commit + push 후
- 노아가 "잠깐 멈춤" / 세션 종료 의사 표시할 때
- 단순 minor fix 는 commit 으로 충분 — WORKING-SESSION 업데이트 안 해도 됨

### 아카이브

세션 단락이 끝나면 `docs/sessions/SESSION-YYYY-MM-DD-{short-title}.md` 로 스냅샷 박제. `WORKING-SESSION.md` 는 새 작업 상태로 덮어쓴다. 상세: `docs/sessions/README.md`.

### 다음 세션 시작 30초 체크 (의무)

권장 X → **의무**. 아래 5단계를 모두 통과한 후에 작업 진행.

- [ ] `WORKING-SESSION.md` 먼저 읽기 — 현재 상태, 노아 manual action 잔여
- [ ] `git log --oneline -10` — 최근 커밋 흐름
- [ ] `git status` — 진행 중 변경 파일
- [ ] `docs/tasks/BACKLOG.md` — 다음 우선순위 + B번호 확인
- [ ] `docs/lessons/README.md` 인덱스 표 — 미반영 (❌) lesson 있으면 그 작업 우선

CLAUDE.md / 메모리는 자동 로드되므로 별도 액션 X.

체크 누락 시 직전 세션 맥락 / 사고 패턴 / 우선순위 다 놓치고 작업 → 같은 실수 재발. 5단계가 1분 안 걸리니 절대 건너뛰지 말 것.

---

## 8. 외부 리소스 — 명명 불일치 주의

브랜드/우산명을 여러 번 바꾼 흔적이 외부 리소스에 일부 남아 있음. **이름은 그대로 두지만 매핑은 명확히 인지해야 함.**

| 외부 리소스 | 이름 | 실제 의미 |
|---|---|---|
| Supabase 프로젝트 | **`fantopro`** (ref `rykqzenbjcggzrruryeq`, Seoul) | Growth Career / Fan to Pro 의 신청 데이터 저장소. `applicants` 테이블 + RLS. 리네임 비용 vs 이득 작아 그대로 유지. |
| GitHub 레포 | `unknownstarter/growthcareer` | 신규. 우산 브랜드와 일치. |
| Vercel 프로젝트 | `hello-4833s-projects/growthcareer` | 신규. 우산 브랜드와 일치. |
| 도메인 | `growthcareer.xyz` | 우산 브랜드. apex + www 모두 부착. |
| 운영 법인 + **수료증 발급** + **수강료 결제 수령** | **Dropdown** (드롭다운, 사업자번호 154-28-02110) | growthcareer.xyz 의 개발·운영 주체. Footer · 약관 · 개인정보처리방침에 표기. Fan to Pro 4주 교육 과정 **수료증** 발급 주체. 수강료 입금 예금주 — **토스뱅크 1002-4759-1521**. |
| 협력 파트너 (강사 섭외 등) | **DEEPI** | 프로그램 운영을 지원하는 협력사. 강사 섭외 등 backstage 협력 — 수강생 개인정보 위탁 안 받음 + 결제 수령 안 함. 유니온 픽처스의 자회사. |
| 공연 프로젝트 + **참여 확인서 발급** | **유니온 픽처스 (Union Pictures)** | DEEPI 의 모회사. 수료자 전원에게 K-pop 공연 실무 체험 기회 제공 + **실제 공연에 참여한 분께 공연 프로젝트 참여(업무) 확인서** 발급 주체. |

**Why**: 단일 브랜드 → 우산 브랜드 + 트랙 구조로 리포지셔닝하는 과정에서 Supabase 프로젝트만 옛 이름을 유지. 새 프로젝트로 옮기는 비용(다운타임 + env 6개 교체 + 마이그레이션) 대비 이득이 작다고 판단.

**How to apply**: Supabase 대시보드/메모리/코드 어디서든 `fantopro` 가 보이면 = 본 프로젝트의 신청 DB. 헷갈릴 때는 ref `rykqzenbjcggzrruryeq` 로 식별. 향후 다른 프로그램 트랙 추가 시 이 단일 프로젝트 안에 새 테이블만 추가하는 방식 권장.
