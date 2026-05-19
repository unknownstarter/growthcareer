# Design System — Growth Career

> 토큰 → tone → atomic UI → 섹션. 디자인은 토큰의 합성으로만 만든다.
> 단일 진실 소스: `app/globals.css` (토큰) · `src/programs/<program>/presentation/ui/` (컴포넌트).

---

## 1. 디자인 철학

- **솔리드 컬러 블록**, 블렌딩 안 함. 섹션 단위로 brand 컬러 풀-블리드.
- **Massive headlines**. Pretendard Variable 900 Black + 음수 letter-spacing.
- **Pixel-honest spacing**. Tailwind 토큰만 사용, 인라인 px 금지.
- **Dark mode 기본**. `html.dark`, `--color-bg: #0a0a0f`.

---

## 2. 컬러 토큰

`app/globals.css @theme` 정의.

### 시맨틱
| Token | Hex | 용도 |
|---|---|---|
| `--color-bg` | `#0a0a0f` | 페이지 배경 (거의 검정) |
| `--color-surface` | `#14141b` | 카드·박스 배경 |
| `--color-surface-elevated` | `#1c1c26` | 위에 한 단 더 |
| `--color-border` | `#27272f` | 보더 |
| `--color-border-strong` | `#3f3f48` | 강조 보더 |
| `--color-fg` | `#fafafa` | 본문 텍스트 |
| `--color-fg-muted` | `#a1a1aa` | 보조 텍스트 |
| `--color-fg-subtle` | `#71717a` | 레이블·캡션 |

### Brand (솔리드 블록 전용)
| Token | Hex | 비고 |
|---|---|---|
| `--color-brand-indigo` | `#6366f1` | 남보라 |
| `--color-brand-violet` | `#8b5cf6` | Recruitment 섹션 배경 |
| `--color-brand-purple` | `#a855f7` | 포커스 링 |
| `--color-brand-pink` | `#ec4899` | 기본 CTA / 강조 |
| `--color-brand-fuchsia` | `#d946ef` | 보조 강조 |

**규칙**:
- Brand 컬러는 두 개를 한 요소에서 그라데이션으로 섞지 않음 (Hero 의 백그라운드 제외).
- Violet 같은 강채도 배경 위에 `brand-pink` 가 묻히면 `text-black` 으로 대비 확보 (이미 검증됨).

---

## 3. 타이포 토큰

### 폰트
- `--font-sans: "Pretendard Variable", "Pretendard", system-ui, …`
- Variable Pretendard CDN 임포트 (globals.css 첫 줄).

### 디스플레이 스케일 (모두 `clamp()` 기반 fluid)
| Token | clamp(min, vw, max) | 용도 |
|---|---|---|
| `--text-display-2xl` | `clamp(5rem, 22vw, 18rem)` | 거대 광고 카피 |
| `--text-display-xl` | `clamp(4rem, 16vw, 12rem)` | Hero "FAN." / "PRO." |
| `--text-display-lg` | `clamp(3rem, 10vw, 7rem)` | 섹션 헤드라인 (h2) 표준 |
| `--text-display-md` | `clamp(2.25rem, 6vw, 4.5rem)` | 서브 헤드라인 |
| `--text-display-sm` | `clamp(1.75rem, 4vw, 3rem)` | 카드 안 강조 |

### 본문
- `text-base` (16px), `text-sm` (14px), `text-xs` (12px), `text-lg` (18px). Tailwind 기본.

### Tracking
| Token | Value | 용도 |
|---|---|---|
| `--tracking-display` | `-0.05em` | 디스플레이 헤드라인 |
| `--tracking-impact` | `-0.04em` | h2 / 강조 텍스트 |
| `--tracking-eyebrow` | `0.4em` | Eyebrow (섹션 번호 라벨) |

### 한국어 가드 (전역)
```css
body {
  word-break: keep-all;
  overflow-wrap: anywhere;
}
h1, h2, h3 { text-wrap: balance; }
```
→ "전문가들에게" 가 음절 중간에서 깨지지 않음. 자세한 배경: `docs/dev-rules.md` §1.

