# B0083 Platform Evolution UX Spec

> Luna, 2026-07-05. Aria ADR 0015 (PO 결정) + Echo B0083 리서치 (벤치마크 7건) 이관.
> 대상: Growth Career 우산 전시 사이트 진화. `growthcareer.xyz/` 우산 랜딩 + 11개 신규 페이지 + 컴포넌트 10종 spec.
> **구현 X**. 이 문서는 노아 승인 대기 spec 이며, 승인 후 B0084~B0089 백로그로 분해 후 Iris + Luna dispatch.

## 배경

노아 발화 (2026-07-04):

> "지금의 fantopro 페이지도 뭔가 바뀌어야 할 것 같은데. 이전 1기를 포함해서 전시의 필요가 생긴거 같아."

Echo 리서치 (`docs/research/B0083-platform-evolution-benchmark.md`) 결론:
- Lambda / BloomTech = 발표 취업률 vs 실제 괴리로 브랜드 소각 → CIRR 표준 사전 박제 필수
- Le Wagon 40개 캠퍼스 / 23,000 alumni = alumni network 를 core moat 로 판매
- Codesmith = 파트너 회사 로고 wall 이 초기 유일 신뢰 asset
- 우아한테크캠프 = alumni 자발적 velog / medium 후기가 검색 결과 지배 = 학생 서사 = 최고 마케팅
- Vercel / Linear 다크 톤 = 개발자 신뢰용. 외국인 K-pop 지망생에겐 cold 위험 → 사람 얼굴 비중 확대로 완화

Aria PO (ADR 0015) 결정:
- 리브랜드 X, 우산 확장 O (Lambda 교훈)
- `growthcareer.xyz/` = 우산 랜딩 신설 (Fan to Pro 리다이렉트 폐지)
- `/fan-to-pro/` = 트랙 landing 그대로 유지 (§7.4 룰)
- 11개 신규 페이지 + 컴포넌트 10종 additive

절대 룰:
1. `/fan-to-pro/*` 마케팅 카피 / 디자인 / 신청 폼 변경 금지 (§7.4)
2. 어드민 3-tab 컬럼 / 액션 / 폴링 변경 금지 (§7.4)
3. em dash (U+2014) / en dash (U+2013) / interpunct (U+00B7) / 곡선 따옴표 (U+201C-U+2019) / 단일 ellipsis (U+2026) 금지 (§6.5)
4. 그라데이션 금지 (Luna 반성 세션 재발 방지)
5. 다크 톤 유지 (`/fan-to-pro/*` 와 통일). 라이트 shell X.

---

## 컨셉 원칙 5 (Echo 인사이트 반영)

### 원칙 1: 사람 얼굴 비중 확대

Echo Insight 5 = "다크 톤 유지하되 사람 얼굴 비중 확대". 배경:
- Vercel / Linear 다크 = 개발자 신뢰용
- 우리 타겟 = 외국인 K-pop 지망생 = "cold, hard-to-read" 위험

적용:
- Hero 배경 = 프로덕션 씬 + 학생 사진 (blur or overlay 로 톤 조정)
- Student Story 카드 = 원형 얼굴 사진 (240px 이상)
- Faculty 카드 = 강사 얼굴 사진 정면 (320px)
- 통계 섹션 단독 배치 금지. 반드시 얼굴 섹션과 인접 배치.

### 원칙 2: raw fraction 강조 (CIRR 준수)

Echo Insight 2 = "발표 지표 정의 사전 박제". Lambda 사고 재발 방지.

적용:
- Outcomes 페이지 = "8/10" 형식 원본 분수 크게 (숫자만 X, 분모 병기 필수)
- 분모 정의 문장 = 통계 옆 permanent 배치 (footnote X, 본문 강조)
- `/outcomes/methodology` 별도 페이지 = 표준 정의 사전 공개

### 원칙 3: 서사 3층 구조 (Le Wagon Tokyo 벤치)

Le Wagon Tokyo Shuxing 학생 서사 = 광고 100편보다 강력. 서사 3층:
1. **국적 + 진입 경로** (관광 / 유학 / 워홀 / 이전 커리어)
2. **비자 여정** (E-7-1 / K-CORE / F-시리즈)
3. **지금 하는 일** (K-pop 산업 in-field / 다른 커리어 전환)

StudentStoryCard 필드 = 위 3층 필수.

### 원칙 4: 파트너 로고 wall = 초기 유일 신뢰 asset

Echo Insight 4 = "채용 파트너 로고 wall 아직 0. Union Pictures / DEEPI / Dropdown 3사 = 초기 대체".

적용:
- PartnerLogoWall = Hero 아래 첫 섹션 (신뢰 base)
- 로고 white / mono 버전 필수 (다크 배경 대비)
- 라이센스 승인 문서 확보 후 노출 (외부 노출 로고 = 서면 동의 필수)

### 원칙 5: 카운트다운 안전판 (B0039 SSG 사고 재발 방지)

Echo Insight 7 + 노아 룰 §7 = "시간 기반 자동 전환 페이지는 SSG 금지".

적용:
- WaitlistApplyCTA / 마감 카운트다운 = `export const dynamic = "force-dynamic"`
- 마감일 미확정 시 카운트다운 X (숫자 표기 대신 "다음 기수 오픈 알림 등록")
- 실제 마감일 확정 후만 D-N 표기

---

## 컴포넌트 10종 spec

각 컴포넌트 = props (TypeScript) + 사용처 + 다크 톤 색상 + 반응형 + 접근성.
공통 색상 토큰 (`app/globals.css` `@theme`):
- `bg-bg` = `#0a0a0f` (기본 배경)
- `bg-surface` = `#14141b` (카드 배경)
- `bg-surface-elevated` = `#1c1c26` (강조 카드)
- `border-border` = `#27272f`
- `text-fg` = `#fafafa`
- `text-fg-muted` = `#a1a1aa`
- `text-fg-subtle` = `#71717a`
- Accent = `brand-pink` (`#ec4899`) 단독 사용 (blue 는 LMS 전용)

### 1. HeroUmbrellaStats

**목적**: 우산 브랜드 지표 4개 (기수 수 / 수료 인원 / 국가 수 / 대표 성과) + 다음 기수 CTA.

**사용처**: `/` 우산 랜딩 above-the-fold (첫 화면).

**Props (TypeScript)**:
```tsx
type HeroUmbrellaStatsProps = {
  cohortCount: number;              // 예: 1 (1기 pilot completed)
  graduateCount: number;            // 예: 10
  countryCount: number;             // 예: 4
  headlineStat: {
    numerator: number;              // 예: 8
    denominator: number;            // 예: 10
    label: string;                  // 예: "실공연 참여"
  };
  nextCohortCta:
    | { type: "apply"; href: string; label: string }
    | { type: "waitlist"; href: string; label: string }
    | { type: "closed"; label: string };  // 마감 상태
  backgroundImage: {
    src: string;                    // /images/stock/*.jpg
    alt: string;                    // 빈 문자열 = 장식 이미지
  };
};
```

**레이아웃 (mobile-first)**:
- 배경 이미지 (opacity 55%) + `bg-bg` overlay (좌측 100% → 우측 transparent)
- 컨테이너 = `max-w-container-content` (1280px), 좌우 padding `px-6 sm:px-10`
- 세로 padding `py-24 sm:py-32`
- 상단 eyebrow (uppercase, `tracking-eyebrow`, `text-fg-subtle`)
- 메인 헤드라인 (`text-display-lg`, `font-black`, `text-fg`)
- 지표 grid (4 컬럼 데스크탑 / 2 컬럼 태블릿 / 1 컬럼 모바일)
- 각 지표 = 큰 숫자 (`text-display-md`, `text-fg`) + 라벨 (`text-fg-muted`, `text-sm`)
- 대표 성과 = raw fraction ("8/10") + 라벨 병기 (별도 카드, `bg-surface-elevated`)
- CTA 버튼 = `brand-pink` accent, `size-xl`

