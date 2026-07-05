# B0083 Platform Evolution Phase 1 Wireframes (Luna Draft)

> Luna, 2026-07-05. Track B Phase 1 wireframe outline. Aria ADR 0015 + Sophia ADR 0016 + Luna B0083 UX spec 이관.
> **구현 X**. 노아 승인 대기 draft. 승인 후 컴포넌트 카탈로그 vs 기존 재사용 확정 + B0084~B0091 백로그 착수.

## 배경 요약

- Aria ADR 0015 = 우산 브랜드 확장, 11 신규 페이지, `/` = 우산 랜딩 신설 (Fan to Pro 리다이렉트 폐지)
- Sophia ADR 0016 = `(marketing)` route group 12 페이지, ISR 3600s 기본 + `/outcomes/*` SSG snapshot + `/waitlist` force-dynamic
- Luna B0083 UX spec = 컴포넌트 10종 spec + 다크 톤 시스템

이 draft = 노아 발주 8 페이지 wireframe outline (`/waitlist`, `/blog`, `/outcomes`, `/tracks`, `/faculty`, `/partners` 제외 = Phase 2 로 미룸). 노아 발주에 없는 `/courses/*` + `/bundles/*` 는 ADR 0013 multi-track 스키마 활용, Phase 1 진입 확정.

## 절대 룰 (self-imposed)

- 그라데이션 금지 (모든 CSS 함수 형태)
- §6.5 부호 금지 (em dash / en dash / interpunct / 곡선 따옴표 / 단일 ellipsis 문자)
- 매출 표기 = 원 단위 (`1,500,000원` 형태, K/M/억 축약 X)
- 다크 톤 유지 (기존 `@theme` 토큰만 사용)
- §7.4 라이브 페이지 (`/fan-to-pro/*` marketing) 변경 X
- 신규 route 만 신설

---

## 페이지 1. `/` (우산 랜딩)

### 목적

우산 브랜드 첫 인상. Growth Career 자체 신뢰 base + N 트랙 카탈로그 gateway.

### Hero

- 컴포넌트: `HeroUmbrellaStats` (Luna UX spec §1)
- Eyebrow: "K-POP INDUSTRY BOOTCAMP FOR FOREIGNERS"
- Headline: "Fan to Pro. Global to Korea."
- Sub: "1기 pilot completed / 수료 10명 / 4개국 출신"
- CTA: "다음 기수 알림 등록" (waitlist 링크, 1기 종강 후)
- 배경: K-pop 프로덕션 씬 이미지 (opacity 55% + `bg-bg` overlay)
- 지표 4개: 기수 수 / 수료 인원 / 국가 수 / 대표 성과 (raw fraction)

### 섹션 2. 파트너 로고 wall

- 컴포넌트: `PartnerLogoWall` (variant="inline")
- 3사: Union Pictures / DEEPI / Dropdown
- 라이센스 승인 확인 후 노출 (RLS `license_granted = TRUE` 필터)

### 섹션 3. 트랙 카탈로그

- 컴포넌트: `CurriculumTracksCards`
- 초기 = Fan to Pro 카드 1개 (open or waitlist)
- 카피 배치: "지금 열려있는 트랙 (1) / 준비 중인 트랙 (2)"
- Coming soon = 셰르파 심화 / 올인원 카드 시각적으로 존재 표시

### 섹션 4. 단과 코스 미리보기 (신규)

- 컴포넌트: `CoursesShowcaseGrid` (신설)
- ADR 0013 multi-track courses 스키마 활용
- 최대 3개 카드 (`/courses` 링크)
- 카피: "단과 코스로 시작해 보기"

### 섹션 5. 학생 스토리

- 컴포넌트: `StudentStoryCard` grid (최대 3개)
- 1기 수료자 인터뷰 (촬영 완료 후, 노아 결정 4)
- "더 보기" 링크 = `/stories/`

### 섹션 6. 기수 아카이브

- 컴포넌트: `CohortsShowcaseGrid` (variant="landing", 최대 3개)
- 1기 카드 1개 (초기)
- "전체 기수 보기" 링크 = `/cohorts/`

