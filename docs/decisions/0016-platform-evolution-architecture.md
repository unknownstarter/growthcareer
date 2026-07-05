# ADR 0016 - Platform Evolution Architecture (PD)

**Status**: Proposed (노아 결정 10건 대기)
**Date**: 2026-07-05
**Deciders**: 노아 + Sophia (PD). Aria (PO) ADR 0015 승계, Luna (UX) B0083 spec 병렬
**Tags**: platform, umbrella-brand, showcase, cohort-archive, alumni, outcomes, waitlist, data-model, routing, isr
**Related**: ADR 0015 (Platform Evolution PO), ADR 0006 (LMS Design System), ADR 0008 (URL/Auth 분리), ADR 0013 (Multi-track + Recruitment), Echo `docs/research/B0083-platform-evolution-benchmark.md`
**Marker**: [skip-gating: approved] (노아 명시 승인, 2026-07-04)

---

## 결정 요약 (1 문장)

Aria ADR 0015 의 5 정보구조 요구를 (1) `(marketing)` route group 통합 shell 위 12 신규 라우트, (2) additive 3 컬럼 + 2 신규 테이블 (`outcome_reports` / `partners`), (3) 초기 MDX + 20+ 임계 후 CMS 검토 콘텐츠 계층, (4) `next-intl` 이중 라우팅 유지하되 KO 우선 + EN 최소 (methodology / stories / outcomes), (5) 라이브 `/fan-to-pro/*` 마케팅 unchanged 로 확정한다.

---

## 컨텍스트

Aria ADR 0015 에서 PD 로 넘어온 정보 구조 요구 5:

1. `/showcase` 경로 신설. Aria 권고 = 우산 = `/`, 트랙 = sub-path
2. Cohort URL 스킴. Aria 권고 = nanoid + `showcase_slug` 컬럼 additive
3. Content 계층. Aria 권고 = 초기 MDX, 20+ 콘텐츠 후 CMS
4. Outcomes 데이터 소스. Aria 권고 = snapshot, `outcome_reports` 신규 테이블
5. Multi-track shell 통일. Aria 권고 = `(marketing)` layout 통합

절대 룰 재확인:

- §7.4 라이브 페이지 (`/fan-to-pro/*` marketing) 카피 / 디자인 / 신청 폼 변경 금지
- §6.5 em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 금지
- §7 그라데이션 금지 (통계 UI 는 단색 bar + 색 대비)
- §7 시간 기반 자동 전환 페이지 SSG 금지 (waitlist / countdown / D-N)
- ADR 0008 URL 분리 (`/admin/*` Basic Auth + `/[locale]/auth/*` Supabase Auth + `/[locale]/fan-to-pro/(lms)/*` role 가드) 그대로 유지. 이 ADR 은 **`(marketing)` 축** 만 확장

---

## 아키텍처 원칙 (Echo 인사이트 반영)

Echo B0083 리서치 7 인사이트 중 아키텍처 결정에 직접 영향 주는 4항목:

### 1. 다크 톤 유지 + 사람 얼굴 focus (Insight 5)

- `(marketing)` route group 은 다크 (기존 `/fan-to-pro/*` 톤 계승)
- 다국어 스위처 X, 통계 단독 X, 다크 자체는 유지. 대신 "누가 어떤 여정을 지나왔는지" 중심 = 컴포넌트 우선순위 재조정
- **PD 결정**: `HeroUmbrellaStats` 배경 = 사람 얼굴 이미지 slot 필수 (props `heroImagePath`). 숫자 단독 배치 금지

### 2. 데이터 시각화 = 단색 그라데이션 X (Insight 5 + §6.5)

- Outcomes / Cohorts / Stats 컴포넌트 chart = 단색 bar + 색 대비만 허용
- `OutcomesReport` 컴포넌트 = raw fraction ("8/10") 을 숫자 UI 로 크게. 백분율 병기 형태 (예: "8/10 (80%)")
- **PD 결정**: chart 라이브러리 도입 X. `<div>` + Tailwind 로 단색 bar 직접 그림. Recharts / D3 등 그라데이션 유도 라이브러리 회피

### 3. 리브랜드가 아니라 우산 확장 (Insight 1)

- Fan to Pro = 트랙명 유지. Growth Career = 우산 도메인
- 카피에 "Fan to Pro 브랜드" 라고 하지 말고 "Growth Career 의 Fan to Pro 트랙"
- **PD 결정**: `<title>` / `<meta>` / og-image 모두 "Growth Career / [트랙명]" 패턴. 우산이 앞

### 4. Snapshot 발표 지표 (Insight 2)

- 실시간 DB query 로 outcomes 계산 X (조작 여지 + 매일 fluctuation 노출)
- 기수 종료 후 감사된 snapshot 을 `outcome_reports` 에 박제. showcase 페이지는 read-only join
- **PD 결정**: `outcome_reports` 는 append-only. UPDATE 는 admin 만 (audit trail 유지). SSG 렌더 (분기별 재생성)

---

## Route 12 신설

### 신규 route table

`app/[locale]/(marketing)/*` route group 안에 아래 12 페이지 신설. 기존 `/fan-to-pro/*` marketing 트랙 랜딩은 sibling 폴더 그대로 유지 (변경 금지).

