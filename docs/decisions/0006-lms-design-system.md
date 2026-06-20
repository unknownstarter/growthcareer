# ADR 0006 — LMS 디자인 시스템 (라이트, 토스 톤, shadcn/ui)

**Status**: Accepted
**Date**: 2026-06-21
**Deciders**: 노아 + Echo (Research) + Sophia (Architecture)
**Tags**: design-system, lms, shadcn, toss, light-mode, tailwind, theme

---

## 컨텍스트

기존 모집 페이지 + 어드민 = **다크 + brand-pink + Pretendard** (강렬한 마케팅 톤, 변경 X). 노아 요구:

- 신규 LMS surface (학생 / 강사 / 어드민 신규 탭) = **별도 디자인 시스템**
- "정갈하고 명확하고 깔끔"
- "토스의 어드민처럼"
- "기본 게시판 X — 라운드 적용 누가봐도 편안한 스타일"
- **배경 라이트가 기본**

LMS 가 4주 cohort 운영 도구라 시각 부담 ↓ + 정보 가독성 ↑ 필요. 다크 톤은 마케팅 임팩트용, LMS 는 차분한 운영 톤.

---

## 진단 — 토스 디자인 시스템 외부 자료

- **토스 디자인 시스템 (TDS) = 내부 전용**. 공식 토큰 (색상/radius/typography 수치) 외부 공개 X.
- **앱인토스 TDS** (외부 파트너용) = 모바일 우선, 어드민 X. 11 컴포넌트 (Badge / Border / Button / Asset 등).
- **`toss/slash` = 2025-12-18 archive**. 살아남은 패키지: `es-hangul` / `es-toolkit` / `suspensive` / `use-funnel` (utility) + `@toss/use-overlay` / `@toss/emotion-utils` (React). **UI 컴포넌트 X**.
- 토스 시각 시그니처 (관찰 기반): Primary Blue `#3182F6` 계열, 강한 화이트 배경, **카드 12px / 버튼 8px radius**, 큰 padding, font-weight 600/700, generous line-height 1.5+.
- 토스 어드민 = SLASH23 컨퍼런스에서 Server-Driven UI 기반이라 공개. 비주얼 스크린샷 외부 X.

**결론**: 토스 톤은 **철학적으로 재현**. 라이브러리 직접 가져올 수 없음.

---

## 결정

### 1. 컴포넌트 라이브러리 = shadcn/ui + Tremor (보조)

**선택 이유**:

1. **코드 소유** — `--radius` 한 줄로 토스 톤 (12px) 전 컴포넌트 적용. Mantine 처럼 provider 종속 X.
2. **Pretendard 통합 자유** — Tailwind `font-sans` 만 바꾸면 끝.
3. **LLM 학습량 압도적** (114K stars) — Claude/v0 코드 생성 → 개발 속도.
4. **Radix primitive 기반** — 접근성·키보드 토스 수준 가능.
5. **Cal.com, Plane, Documenso** 가 이미 shadcn 으로 라이트+정갈 톤 재현 증명.
6. **차트 어드민 탭** (강사 수익 / 학생 진도) 만 **Tremor** 추가 — Radix+Tailwind 기반이라 충돌 X.

**컴포넌트별 매핑**:

| 컴포넌트 | 1순위 | 비고 |
|---|---|---|
| Sidebar | shadcn `sidebar` block | Cal.com 패턴 |
| Card | shadcn `Card` + radius 12px | 토스 카드 매치 |
| Table | shadcn `Table` + TanStack Table | 정갈 + 정렬/필터 |
| Form | shadcn `Form` (React Hook Form + Zod) | 우리 stack 일치 |
| Modal / Drawer | Radix Dialog (shadcn) | 접근성 + 토스 모달 톤 |
| Button | shadcn `Button` + `h-12 px-6` 토스 BottomCTA | 큰 padding |
| Badge | shadcn `Badge` + 12px radius | 토스 동일 |
| Avatar | shadcn `Avatar` | OK |
| Timeline / 진도 | 자체 조립 | shadcn 기본 위에 |
| Chart | **Tremor** | 차트 종 풍부 |

**거부**:
- **Ant Design** — 엔터프라이즈 톤 = 토스와 정반대 (각짐 + 정보 밀도)
- **Mantine** — 자체 톤 강함 + Tailwind 와 CSS-in-JS 충돌
- **HeroUI** — 모던 톤이지만 튀는 그라데이션 = 토스 정갈함 충돌
- **`@toss/slash`** — archive
- **Radix UI 직접** — dialog/select/tabs 디자인 매번 직접 = 시간 낭비. 3회 반복 사용 자명

### 2. 토큰 분리 = `<div data-theme="light">` nested wrapper