### 섹션 7. Alumni 네트워크 teaser

- 컴포넌트: `AlumniNetworkTeaser`
- Slack + 카톡 병행 (Aria ADR 0015 결정 2)
- 얼굴 grid 12명 미만 시 = 얼굴 노출 X (Luna 권고 안)

### 섹션 8. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")
- 카피: "다음 기수 오픈 알림 등록"

### SEO metadata

```tsx
export const metadata: Metadata = {
  title: "Growth Career / K-pop 산업 진입 부트캠프",
  description: "외국인을 위한 K-pop 산업 실무 부트캠프. Union Pictures 공연 프로젝트 참여 기회. E-7-1 / K-CORE / F-시리즈 비자 지원.",
  openGraph: {
    title: "Growth Career",
    description: "K-pop industry bootcamp for foreigners",
    images: ["/og/umbrella-landing.png"],
    locale: "ko_KR",
  },
  alternates: {
    canonical: "/ko",
    languages: {
      ko: "/ko",
      en: "/en",
    },
  },
};
```

### 반응형 breakpoint

- Mobile (< 640px): 세로 스택, Hero 지표 1 컬럼, 트랙 카드 1 컬럼, 얼굴 grid 4 컬럼
- Tablet (>= 640px, < 1024px): Hero 지표 2 컬럼, 트랙 카드 2 컬럼, 얼굴 grid 6 컬럼
- Desktop (>= 1024px): Hero 지표 4 컬럼, 트랙 카드 3 컬럼, 얼굴 grid 6~8 컬럼

### 렌더링

ISR (`revalidate = 3600`). Hero CTA 만 client component (마감 상태 반영). Sophia ADR 0016 확정.

---

## 페이지 2. `/cohorts/`

### 목적

기수별 아카이브. 다기수 증거 (신뢰 지표).

### Hero

- 간단 헤더 (`text-display-md` "기수 아카이브")
- Sub: "N 기수 수료. M 명 alumni. 각 기수의 프로젝트와 수료생을 확인하세요."
- 배경 이미지 X (grid 자체가 시각 무게)

### 섹션 2. 기수 grid

- 컴포넌트: `CohortsShowcaseGrid` (variant="archive")
- 전체 기수 카드 (초기 = 1개)
- 카드 클릭 = `/cohorts/[slug]` 이동
- 각 카드 = 기수명 / 기간 / 강사 3명 / 수료 인원 / 대표 성과 raw fraction

### 섹션 3. 다음 기수 대기 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")

### SEO metadata

```tsx
export const metadata: Metadata = {
  title: "기수 아카이브 / Growth Career",
  description: "Fan to Pro 각 기수의 프로젝트, 강사진, 수료생을 확인하세요. 1기부터 최근 기수까지 모든 기록.",
  openGraph: {
    title: "기수 아카이브 / Growth Career",
    images: ["/og/cohorts.png"],
    locale: "ko_KR",
  },
};
```

### 반응형 breakpoint

- Mobile: 1 컬럼
- Tablet: 2 컬럼
- Desktop: 3 컬럼

### 렌더링

ISR (`revalidate = 3600`). 관리자 신규 기수 추가 시 `revalidateTag('cohorts')`.

---

## 페이지 3. `/cohorts/[slug]/`

### 목적

특정 기수 상세. 강사 / 학생 / outcome / 커리큘럼 / 파트너 통합.

### Hero

- 기수명 (`text-display-lg`)
- 기간 (`text-xl text-fg-muted`, "2026년 6월 27일부터 7월 19일까지")
- 대표 사진 = 기수 프로덕션 씬 (배경 이미지, opacity 55%)
- 대표 성과 raw fraction (`text-brand-pink`, 큰 숫자)

### 섹션 2. 기수 개요

- Grid 4 카드 (기간 / 인원 / 강사진 수 / 대표 성과)
- `bg-surface-elevated` + `border border-border`
- 각 카드 = 큰 숫자 + 라벨

### 섹션 3. 강사진