| # | Route | Rendering | 이유 |
|---|---|---|---|
| 1 | `/` (우산 랜딩) | ISR 3600s | Content 변경 빈도 낮음. 지표 fetch 는 build 시 snapshot |
| 2 | `/cohorts/` | ISR 3600s | 기수 archive. 신규 기수 추가 시 revalidate tag 로 즉시 반영 |
| 3 | `/cohorts/[slug]/` | ISR 3600s | 기수 상세. `showcase_slug` 기반. 정적 파라미터 = 감사 완료 기수만 |
| 4 | `/stories/` | ISR 3600s | 학생 인터뷰 grid. MDX frontmatter 인덱싱 |
| 5 | `/stories/[slug]/` | ISR 3600s | MDX 콘텐츠. 정적 파라미터 = `content/stories/*.mdx` |
| 6 | `/outcomes/` | SSG snapshot | 분기별 재생성 (수동 revalidate tag). 실시간 X (Lambda 교훈) |
| 7 | `/outcomes/methodology/` | SSG | 정책 문서. 변경 시 수동 revalidate |
| 8 | `/tracks/` | ISR 3600s | 트랙 카탈로그. 초기 = Fan to Pro 카드 1개 |
| 9 | `/faculty/` | ISR 3600s | 강사진. DB `instructors` 재사용 |
| 10 | `/partners/` | ISR 3600s | 로고 wall. `partners` 테이블 |
| 11 | `/blog/` + `/blog/[slug]/` | ISR 3600s | 콘텐츠 인덱스 + MDX 상세. B0019 SEO 자산 연결 |
| 12 | `/waitlist/` | `force-dynamic` | 마감일 반영 필수. §7 SSG 사고 재발 방지 (B0039) |

### Rendering strategy 결정 근거

- **ISR 3600s**: Content 는 하루 안 여러 번 변경 안 함. Vercel Fluid Compute + `revalidate = 3600` 조합으로 hit rate 극대화. 관리자 콘텐츠 update 시 `revalidateTag('cohorts')` `revalidateTag('stories')` 등 tag 로 즉시 반영 가능 (`next-cache-components` 스킬 패턴)
- **SSG snapshot (`/outcomes/*`)**: 감사된 값이 변경되면 안 됨. 새 기수 감사 완료 시 admin 액션에서 `revalidatePath('/outcomes')` 명시 호출. cacheLife 무한, cacheTag 로만 invalidate
- **`force-dynamic` (`/waitlist`)**: 마감 cutoff / 다음 기수 오픈 시점 / D-N 카운트다운이 서버 시각 기반. §7 B0039 사고 룰 그대로 계승. `export const dynamic = "force-dynamic"` 명시

### `(marketing)` layout 통합

```
app/[locale]/
  (marketing)/
    layout.tsx           # 다크 shell, nav, footer, SEO defaults 통합
    page.tsx             # / 우산 랜딩
    cohorts/
      page.tsx
      [slug]/page.tsx
    stories/
      page.tsx
      [slug]/page.tsx
    outcomes/
      page.tsx
      methodology/page.tsx
    tracks/page.tsx
    faculty/page.tsx
    partners/page.tsx
    blog/
      page.tsx
      [slug]/page.tsx
    waitlist/page.tsx
    fan-to-pro/          # 기존 트랙 랜딩 (§7.4 변경 금지)
      page.tsx           # 그대로
      (lms)/             # LMS surface (ADR 0008)
  auth/                  # Supabase Auth (ADR 0008)
  admin/                 # 미포함 (Basic Auth, ADR 0008)
```

- 공통 shell (nav / footer / meta defaults) = `(marketing)/layout.tsx`
- 트랙별 색 / 사진 / 카피 override = 트랙 폴더 안 `layout.tsx` (Fan to Pro 는 기존 유지)
- `(marketing)` route group = URL 에 노출 X (parenthesis 규약)

---

## Data Model Additions

### 신규 컬럼 (additive, 기존 스키마 변경 X)

```sql
-- 1. cohorts 확장
ALTER TABLE cohorts
  ADD COLUMN showcase_slug TEXT UNIQUE,   -- human-readable, nullable
  ADD COLUMN hero_stat JSONB,             -- { label, value, denominator, definition }
  ADD COLUMN thumbnail_path TEXT;         -- Storage bucket path

COMMENT ON COLUMN cohorts.showcase_slug IS 'Human-readable slug for /cohorts/[slug]. 예: fan-to-pro-1. LMS 라우팅은 nanoid 그대로.';
COMMENT ON COLUMN cohorts.hero_stat IS 'Cohort 대표 지표 JSONB. 예: {"label":"실공연 참여","value":8,"denominator":10,"definition":"수료자 10명 중 실공연 배정 8명","audit_date":"2026-08-19"}';
COMMENT ON COLUMN cohorts.thumbnail_path IS 'Storage bucket path. 예: cohort-thumbnails/fan-to-pro-1.jpg';

-- showcase_slug 인덱스 (WHERE showcase_slug IS NOT NULL)
CREATE INDEX cohorts_showcase_slug_idx ON cohorts(showcase_slug) WHERE showcase_slug IS NOT NULL;
```

`hero_stat` 을 JSONB 로 결정한 이유: Aria 원안 `TEXT` 대비 (label / value / denominator / definition / audit_date) 5 필드 = raw fraction 병기 + 감사 날짜 = Lambda 교훈 준수. 그리고 트랙마다 지표 종류가 다를 수 있음 (Fan to Pro = 실공연 참여율, 셰르파 심화 = 취업률, 올인원 = 프로젝트 완주율).

### 신규 테이블 1: `outcome_reports`