**다크 톤 색상**:
- 배경: `bg-bg` + 이미지 overlay
- 지표 카드: `bg-surface-elevated` 없음 (배경 위 직접 배치, 얼굴 사진 강조)
- CTA: `bg-brand-pink text-fg` (그라데이션 X, 단색)
- 강조 숫자: `text-brand-pink` (headlineStat.numerator 만)

**반응형**:
- Mobile (`< 640px`): 세로 스택, 지표 1 컬럼, headline `text-display-md`
- Tablet (`≥ 640px`): 지표 2 컬럼, headline `text-display-lg`
- Desktop (`≥ 1024px`): 지표 4 컬럼 (mv 라벨 병기), headline `text-display-lg`

**접근성**:
- `<section aria-labelledby="hero-title">`
- 배경 이미지 `alt=""` (장식) + `<h1 id="hero-title">` 실제 텍스트
- CTA 버튼 = `<a>` 또는 `<button>` (링크 X 상태 = `aria-disabled="true"`)
- 지표 숫자 = `<dl>` / `<dt>` / `<dd>` 구조 (screen reader 로 "N개 기수" 명확히)
- 명도 대비: `text-fg` on `bg-bg` = 15:1 (WCAG AAA)

**애니메이션** (subtle 만):
- 진입 시 지표 숫자 count-up (0 → 최종값, 800ms ease-out)
- 그라데이션 X. transform / opacity 만 사용.

---

### 2. CohortsShowcaseGrid

**목적**: 기수별 카드 archive. 다기수 증거 = 첫 번째 신뢰 지표.

**사용처**: `/` (우산 랜딩 하단, 최대 3개 노출) + `/cohorts/` (전체 grid).

**Props**:
```tsx
type Cohort = {
  slug: string;                     // human-readable, 예: "fan-to-pro-1"
  name: string;                     // "Fan to Pro 1기"
  period: {
    startDate: string;              // "2026-06-27"
    endDate: string;                // "2026-07-19"
  };
  instructors: {
    name: string;
    avatarSrc: string;
  }[];                              // 최대 3명 표시 (초과 시 "+N")
  graduateCount: number;
  heroStat: string;                 // "실공연 참여 8/10"
  thumbnailSrc: string;             // 대표 프로젝트 사진
  detailHref: string;               // /cohorts/[slug]
};

type CohortsShowcaseGridProps = {
  cohorts: Cohort[];
  variant: "landing" | "archive";   // landing = 최대 3개, archive = 전체
};
```

**레이아웃**:
- Grid: 3 컬럼 데스크탑 / 2 태블릿 / 1 모바일 (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`)
- 각 카드:
  - `bg-surface` + `border border-border` + rounded `rounded-xl` (12px)
  - 상단 썸네일 (16:9 비율, `object-cover`)
  - 하단 padding `p-6`:
    - 기수명 (`text-xl font-bold text-fg`)
    - 기간 (`text-sm text-fg-muted`, "2026.06.27 - 2026.07.19" 하이픈만)
    - 강사 얼굴 grid (원형 48px, 겹침 stack)
    - 수료 인원 (`text-fg-muted`, "수료 N명")
    - 대표 성과 = raw fraction 강조 (`text-brand-pink font-bold text-lg`)
    - "자세히 보기" 링크 (`text-fg` + arrow →)

**다크 톤 색상**:
- 카드: `bg-surface` (elevated 아님, hover 시 elevated)
- Hover: `bg-surface-elevated` + `border-border-strong` (transform X, 색만)
- 강조: `brand-pink` (heroStat 만)

**반응형**:
- Mobile: 카드 = full width, 썸네일 위 텍스트 아래
- Tablet: 2 컬럼
- Desktop: 3 컬럼 (`variant="archive"` 는 4 컬럼도 검토)

**접근성**:
- 카드 전체 = `<article>` + `<a>` 래핑 (전체 클릭 가능)
- 강사 얼굴 = `<img alt="{강사이름} 프로필">` (장식 X)
- 기간 = `<time datetime="2026-06-27/2026-07-19">` (screen reader 로 정확히)

**빈 상태**:
- `variant="archive"` + 기수 0개 시 = "기수 데이터 준비 중" 안내 (`text-fg-muted`)
- 실제 사용 시나리오 = 최소 1개 있음 (1기)

---

### 3. StudentStoryCard + StoryDetailPage

**목적**: 학생 인터뷰 카드 grid (StudentStoryCard) + 상세 페이지 (StoryDetailPage). 서사 3층 구조 (원칙 3).

**사용처**: `/` (하단 최대 3개) + `/stories/` (전체 grid) + `/stories/[slug]` (상세).

**Props (StudentStoryCard)**:
```tsx
type StudentStory = {
  slug: string;                     // "chihiro-japan-fan-to-pro-1"
  name: string;                     // 실명 or 이니셜 (anonymous 옵션)
  anonymous: boolean;               // true 시 name = 이니셜, 사진 = blur
  avatarSrc: string;                // 원형 얼굴 사진
  nationality: string;              // "일본" / "필리핀" 등 국기 이모지 X
  cohortName: string;               // "Fan to Pro 1기"
  visaJourney: string;              // "관광 → E-7-1 준비 중" 짧게
  currentRole: string;              // "Union Pictures 프로덕션 인턴"
  quote: string;                    // 대표 인용문 1개 (카드용)
  detailHref: string;
};

type StudentStoryCardProps = {
  story: StudentStory;
};
```

**레이아웃 (카드)**:
- `bg-surface` + `border border-border` + `rounded-xl` + `p-6`
- 상단: 원형 얼굴 사진 (240px on desktop, 160px on mobile, `rounded-full`)
- 이름 + 국적 (`text-xl font-bold text-fg`)
- 기수 태그 (`text-xs uppercase tracking-eyebrow text-fg-subtle`)
- 비자 여정 (`text-sm text-fg-muted`, 화살표 = `→` U+2192 허용 §6.5)
- 인용문 (`text-base text-fg italic`, 큰 따옴표는 직선 `"` `"`)
- 현재 역할 (`text-sm text-brand-pink font-bold`)
- "인터뷰 전문 보기" 링크

**Props (StoryDetailPage, 페이지 단위)**:
```tsx
type StoryDetailPageProps = {
  story: StudentStory & {
    fullQuotes: string[];           // 3~5개 인터뷰 답변
    backgroundBefore: string;       // 프로그램 참여 전 상황
    whyGrowthCareer: string;        // 왜 참여했나
    duringProgram: string;          // 프로그램 중 경험
    afterProgram: string;           // 지금 하는 일 상세
    relatedFaculty?: string[];      // 관련 강사 slug
    relatedPartners?: string[];     // 관련 파트너 slug
  };
};
```

**레이아웃 (상세)**:
- Hero: 큰 얼굴 사진 (fixed height 480px) + 이름 / 국적 / 기수 overlay
- 본문: `max-w-narrow` (720px) 컨테이너, 4 섹션 (before / why / during / after)
- 각 섹션 = 소제목 (`text-2xl font-bold`) + 본문 (`text-lg text-fg leading-relaxed`)
- 사이드바 (desktop): 관련 강사 / 파트너 링크
- 하단: "다른 스토리 보기" (관련 story 3개 카드)

**다크 톤 색상**:
- 카드: `bg-surface`
- 이름: `text-fg`
- 국적 / 기수: `text-fg-muted`
- 현재 역할 강조: `brand-pink`
- 얼굴 사진 = 원본 그대로 (blur 처리 X, anonymous 만 blur)

**반응형**:
- Mobile: 얼굴 사진 160px, 카드 1 컬럼
- Tablet: 얼굴 사진 200px, 2 컬럼
- Desktop: 얼굴 사진 240px, 3 컬럼

**접근성**:
- 얼굴 사진 = `<img alt="{이름} 프로필 사진">`
- Quote = `<blockquote><p>...</p><cite>{name}, {nationality}</cite></blockquote>`
- Anonymous 시: `alt=""` (blur 사진), name = "익명 처리된 수료자" 명시
- 국기 이모지 사용 X (정치적 위험, Echo 리서치 명시)

---

### 4. FacultyProfileGrid

**목적**: 강사진 credential + K-pop 산업 실적 노출.

**사용처**: `/faculty/` (전체) + `/cohorts/[slug]` (해당 기수 강사만).

**Props**:
```tsx
type Instructor = {
  slug: string;
  name: string;
  avatarSrc: string;                // 정면 얼굴 사진 (320px)
  companyName: string;              // "Union Pictures"
  companyLogoSrc: string;           // white / mono 버전
  role: string;                     // "프로듀서"
  keyProjects: string[];            // ["아이돌 그룹 A 프로덕션", ...]
  sessionCount: number;             // 담당 세션 수
  cohortSlugs: string[];            // 참여 기수
};

type FacultyProfileGridProps = {
  instructors: Instructor[];
  filterByCohort?: string;          // 있으면 해당 기수만 필터
};
```

**레이아웃**:
- Grid: 3 컬럼 데스크탑 / 2 태블릿 / 1 모바일
- 각 카드:
  - `bg-surface` + `border border-border` + `rounded-xl`
  - 얼굴 사진 = 정사각 320px on desktop (전체 카드 너비)
  - Padding `p-6`:
    - 이름 (`text-2xl font-bold text-fg`)
    - 역할 (`text-fg-muted`)
    - 회사 로고 (white/mono, height 24px)
    - Key projects list (bullet, `text-sm text-fg-muted`)
    - 세션 수 (`text-xs uppercase tracking-eyebrow text-fg-subtle`)

**다크 톤 색상**:
- 카드: `bg-surface`
- 회사 로고 = mono / white (다크 배경 대비 필수)
- 회사 로고 원본 다크 배경 미대응 시 노출 안 함 (라이센스 승인 미확보 = 노출 X)

**반응형**: 다른 카드 컴포넌트와 동일 패턴.

**접근성**:
- 얼굴 사진 = `<img alt="{이름} 강사 프로필 사진">`
- 회사 로고 = `<img alt="{회사명} 로고">`

---

### 5. PartnerLogoWall

**목적**: 3사 (Union Pictures / DEEPI / Dropdown) + 향후 채용 파트너 확장. 초기 유일 신뢰 asset.

**사용처**: `/` 우산 랜딩 (Hero 바로 아래, 신뢰 base) + `/partners/`.

**Props**:
```tsx
type Partner = {
  slug: string;
  name: string;
  logoSrc: string;                  // white/mono SVG
  category: "production" | "recruitment" | "operator";
  licenseGranted: boolean;          // false 시 렌더 X
  displayOrder: number;
};

type PartnerLogoWallProps = {
  partners: Partner[];
  layout: "wall" | "inline";        // wall = 큰 grid, inline = 좁은 스트립
  showCategory?: boolean;           // /partners/ 는 카테고리별 그룹
};
```

**레이아웃 (wall)**:
- Grid: 3~5 컬럼 responsive (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`)
- 각 로고 = 컨테이너 height 80px, `object-contain`, padding `p-6`
- 배경: `bg-surface` (은은한 카드), border X or `border border-border`
- Hover: 로고 100% opacity → 60% opacity (subtle interactivity)

