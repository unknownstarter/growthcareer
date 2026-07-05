# ADR 0015 - Platform Evolution PO (Growth Career 우산 전시 사이트)

**Status**: Proposed (노아 결정 7건 대기)
**Date**: 2026-07-05
**Deciders**: 노아 + Aria (PO) — Sophia (PD) + Luna (UX) 후속 dispatch 예정
**Tags**: platform, umbrella-brand, showcase, cohort-archive, alumni, outcomes, waitlist, recruitment-partners
**Related**: Echo 리서치 `docs/research/B0083-platform-evolution-benchmark.md` / ADR 0006 (LMS Design System) / ADR 0008 (URL/Auth 분리) / ADR 0013 (Multi-track + Recruitment)
**Marker**: [skip-gating: approved] 노아 명시 요청 (2026-07-04)

---

## 결정 요약 (1 문장)

`growthcareer.xyz` 을 "Fan to Pro 1기 모집 랜딩" 에서 "Growth Career 우산 브랜드 + N 기수 + N 트랙 curated 전시 사이트" 로 진화시키되, 라이브 트랙 랜딩 (`/fan-to-pro/*`) 은 §7.4 룰로 변경 금지하고 신규 `/showcase` shell + 6 컴포넌트 카탈로그 + 2 신규 페이지 (Outcomes / Cohorts) 를 additive 로 얹는다.

---

## 컨텍스트

노아 발화 (2026-07-04):

> "지금의 fantopro 페이지도 뭔가 바뀌어야 할 것 같은데. 이전 1기를 포함해서 전시의 필요가 생긴거 같아. UX 전문 에이전트! 그리고 PO는 플랫폼의 진화에 대해 비즈니스 적으로 임팩트가 있는 구조로 PD과 의논해."

Echo B0083 리서치 결과 (요약):

- Lambda / BloomTech 몰락 = 발표 vs 실제 취업률 괴리. 브랜드 자산 소각.
- Le Wagon 40+ 캠퍼스 / 23,000 alumni / 213 스타트업 = alumni network 를 core moat 로.
- Codesmith = CIRR 표준 준수 + 파트너 회사 로고 wall 신뢰 asset.
- 스파르타 `/community/exhibition` = 기수별 아카이브 명시적 페이지.
- 우아한테크캠프 = alumni 자발적 velog / medium 후기가 검색 결과 지배.

절대 룰 (§7.4 + §6.5 재확인):

1. 라이브 페이지 (`/fan-to-pro/*` 마케팅) 카피 / 디자인 / 신청 폼 변경 금지
2. 어드민 3-tab 컬럼 / 액션 / 폴링 동작 변경 금지
3. em dash / interpunct / 곡선 따옴표 / 단일 ellipsis 금지
4. 그라데이션 금지
5. 리브랜드 X — 우산 확장 O (Lambda 사고 교훈)

---

## 비즈니스 임팩트 구조

### 1. 목표 KPI (4 축)

| 축 | 지표 | 측정 시점 | 근거 |
|---|---|---|---|
| **신뢰** | Outcomes 페이지 도달 → 신청 conversion rate | 매 기수 마감 후 30일 | Codesmith / CIRR 벤치. 신뢰 asset = conversion driver |
| **확장** | 파트너 회사 신규 등록 월 N개 | 월 리뷰 | B0072 partner 스키마 연동 |
| **취업 성사** | 학생 지원 → offer 성사율 (CIRR 표준) | 기수 종료 후 90/180/360일 | Lambda 교훈. 분모 정의 사전 박제 |
| **Alumni 참여** | Slack/Discord DAU + 인터뷰 응답률 | 월 리뷰 | Le Wagon 24k Slack 벤치 |
| **Waitlist → 신청** | `next_cohort_interest` → 다음 기수 PAID conversion | 다음 기수 오픈 후 14일 | 이미 B0039 DB status 존재 |

### 2. 비즈니스 axis (4)

**A. 신뢰 (Outcomes / Student Stories / Faculty / Partners)**
- Outcomes 페이지 = "raw fraction + 분모 정의" 병기 필수 (Lambda 교훈)
- Student Stories = 1기 수료자 3~5명 인터뷰 (기수 마감 직후 감정 fresh)
- Faculty = Union Pictures / DEEPI 소속 credential + K-pop 프로젝트 실적
- Partners = Union Pictures / DEEPI / Dropdown 3사 (초기) → B0072 채용 파트너 확장