```sql
CREATE TABLE outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,             -- "90-day" / "180-day" / "360-day"
  metric_key TEXT NOT NULL,               -- "in_field_employment" / "live_performance_participation" / "graduation_rate"
  raw_numerator INT NOT NULL CHECK (raw_numerator >= 0),
  raw_denominator INT NOT NULL CHECK (raw_denominator > 0),
  denominator_definition TEXT NOT NULL,   -- CIRR-style 정의 문장
  in_field_definition TEXT,               -- metric 이 in-field 관련일 때만
  audit_date DATE NOT NULL,
  audited_by TEXT NOT NULL,               -- 감사자 이름 or 조직명
  notes TEXT,                             -- 추가 맥락
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(cohort_id, period_label, metric_key)  -- 기수당 metric 당 period 1개
);

-- append-only 강제 (UPDATE 는 admin 만)
ALTER TABLE outcome_reports ENABLE ROW LEVEL SECURITY;

-- read = public (전시용)
CREATE POLICY "outcome_reports readable by anyone"
  ON outcome_reports FOR SELECT
  USING (true);

-- insert = super_admin 만
CREATE POLICY "outcome_reports insert by super_admin"
  ON outcome_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- update = super_admin 만 (감사 오탈자 정정)
CREATE POLICY "outcome_reports update by super_admin"
  ON outcome_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

-- delete 금지 (append-only)
-- (no DELETE policy)

-- 인덱스
CREATE INDEX outcome_reports_cohort_id_idx ON outcome_reports(cohort_id);
CREATE INDEX outcome_reports_metric_key_idx ON outcome_reports(metric_key);

-- updated_at 자동 갱신 trigger (기존 함수 재사용 가정)
CREATE TRIGGER outcome_reports_updated_at
  BEFORE UPDATE ON outcome_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**설계 결정**:

- `metric_key` 을 별도 컬럼으로 뽑음 (Aria 원안엔 없음). 이유: cohort 하나에 여러 metric (취업률 / 실공연 / 만족도) 필요. `UNIQUE(cohort_id, period_label, metric_key)` 로 중복 방지
- RLS = read public + write super_admin. Lambda 교훈 = 감사 없는 발표 방지. instructor / student / viewer 는 report 못 만듦
- DELETE 정책 자체를 안 만들어 append-only 보장 (Postgres 는 policy 없으면 deny)
- ON DELETE CASCADE = cohort 자체가 삭제되면 report 도 삭제. 실전에서 cohort 는 soft-delete (`archived_at`) 만 하고 실 DELETE 는 없음. 방어적 CASCADE

### 신규 테이블 2: `partners`

```sql
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,              -- URL 용 (미래 /partners/[slug])
  logo_path_light TEXT NOT NULL,          -- 라이트 배경용 mono 버전
  logo_path_dark TEXT NOT NULL,           -- 다크 배경용 white 버전 (Echo 다크 톤 룰)
  website_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('production', 'operator', 'certification', 'recruitment')),
  license_granted BOOLEAN NOT NULL DEFAULT FALSE,
  license_document_path TEXT,             -- 라이센스 서면 동의 Storage 경로
  license_expires_at DATE,                -- 갱신 시점 관리
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- read = public (license_granted AND is_active 만)
CREATE POLICY "partners readable when licensed and active"
  ON partners FOR SELECT
  USING (license_granted = TRUE AND is_active = TRUE);

-- read for admin (all)
CREATE POLICY "partners readable by admin"
  ON partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'admin')
    )
  );

-- write = super_admin 만
CREATE POLICY "partners write by super_admin"
  ON partners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'super_admin'
    )
  );

CREATE INDEX partners_category_idx ON partners(category);
CREATE INDEX partners_display_order_idx ON partners(display_order);

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**설계 결정**:

- `logo_path_light` + `logo_path_dark` 이중. Echo 인사이트 = "다크 shell 유지 + white/mono 버전 확보 필수". 하나만 두면 라이트 페이지 (LMS admin) 에서도 재사용 불가
- `license_granted = FALSE` 면 public read 차단. 라이센스 서면 동의 없이 실수로 로고 노출 방지 (Sage-friendly)
- `category` = 'production' (Union Pictures), 'operator' (Dropdown), 'certification' (KOCCA 등 미래), 'recruitment' (B0072 이후 확장)
- `slug` 미리 준비 = 미래 `/partners/[slug]` 상세 페이지 대비. 지금은 wall 만

### `student_stories` 는 신규 테이블 X

Aria 원안 = 초기 MDX, 20+ 후 CMS 검토. **PD 확정 = 이대로 유지**. 이유:

- 초기 3~5개 인터뷰 = 파일 관리 최적. Version control (git) + 리뷰 (PR) 가 자연스러움
- DB 테이블 만들면 admin 편집 UI 도 만들어야 함 (지금 리소스 X)
- 20+ 임계 = Sanity / Contentful / Notion API 이관 검토 (별도 ADR)
- MDX frontmatter 로 인덱싱 필드 표준화 (아래)

---

## Content 계층

### 디렉터리 구조

```
content/
  stories/
    fan-to-pro-1-shuxing.mdx
    fan-to-pro-1-maria.mdx
    ...
  blog/
    e7-1-visa-guide.mdx
    k-core-explained.mdx
    ...
  outcomes/
    methodology.mdx        # /outcomes/methodology 원본
```

### MDX frontmatter 표준

`content/stories/*.mdx`:

```yaml
---
slug: fan-to-pro-1-shuxing
name: Shuxing Wang
anonymous: false
nationality: China
cohort_showcase_slug: fan-to-pro-1
visa_journey:
  - visitor
  - k-core
  - e-7-1
current_role: A&R Assistant, XYZ Entertainment
current_since: 2026-09-01
quotes:
  - "..."
  - "..."
photo_path: story-photos/fan-to-pro-1-shuxing.jpg
locale: ko                # or en. 이중 노출 시 sibling 파일 (`.en.mdx`)
published_at: 2026-07-25
featured: true            # /stories/ grid 상단 노출
---

# 본문 MDX ...
```

