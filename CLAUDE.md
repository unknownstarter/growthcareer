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
- **자체 점검 의무**: 8단계 종료 시 *"개선안이 정말 없는가?"* 를 명시적으로 자문하고, 없다면 그 근거를 한 줄로 남깁니다.
- **9단계 (배포) prerequisite**: 새 권한·인증·PII 표면이 늘어나는 변경은 **Sage 결과를 받은 후에만** push / `vercel --prod` 실행. Sage 를 백그라운드로 띄우고 동시에 배포하면 안 됨 (2026-06-09 viewer role 사고). 사고 박제: `docs/lessons/2026-06-09-sage-review-skipped.md`.

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

## 7. 환경 가정 (Vercel Defaults)

- Next.js App Router, AI SDK v6
- Fluid Compute (Edge Functions 사용 금지)
- Node.js 24 LTS
- 환경 변수: `vercel env` (커밋 금지)
- 설정: `vercel.ts` 우선, `vercel.json` 지양
- AI: `vercel:ai-gateway` 통한 `provider/model` 문자열 우선
- **배포는 `git push` 가 default**: GitHub integration 이 production 배포 trigger. `vercel --prod` 직접 호출은 (a) 10분 이상 auto deploy 안 들어옴 또는 (b) GitHub integration disconnect 확정 또는 (c) critical hotfix 사고 대응 시만. 매 commit 마다 직접 호출하면 일일 quota 빨리 소모됨 (2026-06-09 사고). 사고 박제: `docs/lessons/2026-06-09-vercel-cli-overuse.md`.

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

### 다음 세션 시작 시 권장 흐름

1. `WORKING-SESSION.md` 먼저 읽기
2. `git log --oneline -10` 최근 커밋
3. `git status` 작업 중 변경
4. `docs/tasks/BACKLOG.md` 다음 작업 우선순위

CLAUDE.md / 메모리는 자동 로드되므로 별도 액션 X.

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