- 컴포넌트: `FacultyProfileGrid` (filterByCohort={slug})
- 해당 기수 담당 강사만 필터
- 최대 6명 grid, 초과 시 페이지네이션

### 섹션 4. 학생 스토리

- 컴포넌트: `StudentStoryCard` grid (해당 기수만)
- 스토리 인터뷰 3~5개 (촬영 완료 후)

### 섹션 5. Outcomes snapshot

- 컴포넌트: `OutcomesReport` (해당 기수 90 / 180 / 360일)
- 감사 완료 전이면 = "지표 감사 중, N 개월 후 공개 예정" 안내
- 감사 완료 후 = raw fraction + 분모 정의 병기

### 섹션 6. 커리큘럼 하이라이트

- 주차별 아코디언 (텍스트만, 이미지 X)
- 각 주차 = 목표 / 세션 3~5개 / 결과물
- ADR 0013 courses 스키마 재활용 여지

### 섹션 7. 파트너

- 컴포넌트: `PartnerLogoWall` (variant="inline", 해당 기수 협력사)

### 섹션 8. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")

### SEO metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const cohort = await findCohortByShowcaseSlug(params.slug);
  return {
    title: `${cohort.displayName} / Growth Career`,
    description: `${cohort.displayName} 기수 상세. ${cohort.period.startAt} 부터 ${cohort.period.endAt}. 수료 ${cohort.graduateCount}명. 대표 성과 ${cohort.heroStat.label} ${cohort.heroStat.value}/${cohort.heroStat.denominator}.`,
    openGraph: {
      title: `${cohort.displayName} / Growth Career`,
      images: [cohort.thumbnailPath ?? "/og/cohorts.png"],
      locale: "ko_KR",
    },
  };
}
```

### 반응형 breakpoint

- Mobile: 세로 스택 (Hero -> 개요 1 컬럼 -> 강사 1 컬럼 -> 스토리 1 컬럼)
- Tablet: 개요 2 컬럼, 강사 2 컬럼
- Desktop: 개요 4 컬럼, 강사 3 컬럼, 스토리 3 컬럼

### 렌더링

ISR (`revalidate = 3600`). `generateStaticParams` = `showcase_slug IS NOT NULL` 기수만 pre-render.

---

## 페이지 4. `/courses/`

### 목적

단과 코스 카탈로그. 트랙 (`/tracks/`) 과 별개로 개별 모듈 단위 등록 가능 (ADR 0013 multi-track 스키마).

### Hero

- 헤더 (`text-display-md` "단과 코스")
- Sub: "필요한 모듈만 선택해 배우세요. 실무 프로젝트 참여 조건은 트랙 수료입니다."

### 섹션 2. 카테고리 필터 (선택)

- 카테고리: 프로덕션 / A&R / 마케팅 / 무대 / 영상 (초기 = 전체만, 필터 UI 는 Phase 2)

### 섹션 3. 코스 grid

- 컴포넌트: `CoursesShowcaseGrid` (신설)
- 각 카드:
  - 코스명 (`text-xl font-bold`)
  - 카테고리 태그 (`text-brand-pink`)
  - 강사 (얼굴 + 이름)
  - 기간 (예: "2주")
  - 가격 = **원 단위 표기** (예: "500,000원")
  - 다음 시작일 (있으면)
  - "자세히 보기" 링크 = `/courses/[slug]`

### 섹션 4. 번들 안내

- 카피: "여러 코스를 함께 수강하시나요? 번들 할인이 있습니다."
- 링크 = `/bundles/`

### 섹션 5. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")

### SEO metadata

```tsx
export const metadata: Metadata = {
  title: "단과 코스 / Growth Career",
  description: "필요한 모듈만 선택해서 배우는 K-pop 산업 단과 코스. 프로덕션, A&R, 마케팅, 무대, 영상 각 분야별 커리큘럼.",
  openGraph: {
    title: "단과 코스 / Growth Career",
    images: ["/og/courses.png"],
    locale: "ko_KR",
  },
};
```

### 반응형 breakpoint

- Mobile: 1 컬럼
- Tablet: 2 컬럼
- Desktop: 3 컬럼

### 렌더링

ISR (`revalidate = 3600`).

---

## 페이지 5. `/courses/[slug]/`

### 목적

특정 단과 코스 상세.

### Hero

- 카테고리 태그 (`text-brand-pink`)
- 코스명 (`text-display-lg`)
- Sub: 코스 한 줄 소개
- 강사 얼굴 + 이름 (원형 96px)
- 가격 = **원 단위** (예: "500,000원") + "번들 시 할인 적용"
- CTA: "이 코스 신청하기" (`brand-pink`)

### 섹션 2. 코스 개요

- Grid 4 카드 (기간 / 세션 수 / 대상 / 프로젝트 참여 조건)
- ADR 0013 course 스키마 필드 매핑

### 섹션 3. 커리큘럼

- 세션별 리스트 (숫자 목록)
- 각 세션 = 제목 + 3~5줄 설명 + 예상 소요
- 아코디언 없이 flat 리스트 (spec 신뢰성)

### 섹션 4. 강사 프로필

- 컴포넌트: `FacultyProfileGrid` (해당 강사만, 1명)

### 섹션 5. 자주 묻는 질문

- 아코디언 4~6개
- 코스별 커스텀 (기본: 환불 / 결제 / 인증서 / 다음 단계)

### 섹션 6. 관련 번들

- 컴포넌트: `BundlesShowcaseGrid` (해당 코스 포함 번들만)

### 섹션 7. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer") + "이 코스 신청하기" 재노출

### SEO metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const course = await findCourseBySlug(params.slug);
  return {
    title: `${course.name} / Growth Career`,
    description: course.description,
    openGraph: {
      title: `${course.name} / Growth Career`,
      images: [course.thumbnailPath ?? "/og/courses.png"],
      locale: "ko_KR",
    },
  };
}
```