**거부**:
- Tailwind dark/light 자동 (`prefers-color-scheme`) — 사용자 OS 가 surface 의도 덮음. 마케팅 자동 라이트 사고
- 별도 변수 set (`--lms-bg`) — `lms-bg-*` prefix utility 새로 만들어야 함, shadcn 통합 X
- 별도 Tailwind config — v4 single source 철학 충돌, build 복잡

**선택 = `[data-theme="light"]` selector + nested wrapper**:

```css
/* globals.css 추가만 */
@layer base {
  [data-theme="light"] {
    color-scheme: light;

    /* 색 — 토스 관찰 기반 */
    --color-bg: #ffffff;
    --color-surface: #f7f8fa;
    --color-surface-elevated: #ffffff;
    --color-border: #e5e8eb;
    --color-border-strong: #d1d6db;
    --color-fg: #191f28;
    --color-fg-muted: #4e5968;
    --color-fg-subtle: #8b95a1;
    --color-primary: #3182f6;

    /* 라운드 — 토스 시그니처 */
    --radius: 0.75rem;       /* 12px 카드/모달 */
    --radius-sm: 0.5rem;     /* 8px 인풋/배지 */
    --radius-lg: 1rem;       /* 16px 큰 카드 */

    /* shadow — 라이트 전용 */
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 8px rgba(0,0,0,0.06);

    /* typography (fixed scale, fluid X) */
    --text-lms-h1: 1.75rem;
    --text-lms-h2: 1.375rem;
    --text-lms-body: 0.9375rem;
    --text-lms-caption: 0.8125rem;
  }
}
```

**핵심**: 변수명을 같게 유지. 기존 utility (`bg-bg text-fg`) 가 theme 만 바뀌어도 그대로 동작. 컴포넌트 코드에 theme 분기 0.

### 3. Next.js layout 분기 = App Router route group `(lms)/`

```
app/[locale]/
├── layout.tsx                       # 기본 (현 상태)
├── (marketing)/                     # 다크 그룹
│   ├── page.tsx
│   └── fan-to-pro/*
├── admin/                           # 기존 어드민 (다크) — 그대로
│   ├── applicants/
│   ├── instructors/
│   └── finance/
└── (lms)/                           # 라이트 그룹 ⭐ 신규
    ├── layout.tsx                   # <div data-theme="light">
    ├── instructor/*
    ├── student/*
    └── admin/lms/*                  # 신규 LMS 어드민 탭만 여기
```

`(lms)/layout.tsx`:

```tsx
export default function LmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="bg-bg text-fg min-h-screen">
      {children}
    </div>
  );
}
```

**주의**: `<html>` 의 `data-theme` 는 client side 에서 변경 X. 항상 nested wrapper `<div data-theme>` 사용. SSR/hydration 안전, 한 페이지 두 theme 섞임 사고 방지.

### 4. 폰트 / typography 정책

- **Pretendard 유지** (한영 단일, 운영 단순)
- LMS 는 **fixed scale** (`text-sm` ~ `text-2xl`). fluid display 토큰 (`text-display-*`) 은 **마케팅 전용**. 토스 어드민 톤 = clamp 안 씀.
- `line-height: 1.6` (LMS), 마케팅은 1.4 유지
- 한글/영문 line-height 분기 X (Pretendard 자체가 한영 metrics 잘 맞음)

### 5. shadcn/ui 통합 — components.json 매핑

```json
// components.json
{
  "cssVariables": false,    // 자동 변수 박힘 방지, 우리가 wire
  "tailwind": {
    "css": "app/globals.css",
    "baseColor": "neutral",
    "prefix": ""
  },
  "aliases": {
    "components": "src/programs/fan-to-pro/interface/components/lms",
    "ui": "src/programs/fan-to-pro/interface/components/lms/ui"
  }
}
```

shadcn 컴포넌트의 CSS 변수 mapping:

```css
[data-theme="light"] {
  /* shadcn 기대 변수 = 우리 변수 alias */
  --background: var(--color-bg);
  --foreground: var(--color-fg);
  --card: var(--color-surface-elevated);
  --border: var(--color-border);
  --primary: var(--color-primary);
  --muted: var(--color-surface);
  --muted-foreground: var(--color-fg-muted);
  --radius: 0.75rem;
}
```

### 6. 어드민 신규 LMS 탭 = 라이트 디자인 추천

| 영역 | 디자인 |
|---|---|
| 어드민 기존 3-tab (applicants / instructors / finance) | **다크 유지** (트래킹 + 모집 안정) |
| **어드민 신규 LMS 탭** (cohorts / students / consultations / announcements) | **라이트 (LMS 디자인)** |
| 강사 surface (`/instructor/*`) | 라이트 |
| 학생 surface (`/student/*`) | 라이트 |
| viewer role 코워크 공유 | 다크 유지 (기존 어드민 readonly view) |

이유: cohort 관리 / 수강생 상담 기록 = LMS 도메인. 강사/학생 surface 와 UX 정렬 필요. 어드민 기존 (현금영수증/정산/재무) = 마케팅 도메인.