`content/blog/*.mdx`:

```yaml
---
slug: e7-1-visa-guide
title: E-7-1 비자 완화 가이드
description: 2024년 E-7-1 비자 완화 정책 이후 K-pop 산업 직군 지원 방법.
category: visa           # visa / industry / career / faculty
tags: [E-7-1, 비자, 취업]
locale: ko
og_image_path: blog-og/e7-1-visa-guide.png
published_at: 2026-07-10
author: Growth Career Team
---

# 본문 MDX ...
```

### 파싱 라이브러리

- `contentlayer` 검토했으나 Next.js 14+ 호환 issue. **PD 결정** = `next-mdx-remote` + `gray-matter` 조합 (안정)
- `content/stories/*.mdx` 인덱스는 build time 에 파일 시스템 scan + frontmatter 파싱 (정적 데이터)
- `generateStaticParams` 로 slug list 반환. 새 MDX 추가 시 재배포 필요 (git push 로 자연스러움)

### 20+ 임계 후 CMS 검토

`content/stories/` 파일 수가 20 넘어가면 다음 ADR 에서:

- Option A: Sanity (headless CMS, generous free tier)
- Option B: Notion API (기존 노아 팀 익숙, but rate limit 우려)
- Option C: DB 이관 (`student_stories` 테이블 신설)

지금은 결정 유예. 20 도달 = 대략 5기 종료 시점 예상.

---

## Multi-track shell 통일

### 원칙

- 공통 shell = `(marketing)/layout.tsx` (다크 nav / footer / SEO defaults)
- 트랙별 색 / hero 카피 = 트랙 폴더 layout override
- 기존 `/fan-to-pro/*` marketing 페이지 = §7.4 룰 = **변경 X**. 신규 route 만 신설

### Shell 요소

`(marketing)/layout.tsx` 에서 통합 관리:

- Top nav: `우산 / 트랙 / 기수 / 성과 / 이야기 / 블로그 / CTA(신청/대기)`
- Footer: Dropdown 사업자 정보 + 개인정보처리방침 + 이용약관 + Union Pictures / DEEPI 파트너 표기 + 카톡 오픈채팅 링크
- SEO defaults: OG image 기본값 (`og-default.png`), locale, twitter card
- JSON-LD Organization schema (B0019 재사용)

### 다크 톤 primitives 재사용

기존 `/fan-to-pro/*` 마케팅에서 쓰던 컴포넌트 중 shell 로 승격:

- `<SectionHeading>` (다크 톤 h2)
- `<CTAButton>` (다크 primary / secondary)
- `<PartnerBadge>` (기존 인라인 로고 표기)
- `<StatBadge>` (raw fraction 강조 UI)

이 primitives 는 `src/programs/growth-career/presentation/primitives/` 로 이동 검토 (별도 리팩터 backlog, 지금 X). 지금은 `/fan-to-pro/*` 안 있으면 그대로 import 해서 재사용.

### 트랙 확장 시 패턴

미래 셰르파 심화 / 올인원 추가 시:

```
app/[locale]/(marketing)/
  sherpa-deep-dive/
    layout.tsx           # 트랙 색 override
    page.tsx             # 트랙 랜딩
    (lms)/               # LMS surface
  all-in-one/
    layout.tsx
    page.tsx
```

이 확장은 이 ADR 범위 X. B0084~B0091 완료 후 별도 backlog.

---

## SEO / OG / structured-data

### 페이지별 metadata

각 신규 페이지 = `generateMetadata` export 필수:

- `title`: "[페이지명] / Growth Career" (우산이 뒤에)
- `description`: 페이지별 커스텀 (검색 CTR 최적화)
- `openGraph.images`: 페이지별 og-image (`og-{route}.png`)
- `alternates.languages`: KO / EN 매핑 (해당 페이지가 이중 지원 시)
- `alternates.canonical`: `/[locale]/{route}` 명시

### JSON-LD schema 확장

B0019 에서 이미 5종 (Organization / EducationalOrganization / Course / FAQPage / BreadcrumbList) 있음. 이 ADR 로 추가:

- `Person` schema (`/faculty/[slug]` 강사 프로필 미래, 지금은 `/faculty` grid 만이라 유예)
- `Article` schema (`/blog/[slug]` MDX 상세)
- `EducationalOccupationalCredential` schema (`/outcomes/` 감사 문서, 신뢰 도구)

`content/blog/*.mdx` 는 build time frontmatter 로 Article schema 자동 생성 (helper 함수 하나).

### llms.txt 확장

B0019 llms.txt 이미 존재. 신규 route 12 추가:

```
# Growth Career (llms.txt)

## Umbrella
- / (우산 랜딩)
- /tracks/ (트랙 카탈로그)

## Showcase
- /cohorts/ (기수 archive)
- /cohorts/{slug}/ (기수 상세)
- /stories/ (학생 인터뷰 grid)
- /stories/{slug}/ (인터뷰 상세)
- /faculty/ (강사진)
- /partners/ (파트너 회사)

## Outcomes (감사됨)
- /outcomes/ (지표 snapshot)
- /outcomes/methodology/ (분모 정의)

## Content
- /blog/ (콘텐츠 인덱스)
- /blog/{slug}/ (블로그 상세)

## Lead
- /waitlist/ (다음 기수 대기)

## Tracks
- /fan-to-pro/ (첫 트랙, 1기 pilot completed 2026-07-19)
```

