# Dev Rules — Growth Career

> 코드를 쓰기 전에 한 번 훑고, 리뷰 전에 다시 훑는 룰 모음.
> CLAUDE.md 가 *팀 운영 매뉴얼*이라면, 이 문서는 *코드·UI 만들 때의 가드*.

---

## 1. 한국어 타이포 — 음절 단위 절단 금지

증상: `text-display-lg` 같은 대형 헤드라인에서 *"실제 전문가들에"* + *"게"* 식으로 음절 중간이 끊어짐 — 한국어를 읽을 줄 아는 사용자에게 즉각 위화감.

원인: CSS 기본값 `word-break: normal` 은 CJK 글자 사이를 어디든 잘라도 된다고 간주.

룰:
- `app/globals.css` 의 `body` 에 **`word-break: keep-all`** 전역 박혀있음. 건드리지 말 것.
- `overflow-wrap: anywhere` 도 폴백으로 깔려있음 (영문 super-long-word/URL 대응).
- `h1, h2, h3` 에 `text-wrap: balance` 로 외톨이 줄 방지.

**예외 처리 금지**: 특정 컴포넌트에서 `word-break: break-all` 같은 걸 다시 켜지 말 것. 정 필요하면 그 자리에서 카피를 줄여라.

---

## 2. 타이포 스케일 — 직접 px 금지

룰:
- 헤드라인은 `text-display-{sm|md|lg|xl|2xl}` 사용. 다 `clamp()` 기반 fluid.
- 본문은 `text-base / text-sm / text-xs` + 모바일·데스크탑 분기는 `sm:text-lg` 식 Tailwind 브레이크포인트.
- **금지**: 인라인 `style={{ fontSize: 32 }}` 형태. 토큰을 안 쓰는 시점에서 디자인 시스템과 분리됨.
- 예외: variable 가 디자인 토큰일 때만 OK — `style={{ fontSize: "var(--text-display-md)" }}` 처럼.

---

## 3. 컬러 — 토큰만 쓴다, hex 금지

룰:
- `--color-fg`, `--color-bg`, `--color-surface`, `--color-fg-muted`, `--color-border` 등 시맨틱 토큰 우선.
- 브랜드 컬러 5종 (`brand-indigo / violet / purple / pink / fuchsia`) 은 **솔리드 블록** 으로 사용. 블렌딩(섞기) 안 함.
- **인라인 hex 금지**: `color: "#ff3b3b"` 같은 거 박지 말 것.
- 예외 — violet 섹션 같은 강채도 배경 위에서 `text-brand-pink` 대비가 약할 땐 `text-black` 으로 명시 fallback. 단 그 자리에 한정.
- 접근성: 본문 텍스트 WCAG AA (4.5:1) 이상.

---

## 4. 반응형 — 데스크탑부터 짜고 모바일까지 깨지지 않게

기본:
- 모바일 우선이 아니라 **양방향 동시 검증**. 캡처 항상 `360 / 390 / 768 / 1024 / 1440` 5뷰포트 (`tools/clip-viewports.mjs`).
- `max-w-*` 로 콘텐츠 폭 제한. 컨테이너는 `Container` 컴포넌트 (1280px max).
- 그리드 분기는 `grid-cols-1 lg:grid-cols-[1.6fr_1fr]` 같이 명시. arbitrary value 적극 사용 가능.
- 텍스트가 컨테이너를 넘는다 = clamp 토큰 + word-break 가드의 정상 동작. 카피를 줄이는 게 1순위 해결.

---

## 5. 접근성 (a11y)

- 폼: 모든 `<input>` 에 `<label htmlFor>` + `aria-describedby` (에러 표시). `Field` 컴포넌트가 이미 강제.
- 포커스: `*:focus-visible { outline: 2px solid var(--color-brand-purple); }` 글로벌. 컴포넌트 단위에서 `outline: none` 으로 죽이지 말 것.
- 이미지: `next/image` + 의미 있는 alt. 데코는 `alt=""` + `aria-hidden`.
- 색약: 빨강↔초록만으로 신호 전달 금지. 아이콘·텍스트 동반.

---

## 6. 환경변수

- 클라이언트 노출 가능: `NEXT_PUBLIC_*` prefix 만. 예: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- 서버 전용(금지된 노출): `SUPABASE_SERVICE_ROLE_KEY` 등. 서버 액션·라우트 핸들러에서만 `process.env.*` 로 읽기.
- 로컬: `.env.local` (gitignored). 절대 커밋 금지.
- Vercel: `vercel env add <NAME> production` 으로 등록 → 새 빌드부터 반영. 빈 commit 으로 재배포 트리거.

---

## 7. 폼 — 2-step + zod + Supabase 폴백

검증된 패턴:
- 클라이언트 `step` state (`1 | 2`) + Step 1 zod parse → 통과 시 step 2 로 이동.
- Step 2 는 `useActionState` + Next Server Action (`submitApplication`).
- Supabase 클라이언트가 `null` 이면 `ok_local` (로컬 모의 모드). 키 미설정 환경도 죽지 않게.
- 에러는 `{ status: "error", errors: fieldErrors }` 로 통일. UI 가 키별로 매핑.

---

## 8. 개인정보 (PII) 관리

- 강사 원본 자료 (PDF·XLSX·증명사진 raw 등) 은 **레포에 커밋 금지**. `.gitignore` 패턴 박혀있음.
- 가공된 이미지 (web-friendly 사이즈) 만 `public/images/instructors/` 에 커밋.
- 사용자 입력 PII: Supabase `applicants` 테이블, RLS 로 anon 차단. 수강 처리 종료 후 1년 내 파기.
- 폼 동의 문구 변경 시 사용 목적 명시 ("교육 프로그램 안내 및 긴급 연락").

---

## 9. 시각 검증

- UI / 스타일 / 컴포넌트 / 레이아웃 변경 후 **반드시** `pnpm preview` 자체 캡처 후 `Read` 로 확인.
- 사용자에게 `pnpm dev` 띄우라고 시키지 말 것 (CLAUDE.md §6 + `docs/skills/visual-preview.md` 참조).
- 결과는 `docs/screenshots/` (gitignored).

---

## 10. 배포 — 단방향

- 모든 코드는 `main` 브랜치 push → Vercel 자동 production 배포.
- env 만 바꿨을 땐 자동 배포 안 됨 → **빈 commit** 으로 재배포 트리거: `git commit --allow-empty -m "chore(deploy): ..."`.
- 도메인: `growthcareer.xyz` (apex + www). DNS 는 Vercel.
- 배포 전 체크리스트: 타입 체크 + visual preview + (보안 변경이면) Sage 점검.

---

## 11. 의사결정 기록

- 큰 결정(아키텍처 / 외부 의존성 / 데이터 모델) 은 `docs/decisions/NNNN-<slug>.md` 에 ADR.
- 일상적 변경은 `CHANGELOG.md` 에 날짜별 기록.

---

## 12. 응답·코멘트 톤

- 코드 코멘트는 **WHY** 만. WHAT 은 코드가 말함.
- 이모지 금지 (사용자가 명시적으로 요청한 경우 제외).
- 한국어 본문 우선. 외래어는 원어 병기 (예: 카카오톡 오픈채팅).
- 어미: `~합니다 / ~됩니다` 정중 + 명확. 친근체 `~해요` 는 마케팅 카피에만 한정.