### 반응형 breakpoint

- Mobile: 세로 스택
- Tablet: 개요 2 컬럼
- Desktop: 개요 4 컬럼, 커리큘럼 = `max-w-narrow` (720px)

### 렌더링

ISR (`revalidate = 3600`). `generateStaticParams` = ADR 0013 courses 테이블 published 만.

---

## 페이지 6. `/bundles/`

### 목적

번들 카탈로그. 여러 단과 코스 조합 할인 상품.

### Hero

- 헤더 (`text-display-md` "번들")
- Sub: "관련 코스를 함께 수강하고 할인 혜택을 받으세요."

### 섹션 2. 번들 grid

- 컴포넌트: `BundlesShowcaseGrid` (신설)
- 각 카드:
  - 번들명 (예: "K-pop 실무 올인원")
  - 포함 코스 수 (예: "5개 코스 포함")
  - 정상 가격 vs 번들 가격 = **원 단위 표기** (예: "2,500,000원 -> 1,800,000원")
  - 할인 금액 강조 (`text-brand-pink`)
  - "자세히 보기" 링크 = `/bundles/[slug]`

### 섹션 3. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")

### SEO metadata

```tsx
export const metadata: Metadata = {
  title: "번들 / Growth Career",
  description: "여러 단과 코스를 함께 수강하고 할인 혜택을 받는 번들 상품. K-pop 실무 올인원 등.",
  openGraph: {
    title: "번들 / Growth Career",
    images: ["/og/bundles.png"],
    locale: "ko_KR",
  },
};
```

### 반응형 breakpoint

- Mobile: 1 컬럼
- Tablet: 2 컬럼
- Desktop: 3 컬럼

### 렌더링

ISR (`revalidate = 3600`).

---

## 페이지 7. `/bundles/[slug]/`

### 목적

특정 번들 상세.

### Hero

- 번들명 (`text-display-lg`)
- Sub: 번들 한 줄 소개
- 가격 = **원 단위** (예: 정상 "2,500,000원" -> 번들 "1,800,000원")
- 할인 금액 (`text-brand-pink`, "700,000원 할인")
- CTA: "이 번들 신청하기" (`brand-pink`)

### 섹션 2. 번들 개요