---

## i18n

### 라우팅

기존 `next-intl` `/[locale]/{...}` 유지. `middleware.ts` 분기 (ADR 0008) 그대로.

### KO 우선 + EN 최소 (Aria 결정 6)

**EN 필수** (외국인 타겟 콘텐츠):

- `/outcomes/*` (신뢰 도구, KO/EN 병기 필수)
- `/outcomes/methodology/*` (동일)
- `/stories/*` (외국인 학생 서사 자체가 EN 화자 대상)
- `/waitlist/*` (외국인 lead 축적)
- 약관 / 개인정보처리방침 (기존 유지)

**KO 우선** (한국어 최소 유지):

- `/` (우산 랜딩): KO 필수, EN 요약 정도만
- `/cohorts/*`: KO
- `/faculty/*`: KO
- `/partners/*`: KO
- `/blog/*`: locale-specific (frontmatter `locale` 필드로 fork)
- `/tracks/*`: KO

### EN 콘텐츠 처리

MDX 는 sibling 파일 (`fan-to-pro-1-shuxing.mdx` + `fan-to-pro-1-shuxing.en.mdx`). 파싱 시 locale suffix 로 매칭.

Page metadata / UI 텍스트는 기존 `messages/en.json` 확장. 신규 키 prefix = `growthCareer.` (`fanToPro.` 와 분리).

---

## 신규 도메인 entity

`src/programs/growth-career/domain/entities/` 신설.

### `outcome-report.ts`

```typescript
export type OutcomeReport = {
  id: string
  cohortId: string
  periodLabel: '90-day' | '180-day' | '360-day'
  metricKey: string   // 'in_field_employment' 등
  rawNumerator: number
  rawDenominator: number
  denominatorDefinition: string
  inFieldDefinition: string | null
  auditDate: Date
  auditedBy: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export function formatFraction(report: OutcomeReport): string {
  return `${report.rawNumerator}/${report.rawDenominator}`
}

export function formatPercentage(report: OutcomeReport): string {
  const pct = Math.round((report.rawNumerator / report.rawDenominator) * 100)
  return `${pct}%`
}

// §6.5 준수: interpunct/em dash 금지. 슬래시 또는 괄호만
export function formatCombined(report: OutcomeReport): string {
  return `${formatFraction(report)} (${formatPercentage(report)})`
}
```

### `partner.ts`

```typescript
export type PartnerCategory = 'production' | 'operator' | 'certification' | 'recruitment'

export type Partner = {
  id: string
  name: string
  slug: string
  logoPathLight: string
  logoPathDark: string
  websiteUrl: string | null
  category: PartnerCategory
  licenseGranted: boolean
  licenseDocumentPath: string | null
  licenseExpiresAt: Date | null
  displayOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export function isPubliclyDisplayable(partner: Partner): boolean {
  return partner.licenseGranted && partner.isActive
}

export function isLicenseExpiringSoon(partner: Partner, withinDays: number = 30): boolean {
  if (!partner.licenseExpiresAt) return false
  const now = new Date()
  const diffMs = partner.licenseExpiresAt.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays > 0 && diffDays <= withinDays
}
```

### `cohorts` entity 확장

기존 `src/programs/fan-to-pro/domain/entities/cohort.ts` 는 §7.4 룰로 시그니처 변경 금지. 대신:

- **PD 결정**: `growth-career/domain/entities/cohort-showcase.ts` 신설. `Cohort` (LMS 원본) 을 wrap 하는 view type

```typescript
export type CohortShowcase = {
  slug: string                // showcase_slug
  displayName: string         // "Fan to Pro 1기"
  trackSlug: string           // "fan-to-pro"
  period: {
    startAt: Date
    endAt: Date
  }
  graduateCount: number       // 감사된 값 (from outcome_reports 또는 cohort_memberships COUNT)
  instructorCount: number
  heroStat: {
    label: string             // "실공연 참여"
    value: number             // 8
    denominator: number       // 10
    definition: string
    auditDate: Date
  } | null                    // 감사 전이면 null
  thumbnailPath: string | null
  storiesSlugs: string[]      // content/stories 인덱스에서 join
}
```

이 wrap type = 정적 데이터 (build time 생성). Cohort 원본 LMS entity 와 결합도 낮게.

---

## 신규 repository

`src/programs/growth-career/infrastructure/supabase/repositories/` 신설.

### `outcome-report-repository.ts`

```typescript
export interface OutcomeReportRepository {
  findByCohort(cohortId: string): Promise<OutcomeReport[]>
  findLatestByMetric(metricKey: string, periodLabel: string): Promise<OutcomeReport[]>
  create(input: OutcomeReportInput): Promise<OutcomeReport>
  update(id: string, patch: Partial<OutcomeReportInput>): Promise<OutcomeReport>
  // no delete (append-only)
}
```

### `partner-repository.ts`

```typescript
export interface PartnerRepository {
  findAllPubliclyDisplayable(): Promise<Partner[]>
  findByCategory(category: PartnerCategory): Promise<Partner[]>
  findAll(): Promise<Partner[]>              // admin only
  findExpiringLicenses(withinDays: number): Promise<Partner[]>
  create(input: PartnerInput): Promise<Partner>
  update(id: string, patch: Partial<PartnerInput>): Promise<Partner>
  archive(id: string): Promise<void>         // is_active = false
}
```

### `cohort-showcase-repository.ts` (신규)