---

## 토스 톤 핵심 시그니처

| 시그니처 | 적용 |
|---|---|
| 카드 radius 12px | `--radius: 0.75rem` |
| 버튼 radius 8px | `--radius-sm: 0.5rem` |
| 버튼 큰 padding | `h-12 px-6` (토스 BottomCTA) |
| 얇은 단일 그림자 | `shadow-sm` only |
| Primary Blue | `#3182f6` 한 가지 색만 |
| 회색 9단계 | `#191f28` → `#8b95a1` |
| Whitespace generous | section gap 큰 padding |
| Font-weight 600/700 | bold 강조 |
| Letter-spacing -0.01em | 약간 좁게 |

---

## 폴더 구조

```
src/programs/fan-to-pro/
├── presentation/              # 마케팅 (다크) — 그대로
│   └── sections/
└── interface/                 # 신규
    ├── components/
    │   ├── shared/            # Avatar, Spinner, Icon — theme-agnostic
    │   ├── lms/
    │   │   ├── ui/            # shadcn primitives (button, dialog, ...)
    │   │   ├── instructor/    # 강사 surface 전용
    │   │   ├── student/       # 학생 surface 전용
    │   │   └── admin/         # LMS 어드민 탭 전용
    │   └── admin-legacy/      # 기존 admin/components 이전 (선택)
    └── hooks/
```

원칙: **surface 별 격리 → 공통은 shared 끌어올림**. 처음부터 공통화 X. 3회 반복 보이면 그때 shared.

---

## 첫 LMS 컴포넌트 우선순위

1. **shadcn primitives 6개** (Button / Card / Input / Dialog / Tabs / Table) — 무조건 먼저
2. **LMS Shell** (Sidebar + TopBar) — instructor / student / admin lms 셋이 공유
3. **DataTable** (강의·수강생 리스트) — 강사 / 어드민 둘 다 사용 = 3회 사용 사례 충족
4. **Form** (RHF + Zod) — Wave 1 에서 PW 변경 / 본인 정보 수정
5. **Drawer / Popover** — Wave 1+
6. **Chart (Tremor)** — Wave 3 정산 dashboard

---

## Failure Modes

| risk | 회피 |
|---|---|
| `<html>` className 과 nested `data-theme` 충돌 | `<html>` 다크 고정, nested wrapper 만 light. CSS cascade wrapper 안에서만 |
| shadcn 컴포넌트 다크 surface 잘못 박힘 | `interface/components/lms/*` 폴더 격리 + import 경로 룰 |
| Tailwind v4 `@theme` vs `[data-theme]` specificity | `:root` (0,0,1) < `[data-theme]` (0,1,0) — 안전 |
| 마케팅 우연히 `(lms)` 그룹 들어감 | folder group 명명 명확 + PR 리뷰 |
| shadcn upgrade 시 변수 mapping 깨짐 | mapping 1곳 (`globals.css`) 집중 |

---

## Rejected Alternatives

- **Tailwind multi-config** — v4 single source 충돌, build 복잡
- **CSS-in-JS (vanilla-extract / emotion)** — Tailwind 와 이중 system
- **`prefers-color-scheme` 자동 분기** — surface 의도 못 제어
- **LMS 폴더를 `lms/` 최상위 분리** — Fan to Pro 트랙 안 surface 라 `interface/` 안 유지
- **shadcn 안 쓰고 Radix headless 직접** — 3회 사용 사례 자명, 처음부터 shadcn

---

## 1년 뒤 바뀌어야 한다면

| 변화 | 손대는 곳 |
|---|---|
| theme 추가 (강사 다크 opt-in) | `[data-theme="light-instructor"]` 변수 set 추가. 컴포넌트 0 수정 |
| shadcn 버전업 | globals.css 변수 alias 만 |
| 마케팅 라이트 실험 | `(marketing)` layout 에 `data-theme="light"` 부착. 페이지 코드 0 수정 |

---

## 핵심 파일 (작업 시작점)

- `app/globals.css` — `[data-theme="light"]` block 추가
- `app/[locale]/layout.tsx` — `<html className="dark">` → `data-theme="dark"` 교체
- `app/[locale]/(lms)/layout.tsx` — 신규 wrapper
- `src/programs/fan-to-pro/interface/components/lms/ui/` — 신규 shadcn 위치
- `components.json` — 신규 shadcn registry config

---

## 참조

- ADR 0005 (LMS 클린 아키텍처)
- CLAUDE.md §7.4 (기존 영역 보호 룰)
- WORKING-SESSION.md
- B0031 ~ B0036 (Wave 0~5 백로그)
- Toss Tech 디자인 시스템 (https://toss.tech/article/toss-design-system)
- shadcn/ui (https://ui.shadcn.com)
- Tremor (https://npm.tremor.so)
