# 디자인 시스템 — 레이아웃 컴포지션 룰

> 목적: 페이지마다 배치가 제각각이 되는 걸 막는 공통 룰. 요소 순서, 섹션 리듬, stacking, 간격, 터치 타깃 같은 "토큰이 아닌 배치" 규칙을 박제한다.
> 근거: Material 3, Apple HIG, Shopify Polaris, IBM Carbon, Atlassian, web.dev, NN/g (하단 링크).
> 적용 범위: GC 라이트(우산) + Fan to Pro 다크 픽셀(2기) 두 서피스 공통. 순서·리듬·터치타깃은 동일 적용, 톤(다크/라이트)만 서피스별 variant.
> 공통 컴포넌트: `src/shared/navigation/SiteHeader` `src/shared/ui/{Button,Card,StickyCtaBar}`.

---

## A. 히어로 / 피처 섹션 컴포지션

- **요소 순서 고정 (텍스트 훅 먼저)**: eyebrow → 헤드라인 → 미디어 → 디스크립션 → CTA. 헤드라인이 5초 훅이고 미디어는 서포팅. **미디어를 맨 위로 올리지 말 것** (이미지만 떡 위에 = 나쁜 히어로).
- **좌측 정렬 기본** (중앙 정렬은 짧은 헤드라인이나 CTA 블록에만). 데스크탑 = 2컬럼(텍스트 좌 / 이미지 우) 또는 좌측 세로형. 모바일 = grid 명시 배치(`col-start`/`row-start`)로 DOM 순서(eyebrow → headline → 이미지 → 설명 → CTA)를 유지하면서 데스크탑만 이미지를 우측 컬럼으로 배치. `order` 트릭(시각 순서와 DOM 순서 어긋남)은 키보드 tab 순서를 깨니 금지.
- **CTA 2개면 위계 + 목적지 분리**: primary(전환 목표, 채움 컬러) 1개 + secondary(탐색, 컬러 outline) 1개. 동일 weight 2개(competing CTA) 금지. 두 CTA는 서로 다른 목적지로 (예: 전환 = 교육/모집 실페이지, 유입 = 콘텐츠 hub). 퍼널상 primary는 항상 전환 액션.
- **2컬럼 히어로 미디어 (최종 방식, 2026-08)**: 미디어를 grid에서 **헤드라인 행부터 CTA 행까지 span**(row-start = 헤드라인, eyebrow 제외) + `self-stretch` + `object-cover`. 결과:
  - 이미지 top = 헤드라인 top, 이미지 bottom = CTA bottom **자동 정렬** (측정 0px). 헤더 상단과 CTA 하단이 이미지 상하와 딱 맞음.
  - `object-cover`라 늘어나는 게 아니라 **crop** = 왜곡 0. 고정 aspect가 아니라 텍스트 높이에 맞춰지므로 **폰트/단어로 높이 맞출 필요 없음. 언어 무관**(EN 헤드라인이 길어져도 자동 대응).
  - 이미지 컬럼을 충분히 넓게(**텍스트:이미지 ≈ 47:53**, `grid-cols-[1fr_1.15fr]`) 잡으면 결과 비율이 **직사각형(≈1.5)** = 정사각형 회피. 컬럼이 좁으면 near-square가 되니 폭으로 조절.
  - gap 56~64px, 라운딩 `rounded-2xl`. eyebrow는 좌측 컬럼에만. 모바일은 미디어 단독 aspect(16:9)로 세로 stacking.
- **간격 proximity**: eyebrow와 헤드라인 20px, 헤드라인과 미디어 32~40px, 미디어와 설명 32px, 설명과 CTA 32px.
- 위치 표현 카피 금지("왼쪽 이미지처럼") — 반응형에서 위아래로 바뀜.

## B. 카드 anatomy

- **내부 순서 고정**: 미디어/썸네일 → 태그/chip → 타이틀 → 본문 → 메타/CTA.
- **이미지 비율 통일**: 콘텐츠 카드 16:9 또는 4:3, 인물/아바타 1:1.
- 액션은 카드 하단 영역. 카드 간 세로 gap 16~24px. 카드는 항상 컨테이너로 주변과 분리.

## C. 스페이싱 (8pt 그리드)

- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96 위주 사용. 인라인 px 금지(토큰/유틸리티만).
- Proximity로 위계: 관련 요소는 한 단계 좁게, 그룹 경계는 한 단계 넓게.

## D. 섹션 세로 리듬 + 본문 폭

- **섹션 세로 패딩**: 모바일 py 48~64 / 데스크탑 py 80~96.
- **본문 1줄 폭 max 65ch**(약 66자). 긴 본문은 좌측 정렬(F 패턴). 중앙 정렬은 짧은 헤드라인이나 CTA 블록에만.
- 페이지 컨테이너 1120~1160 유지.

## E. 버튼 위계 + 터치 타깃

- **최소 터치 타깃 44x44px.** 시각 크기가 작아도 클릭 영역은 44px 확보. 인접 타깃 최소 8px 간격.
- 한 화면에 primary 1개 / secondary 다수 / tertiary(텍스트 링크)로 weight 위계 명확히.

## F. 타이포 스케일