기존 `cohort-repository.ts` 을 확장하지 않고, showcase 용 별도 repo 신설. §7.4 룰 = 기존 함수 시그니처 변경 금지.

```typescript
export interface CohortShowcaseRepository {
  findAllPubliclyDisplayable(): Promise<CohortShowcase[]>       // showcase_slug NOT NULL
  findBySlug(slug: string): Promise<CohortShowcase | null>
  // write 는 admin cohort-repository 통해서만
}
```

내부 구현은 기존 `cohort-repository` 의 원본 데이터 + `showcase_slug` / `hero_stat` / `thumbnail_path` 컬럼 + `outcome_reports` join.

---

## Failure Modes

이 아키텍처가 무엇이 깨지면 무엇이 죽나:

### 1. `outcome_reports` 감사 안 된 값 발표

- 위험: Lambda 사고 재현. 브랜드 소각
- 방어: RLS = insert super_admin only. admin UI 에 `audited_by` `audit_date` 필수 필드 강제
- 감시: `/outcomes` 페이지는 감사 없는 report skip (`audit_date IS NULL` 필터). audit_date NOT NULL constraint 이미 SQL 에 박음

### 2. 로고 라이센스 만료 방치

- 위험: 파트너 로고 사용권 만료 후 노출 = 법적 issue
- 방어: `license_expires_at` 컬럼 + `isLicenseExpiringSoon()` helper + admin 대시보드 알림
- 감시: 만료된 로고 자동 hide (RLS 정책에 `license_granted = TRUE` 조건. `license_expires_at IS NULL OR license_expires_at > NOW()` 추가 검토)

### 3. `showcase_slug` 충돌

- 위험: reserved word (`admin`, `apply`, `auth`, `waitlist` 등) 와 slug 충돌 (라우팅 파괴)
- 방어: DB level `CHECK (showcase_slug NOT IN ('admin', 'apply', 'auth', 'waitlist', 'outcomes', 'stories', 'cohorts', 'faculty', 'partners', 'blog', 'tracks'))`. Admin UI validation 병행
- 감시: middleware.ts 는 `/cohorts/[slug]` 만 match. Reserved 경로는 별도 route file 로 우선순위 확보

### 4. MDX build 실패

- 위험: 신규 MDX 파일 문법 오류가 전체 build 실패로 전파
- 방어: `content/**/*.mdx` = 로컬 lint 스크립트 (pre-commit hook). CI 에서 build 시 명시 검증
- 감시: MDX schema (frontmatter) zod validation 도입

### 5. ISR revalidate tag 미호출

- 위험: 새 story / cohort 추가했는데 페이지에 안 뜸
- 방어: admin server action 에 `revalidateTag('stories')` `revalidateTag('cohorts')` `revalidatePath('/outcomes')` 명시. `next-cache-components` 스킬 패턴 준수
- 감시: 관리자 UI 에서 "지금 반영" 버튼 옵션 (수동 재검증)

### 6. `force-dynamic` waitlist 페이지가 SSG 로 캐시됨

- 위험: B0039 사고 재발. 마감 지나도 오래된 상태 노출
- 방어: `export const dynamic = "force-dynamic"` 페이지 상단 명시. 빌드 시 검증 스크립트 (waitlist / countdown 관련 페이지 grep)
- 감시: Sage 배포 전 5종 체크 4번 (카피 부호) 옆에 "시간 기반 페이지 dynamic 검증" 항목 추가 검토

### 7. Layout 통합 후 기존 `/fan-to-pro/*` 회귀

- 위험: `(marketing)/layout.tsx` 변경이 `/fan-to-pro/*` 에 전파. §7.4 위반
- 방어: `/fan-to-pro/(lms)/*` 는 이미 별도 route group. `/fan-to-pro/page.tsx` 는 `(marketing)/layout.tsx` 아래 sibling
- 감시: 신규 layout 배포 전 `/fan-to-pro` 랜딩 스크린샷 비교 (pnpm preview)

---

## Rejected Alternatives

### R1. `/showcase/*` sub-shell 안 신설

- Aria 원안 = `/` 우산 랜딩. 대안 = `/showcase/*` sub-path (기존 `/` = Fan to Pro 리다이렉트 유지)
- 거부 이유: 우산 브랜드 자산화 안 됨. Growth Career 검색해도 Fan to Pro 만 보임. 리다이렉트 = 브랜드 dilution
- 채택 = Aria 권고 그대로 (`/` 우산 랜딩)

### R2. `hero_stat` TEXT

- Aria 원안 = `TEXT` (단순 문자열)
- 거부 이유: (label / value / denominator / definition / audit_date) 5 필드 필요. TEXT 는 감사 못 함
- 채택 = JSONB (구조화)

### R3. `outcome_reports` UPDATE 허용

- 대안 = 감사 오탈자 정정 위해 super_admin UPDATE 허용
- 거부 부분: DELETE 는 여전히 금지. UPDATE 는 audit trail (updated_at + notes 컬럼) 로 관리
- 채택 = UPDATE 허용 + DELETE 금지 (append-only 완화 버전)

### R4. Contentlayer 채택

- 대안 = Next.js MDX 파싱 라이브러리 표준
- 거부 이유: Next.js 14+ 호환성 issue 지속 (2026 초 기준). 유지보수 활발도 낮음
- 채택 = `next-mdx-remote` + `gray-matter` (안정)

### R5. `student_stories` DB 테이블 즉시 신설