- Grid 4 카드 (포함 코스 수 / 총 세션 수 / 총 기간 / 강사 수)

### 섹션 3. 포함 코스

- 각 코스 카드 (링크 = `/courses/[slug]`)
- 컴포넌트: `CoursesShowcaseGrid` (variant="bundle-contents")
- 코스별 개별 신청 가격 병기 (`text-fg-muted`, "정상 500,000원")

### 섹션 4. 커리큘럼 통합 뷰

- 코스별 주차 목록 (아코디언)

### 섹션 5. 관련 트랙 (있으면)

- 카피: "이 번들은 [Fan to Pro] 트랙의 일부 구성이에요."
- 링크 = `/fan-to-pro/`

### 섹션 6. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer") + "이 번들 신청하기" 재노출

### SEO metadata

```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const bundle = await findBundleBySlug(params.slug);
  return {
    title: `${bundle.name} / Growth Career`,
    description: bundle.description,
    openGraph: {
      title: `${bundle.name} / Growth Career`,
      images: [bundle.thumbnailPath ?? "/og/bundles.png"],
      locale: "ko_KR",
    },
  };
}
```

### 반응형 breakpoint

- Mobile: 세로 스택
- Tablet: 개요 2 컬럼, 포함 코스 2 컬럼
- Desktop: 개요 4 컬럼, 포함 코스 3 컬럼

### 렌더링

ISR (`revalidate = 3600`). `generateStaticParams` = ADR 0013 bundles 테이블 published 만.

---

## 페이지 8. `/stories/`

### 목적

학생 인터뷰 grid. 서사 3층 구조 (국적 진입 경로 / 비자 여정 / 지금 하는 일).

### Hero

- 헤더 (`text-display-md` "수료생 이야기")
- Sub: "N 개국 M 명의 수료생이 K-pop 산업에서 커리어를 시작했어요."

### 섹션 2. 필터 (Phase 2)

- 국적 / 기수 / 비자 여정 / 현재 역할 필터
- 초기 = 필터 UI X (20+ 스토리 후 도입)

### 섹션 3. Story grid

- 컴포넌트: `StudentStoryCard` grid (전체)
- 각 카드 = 원형 얼굴 240px + 이름 + 국적 + 기수 태그 + 비자 여정 + 인용문 + 현재 역할
- Anonymous 옵션 = 얼굴 blur + 이니셜

### 섹션 4. 인터뷰 촬영 예정 안내

- 카피: "1기 수료생 인터뷰는 7월 말 촬영 후 순차 공개 예정입니다."
- (촬영 완료 시 삭제)

### 섹션 5. 하단 CTA

- 컴포넌트: `WaitlistApplyCTA` (variant="footer")

### SEO metadata

```tsx
export const metadata: Metadata = {
  title: "수료생 이야기 / Growth Career",
  description: "Growth Career Fan to Pro 수료생 인터뷰. 국적, 비자 여정, 현재 K-pop 산업 커리어를 확인하세요.",
  openGraph: {
    title: "수료생 이야기 / Growth Career",
    images: ["/og/stories.png"],
    locale: "ko_KR",
  },
  alternates: {
    canonical: "/ko/stories",
    languages: {
      ko: "/ko/stories",
      en: "/en/stories",
    },
  },
};
```

### 반응형 breakpoint

- Mobile: 1 컬럼, 얼굴 160px
- Tablet: 2 컬럼, 얼굴 200px
- Desktop: 3 컬럼, 얼굴 240px

### 렌더링

ISR (`revalidate = 3600`). `content/stories/*.mdx` frontmatter build time indexing.

---

## 컴포넌트 재사용 vs 신설 표