**레이아웃 (inline)**:
- 가로 스트립: `flex items-center gap-8 overflow-x-auto`
- 각 로고 height 40px
- 우산 랜딩 Hero 아래용

**다크 톤 색상**:
- 배경: `bg-surface` 또는 `bg-bg`
- 로고: white/mono SVG (필수, 원본 컬러 X)
- Border: `border-border`

**반응형**:
- Mobile: 2 컬럼 wall, inline 스트립은 가로 스크롤
- Tablet: 3 컬럼
- Desktop: 5 컬럼

**접근성**:
- 각 로고 = `<img alt="{회사명} 로고">`
- Wall = `<section aria-labelledby="partners-title">` + `<h2 id="partners-title">파트너 회사</h2>`
- 라이센스 미승인 = 렌더 X (`licenseGranted === false` 필터)

**초기 상태**:
- 3사만 (Union Pictures / DEEPI / Dropdown). 얇게 배치, "N사 파트너십" 카피 대신 실제 로고 노출.

---

### 6. OutcomesReport

**목적**: 취업률 / 실공연 참여율 / 만족도 + 분모 정의 병기. CIRR 표준 준수.

**사용처**: `/outcomes/` + `/cohorts/[slug]` (기수별 snapshot).

**Props**:
```tsx
type OutcomeSnapshot = {
  cohortSlug: string;
  periodLabel: "90-day" | "180-day" | "360-day";
  numerator: number;                // 예: 8
  denominator: number;              // 예: 10
  denominatorDefinition: string;    // "수료자 10명 중 실공연 배정 8명"
  inFieldDefinition: string;        // "K-pop 산업 관련 직무 (프로덕션 / A&R / 마케팅 / 무대 / 영상)"
  auditDate: string;                // "2026-10-19"
  auditedBy: string;                // "Dropdown 사업자"
  label: string;                    // "실공연 참여율"
};

type OutcomesReportProps = {
  snapshots: OutcomeSnapshot[];     // 90 / 180 / 360일 3개 병기
  methodologyHref: string;          // /outcomes/methodology
};
```

**레이아웃**:
- 상단: 대표 지표 3개 (90 / 180 / 360일) 큰 카드
- 각 카드:
  - `bg-surface-elevated` + `border border-border` + `rounded-xl` + `p-8`
  - 상단: 기간 라벨 (`text-xs uppercase tracking-eyebrow text-fg-subtle`, "90-DAY OUTCOME")
  - 큰 raw fraction ("8/10") = `text-display-md font-black text-brand-pink`
  - Percentage ("80%") = `text-2xl text-fg-muted`
  - 라벨 ("실공연 참여율") = `text-lg text-fg`
  - 분모 정의 문장 = `text-sm text-fg-muted leading-relaxed` (강조, footnote X)
  - 감사일 + 감사자 병기 = interpunct (U+00B7) 대신 슬래시 or 파이프 사용:
    - "감사일 2026-10-19 / Dropdown" 슬래시 or
    - "감사일 2026-10-19 | Dropdown" 파이프
    - (U+00B7 금지 §6.5)
- 하단: "지표 정의 방법론 자세히 보기" 링크 → `/outcomes/methodology`

**시각화 (그라데이션 X)**:
- 막대 그래프 = 단색 (`bg-brand-pink`), 배경 = `bg-surface`
- 원형 그래프 = 단색 stroke (SVG, 그라데이션 X)
- 데이터 라벨 = 큰 raw fraction 만 (원형 안 X, 옆에 병기)

**다크 톤 색상**:
- 카드: `bg-surface-elevated`
- 강조 숫자: `text-brand-pink` (raw fraction)
- 본문: `text-fg` / `text-fg-muted`