- 대안 = MDX 대신 DB (admin 편집 UI 가능)
- 거부 이유: admin 편집 UI 개발 리소스 X. 초기 3~5개 = 파일 관리 충분. 20+ 후 재검토
- 채택 = MDX + frontmatter zod validation

### R6. Sanity CMS 즉시 도입

- 대안 = 초기부터 headless CMS
- 거부 이유: 학습 곡선 + 신규 의존성 + 비용 (generous free tier 있지만 lock-in)
- 채택 = MDX (git 관리). 20+ 후 재검토

### R7. Multi-track = 폴더 sibling X, config 기반 동적 라우팅

- 대안 = `tracks.json` 같은 config 로 트랙 동적 생성 (`app/[locale]/(marketing)/tracks/[slug]/page.tsx`)
- 거부 이유: 트랙별 카피 / 색 / 사진이 크게 다름. 동적 라우팅 시 config 비대. 실제 트랙 수 3~5개 유지 예상 = 폴더 sibling 이 명료
- 채택 = 트랙별 폴더 (`/fan-to-pro`, 미래 `/sherpa-deep-dive`, `/all-in-one`)

### R8. `/outcomes/` = `force-dynamic`

- 대안 = 최신 감사 반영 위해 dynamic
- 거부 이유: Snapshot 원칙 위배. 매 request 마다 조작 여지. Lambda 교훈 = 정적 감사 값만 노출
- 채택 = SSG + revalidateTag (admin 이 새 감사 완료 시 수동 revalidate)

### R9. `partners` license 없이도 노출

- 대안 = admin 판단으로 노출 여부만 결정 (license_granted 컬럼 X)
- 거부 이유: 라이센스 서면 동의 실수 방지. Sage 원칙 (fail-safe default)
- 채택 = `license_granted = FALSE` 시 public read 자동 차단

### R10. Cohort URL = nanoid 만

- 대안 = LMS 랑 동일한 nanoid 사용 (`/cohorts/{nanoid}`)
- 거부 이유: SEO 불리 + 사람이 URL 공유 어려움. Aria 권고 = human-readable
- 채택 = `showcase_slug` 컬럼 additive (LMS 는 nanoid 그대로)

---

## 노아 결정 필요 (10건)

Aria PO 7건 + PD 추가 3건. Aria 7건 = 기존 승인 대기 상태. PD 3건은 아래 추가.

### Aria PO 7건 (ADR 0015 원문 참조)

1. 우산 도메인 구조 (A: `/` 우산 + `/fan-to-pro` 트랙 vs B: `/` = Fan to Pro 유지 + `/showcase/*`)
2. Alumni 커뮤니티 최종 플랫폼 (A: Slack, B: Discord, C: 카톡 유지, D: Slack + 카톡 병행)
3. Outcomes 분모 / 기간 / in-field 정의
4. 사람 얼굴 비중 확대 = 수료생 인터뷰 촬영 시점 (A: 종강 직후, B: 수료식 당일, C: 8월)
5. Waitlist form 오픈 시점 (A: 즉시, B: 2기 확정 후, C: 종강 직후)
6. 다국어 콘텐츠 축 (A: KO/EN 이중 전체, B: KO 우선 + EN 최소)
7. 채용 파트너 개척 시점 (A: 즉시, B: B0072 후, C: 3기 이후)

### PD 추가 3건

**8. Cohort thumbnail Storage bucket 신설 or 재사용**

- Option A: 신규 bucket `cohort-thumbnails` (public read)
- Option B: 기존 bucket 재사용 (예: `assets` 하위 폴더)
- **PD 권고 A**: bucket 분리 = access policy 명확 + 파일 lifecycle 관리 (라이센스 만료 시 폴더 단위 삭제 가능)

**9. Outcomes methodology 분모 / 기간 / in-field 정의 (Lambda 교훈)**

Aria 3번과 겹치지만 PD 관점 재확인. Sophia 는 데이터 모델 관점에서:

- 분모 = `raw_denominator` 컬럼 값. 정의는 `denominator_definition` TEXT 문장으로 명시적 박제 (구조화 X, 자연어)
- 기간 = `period_label` ENUM ('90-day' / '180-day' / '360-day'). Codesmith 패턴 3 지표 병기 = 스키마 지원 완료
- in-field = `metric_key = 'in_field_employment'` 일 때 `in_field_definition` 컬럼 필수. 그 외 metric 에는 NULL 허용
- **PD 권고**: Aria 권고 그대로 (CIRR 표준). 스키마는 이미 뒷받침. **노아 결정은 (a) `in_field` 정의 텍스트 문장 초안 = "K-pop 산업 관련 직무 (프로덕션 / A&R / 마케팅 / 무대 / 영상) 로 한정" 승인 여부, (b) 실공연 참여도 = 별도 metric_key ('live_performance_participation') 승인 여부**

**10. Content 초기 MDX vs Notion API 즉시**

- Option A: MDX (PD 권고, Aria 권고)
- Option B: Notion API 즉시 도입 (노아 팀 Notion 익숙, but rate limit + build time fetch 복잡도)
- Option C: Sanity 즉시 도입 (학습 곡선)
- **PD 권고 A**: 초기 3~5개 = 파일 충분. 20+ 후 별도 ADR. Notion API 는 draft 관리엔 좋으나 public 콘텐츠 delivery 는 오히려 복잡

---

## 백로그 파생

Sophia PD spec 확정 후 아래 B0084~B0091 status raw → specced 승격.

### B0084. Outcomes 페이지 (`/outcomes/*`)