| 컴포넌트 | 상태 | 소스 |
|---|---|---|
| `HeroUmbrellaStats` | 신설 | Luna UX spec §1 |
| `CohortsShowcaseGrid` | 신설 | Luna UX spec §2 |
| `StudentStoryCard` | 신설 | Luna UX spec §3 |
| `StoryDetailPage` | 신설 (Phase 2, `/stories/[slug]/`) | Luna UX spec §3 |
| `FacultyProfileGrid` | 신설 | Luna UX spec §4 |
| `PartnerLogoWall` | 신설 | Luna UX spec §5 |
| `OutcomesReport` | 신설 | Luna UX spec §6 |
| `CurriculumTracksCards` | 신설 | Luna UX spec §7 |
| `AlumniNetworkTeaser` | 신설 | Luna UX spec §8 |
| `BlogInsightsGrid` | Phase 2 (`/blog/*`) | Luna UX spec §9 |
| `WaitlistApplyCTA` | 신설 | Luna UX spec §10 |
| `CoursesShowcaseGrid` | 신설 (신규, UX spec 없음) | 이 draft |
| `BundlesShowcaseGrid` | 신설 (신규, UX spec 없음) | 이 draft |
| `SectionHeading` | 재사용 | `src/programs/fan-to-pro/*` |
| `CTAButton` | 재사용 | `src/programs/fan-to-pro/*` |
| `PartnerBadge` | 재사용 | `src/programs/fan-to-pro/*` |
| `StatBadge` | 재사용 | `src/programs/fan-to-pro/*` |

### 신설 컴포넌트 배치 위치

- `src/programs/growth-career/presentation/components/HeroUmbrellaStats.tsx`
- `src/programs/growth-career/presentation/components/CohortsShowcaseGrid.tsx`
- `src/programs/growth-career/presentation/components/StudentStoryCard.tsx`
- `src/programs/growth-career/presentation/components/FacultyProfileGrid.tsx`
- `src/programs/growth-career/presentation/components/PartnerLogoWall.tsx`
- `src/programs/growth-career/presentation/components/OutcomesReport.tsx`
- `src/programs/growth-career/presentation/components/CurriculumTracksCards.tsx`
- `src/programs/growth-career/presentation/components/AlumniNetworkTeaser.tsx`
- `src/programs/growth-career/presentation/components/WaitlistApplyCTA.tsx`
- `src/programs/growth-career/presentation/components/CoursesShowcaseGrid.tsx`
- `src/programs/growth-career/presentation/components/BundlesShowcaseGrid.tsx`

### 재사용 primitives 배치

- 기존 `src/programs/fan-to-pro/presentation/components/*` 그대로 import
- 별도 `src/programs/growth-career/presentation/primitives/` 승격은 별도 리팩터 (Phase 3)

---

## 노아 확인 필요 (5건)

### 확인 1: 우산 랜딩 = 기존 Fan to Pro 랜딩 대체 vs 병행

Aria ADR 0015 결정 1 이미 답변 대기. Sophia ADR 0016 은 대체 = Aria 권고 A 채택 가정 (Fan to Pro 리다이렉트 폐지).

**옵션**:
- A. `/` = 우산 랜딩 신설. 기존 `/fan-to-pro/` = 트랙 랜딩 그대로 유지. (Aria/Sophia 권고)
- B. `/` = Fan to Pro 랜딩 유지. `/growth-career/` = 우산 랜딩 (덜 관용적, 브랜드 dilution)
- C. 병행 = `/` = 기존 Fan to Pro. `/showcase/` = 우산 shell (ADR 0015 옵션 B)

**Luna 권고**: A. 우산 브랜드 자산화 필수. 기존 `/fan-to-pro/*` marketing 은 §7.4 룰로 변경 X, 별도 트랙 landing 으로 sibling.

**노아 결정 필요 이유**: 기존 랜딩 카피 / 디자인 / 신청 폼 = 라이브 운영 중. 대체 시 SEO 리다이렉트 정책 + 검색 결과 index 변경 영향.

### 확인 2: 트랙별 accent 컬러 통일 vs 분리

Aria ADR 0015 = 각 트랙 accent 컬러 1개씩 (Toss 블루 계열 언급). Luna B0083 UX spec §8 = `brand-pink` 통일 권고.