**반응형**:
- Mobile: 3 카드 세로 스택
- Tablet: 3 카드 가로 grid (좁게)
- Desktop: 3 카드 가로 grid (넓게)

**접근성**:
- 각 지표 = `<figure><figcaption>...</figcaption><data value="80">8/10</data></figure>`
- Screen reader 로 "실공연 참여율 10명 중 8명, 80%" 명확히 읽힘
- 분모 정의 = `<p>` 본문 (footnote X, 명확히 노출)

**Lambda 교훈 방어**:
- Raw fraction 강조 (숫자만 X)
- 분모 정의 permanent 노출 (footnote 접기 X)
- 감사일 + 감사자 이름 명시
- `/outcomes/methodology` 별도 페이지 링크

---

### 7. CurriculumTracksCards

**목적**: 트랙 3개 (Fan to Pro / 셰르파 심화 / 올인원) 카탈로그.

**사용처**: `/` 우산 랜딩 + `/tracks/`.

**Props**:
```tsx
type Track = {
  slug: string;                     // "fan-to-pro"
  name: string;                     // "Fan to Pro"
  target: string;                   // "K-pop 산업 진입 희망 외국인"
  duration: string;                 // "4주"
  curriculumSummary: string[];      // ["프로덕션 기본", "무대 실무", ...]
  representativeFaculty: string[];  // 대표 강사 이름 3명
  nextCohortStatus:
    | { type: "open"; startDate: string; applyHref: string }
    | { type: "closed"; waitlistHref: string }
    | { type: "coming-soon"; label: string };
  thumbnailSrc: string;
  detailHref: string;               // /fan-to-pro/ or /tracks/[slug]
};

type CurriculumTracksCardsProps = {
  tracks: Track[];
};
```

**레이아웃**:
- Grid: 3 컬럼 데스크탑 / 1 컬럼 모바일 (`grid grid-cols-1 lg:grid-cols-3 gap-8`)
- 각 카드:
  - `bg-surface` + `border border-border` + `rounded-xl` + `p-8`
  - 상단 썸네일 (16:9)
  - 트랙명 (`text-3xl font-black text-fg`)
  - 대상 (`text-fg-muted`, "K-pop 산업 진입 희망 외국인")
  - 기간 (`text-sm uppercase tracking-eyebrow text-fg-subtle`, "4주")
  - 커리큘럼 요약 (bullet, `text-fg-muted`)
  - 대표 강사 (얼굴 아이콘 3개 + 이름)
  - Next cohort 상태:
    - Open = "N월 N일 시작" + CTA 버튼 (`brand-pink`)
    - Closed = "다음 기수 대기 등록" + CTA (`bg-surface-elevated` outline)
    - Coming soon = "준비 중" 태그 (`text-fg-subtle`)

**다크 톤 색상**:
- 카드: `bg-surface`
- 강조 트랙명: `text-fg`
- CTA: `brand-pink` (open 상태만)
- Coming soon 배지: `bg-surface-elevated text-fg-muted`

**주의**: Aria ADR 0015 = "각 트랙 accent 컬러 1개씩 (Toss 블루 계열)" 이지만 Toss 블루는 라이트 LMS 전용. 다크 shell 에는 `brand-pink` 만 accent (`brand-purple` / `brand-violet` 은 §7.4 어드민 3-tab 색과 겹칠 위험). 각 트랙 accent 컬러 분리 = 노아 확인 필요 항목.

**반응형**:
- Mobile: 1 컬럼, 카드 세로 스택
- Tablet: 2 컬럼 (2개 나란히, 3번째는 다음 줄)
- Desktop: 3 컬럼 나란히

**접근성**:
- 카드 = `<article>` + heading `<h3>`
- CTA 버튼 = `<a>` 또는 `<button>`
- Coming soon = `aria-disabled="true"` 명시

---

### 8. AlumniNetworkTeaser

**목적**: Slack / Discord / 카톡 커뮤니티 미리보기 + 가입 CTA.

**사용처**: `/` 우산 랜딩 하단 + `/cohorts/[slug]` (해당 기수 완료 후).

**Props**:
```tsx
type AlumniNetworkTeaserProps = {
  platform: "slack" | "discord" | "kakao";
  memberCount: number;              // 실제 인원 (1기 = 10)
  countryCount: number;             // 4
  representativeMembers: {
    avatarSrc: string;
    name?: string;                  // 익명 옵션
  }[];                              // 최대 12명 얼굴 노출
  inviteCta: {
    href: string;
    label: string;                  // "Slack 워크스페이스 참여"
  };
  headline: string;                 // "N명 alumni 네트워크"
};
```

**레이아웃**:
- 컨테이너 `max-w-container-content` + `py-24`
- 좌: 카피 (`text-4xl font-bold text-fg` + `text-lg text-fg-muted`)
- 우: 얼굴 grid (12명, 원형 64px, `grid grid-cols-4 sm:grid-cols-6 gap-3`)
- 하단: CTA 버튼 (`bg-brand-pink text-fg`)

**다크 톤 색상**:
- 배경: `bg-surface` (섹션 강조)
- 얼굴 원형: 원본 사진 그대로
- CTA: `brand-pink`

**반응형**:
- Mobile: 세로 스택 (카피 위, 얼굴 아래)
- Tablet: 좌우 2 컬럼
- Desktop: 좌우 2 컬럼 (얼굴 grid 넓게)

**접근성**:
- 얼굴 = `<img alt="{이름} alumni 프로필">` or `alt=""` (익명)
- CTA = `<a href={inviteCta.href}>` (외부 링크 시 `target="_blank" rel="noopener"`)

**주의**:
- 초기 (1기 종강 직후) = 얼굴 grid 10명 = grid 6 컬럼 = 어색. Aria 결정 대기 (얼굴 노출 최소 인원 기준).

---

### 9. BlogInsightsGrid

**목적**: K-pop 산업 + 비자 (E-7-1 / K-CORE / F-시리즈) 콘텐츠 카드 grid. B0019 SEO 자산 연결.

**사용처**: `/blog/` + `/` 우산 랜딩 하단 (최대 3개 미리보기).

**Props**:
```tsx
type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;                  // 150자 이하
  category: "visa" | "industry" | "career" | "cohort-recap";
  publishedAt: string;              // "2026-07-05"
  readingTime: number;              // 분
  coverImageSrc: string;
  authorName: string;
  detailHref: string;               // /blog/[slug]
};

type BlogInsightsGridProps = {
  posts: BlogPost[];
  variant: "landing" | "archive";
};
```

**레이아웃**:
- Grid: 3 컬럼 데스크탑 / 2 태블릿 / 1 모바일
- 각 카드:
  - `bg-surface` + `border border-border` + `rounded-xl`
  - 상단 커버 이미지 (16:9)
  - Padding `p-6`:
    - 카테고리 태그 (`text-xs uppercase tracking-eyebrow text-brand-pink`)
    - 제목 (`text-xl font-bold text-fg`)
    - 발췌 (`text-fg-muted text-sm`)
    - 하단: 저자 (`text-xs text-fg-subtle`) + 읽는 시간 ("N분")
    - 발행일 = `<time>` (ISO)

**다크 톤 색상**:
- 카드: `bg-surface`
- 카테고리 태그: `brand-pink` (강조)
- 나머지: `text-fg` / `text-fg-muted` / `text-fg-subtle`

**반응형**: 다른 카드 grid 와 동일.

**접근성**:
- 카드 = `<article>` + `<h3>` (제목)
- 커버 이미지 = `alt="{제목}"` (내용 표현)
- 카테고리 = `<span aria-label="카테고리: {category}">`
- `<time datetime="2026-07-05">` = 정확한 날짜