- 모듈러 스케일 비율 1.25(Major Third) 기준 위계. 역할명: display / heading / body / caption.
- GC 다크 = fluid display(마케팅 임팩트). 우산 라이트 / LMS = fixed scale(ADR 0006).
- **읽는 텍스트(본문·캡션·메타·칩) 최소 14px** (web.dev·토스 기준, 12px 이하는 Lighthouse 접근성 경고). eyebrow 같은 작은 accent 라벨만 13px 허용. **10~13px 본문/캡션 금지 = 인간 PD 는 안 씀 = AI 티.**
- 하이라키 스텝: h1 fluid(clamp) / h2 28~34 / card title 26~32 / body 16~17 / body-sm 15 / caption·label 14 / eyebrow 13(bold + accent 컬러). 비슷한 크기 회색 텍스트를 여러 개 흩뿌리지 말 것 — 위계는 크기·굵기·컬러로.
- **한국어는 `word-break: keep-all`(Tailwind `break-keep`) 필수**: 단어 중간에서 줄바꿈되면 어색하고 AI 티. 컨테이너(main/section)에 걸어 전역 적용. 영문 고유명사가 짧아 overflow 위험 없음.

## H. 섹션 헤더

- **타이틀 → 디스크립션 stacked** (디스크립션은 타이틀 바로 밑). 타이틀과 디스크립션을 좌우 2컬럼(title | desc)으로 벌리지 말 것. 좌측 정렬, 디스크립션은 `max-w-2xl` 로 가독폭 제한.
- **섹션 이름 라벨 = 영역 이름이므로 작게 두지 말 것.** 17px bold accent 컬러 (짝대기/바 없이, 텍스트만). 13px 이하 tiny 라벨 금지. 순서: 섹션 이름 라벨 → h2(타이틀) → 디스크립션.
- **하드코딩 금지, 컴포넌트로**: 섹션 헤더는 공통 `<SectionHeader label title description />` (`src/shared/ui/section-header.tsx`) 사용. 페이지마다 인라인 h2/desc 하드코딩하면 한 곳만 고쳐도 다른 데 안 반영됨. 반복되는 UI(헤더·버튼·카드·바)는 전부 `src/shared/` 컴포넌트.

## I. StatusBadge (프로그램 / 기수 상태 pill)

- 공통 `<StatusBadge status label? />` (`src/shared/ui/status-badge.tsx`). 서버 컴포넌트.
- status → 컬러 + 기본 라벨. label 주면 라벨만 덮어씀.
  - `open` = 모집중 → 핑크 solid soft (`bg-brand-pink/10 text-brand-pink`) + 앞에 핑크 dot
  - `upcoming` = 오픈 예정 → 남보라 soft (`bg-brand-indigo/10 text-brand-indigo`)
  - `closed` = 모집 마감 / `completed` = 종료 → 중립 회색 (`bg-[#F2F4F6] text-[#8B95A1]`)
- **solid 블록만** (컬러 그라데이션 / 글로우 금지, §6.8). rounded-full, px-3 py-1, 13px bold, break-keep.
- 페이지마다 인라인 pill 하드코딩 금지 = 이 컴포넌트로 통일.

## J. Modal (게이트 / 확인 패턴)

- 공통 `<Modal open onClose title? actions? />` (`src/shared/ui/modal.tsx`, `"use client"`).
- 접근성 필수: backdrop 클릭 / ESC 로 닫힘, 포커스 트랩(첫 focusable 자동 포커스, Tab 순환), body scroll lock, `role="dialog" aria-modal aria-labelledby`, 닫힐 때 트리거로 포커스 복원.
- 패널: 라이트(`bg-white rounded-2xl`), max-w-420, 검정 하드 드롭섀도(글로우 금지, §6.8). 등장 = fade + scale (로컬 CSS module keyframes, `prefers-reduced-motion` 존중, §6.7).
- `actions` 없으면 하단 액션 영역 렌더 X (호출측이 확인/취소 버튼 주입).
- **게이트 패턴**: 라우팅 대신 안내 모달 (예: 커뮤니티 = 수강생 전용). GNB 진입은 `SiteHeader` menu 의 `{ label, node: <Gate/> }` 슬롯으로 주입 (href 대신 node).

## G. CTA 배치

- above the fold에 primary CTA 1개(시청 시간 80%가 fold 위). 긴 랜딩은 하단 반복 = `StickyCtaBar`.
- fold 위는 value prop 명확 + "더 있다" 스크롤 힌트.

---

## 적용 규칙

- 신규 페이지/섹션은 이 룰을 따른다. 어긴 곳을 발견하면 자연스러운 변경 시점에 교정.
- 새 UI 요소는 페이지 로컬 금지 = `src/shared/`에 variant/슬롯 컴포넌트로.
- 관련: `docs/design-system.md`(토큰 카탈로그), `docs/decisions/0006-lms-design-system.md`(LMS 라이트 톤), CLAUDE.md §6.7(인터렉션) §6.8(그라데이션/글로우 금지).

## 근거 링크

- [Material 3 — Grids & spacing](https://m3.material.io/foundations/layout/grids-spacing/spacing) / [Type scale](https://m3.material.io/styles/typography/type-scale-tokens)
- [Shopify Polaris — Layout tokens](https://polaris-react.shopify.com/design/layout/layout-tokens) / [Media card](https://polaris.shopify.com/components/media-card)
- [IBM Carbon — Spacing](https://carbondesignsystem.com/elements/spacing/overview/)
- [Atlassian — Spacing](https://atlassian.design/foundations/spacing) / [Typography](https://atlassian.design/foundations/typography/applying-typography)
- [web.dev — Accessible tap targets](https://web.dev/articles/accessible-tap-targets) / [Accessible responsive design](https://web.dev/articles/accessible-responsive-design)
- [NN/g — Scrolling and attention](https://www.nngroup.com/articles/scrolling-and-attention-original-research/)
- [SAP Design System — Hero anatomy](https://www.sap.com/design-system/digital/patterns/hero-media-blend/style)
- [Baymard — Line length readability](https://baymard.com/blog/line-length-readability)