**옵션**:
- A. 다크 shell = `brand-pink` 통일 (트랙별 accent 없음). 트랙 구분 = 썸네일 이미지로. (Luna 권고)
- B. 트랙별 accent = `brand-pink` / `brand-purple` / `brand-violet` 3가지 (다크 팔레트 안)
- C. 트랙별 accent = 라이트 blue 도입 (톤 혼재 위험)

**Luna 권고**: A. 다크 shell 통일 유지. accent 희소성 확보. 트랙별 구분은 썸네일 이미지 + 카피로.

### 확인 3: CTA URL 정책 (waitlist / apply / 개별 신청)

Phase 1 = 1기 종강 후 waitlist 축적 시점. 신청 폼 오픈 시점 미확정.

**옵션**:
- A. 모든 페이지 CTA = `/waitlist` (다음 기수 알림 등록). 신청 폼 오픈 후 = `/fan-to-pro#apply` 로 자동 전환.
- B. 각 페이지 = 개별 CTA URL (`/courses/[slug]` = "이 코스 신청" -> Phase 2 결제 페이지, `/bundles/[slug]` = "이 번들 신청" 별도, 트랙 = `/fan-to-pro#apply`)
- C. 통합 = 우산 랜딩 = `/waitlist`, 트랙 페이지 = `/fan-to-pro#apply`, 코스 / 번들 = "관심 등록" (구매는 Phase 2 결제 인프라 완성 후)

**Luna 권고**: C. 결제 인프라 완성 전까지 = "관심 등록" 리드 축적. 결제 인프라 완성 후 = 실제 신청 폼.

**노아 결정 필요 이유**: 코스 / 번들 결제 인프라 = ADR 0013 스키마 있지만 결제 게이트웨이 통합 여부 미확정.

### 확인 4: 콘텐츠 확보 시점 (스토리 / 코스 / 번들)

Phase 1 8 페이지 중 실제 콘텐츠 필요:

- `/stories/` = 1기 수료자 인터뷰 3~5개 (촬영 발주 시점 = 노아 결정 4)
- `/courses/` + `/courses/[slug]` = 단과 코스 데이터 (ADR 0013 스키마 + 실제 코스 등록)
- `/bundles/` + `/bundles/[slug]` = 번들 데이터 (ADR 0013 스키마 + 실제 번들 등록)
- `/cohorts/[slug]` = 1기 상세 (강사 재사용 OK, 대표 성과 감사 완료 후)

**옵션**:
- A. 콘텐츠 확보 전 = 페이지 노출 X (build 안 함). 콘텐츠 확보 순차 오픈.
- B. 콘텐츠 확보 전 = 페이지 skeleton + "N월 오픈 예정" 안내. SEO index 는 pre-load.
- C. Phase 1 = shell 만 배포. 콘텐츠 확보 = Phase 2 로 미룸.

**Luna 권고**: A. 빈 페이지 SEO index = 신뢰 손상. 콘텐츠 확보 순차 오픈.

**노아 결정 필요 이유**: 1기 수료 후 인터뷰 촬영 발주 = 예산 + 스타일링 가이드 별도 결정. 코스 / 번들 실제 상품 등록 = 사업 결정 (가격 / 커리큘럼 / 강사 배정).

### 확인 5: `/courses/` + `/bundles/` = Phase 1 진입 vs Phase 2 미룸

노아 발주 8 페이지 = `/`, `/cohorts/`, `/cohorts/[slug]`, `/courses/`, `/courses/[slug]`, `/bundles/`, `/bundles/[slug]`, `/stories/`. Aria ADR 0015 + Sophia ADR 0016 = `/courses/*` `/bundles/*` 미포함 (ADR 0013 별도).

**옵션**:
- A. Phase 1 8 페이지 그대로 진행 (노아 발주). `/courses/*` `/bundles/*` = ADR 0013 스키마 + 실제 상품 등록 후 콘텐츠 확보 순차 오픈.
- B. Phase 1 = `/`, `/cohorts/`, `/cohorts/[slug]`, `/stories/` 4 페이지만. `/courses/*` `/bundles/*` = Phase 2 로 미룸.
- C. Phase 1 = 노아 발주 8 페이지 shell 배포. 콘텐츠 확보 전까지 = "N월 오픈 예정" 안내.