**B. 확장 (Cohorts Showcase / Tracks / 올인원)**
- Cohorts Showcase = 1기 카드 1개 시작. 스파르타 `/exhibition` 패턴
- Tracks = Fan to Pro / 셰르파 심화 / 올인원 3 카드 (ADR 0013 courses/bundles 스키마 준비 후)
- 올인원 = 여러 단과반 조합 landing

**C. Lead 축적 (Waitlist / Alumni network)**
- Waitlist landing = 1기 마감 후 3개월 gap 동안 lead 축적
- DB status `next_cohort_interest` 이미 존재 (B0039)
- Alumni = 카톡 (임시) → Slack or Discord (정식) 승격

**D. 채용 연계 (Partner 회사 / JD / 지원 파이프라인)**
- B0072 companies_partners / job_postings / student_applications 스키마 연동
- Showcase 사이트 = 파트너에게 "학생 리스트 어디서 확인" 안내 gateway
- Waitlist form 별도 = 기업 회원 인바운드용

---

## 정보 우선순위 (Hero 첫 1 scroll)

`growthcareer.xyz/` (우산 랜딩) 진입 시 above-the-fold 정보 층:

1. **Umbrella Brand + 지표** — "Growth Career · N기 수료 · M명 · K개국 출신" (1기 시점 = "1기 pilot completed · 10명 · N개국")
2. **다음 기수 CTA** — Waitlist 또는 신청 (2기 오픈 확정 후)
3. **파트너 로고 wall** — Union Pictures / DEEPI / Dropdown 3사 (신뢰 base)
4. **트랙 카드 3개** — Fan to Pro / 셰르파 심화 (예정) / 올인원 (예정)
5. **수료생 사례** — 사진 + 이름 (익명 옵션) + 지금 하는 일 (Le Wagon Tokyo 패턴)

---

## Cohorts Showcase 정보 계층

`growthcareer.xyz/cohorts/` 각 기수 카드:

**카드 앞면**:
- 기수명 (예: "Fan to Pro 1기")
- 기간 (2026-06-27 ~ 07-19)
- 강사 이름 3~5명 (링크: Faculty 페이지)
- 수료 인원 (10명 pilot)
- 대표 성과 (예: "실공연 참여 8/10")

**카드 클릭 → 기수 상세 페이지** (`growthcareer.xyz/cohorts/[slug]`):
- 수료생 인터뷰 (Student Stories 카드 embed)
- 자료 archive (강의 개요 · 커리큘럼 · 최종 발표 하이라이트)
- 파트너 (해당 기수 협력사)
- Outcomes snapshot (분모 정의 병기)

---

## Alumni 커뮤니티 승격

**현재 (1기)**: 카톡 오픈채팅 (`https://open.kakao.com/o/gX12jFAi`, 비번 fan06pro)

**정식 이관 후보**:

| 옵션 | 장 | 단 | 초기 비용 |
|---|---|---|---|
| **Slack** | Le Wagon 24k 벤치 / 검색 가능 / 채용 broadcast 최적 | 외국인 학생에게 진입 장벽 (설치 + 워크스페이스 초대) | Free tier |
| **Discord** | 게임/K-pop 팬 익숙 / 검색 가능 / 음성 채널 | 비즈니스 톤 아님 / 관리 복잡 | Free |
| **카톡 오픈채팅 유지** | 한국 거주 외국인 익숙 | 검색 X / lifetime asset 안 됨 / 채용 broadcast 부적합 | Free |

**Aria 권고**: **Slack + 카톡 병행**. Slack = alumni 정식 (lifetime asset). 카톡 오픈채팅 = 재학 중 소통용. 학생 종강 시 Slack invite → alumni 그룹 승격.

이유:
- Le Wagon 벤치 (24k Slack) = "lifetime career support" 카피 커밋 근거
- 검색 가능 + 채용 broadcast + 알럼나이 프로필 = 신뢰 asset
- 초기 = 노아 수동 초대. 자동화 = B0036 Wave 5 로 미룸

**노아 결정 필요**: Slack vs Discord vs 카톡 유지 (결정 2 아래)

---

## 채용 파트너 확장 base

Showcase 사이트 진화 = 채용 파트너 개척 base:

- 파트너 회사 대상 페이지: `growthcareer.xyz/partners` (등록 인바운드용)
- Partner CTA: "우리 학생 리스트 어디서 확인" → `/partners/apply` waitlist form 별도
- 로고 wall 확장: 초기 3사 (Union Pictures / DEEPI / Dropdown) → B0072 이후 채용 파트너 로고 추가
- 라이센스 승인 필수 (로고 사용 서면 동의)

B0072 병행 흐름:
1. B0072 스키마 (companies_partners / job_postings / student_applications)
2. B0073 admin recruitment 3 페이지 (파트너 등록 + JD 관리 + 지원 트래킹)
3. B0074 student recruitment surface (JD list + 본인 지원 트래킹)
4. 이 ADR 의 파트너 페이지 = B0072~B0074 완료 후 외부 노출용 shell

---

## 발표 지표 정의 사전 박제 (CIRR 표준)

Lambda / BloomTech 사고 = "발표 vs 실제 취업률 괴리" → 브랜드 소각. 우리는 사전 문서로 방어.

**Outcomes methodology 페이지 (`growthcareer.xyz/outcomes/methodology`)** 필수:

- **분모 정의** (노아 결정 필요, 결정 3):
  - Option A: "job-seeking grads only" (Lambda 이전 표준)
  - Option B: "all grads" (CIRR 표준, 더 보수적)
  - Aria 권고: **Option B** — 처음부터 CIRR 급 보수 기준. 나중 상향 X, 하향 O 시 신뢰 손상.

- **기간 정의**:
  - Option A: 3개월 안 취업
  - Option B: 6개월 안 취업 (CIRR 표준)
  - Option C: 90 / 180 / 360일 3 지표 병기 (Codesmith 패턴)
  - Aria 권고: **Option C** — 3 지표 병기 = 신뢰 도구.

- **"in-field" 정의**:
  - K-pop 산업 관련 직무 (프로덕션 / A&R / 마케팅 / 무대 / 영상 등) 로 한정
  - 관광업 / 외식업 / 비관련 직무는 "in-field" 아님
  - 실공연 참여도 별도 지표 (in-field 와 병기)

- **발표 형식**:
  - Raw fraction ("8/10") + percentage ("80%") 병기
  - 분모 정의 문장 병기 ("수료자 10명 중 실공연 배정 8명")
  - 감사 날짜 명시

---

## `/showcase` shell IA 요구 (Sophia 넘김)

Sophia (PD) 가 후속 dispatch 에서 결정할 6 항목:

### 1. `/showcase` 경로 신설 vs 기존 통합

Aria 권고: **우산 랜딩 = `growthcareer.xyz/`** + **트랙 landing = sub-path** (기존 `/fan-to-pro/*` 그대로).

- `/` = 우산 랜딩 (신규)
- `/cohorts/` = 기수 아카이브 (신규)
- `/cohorts/[slug]` = 기수 상세 (신규)
- `/stories/` = 학생 인터뷰 grid (신규)
- `/stories/[slug]` = 인터뷰 상세 (신규)
- `/outcomes/` = 통계 페이지 (신규)
- `/outcomes/methodology` = 분모 정의 문서 (신규)
- `/tracks/` = 트랙 카탈로그 (신규)
- `/faculty/` = 강사진 프로필 (신규)
- `/partners/` = 파트너 회사 (신규)
- `/blog/` = K-pop 산업 + 비자 콘텐츠 (신규, B0019 SEO 자산 연결)
- `/fan-to-pro/` = Fan to Pro 트랙 landing (기존, 변경 금지)

노아 결정 필요 (결정 1).

### 2. Cohort URL 스킴

Aria 권고: **nanoid 유지 + human-readable slug alias 병행**.

- LMS 라우팅 = nanoid (예약어 회피, 보안)
- Showcase 라우팅 = human-readable slug (예: `/cohorts/fan-to-pro-1`)
- alias 테이블 신설 or `cohorts.showcase_slug` 컬럼 추가 (nullable, additive)

Sophia 가 스키마 결정.

### 3. Content 계층 (CMS vs MDX vs Notion)

Aria 권고: **초기 = MDX 파일** (프로젝트 안, git 관리). 이유:

- 학생 인터뷰 3~5개 = 파일 관리 충분
- CMS 도입 = 학습 곡선 + 비용 + 신규 의존성
- 향후 20+ 콘텐츠 축적 후 Sanity / Notion API 마이그레이션 검토