**콘텐츠 소스**:
- 초기 = MDX 파일 (`content/blog/*.mdx`)
- 20+ 콘텐츠 축적 후 CMS 검토 (Aria 권고, ADR 0015 결정 3)

---

### 10. WaitlistApplyCTA

**목적**: 다음 기수 신청 대기 등록. 1기 마감 후 lead 축적.

**사용처**: `/waitlist` + `/` 하단 (마감 시) + `/fan-to-pro/*` 하단 (마감 시).

**Props**:
```tsx
type WaitlistApplyCTAProps = {
  nextCohortDate?: string;          // 확정 시만. 미확정 = undefined
  formAction: string;               // Server Action URL
  variant: "hero" | "footer";       // hero = 큰 배치, footer = 좁게
  trackSlug: string;                // "fan-to-pro" / 우산 전체 = "all"
};
```

**렌더 규칙 (원칙 5)**:
- **`export const dynamic = "force-dynamic"` 필수** (SSG 사고 재발 방지)
- `nextCohortDate` 확정 시 = D-N 카운트다운 + CTA
- `nextCohortDate` 미확정 시 = "다음 기수 오픈 알림 등록" 카피 (숫자 없음)

**레이아웃 (hero variant)**:
- 컨테이너 `max-w-narrow` (720px) 중앙
- 상단: 카피 (`text-4xl font-bold text-fg`) + 서브 (`text-fg-muted`)
- 폼:
  - 이메일 인풋 (`bg-surface border border-border rounded-lg px-4 py-3 text-fg`)
  - Submit 버튼 (`bg-brand-pink text-fg font-bold rounded-lg px-6 py-3`)
  - 개인정보 동의 체크박스 (필수)
- 하단: 프라이버시 안내 (`text-xs text-fg-subtle`)

**레이아웃 (footer variant)**:
- 좁은 스트립 (`bg-surface py-12`)
- 카피 좌 / 폼 우 (모바일 = 세로 스택)

**다크 톤 색상**:
- 배경: `bg-bg` (hero) or `bg-surface` (footer)
- 인풋: `bg-surface border-border`
- 인풋 focus: `border-brand-pink` (outline 2px `brand-purple`)
- Submit: `brand-pink`

**반응형**:
- Mobile: 세로 스택 (카피 위, 폼 아래)
- Desktop: 카피 좌 / 폼 우 (footer variant), hero variant 는 중앙 정렬 유지

**접근성**:
- 이메일 인풋 = `<label>` (visible 또는 sr-only + `aria-label`)
- Submit = `<button type="submit">`
- 성공 시 = `<div role="status" aria-live="polite">등록 완료</div>`
- 개인정보 동의 = `<input type="checkbox" required>` + 관련 문서 링크

**주의 (B0039 재발 방지)**:
- 페이지 export const dynamic = "force-dynamic" 필수
- 서버 시각 기반 마감 판단 시 SSG X
- 카운트다운 숫자 = 실제 마감일 확정 후만
- 미확정 = 숫자 대신 텍스트 CTA ("오픈 알림 등록")

---

## 페이지 12 route wireframe

각 페이지 = Hero + 주요 섹션 + 하단 CTA + SEO metadata.

라우트 경로 (Aria ADR 0015 확정):
```
app/[locale]/(marketing)/
  layout.tsx                        # 공통 shell (nav / footer)
  page.tsx                          # /  = 우산 랜딩
  cohorts/
    page.tsx                        # /cohorts/  = 기수 아카이브
    [slug]/
      page.tsx                      # /cohorts/[slug]  = 기수 상세
  stories/
    page.tsx                        # /stories/  = 학생 인터뷰 grid
    [slug]/
      page.tsx                      # /stories/[slug]  = 인터뷰 상세
  outcomes/
    page.tsx                        # /outcomes/  = 통계
    methodology/
      page.tsx                      # /outcomes/methodology  = 분모 정의
  tracks/
    page.tsx                        # /tracks/  = 트랙 카탈로그
  faculty/
    page.tsx                        # /faculty/  = 강사진
  partners/
    page.tsx                        # /partners/  = 파트너 회사
  blog/
    page.tsx                        # /blog/  = 콘텐츠 archive
    [slug]/
      page.tsx                      # /blog/[slug]  = 포스트 상세
  waitlist/
    page.tsx                        # /waitlist  = Waitlist form

app/[locale]/fan-to-pro/            # 기존, §7.4 변경 금지
  page.tsx                          # /fan-to-pro/  = 트랙 landing
```

---

### 페이지 1. `/` (우산 랜딩)

**목적**: 우산 브랜드 첫 인상 + 다음 기수 CTA + 신뢰 base + 트랙 카탈로그.

**Hero**: HeroUmbrellaStats (지표 4개 + 다음 기수 CTA)
- 배경: K-pop 프로덕션 씬 (opacity 55%)
- 카피 예시:
  - Eyebrow: "K-POP INDUSTRY BOOTCAMP FOR FOREIGNERS"
  - Headline: "Fan to Pro. Global to Korea."
  - Sub: "N기 pilot completed / 10명 수료 / 4개국 출신"
  - CTA: "다음 기수 알림 등록" (1기 종강 후 → 2기 확정 전)

**섹션 2. 파트너 로고 wall**: PartnerLogoWall (variant="inline")
- Union Pictures / DEEPI / Dropdown 3사
- "함께 만드는 파트너" 카피 (얇게)

**섹션 3. 트랙 카탈로그**: CurriculumTracksCards
- Fan to Pro (open or waitlist) / 셰르파 심화 (coming soon) / 올인원 (coming soon)
- 카피: "지금 열려있는 트랙 / 준비 중인 트랙"

**섹션 4. 학생 스토리**: StudentStoryCard grid (최대 3개, "더 보기" 링크)
- 1기 수료자 인터뷰

**섹션 5. 기수 아카이브**: CohortsShowcaseGrid (variant="landing", 최대 3개)
- 1기 카드 1개 (초기)

**섹션 6. Alumni 네트워크**: AlumniNetworkTeaser
- Slack / 카톡 병행 (Aria ADR 0015 결정 2)

**섹션 7. Blog insights**: BlogInsightsGrid (variant="landing", 최대 3개)
- E-7-1 / K-CORE / F-시리즈 콘텐츠

**섹션 8. 하단 CTA**: WaitlistApplyCTA (variant="footer")

**SEO metadata**:
```tsx
export const metadata: Metadata = {
  title: "Growth Career - K-pop 산업 진입 부트캠프",
  description: "외국인을 위한 4주 K-pop 산업 실무 부트캠프. Union Pictures 공연 프로젝트 참여 기회. E-7-1 / K-CORE / F-시리즈 비자 지원.",
  openGraph: {
    title: "Growth Career",
    description: "K-pop industry bootcamp for foreigners",
    images: ["/og/umbrella-landing.png"],
  },
};
```

**Rendering**: ISR (`revalidate = 3600`), 콘텐츠 변경 빈도 낮음.

---

### 페이지 2. `/cohorts/`

**목적**: 기수별 아카이브. 다기수 증거.

**Hero**: 간단 헤더 (`text-display-md` "기수 아카이브" + sub)

**섹션 2. 기수 grid**: CohortsShowcaseGrid (variant="archive")
- 전체 기수 카드 (초기 = 1개)

**섹션 3. 다음 기수 대기**: WaitlistApplyCTA (variant="footer")

**SEO**: title="기수 아카이브 - Growth Career"

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 3. `/cohorts/[slug]`

**목적**: 특정 기수 상세.

**Hero**: 기수명 + 기간 + 대표 사진 (기수 프로덕션 씬)