**Luna 권고**: A. 노아 발주 그대로 + 콘텐츠 확보 순차 오픈. `/courses/*` `/bundles/*` 스키마 = ADR 0013 준비 완료 상태.

**노아 결정 필요 이유**: `/courses/*` `/bundles/*` 오픈 = 결제 인프라 + 상품 등록 + 강사 배정 = 사업 결정 여러 건 필요.

---

## Luna self-check

### §6.5 부호 검사 (문서 전체 grep 결과)

- em dash (U+2014): 0회
- en dash (U+2013): 0회
- interpunct (U+00B7): 0회
- 곡선 따옴표 (U+201C, U+201D, U+2018, U+2019): 0회
- 단일 ellipsis (U+2026): 0회
- 화살표 (U+2192): 0회 (Phase 2 컴포넌트 spec 참조만, 이 draft 에는 사용 X. `->` ASCII 만 사용)

참고: 부호 자체를 문서에 예시 표기 X (self-check grep 이 위반으로 카운트하기 때문). 서술로만 표현.

### 그라데이션 검사

- CSS linear grad function: 0회
- CSS radial grad function: 0회
- CSS conic grad function: 0회
- 실제 스타일 예시에서 그라데이션 함수 사용: 0회

참고: 금지 서술을 위해 함수명 자체를 이 문서에 예시 표기 X. 서술로만 표현.

### 매출 원 단위 표기 검사

- 코스 가격 예시: "500,000원" (원 단위)
- 번들 가격 예시: "2,500,000원 -> 1,800,000원" (원 단위)
- 할인 금액 예시: "700,000원 할인" (원 단위)
- K / M / 억 축약: 0회

### 다크 톤 통일

- 라이트 shell 도입 X
- Toss 블루 (`#3182f6`) 도입 X (LMS 전용)
- 기존 `@theme` 토큰만 사용
- Accent = `brand-pink` 통일

### §7.4 준수

- 라이브 페이지 (`/fan-to-pro/*`) 변경 X (spec 만 작성)
- 어드민 3-tab 변경 X
- 구현 X (노아 승인 대기 draft)
- 신규 route 만 신설 (`(marketing)` route group 안)

### Feature Intent Gating (§2.5)

- 노아 이미 gating 4 질문 답변 승인 (2026-07-04)
- 이 draft = 노아 명시 요청 산출물 (승인 후 gating 완료 상태)

---

## 다음 단계

1. 노아 확인 5건 회신
2. 확인 완료 시 B0084 ~ B0091 백로그 spec 승격 (Iris + Luna 병행)
3. Phase 1 착수 순서:
   - B0084 (outcome_reports 마이그레이션) + B0085 (cohorts 컬럼 추가) 스키마 additive 먼저
   - `/`, `/cohorts/`, `/cohorts/[slug]` shell 배포 (콘텐츠 확보 순차 오픈)
   - `/stories/` shell 배포 (1기 인터뷰 촬영 완료 후 콘텐츠 오픈)
   - `/courses/*` `/bundles/*` = 결제 인프라 + 상품 등록 완료 후 오픈
4. Phase 2 = `/waitlist/`, `/blog/*`, `/outcomes/*`, `/tracks/`, `/faculty/`, `/partners/`
5. Phase 3 = `src/programs/growth-career/presentation/primitives/` 승격 리팩터

---

## 참조

- Aria ADR 0015: `docs/decisions/0015-platform-evolution-po.md`
- Sophia ADR 0016: `docs/decisions/0016-platform-evolution-architecture.md`
- Luna B0083 UX spec: `docs/specs/B0083-platform-evolution-ux.md`
- Echo 리서치: `docs/research/B0083-platform-evolution-benchmark.md`
- ADR 0013 (multi-track + recruitment + courses / bundles 스키마): `docs/decisions/0013-multi-track-recruitment.md`
- CLAUDE.md §6.5 (부호 룰) / §7 (SSG 룰) / §7.4 (production 보호) / §2.5 (Feature Intent Gating)