Sophia 가 대안 검토 후 확정.

### 4. Outcomes 데이터 소스

Aria 권고 (Lambda 교훈): **snapshot 방식**.

- 매기수 종료 시 `outcome_reports` 테이블에 감사된 값 박제
- Showcase 페이지 = snapshot 만 join
- 실시간 DB query X (조작 여지 + 매일 fluctuation 노출 = 신뢰 손상)

Sophia 가 스키마 설계.

### 5. Multi-track shell 통일

Aria 권고: `app/[locale]/(marketing)/layout.tsx` 통합 + 트랙 폴더 sibling.

- 공통 shell (nav / footer / CTA / hero 지표) = layout
- 트랙별 색 / 사진 / 카피 = override
- Fan to Pro / 셰르파 심화 / 올인원 카드 = 공통 CurriculumTracksCards 컴포넌트

Sophia 가 폴더 구조 확정.

### 6. Waitlist form 위치

Aria 권고: **`/waitlist` 별도 페이지 신설**.

- 신청 폼 `/fan-to-pro#apply` (기존) 은 그대로 유지
- `/waitlist` = 다음 기수 미확정 시점의 lead 축적 폼
- DB: `applicants.status = 'next_cohort_interest'` 재사용 (B0039)

---

## Luna (UX) 넘길 컴포넌트 카탈로그 (10)

Sophia PD 완료 후 Luna dispatch. 각 컴포넌트 = props + 사용처 + 다크 톤 유지 고려 (Vercel/Linear 벤치, 사람 얼굴 비중 확대).

### 1. HeroUmbrellaStats
- **목적**: 우산 브랜드 지표 4개 (기수 / 수료 / 국가 / 대표 성과)
- **사용**: `/` 우산 랜딩 above-the-fold
- **props**: `{ cohortCount, graduateCount, countryCount, headlineStat }`
- **다크 톤 주의**: 숫자 + 사람 얼굴 배경 (프로덕션 씬)

### 2. CohortsShowcaseGrid
- **목적**: 기수별 카드 archive
- **사용**: `/cohorts/`
- **props**: `{ cohorts: Cohort[] }` (Cohort = { slug, name, period, instructorCount, graduateCount, hero_stat, thumbnail })
- **다크 톤 주의**: 카드 배경 = 톤다운 warm accent 1가지 허용 검토 (그라데이션 X, 단색만)

### 3. StudentStoryCard + StoryDetailPage
- **목적**: 학생 인터뷰 카드 grid + 상세 페이지
- **사용**: `/stories/` (grid) + `/stories/[slug]` (상세)
- **props**: `{ name, anonymous, nationality, cohort, visa_journey, current_role, quote }`
- **다크 톤 주의**: 얼굴 사진 명도 대비 확보

### 4. FacultyProfileGrid
- **목적**: 강사진 credential + K-pop 산업 실적
- **사용**: `/faculty/`
- **props**: `{ faculty: Instructor[] }` (Instructor = { name, company, projects, session_count })
- **다크 톤 주의**: 회사 로고 (Union Pictures 등) mono/white 버전 필요

### 5. PartnerLogoWall
- **목적**: 3사 (Union Pictures / DEEPI / Dropdown) + 향후 채용 파트너 확장
- **사용**: `/` 우산 랜딩 + `/partners/`
- **props**: `{ partners: Partner[], layout: 'wall' | 'inline' }`
- **다크 톤 주의**: 로고 원본 어두운 배경 미대응 → white/mono 버전 확보 필수. 라이센스 승인 명시.

### 6. OutcomesReport
- **목적**: 취업률 / 실공연 참여율 / 만족도 + 분모 정의 병기
- **사용**: `/outcomes/`
- **props**: `{ snapshot: OutcomeSnapshot }` (OutcomeSnapshot = { period, raw_fraction, denominator_definition, audit_date, in_field_only })
- **다크 톤 주의**: 통계 UI = 그라데이션 X → 단색 bar + 색 대비. Raw fraction 크게 (숫자 아니라 "8/10" 형태).

### 7. CurriculumTracksCards
- **목적**: 트랙 3개 (Fan to Pro / 셰르파 심화 / 올인원) 카탈로그
- **사용**: `/` 우산 랜딩 + `/tracks/`
- **props**: `{ tracks: Track[] }` (Track = { slug, name, target, duration, curriculum_summary, next_cohort_cta, thumbnail })