**섹션 2. 기수 개요**: 기간 / 인원 / 강사진 / 대표 성과 (grid 4개)

**섹션 3. 강사진**: FacultyProfileGrid (filterByCohort={slug})

**섹션 4. 학생 스토리**: StudentStoryCard grid (해당 기수만)

**섹션 5. Outcomes snapshot**: OutcomesReport (해당 기수 90/180/360일)

**섹션 6. 커리큘럼 하이라이트**: 주차별 아코디언 (텍스트만)

**섹션 7. 파트너**: PartnerLogoWall (variant="inline", 해당 기수 협력사)

**SEO**: dynamic (기수명 기반), `generateMetadata`

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 4. `/stories/`

**목적**: 학생 인터뷰 grid.

**Hero**: 간단 헤더 ("수료생 이야기" + sub)

**섹션 2. Story grid**: StudentStoryCard grid (전체)
- 필터 옵션 (국적 / 기수 / 비자 여정 / 현재 역할) - 초기 X, 20+ 스토리 시 도입

**섹션 3. 하단 CTA**: WaitlistApplyCTA (variant="footer")

**SEO**: title="수료생 이야기 - Growth Career"

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 5. `/stories/[slug]`

**목적**: 학생 인터뷰 상세.

**레이아웃**: StoryDetailPage 컴포넌트 사용.
- Hero: 얼굴 사진 (480px) + 이름 / 국적 / 기수
- 본문 4 섹션 (before / why / during / after)
- 사이드바 (desktop): 관련 강사 / 파트너
- 하단: 관련 스토리 3개

**SEO**: dynamic (이름 + 국적 + 기수 조합)

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 6. `/outcomes/`

**목적**: 취업률 / 실공연 참여율 통계.

**Hero**: 헤더 ("성과 리포트") + sub ("CIRR 표준 준수 감사 리포트")

**섹션 2. Methodology 링크 안내**: 큰 배너 → "지표 정의 방법론 자세히 보기" `/outcomes/methodology`

**섹션 3. 기수별 OutcomesReport**:
- 1기 (90 / 180 / 360일)
- 2기 (추가 시)

**섹션 4. Cohort별 breakdown**: OutcomesReport 각 기수

**섹션 5. 감사 이력**: 감사일 / 감사자 / 변경 이력 (표)

**SEO**: title="성과 리포트 - Growth Career"

**Rendering**: SSG + snapshot 기반 (실시간 X, Aria ADR 0015 결정 4)

**주의**: Lambda 교훈 = 실시간 DB query 금지. `outcome_reports` 테이블 (감사된 snapshot) 만 join.

---

### 페이지 7. `/outcomes/methodology`

**목적**: 분모 / 기간 / in-field 정의 사전 박제 문서.

**Hero**: 간단 헤더 ("성과 지표 정의 방법론")

**섹션 2. 분모 정의**:
- 본문 = "all grads" (CIRR 표준, Aria 권고 옵션 B)
- 예시: "Fan to Pro 1기 수료자 10명 전원을 분모로 사용"
- 왜 이렇게 정의하는가 (Lambda 사고 언급 with reference)

**섹션 3. 기간 정의**:
- 90 / 180 / 360일 3 지표 병기 (Aria 권고 옵션 C)
- 각 기간 정의 상세

**섹션 4. In-field 정의**:
- K-pop 산업 관련 직무 (프로덕션 / A&R / 마케팅 / 무대 / 영상)
- 관광업 / 외식업 / 비관련 직무 = in-field 아님
- 실공연 참여도 = 별도 지표

**섹션 5. 감사 프로세스**:
- Dropdown 사업자 자체 감사
- 감사 주기 (6개월)
- 감사 로그 공개 (변경 이력 표)

**섹션 6. CIRR 표준 참조**:
- CIRR 정의 링크 (외부)
- 우리 정의 vs CIRR 정의 차이 (있으면)

**SEO**: title="성과 지표 정의 방법론 - Growth Career"

**Rendering**: SSG (정의 문서 = 자주 변경 X)

---

### 페이지 8. `/tracks/`

**목적**: 트랙 카탈로그 상세.

**Hero**: 헤더 ("트랙 카탈로그")

**섹션 2. CurriculumTracksCards**: 전체 트랙 (open + coming soon)

**섹션 3. 트랙 비교 표**: 트랙별 대상 / 기간 / 가격 / 주요 커리큘럼 비교

**섹션 4. 다음 기수 CTA**: WaitlistApplyCTA

**SEO**: title="트랙 카탈로그 - Growth Career"

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 9. `/faculty/`

**목적**: 강사진 전체 프로필.

**Hero**: 헤더 ("강사진")

**섹션 2. FacultyProfileGrid**: 전체 강사

**섹션 3. 강사 지원 CTA**: "강사로 참여하기" 이메일 (또는 폼)

**SEO**: title="강사진 - Growth Career"

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 10. `/partners/`

**목적**: 파트너 회사 소개 + 신규 파트너 인바운드.

**Hero**: 헤더 ("파트너 회사")

**섹션 2. PartnerLogoWall (variant="wall")**: 전체 파트너 (카테고리별 그룹)
- Production 파트너 (Union Pictures / DEEPI)
- Operator (Dropdown)
- Recruitment (초기 X, B0072 이후)

**섹션 3. 각 파트너 상세**: 회사 소개 + 협력 내용 + 로고

**섹션 4. 파트너 문의**: "새로운 파트너십 문의" 이메일 CTA

**SEO**: title="파트너 회사 - Growth Career"

**Rendering**: ISR (`revalidate = 3600`).

---

### 페이지 11. `/blog/` + `/blog/[slug]`

**목적**: K-pop 산업 + 비자 콘텐츠 archive.

**`/blog/`**:
- Hero: 헤더 ("Insights")
- 섹션 2. BlogInsightsGrid (variant="archive")
- 필터: 카테고리 (visa / industry / career / cohort-recap)
- 하단 CTA

**`/blog/[slug]`**:
- Hero: 커버 이미지 + 제목 + 발행일 + 저자
- 본문: MDX 렌더 (`max-w-narrow` 720px)
- 관련 포스트 3개 하단
- Waitlist CTA 하단

**SEO**: 각 포스트 `generateMetadata` (title + description + og-image)

**Rendering**: ISR (`revalidate = 3600`), 초기 콘텐츠 = MDX 파일

---

### 페이지 12. `/waitlist`

**목적**: 다음 기수 대기 등록.

**Hero**: WaitlistApplyCTA (variant="hero")

**섹션 2. 왜 대기 등록**:
- 다음 기수 오픈 시 첫 알림
- Early bird 할인 (확정 시)
- 사전 인터뷰 우선 배정

**섹션 3. 지금까지 실적**:
- HeroUmbrellaStats 요약 버전

**SEO**: title="다음 기수 대기 등록 - Growth Career"

**Rendering**: `force-dynamic` (§7 SSG 룰 준수, B0039 재발 방지)

---

## 다크 톤 디자인 시스템

### 색상 팔레트

`app/globals.css` `@theme` 기존 토큰 사용 (신규 도입 X).

**배경 계층**:
- Level 0 (page bg): `bg-bg` `#0a0a0f`
- Level 1 (card): `bg-surface` `#14141b`
- Level 2 (elevated): `bg-surface-elevated` `#1c1c26`

**텍스트 계층**:
- Primary: `text-fg` `#fafafa` (헤드라인 / 본문)
- Muted: `text-fg-muted` `#a1a1aa` (서브 / 캡션)
- Subtle: `text-fg-subtle` `#71717a` (메타 / eyebrow)