---

## 4. 레이아웃 토큰

- `--container-content: 1280px` — 본문 컨테이너 max-width.
- `--container-narrow: 720px` — 좁은 콘텐츠 (FAQ 본문 등).

---

## 5. Section Tones — 풀-블리드 컬러 블록

`@utility section-{purple|pink|indigo|violet}` 4종. 섹션 배경 + fg 세팅을 한 번에. `Section` 컴포넌트의 `tone` prop 으로 적용.

| Tone | 용도 |
|---|---|
| `section-violet` | Recruitment (Eligibility) |
| `section-pink` | (예약) — 강조 CTA 섹션 후보 |
| `section-purple` | (예약) — Hero 백그라운드 일부 |
| `section-indigo` | (예약) |

추가 tone: `bg`, `surface` — 일반 페이지 톤.

---

## 6. UI 컴포넌트 카탈로그

`src/programs/fan-to-pro/presentation/ui/`

| Component | 파일 | 한 줄 |
|---|---|---|
| `Avatar` | `avatar.tsx` | 이니셜 placeholder 아바타. tint 3종(indigo/purple/pink), size prop. |
| `Button` | `button.tsx` | CTA 버튼. variant + size. |
| `Chip` | `chip.tsx` | 카테고리/메타 라벨. variant=accent/default/subtle, size=sm/md. |
| `Container` | `container.tsx` | 최대 폭 1280px + 좌우 패딩. |
| `Eyebrow` | `eyebrow.tsx` | 섹션 번호 + 영문 라벨 (`03 · ELIGIBILITY` 등). |
| `ScarcityBadge` | `scarcity-badge.tsx` | "선착순 마감" 등 결핍 시그널. |
| `Section` | `section.tsx` | tone prop 으로 배경 컬러 적용. 섹션 단위 풀-블리드. |
| `StatCard` | `stat-card.tsx` | 큰 숫자 + 라벨. social-proof 등에서 사용. |

**Composite (sections-level)**: `src/programs/fan-to-pro/presentation/components/`
- `Footer` — 사업자정보·약관·은행계좌
- `StickyCTA` — 화면 하단 고정 가격 + CTA

---

## 7. 사진·이미지

- Faculty 아바타: 112px(`size={112}`) 원형. `next/image` + `object-cover` + `object-position` 으로 얼굴 위치 보정. 사진 없을 시 `Avatar` 컴포넌트 이니셜 폴백.
- Hero 백그라운드: `public/images/stock/` 의 K-pop concert 이미지. `next/image priority` + `imageSrcSet` SSR.
- 원본 PII 자료 (강사 PDF·XLSX·증명사진) 는 `.gitignore` 됨.

---

## 8. 모션·인터랙션

- **호버**: 카드 border `hover:border-brand-pink` 패턴. 색만 바뀌고 transform 없음.
- **포커스**: 글로벌 `*:focus-visible { outline: 2px solid var(--color-brand-purple); outline-offset: 4px }`.
- **트랜지션**: `transition-colors` 만. transform 애니메이션은 명시적 필요 시에만.

---

## 9. 접근성 가드

- 본문 텍스트 대비 4.5:1 이상 (WCAG AA).
- 헤드라인 (large text 18pt+) 대비 3:1 이상.
- 포커스 링 outline 절대 끄지 말 것.
- 폼 input 마다 `<label htmlFor>` + 에러 메시지는 `text-brand-pink` (배경과 5:1 이상).
- 이미지 alt: 정보 전달은 정확히, 데코는 `alt=""` + `aria-hidden`.

---

## 10. 확장 규칙

- 새 컬러 추가: `globals.css @theme` 에 토큰 정의 → 컴포넌트는 토큰만 참조.
- 새 컴포넌트: `presentation/ui/` 에 atomic + 시그니처는 props 인터페이스로. Storybook 없음 — 대신 `tools/clip-sections.mjs` 같은 자체 캡처로 검증.
- 새 tone 섹션: `@utility section-<name>` 추가 후 `Section` 컴포넌트 `tone` 유니온에 union literal 추가.