- **의존**: 노아 결정 3 + 9 (분모 / 기간 / in-field)
- **산출**: `/outcomes/page.tsx` (SSG) + `/outcomes/methodology/page.tsx` (SSG) + `outcome_reports` 마이그레이션 + admin UI (감사 값 입력)
- **일정**: 1기 종강 (7/19) 후 30일 안 발표. 감사 시간 확보

### B0085. Cohorts Showcase (`/cohorts/*`)

- **의존**: `showcase_slug` / `hero_stat` / `thumbnail_path` 마이그레이션
- **산출**: `/cohorts/page.tsx` (grid) + `/cohorts/[slug]/page.tsx` (상세) + admin UI (showcase_slug 편집)
- **일정**: 1기 카드 1개 시작. 2기 시작 전 확장

### B0086. Student Stories (`/stories/*`)

- **의존**: 노아 결정 4 (인터뷰 촬영 시점)
- **산출**: `/stories/page.tsx` (grid) + `/stories/[slug]/page.tsx` (MDX 상세) + `content/stories/*.mdx` 초기 3~5개
- **일정**: 종강 직후 인터뷰 발주. 3주 안 게시

### B0087. Partner Logo Wall + Faculty (`/partners/`, `/faculty/`)

- **의존**: `partners` 테이블 마이그레이션 + 3사 로고 mono/white 버전 확보 + 라이센스 서면 동의
- **산출**: `/partners/page.tsx` (wall) + `/faculty/page.tsx` (기존 `instructors` join) + admin partners CRUD
- **일정**: Union Pictures / DEEPI / Dropdown 3사 우선. 채용 파트너 확장은 B0072 이후

### B0088. Alumni 커뮤니티 (Slack + 카톡 병행)

- **의존**: 노아 결정 2 (Slack 확정 가정)
- **산출**: Slack workspace 신설 + `/alumni` 랜딩 (선택) + 종강 시 학생 초대 자동화 (B0036 Wave 5)
- **일정**: 종강 (7/19) 직후 이관

### B0089. Waitlist form (`/waitlist`)

- **의존**: 노아 결정 5 (오픈 시점)
- **산출**: `/waitlist/page.tsx` (`force-dynamic`) + `applicants.status = 'next_cohort_interest'` 재사용 + email drip 캠페인 (별도)
- **일정**: 1기 종강 직후 오픈

### B0090. Umbrella 랜딩 (`/`)

- **의존**: 노아 결정 1 + B0084~B0089 부분 완료 (데이터 있어야 hero 지표 채움)
- **산출**: `/page.tsx` (ISR) + `HeroUmbrellaStats` / `CurriculumTracksCards` / `PartnerLogoWall` / `AlumniNetworkTeaser` 조합
- **일정**: B0084~B0089 완료 후 최종 조립

### B0091. Blog Insights (`/blog/*`)

- **의존**: 없음 (독립 착수 가능). B0019 SEO 자산 (llms.txt / JSON-LD) 연결
- **산출**: `/blog/page.tsx` (grid) + `/blog/[slug]/page.tsx` (MDX) + `content/blog/*.mdx` 초기 3~5개 (E-7-1 / K-CORE / F-시리즈)
- **일정**: SEO 축 강화 = 언제든 병행 가능

---

## Luna UX 컨셉 spec 과 정합 확인 (도착 후)

Luna B0083 UX spec (`docs/specs/B0083-platform-evolution-ux.md`) 병렬 진행 중. 도착 후 아래 5 항목 정합 검증:

1. **컴포넌트 카탈로그 10종 props 시그니처** 가 이 ADR 의 `hero_stat` JSONB / `outcome_reports` schema / `partner` entity 와 매칭되나
2. **다크 톤 + 사람 얼굴 primitive** 이 `(marketing)/layout.tsx` shell 요소와 정합되나
3. **그라데이션 X + 단색 bar chart** 원칙이 `OutcomesReport` 컴포넌트에 반영되나
4. **Waitlist `force-dynamic`** 이 Luna 카운트다운 UX 컨셉과 충돌 X 인가 (B0039 재발 방지)
5. **KO 우선 + EN 최소** 결정이 Luna copy layer 와 정합되나

Luna spec 도착 후 불일치 발견 시 이 ADR 을 patch (rev v2). Luna 결과 도착 대기 X.

---

## Prevention (사고 재발 방지)

이 ADR 자체가 여러 lesson 반영. 별도 lesson 파일 신설 X. CLAUDE.md 룰 재확인:

- `docs/lessons/2026-06-09-sage-review-skipped.md` (§4). 이 ADR 이 도입하는 partners RLS / outcome_reports RLS 는 Sage 검토 후 배포
- `docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md` (§7). `/waitlist` `force-dynamic` 명시로 재발 방지
- `docs/lessons/2026-07-04-feature-intent-gating.md` (§2.5). 이 ADR 시작 시 [skip-gating: approved] 마커 있음 (노아 명시 승인)

---

## Next

1. 노아 결정 10건 회신
2. 결정 승인 시. B0084 (outcome_reports 마이그레이션) + B0085 (cohorts 컬럼 추가) + B0091 (blog) 우선 착수. 순서 = 스키마 additive 먼저, UI 페이지는 후
3. Luna UX spec 도착 시 정합 검증. 필요 시 이 ADR patch v2
4. 1기 종강 (7/19) 전: MDX frontmatter zod schema 확정 + `content/stories/` 파일 layout 준비 + Storage bucket `cohort-thumbnails` / `story-photos` / `partner-logos` 신설
5. 1기 종강 직후: outcome_reports 감사 시작 (분모 / 기간 / in-field 정의 노아 승인 필수)