### 8. AlumniNetworkTeaser
- **목적**: Slack / Discord / 카톡 미리보기 + 가입 CTA
- **사용**: `/` 우산 랜딩 + `/faculty/` + `/cohorts/[slug]`
- **props**: `{ platform, member_count, country_count, invite_cta }`

### 9. BlogInsightsGrid
- **목적**: K-pop 산업 + 비자 (E-7-1 / K-CORE / F-시리즈) 콘텐츠 카드 grid
- **사용**: `/blog/`
- **props**: `{ posts: BlogPost[] }` (B0019 SEO 자산 연결)

### 10. WaitlistApplyCTA
- **목적**: 다음 기수 신청 대기 / 알림 등록
- **사용**: `/waitlist` + 마감 후 `/fan-to-pro/*` 하단
- **props**: `{ next_cohort_date?, form_action }`
- **주의**: 카운트다운 = 실제 마감일 확정 후만. Force-dynamic 유지 (§7 SSG 룰). 가짜 카운트다운 금지 (B0039 재발 방지).

---

## 노아 결정 필요 (7)

각 결정 = Aria 권고 + trade-off. 승인 시 → Sophia PD dispatch.

### 결정 1: 우산 도메인 구조

- Option A: `growthcareer.xyz/` 우산 랜딩 신설 + `/fan-to-pro/` 트랙 sub-path 유지 (**Aria 권고**)
- Option B: `growthcareer.xyz/` 는 여전히 Fan to Pro 랜딩 리다이렉트 유지 + `/showcase/` 별도 서브 shell

**Aria 권고 A** — 우산 브랜드 노출 강화 + SEO 축 강화 + 트랙 확장 시 자연스러운 IA.

### 결정 2: Alumni 커뮤니티 최종 플랫폼

- Option A: **Slack** (Le Wagon 벤치, lifetime asset)
- Option B: Discord (K-pop 팬 익숙)
- Option C: 카톡 오픈채팅 유지
- Option D: Slack + 카톡 병행 (**Aria 권고**)

**Aria 권고 D** — Slack = alumni 정식, 카톡 = 재학 중. 이관 시점 = 1기 종강 (7/19) 직후.

### 결정 3: Outcomes 분모 / 기간 / in-field 정의

**분모**:
- Option A: job-seeking grads only
- Option B: all grads (**Aria 권고, CIRR 표준**)

**기간**:
- Option A: 3개월
- Option B: 6개월 (CIRR 표준)
- Option C: 90 / 180 / 360일 3 지표 병기 (**Aria 권고**)

**in-field 정의**:
- Aria 권고: K-pop 산업 관련 직무 (프로덕션 / A&R / 마케팅 / 무대 / 영상) 로 한정 + 실공연 참여도 별도 지표

### 결정 4: 사람 얼굴 비중 확대 = 수료생 인터뷰 촬영 시점

- Option A: 종강 (7/19) 직후 = 감정 fresh (**Aria 권고**)
- Option B: 수료식 (7/25) 당일 = 오프라인 모임 활용
- Option C: 8월 = 취업 결과 반영 후

**Aria 권고 A** — 감정 fresh + Cohort 1 landing 카드 조기 채움. 취업 결과는 3개월 후 후속 인터뷰 추가.

### 결정 5: Waitlist form 오픈 시점

- Option A: 즉시 (1기 마감 후 = 이미 활성) — `/waitlist` 페이지만 신설
- Option B: 2기 일정 확정 후 (**Aria 권고 아님**)
- Option C: **1기 종강 (7/19) 직후 오픈** (**Aria 권고**)

**Aria 권고 C** — 1기 종강 = "실증 사례 확보" 시점. Waitlist 카피에 "1기 pilot completed" 노출 가능. 2기 일정 미확정 상태라도 lead 축적 시작.

### 결정 6: 다국어 콘텐츠 축

- Option A: KO / EN 이중 (기존 정책 유지) — 모든 신규 페이지
- Option B: KO 우선 + EN 최소 (약관 / Outcomes / Student Stories 만) (**Aria 권고**)