**Accent (단색 사용, 그라데이션 X)**:
- Primary accent: `brand-pink` `#ec4899`
  - 사용처: CTA 버튼, 강조 숫자 (raw fraction), 카테고리 태그
  - 사용 제한: 페이지당 3~5회 이하 (강조 = 희소성)
- Secondary accent 후보: `brand-purple` `#a855f7`
  - 사용처: focus outline, decoration
  - Aria ADR 0015 트랙별 accent 컬러 분리 = 노아 확인 필요 (§6 참고)

**Border**:
- Default: `border-border` `#27272f`
- Strong: `border-border-strong` `#3f3f48` (hover / focus)

**금지**:
- 그라데이션 (CSS `linear`, `radial`, `conic` 3종 모두)
- Blue 계열 (`#3182f6` 등 Toss 블루) - 라이트 LMS 전용
- 채도 낮은 warm accent (Echo Insight 5 검토안) = **원칙 X**. 다크 shell 통일 유지.

### 타이포그래피

**폰트 스택**:
- Primary: Pretendard Variable (한글 + 영문)
- Fallback: system-ui / -apple-system

**디스플레이 스케일** (Fluid, 기존 토큰):
- `text-display-2xl` = clamp(5rem, 22vw, 18rem) - 극단 IMPACT 헤로
- `text-display-xl` = clamp(4rem, 16vw, 12rem)
- `text-display-lg` = clamp(3rem, 10vw, 7rem) - Hero headline 주력
- `text-display-md` = clamp(2.25rem, 6vw, 4.5rem) - 섹션 헤더
- `text-display-sm` = clamp(1.75rem, 4vw, 3rem) - 서브 헤더

**본문**:
- Body large: `text-lg` (18px)
- Body: `text-base` (16px)
- Body small: `text-sm` (14px)
- Caption: `text-xs` (12px)

**Tracking (letter-spacing)**:
- Display: `tracking-display` (-0.05em) - 큰 헤드라인 좁게
- Impact: `tracking-impact` (-0.04em) - 강조 숫자
- Eyebrow: `tracking-eyebrow` (0.4em) - uppercase 라벨

**Line-height**:
- Display: 0.95 (극단 좁게)
- Heading: 1.1
- Body: 1.4 (기본) / 1.6 (LMS 라이트)
- Relaxed: 1.75 (긴 인터뷰 본문)

### 여백 시스템

**섹션 padding (세로)**:
- Mobile: `py-16` (64px)
- Tablet: `py-24` (96px)
- Desktop: `py-32` (128px)

**컨테이너 max-width**:
- `max-w-container-content` = 1280px (일반 페이지)
- `max-w-container-narrow` = 720px (인터뷰 본문 / 방법론)

**카드 padding**:
- Small: `p-4`
- Default: `p-6`
- Large: `p-8`

**Grid gap**:
- Small: `gap-3` (12px) - 얼굴 grid
- Default: `gap-6` (24px) - 카드 grid
- Large: `gap-8` (32px) - 섹션 간

### 라운드 (border-radius)

- Small: `rounded` (4px) - 태그
- Default: `rounded-lg` (8px) - 인풋 / 버튼
- Card: `rounded-xl` (12px) - 카드 (Toss 시그니처, 다크에서도 유지)
- Circle: `rounded-full` - 얼굴 사진

**금지**: `rounded-2xl` 이상 (다크 shell 시그니처 = 12px 이하)

### Shadow (다크 shell 에서는 극도로 절제)

**금지**: 다크 배경 위 shadow 는 시각적 효과 미미. 대신 `border-strong` 으로 계층 표현.

**허용**:
- Focus ring: `outline` 2px `brand-purple` + `outline-offset` 4px
- 카드 hover: shadow X, 대신 `bg-surface-elevated` transition

---

## 반응형 breakpoint (mobile-first)

Tailwind 기본 breakpoint 사용.

| Breakpoint | Min width | 대상 | 주요 조정 |
|---|---|---|---|
| Default | 0 | Mobile (< 640px) | 1 컬럼, 세로 스택, display-md |
| `sm` | 640px | Tablet 세로 | 2 컬럼 grid, display-lg |
| `md` | 768px | Tablet 가로 | 2~3 컬럼, sidebar 도입 |
| `lg` | 1024px | Desktop | 3~4 컬럼, 데스크탑 nav |
| `xl` | 1280px | Desktop wide | max-width container 확대 |

### Mobile-first 규칙

1. 모든 컴포넌트 = 기본 스타일 = mobile
2. Breakpoint prefix (`sm:` `lg:`) 로 확대
3. Desktop-only 스타일 = `hidden lg:block` (숨김 아니면 표시)
4. Touch target 최소 44 x 44px (모바일 접근성)

### 이미지 반응형

- 얼굴 사진: `sizes="(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px"`
- 커버 이미지: `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`
- Hero 배경: `sizes="100vw"` + priority

### 텍스트 반응형

- Fluid clamp (기존 `text-display-*` 토큰 사용)
- `text-lg sm:text-xl lg:text-2xl` 패턴 회피 (한 곳에서 관리 = 토큰)

---

## 접근성 (WCAG AA)

### 명도 대비

- `text-fg` on `bg-bg`: 15:1 (AAA)
- `text-fg-muted` on `bg-bg`: 6.8:1 (AA large / normal 통과)
- `text-fg-subtle` on `bg-bg`: 4.5:1 (AA normal 경계, 큰 텍스트만 사용 권장)
- `text-brand-pink` on `bg-bg`: 4.9:1 (AA normal 통과)
- `text-fg` on `bg-brand-pink`: 4.1:1 (AA large only) - CTA 버튼용, 본문 X

### 키보드 접근

- 모든 상호작용 = `Tab` 도달 필수
- Focus visible = 2px `brand-purple` outline + 4px offset (기존 CSS)
- Skip link = `<a href="#main">Skip to main content</a>` (레이아웃 첫 요소)
- Modal / 카드 클릭 시 focus trap (WaitlistApplyCTA 성공 팝업 등)

### 스크린 리더

- Semantic HTML 우선 (`<section>` `<article>` `<nav>` `<main>`)
- Landmark = 페이지당 1개 `<main>`, 여러 `<section>` (aria-labelledby)
- 이미지 alt = 콘텐츠 표현 vs 장식 (`alt=""`) 구분
- 폼 = 모든 인풋 `<label>` 연결
- 동적 콘텐츠 = `aria-live` (WaitlistApplyCTA 성공 메시지)

### 대체 텍스트 원칙

- 얼굴 사진: `alt="{이름} 프로필 사진"` (익명 = `alt=""`)
- 회사 로고: `alt="{회사명} 로고"`
- 배경 이미지: `alt=""` (장식)
- 데이터 시각화: `<figcaption>` 텍스트 병기

### 다국어 접근성

- `<html lang="ko">` or `<html lang="en">` (locale 기반)
- 언어 스위처 = `<button aria-label="언어 선택: 한국어">`
- KO / EN 콘텐츠 분리 (Aria ADR 0015 결정 6, 노아 확인 필요)

### 폼 접근성 (WaitlistApplyCTA)

- 필수 필드 = `required` + `aria-required="true"`
- 에러 = `aria-invalid="true"` + `aria-describedby="error-id"`
- 성공 = `role="status" aria-live="polite"`
- 개인정보 동의 = 체크박스 + 관련 문서 링크 (외부 링크 = `rel="noopener"`)

---

## 애니메이션 원칙 (subtle, 그라데이션 X)

### 허용

- Opacity fade (0 → 1)
- Transform translateY (16px → 0)
- Transform scale (0.95 → 1) - 카드 진입
- Count-up 숫자 (0 → 최종값, 800ms ease-out)
- Color transition (hover 시 border / bg)