**Aria 권고 B** — Content 계층 부담 절감. Le Wagon 벤치 = "비자 · 문화 서사 자체를 콘텐츠" 로 = 국가 서사 (E-7-1 / K-CORE / F-시리즈) EN 우선. 일반 마케팅 카피는 KO 우선.

### 결정 7: 채용 파트너 개척 시점

- Option A: 즉시 착수 (Aria 권고 아님 — B0072 스키마 준비 전)
- Option B: **B0072 completions 후 (8~9월)** (**Aria 권고**)
- Option C: 3기 이후 (10월+)

**Aria 권고 B** — B0072 스키마 (companies_partners / job_postings) 완료 후 파트너 인바운드 gateway 오픈. 초기 = 노아 수동 관계 개척, 사이트는 gateway 역할.

---

## Sophia (PD) 넘길 정보 구조 요구 (5)

Sophia dispatch 시 첫 응답으로 받을 5 결정:

1. `/showcase` 경로 신설 (Aria 권고 = 우산 랜딩 = `/`, 트랙 = sub-path)
2. Cohort URL 스킴 (Aria 권고 = nanoid 유지 + showcase_slug 컬럼 additive)
3. Content 계층 (Aria 권고 = 초기 MDX, 20+ 콘텐츠 후 CMS 검토)
4. Outcomes 데이터 소스 (Aria 권고 = snapshot 방식, `outcome_reports` 신규 테이블)
5. Multi-track shell 통일 (Aria 권고 = `(marketing)` layout 통합)

Sophia PD 완료 후 산출물:

- 신규 폴더 구조 spec (`app/[locale]/(marketing)/*`)
- `outcome_reports` 테이블 마이그레이션 spec
- `cohorts.showcase_slug` 컬럼 추가 마이그레이션 spec
- 콘텐츠 파일 layout (`content/stories/*.mdx`, `content/blog/*.mdx`)
- API 경계 (server component vs client component 분기)

---

## 백로그 파생 (B0084 ~ B0089)

Sophia PD 완료 후 확정, 이하 초안:

- **B0084** · Outcomes 페이지 신설 (`/outcomes/` + `/outcomes/methodology`) — snapshot 방식, 분모 정의 병기. 1기 종강 후 30일 안 발표.
- **B0085** · Cohorts Showcase (`/cohorts/` + `/cohorts/[slug]`) — 1기 카드 1개 시작. `cohorts.showcase_slug` 컬럼 추가.
- **B0086** · Student Stories 페이지 (`/stories/` + `/stories/[slug]`) — 1기 수료자 3~5명 인터뷰 발주 + MDX 콘텐츠.
- **B0087** · Partner Logo Wall + Faculty (`/partners/` + `/faculty/`) — Union Pictures / DEEPI / Dropdown 3사 로고 mono 확보 + 강사 프로필 (기존 `instructors` 재사용).
- **B0088** · Alumni 커뮤니티 승격 (Slack 워크스페이스 신설 + 카톡 병행) — 종강 (7/19) 직후 이관.
- **B0089** · Waitlist form (`/waitlist`) — DB `next_cohort_interest` 재사용. 종강 직후 오픈.

각 백로그 = Sophia PD spec 완료 후 status raw → specced → approved 승격.

---

## Spec 인터페이스 정의 (Sophia PD dispatch 대비)

Sophia 가 spec 작성 시 참고할 인터페이스 초안:

### Data model additions

```
-- 1. cohorts 확장 (additive)
ALTER TABLE cohorts
  ADD COLUMN showcase_slug TEXT UNIQUE,  -- human-readable, nullable
  ADD COLUMN hero_stat TEXT,             -- "실공연 참여 8/10" 같은 대표 지표
  ADD COLUMN thumbnail_path TEXT;        -- Storage bucket

-- 2. outcome_reports 신규 (감사된 snapshot)
CREATE TABLE outcome_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id),
  period_label TEXT NOT NULL,            -- "90-day" / "180-day" / "360-day"
  raw_numerator INT NOT NULL,
  raw_denominator INT NOT NULL,
  denominator_definition TEXT NOT NULL,  -- CIRR-style 정의 문장
  in_field_definition TEXT NOT NULL,
  audit_date DATE NOT NULL,
  audited_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. student_stories 신규 (MDX 대신 DB 채택 시)
-- Aria 권고: 초기는 MDX. 이 테이블은 20+ 콘텐츠 축적 후.

-- 4. partners 신규 (라이센스 관리)
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_path TEXT NOT NULL,               -- Storage bucket, mono/white 버전
  license_granted BOOLEAN DEFAULT FALSE,
  license_document_path TEXT,
  category TEXT NOT NULL,                -- 'production' / 'recruitment' / 'operator'
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Route additions

- `app/[locale]/(marketing)/page.tsx` — 우산 랜딩 (기존 `/` = Fan to Pro 리다이렉트 폐지 검토)
- `app/[locale]/(marketing)/cohorts/page.tsx` — 기수 아카이브
- `app/[locale]/(marketing)/cohorts/[slug]/page.tsx` — 기수 상세
- `app/[locale]/(marketing)/stories/page.tsx` — 학생 인터뷰 grid
- `app/[locale]/(marketing)/stories/[slug]/page.tsx` — 인터뷰 상세
- `app/[locale]/(marketing)/outcomes/page.tsx` — 통계
- `app/[locale]/(marketing)/outcomes/methodology/page.tsx` — 분모 정의
- `app/[locale]/(marketing)/tracks/page.tsx` — 트랙 카탈로그
- `app/[locale]/(marketing)/faculty/page.tsx` — 강사진
- `app/[locale]/(marketing)/partners/page.tsx` — 파트너 회사
- `app/[locale]/(marketing)/blog/page.tsx` — 콘텐츠
- `app/[locale]/(marketing)/waitlist/page.tsx` — Waitlist form

### Rendering strategy

- 우산 랜딩 / cohorts / stories / faculty / partners / blog = ISR (revalidate 3600s) — Content 변경 빈도 낮음
- outcomes = SSG + snapshot 기반 (실시간 X)
- waitlist = `force-dynamic` (마감일 정보 반영, B0039 SSG 사고 재발 방지)

### Content directory

- `content/stories/*.mdx` — 학생 인터뷰
- `content/blog/*.mdx` — 콘텐츠 (B0019 SEO 자산)
- `content/faculty/*.mdx` — 강사 상세 (옵션, DB `instructors` 재사용 우선)

---

## 트레이드오프

**신뢰 우선 (Aria 권고) vs 조기 노출**:

- Outcomes 페이지 = 1기 종강 후 30일 대기 (감사 시간 확보) vs 즉시 노출
- Aria 권고 = **30일 대기**. 감사 없는 발표 = Lambda 사고 재발 위험.

**Slack + 카톡 병행 (Aria 권고) vs 단일 플랫폼**:

- 이중 관리 부담 vs 단일 플랫폼 진입 장벽
- Aria 권고 = **병행**. 종강 시점 = 자연스러운 이관 기회.

**MDX (Aria 권고) vs CMS**:

- 초기 콘텐츠 3~5개 = MDX 충분
- 20+ 축적 후 마이그레이션 = 자연스러운 전환
- 조기 CMS 도입 = 학습 곡선 + 비용

**우산 랜딩 신설 (Aria 권고) vs 기존 리다이렉트 유지**:

- 신설 = 우산 브랜드 강화 + SEO 축 확장
- 기존 유지 = 트래픽 흐름 안정 + 낮은 변경 risk
- Aria 권고 = **신설**. 리다이렉트 유지 시 우산 브랜드 자산화 X.

---

## 결과 확인 방법

- Outcomes 페이지 도달 → 신청 conversion rate 트래킹 (GA4 커스텀 이벤트)
- 파트너 회사 신규 등록 월별 리포트 (`partners.created_at` group by month)
- Alumni Slack DAU (Slack API) + 카톡 오픈채팅 인원 (수동)
- Waitlist → PAID conversion (`applicants.status` transition 트래킹)
- 다음 기수 신청 폼 진입 UTM 별 breakdown

---

## Next

1. 노아 결정 7건 회신
2. 결정 승인 시 → Sophia PD dispatch (spec 인터페이스 정의 기반)
3. Sophia PD 완료 → Luna UX dispatch (컴포넌트 카탈로그 10종 기반)
4. Luna 완료 → B0084 ~ B0089 백로그 확정 + Iris/Luna 구현 착수
5. 1기 종강 (7/19) 전: 학생 인터뷰 발주 준비 + Slack 워크스페이스 신설
6. 1기 종강 직후: Outcomes snapshot 감사 시작 (분모 정의 확정 필요)