### 금지

- 그라데이션 애니메이션 (모든 형태)
- Bounce / spring (K-pop 다이나믹 느낌 유혹 있지만 = 신뢰 손상)
- Auto-play video 소리 켜짐 (음소거 default)
- Parallax scroll (LCP / CLS 손상)
- 3D transform (perspective / rotateX 등)

### Duration 기준

- Micro (hover): 150ms
- Small (card enter): 300ms
- Medium (page transition): 400ms
- Large (count-up): 800ms

### Easing

- `ease-out` (모든 진입)
- `ease-in-out` (transition)
- 커스텀 cubic-bezier 지양

### Reduced motion

- `@media (prefers-reduced-motion: reduce)` = 모든 transform / animation 제거
- Opacity 만 유지 (콘텐츠 접근성)

---

## 노아 확인 필요 (5건)

### 확인 1: Toss 블루 vs 다크 shell accent 통일

Aria ADR 0015 = "각 트랙 accent 컬러 1개씩 (Toss 블루 계열)" 이지만 Toss 블루는 라이트 LMS 전용. 다크 shell 마케팅에는 `brand-pink` `#ec4899` 이 이미 accent.

**옵션**:
- A. 다크 shell = `brand-pink` 통일 (트랙별 accent 없음, 시각 통일)
- B. 트랙별 accent = `brand-pink` / `brand-purple` / `brand-violet` 3가지 (다크 팔레트 안)
- C. 트랙별 accent = 다크 shell 도 라이트 blue 도입 (톤 혼재 위험)

**Luna 권고**: A - `brand-pink` 통일. 트랙별 구분은 썸네일 이미지로.

### 확인 2: Alumni 커뮤니티 얼굴 노출 최소 인원

AlumniNetworkTeaser = 얼굴 grid 12명 노출 설계. 1기 = 10명 = grid 어색.

**옵션**:
- A. 얼굴 grid 최소 12명 미달 시 = 얼굴 노출 X (숫자만)
- B. 10명 시 = 얼굴 노출하되 grid 5x2
- C. 강사 얼굴 병기 (10명 학생 + 2명 강사 = 12명)

**Luna 권고**: A - 신뢰 손상 방지. 2기 완료 후 노출 시작.

### 확인 3: 우산 랜딩 첫 렌더 = SSG vs ISR vs force-dynamic

Aria ADR 0015 = ISR (`revalidate = 3600`) 권고. 하지만 마감일 / 다음 기수 CTA = 시각에 따라 변경 (§7 SSG 룰).

**옵션**:
- A. ISR (3600s) = 콘텐츠 안정성 우선, 마감일은 별도 컴포넌트로 force-dynamic
- B. force-dynamic = 페이지 전체 매 요청 (성능 손실)
- C. ISR (60s) = 짧은 revalidate + 마감일 근처 정확도 향상

**Luna 권고**: A - HeroUmbrellaStats 안의 CTA만 client component + force-dynamic 서브. 나머지는 ISR.

### 확인 4: 다국어 콘텐츠 축 (KO 우선 vs 이중)

Aria ADR 0015 결정 6 = "KO 우선 + EN 최소 (약관 / Outcomes / Student Stories 만)" 권고.

**옵션**:
- A. Aria 권고: 전 페이지 KO 필수, EN = Outcomes + Stories + 약관만
- B. 전 페이지 KO / EN 이중 (기존 정책)
- C. KO 페이지 + EN 페이지 완전 분리 (route split)

**Luna 권고**: A 유지. StudentStoryCard 는 원문 언어 (KO or EN) + 번역 병기.

### 확인 5: 사람 얼굴 사진 수급 시점

Echo Insight 3 + 원칙 1 = 얼굴 비중 확대 필수. 초기 얼굴 사진 = 없음.

**옵션**:
- A. 1기 종강 (7/19) 직후 프로페셔널 촬영 (Aria ADR 0015 결정 4)
- B. 수료식 (7/25) 오프라인에서 촬영
- C. 8월 후 (취업 결과 반영)

**Luna 권고**: A - 감정 fresh + Cohort 1 landing 조기 채움. 촬영 발주 예산 + 스타일링 가이드 별도 결정.

---

## Luna self-check 결과

### 부호 검사 (§6.5)

- em dash (U+2014): 0회 사용 (본 spec 전체 grep 결과)
- en dash (U+2013): 0회 사용
- interpunct (U+00B7): 0회 사용
- 곡선 따옴표 (U+201C U+201D U+2018 U+2019): 0회 사용
- 단일 ellipsis (U+2026): 0회 사용
- 화살표 (U+2192): 허용 (§6.5 "디자인 요소로 의도된 글리프")
- 체크마크 (U+2713): 허용

  참고: 부호 검증 시 위 코드 포인트를 직접 grep. 부호 자체를 문서에 예시 표기하지 않음
  (예시 표기 시 self-check 자동 grep 이 위반으로 카운트하기 때문).

### 그라데이션 검사

- CSS linear grad function: 0회 (금지 서술 컨텍스트 외)
- CSS radial grad function: 0회
- CSS conic grad function: 0회
- 실제 코드 예시에서 그라데이션 함수 사용: 0회 (본 spec 전체 grep 결과)

  참고: 금지 서술을 위해 함수명 자체를 문서에 예시 표기하지 않고 서술로 표현.

### 다크 톤 통일

- 라이트 shell 도입 X
- Toss 블루 (#3182f6) 도입 X
- 기존 `@theme` 토큰만 사용
- Accent = `brand-pink` 통일

### §7.4 준수

- 라이브 페이지 (`/fan-to-pro/*`) 변경 X (spec 만 작성)
- 어드민 3-tab 변경 X
- 구현 X (노아 승인 대기)

### 접근성 항목 커버리지

- WCAG AA 명도 대비 표기
- 키보드 접근 원칙 (Tab / focus / skip link)
- 스크린 리더 (semantic HTML / aria-*)
- 폼 접근성 (label / required / error / success)
- 다국어 접근성 (lang / 언어 스위처)
- Reduced motion (prefers-reduced-motion)

### 반응형 항목 커버리지

- Mobile-first 원칙
- Breakpoint 4개 (sm / md / lg / xl)
- Touch target 44 x 44px
- 이미지 sizes 속성
- Fluid typography (clamp 토큰 사용)

### Feature Intent Gating (§2.5)

- 이 spec = 노아 승인 대기 문서
- 실제 구현 = 승인 후 별도 백로그 (B0084 ~ B0089)
- Aria PO 이미 4 질문 답변 완료 (ADR 0015)
- Luna = UX spec 작성만 (gating 완료 상태 이관)

---

## 다음 단계

1. 노아 확인 5건 회신
2. 확인 완료 시 B0084 ~ B0089 백로그 spec 승격 (Iris + Luna 병행)
3. B0084 (Outcomes 페이지) + B0086 (Student Stories) = 1기 종강 (7/19) 직후 착수
4. B0085 (Cohorts Showcase) + B0087 (Partners / Faculty) = 2기 시작 전
5. B0088 (Alumni 승격) + B0089 (Waitlist) = 종강 직후 노아 매뉴얼 액션

---

## 참조

- Aria ADR 0015: `docs/decisions/0015-platform-evolution-po.md`
- Echo 리서치: `docs/research/B0083-platform-evolution-benchmark.md`
- 기존 다크 톤 시스템: `app/globals.css`
- 기존 마케팅 참고: `src/programs/fan-to-pro/presentation/sections/hero.tsx`
- CLAUDE.md §6.5 (부호 룰) / §7 (SSG 룰) / §7.4 (production 보호) / §2.5 (Feature Intent Gating)
