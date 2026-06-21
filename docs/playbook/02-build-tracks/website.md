# 02 Build Tracks — Marketing Website

> 외부 노출 사이트 `/[locale]/fan-to-pro` 의 빌드 / 구조 / 운영 결정 박제.

## 스택

- **Next.js 16** App Router
- **next-intl** i18n (ko / en, EN 디폴트 — 외국인 유학생 타겟)
- **Tailwind** + 자체 디자인 토큰 (다크 톤 + brand-pink #ff5b6e + brand-purple)
- **Vercel** Fluid Compute (Edge 사용 안 함)
- **Pretendard** 폰트 (한글 + 영문 동일 패밀리)
- **Supabase** (`fantopro` 프로젝트) — applicants 테이블

## URL 구조

```
/[locale]/                          → fan-to-pro 로 리다이렉트 (또는 우산 페이지)
/[locale]/fan-to-pro/               → 메인 랜딩 (single-page scroll)
/[locale]/fan-to-pro/#apply         → apply form 섹션 (anchor)
/[locale]/privacy                   → 개인정보처리방침
/[locale]/terms                     → 이용약관
/[locale]/auth/*                    → LMS 인증 (별도, /admin/* 와 다름)
/[locale]/fan-to-pro/(lms)/admin/*  → LMS 어드민 (Supabase Auth)
/[locale]/fan-to-pro/[cohortSlug]/{student,instructor}/* → cohort 단위 surface
/admin/*                            → 기존 운영자 어드민 (Basic Auth, 다크)
```

## 페이지 섹션 순서 (랜딩)

```
Hero          → 한 줄 가치 제안 + 가격 + Apply CTA
Problem       → 외국인 유학생의 K-pop 진로 진입 장벽
Solution      → 4주 압축 강의 + 현업 멘토 + 공연 체험
ValueCards    → 4 가지 가치 카드
Outcome       → 수료 후 무엇이 달라지나
Testimonials  → 사용자 후기 (1기 운영 후 갱신 예정)
Mentor        → 강사 3인 (NDA 차원 직무로만 표기)
Program       → 4 phase (Class / Certificate / Network / On Stage)
SocialProof   → 누적 공연 / 관객 / 멘토 / 만족도 수치
Guarantees    → 3가지 보장 (포트폴리오 / 네트워크 / 수료증)
Bonus         → 추가 혜택
Recruitment   → 신청 자격 + 비자
Pricing       → 가격 카드 + 결제 정보 / 미지원 항목
FAQ           → 자주 묻는 질문
ApplyForm     → 2-step 신청 폼
Footer        → 운영 주체 + 법적 정보
StickyCTA     → 하단 고정 (apply 섹션 보이면 hide)
```

## 디자인 시스템 (다크)

- 배경: `bg` (거의 검정) / `surface` (살짝 밝음)
- 텍스트: `fg` / `fg-muted` / `fg-subtle`
- 강조: `brand-pink` (#ff5b6e) / `brand-purple`
- 폰트: 한글 + 영문 동일 Pretendard. `text-display-lg` / `text-display-md` 등 fluid clamp 토큰
- 모바일: 320px ~ 768px / 데스크탑: 1024px+
- breakpoint: Tailwind 표준 (`sm:` 640px / `md:` 768px / `lg:` 1024px)

상세: `docs/design-system.md`

## 핵심 디자인 결정

| 결정 | 이유 |
|---|---|
| EN 디폴트, KO `/ko/` | 타겟 = 한국 거주 외국인 유학생 |
| 단일 페이지 (scroll-driven) | 정보 밀도 + 신뢰 시그널 한 번에 |
| 헤더 first-fold 언어 토글 | 풋터 숨김 금지 (UX 사고 방지) |
| 강사 본문은 직무로만 (음악 디렉터 / Music Business / Visual Director) | NDA 차원 (실명 비공개 — 카드 이미지만 노출, 자세한 이력 X) |
| 가격 한 곳에서만 비교 (Hero + Pricing + Sticky) | 가격 anchor 일관성. 마감 후 모두 일괄 숨김 (B0039) |
| 친구 추천 = 결제 안내 답장 형태 | 약관 §15 매칭 단순화. 자동화보다 사람 매칭이 검증 빠름 |
| 비자 칩 (D-2 / D-4 / D-10 / E-시리즈 + F-시리즈) | 한국 체류 자격 명확화. F-시리즈는 1기 운영 중 추가 |

## 마감 후 자동 전환 (B0039)

`isEnrollmentClosed()` helper (`src/programs/fan-to-pro/domain/program.ts`) + `ENROLLMENT_CAP.cutoffAt` ISO datetime 기준.

**전환되는 곳**:
- Hero: 가격 strikethrough + 할인가 + VAT note 숨김 → "1기 모집 상태 / 모집 마감"
- Pricing card: 정가 / 할인가 / VAT 모두 숨김 → "모집 마감"
- StickyCTA: 가격 + scarcity → "1기 마감 / 모집 마감"
- Apply form: 폼 위 sky 배너 + Submit CTA "다음 기수 알림 받기" + summary 4 cell 모두 closed 변형 + PaymentNotice hide + SuccessBlock closed 모드

**서버 측**:
- `submit-application.ts` 마감 후 INSERT 시 `status='next_cohort_interest'` + `cohort_id=NULL`
- DB constraint: `applicants_status_cohort_xor` (status=next_cohort_interest 이면 cohort_id NULL, 그 외 NOT NULL)

**중요 함정**: 페이지가 SSG 면 빌드 시점 값이 박힘. `export const dynamic = "force-dynamic"` 필수.

## 메시지 시스템

`src/programs/fan-to-pro/messages/templates.ts` — 단일 진실 소스.

**MessageKind** (7종):
- `paymentGuide` — 입금 안내
- `paymentConfirmed` — 입금 확인 완료
- `reminderT1` / `reminderD3` / `reminderD1` — 리마인드 (T+1일, D-3, D-1)
- `referralInvite` — 친구초대 이벤트 (paid 전용)
- `cohortKickoff` — 기수 첫 강의 안내 (paid 전용)

각 메시지: SMS (단일 채널 카톡/문자) + email (subject + body) × ko / en = 4 variation.

**비자 분기**: paymentGuide 에만 noVisa 변형 4종 (비자 없음 신청자 거절).

**nationality 기반 country code 자동 prefix**: phone 입력 시 자동 국가 코드 prepend. 40개국 매핑.

## SEO / GEO (B0019)

- JSON-LD 5종: Organization / Course / EducationEvent / WebSite / LocalBusiness
- OG locale: ko_KR / en_US 분기
- Twitter card: summary_large_image + dynamic OG image (`opengraph-image.tsx`)
- `llms.txt` 추가 (AI 크롤러 friendly)
- Google Search Console 등록 + sitemap.xml 제출 (노아 manual)
- Naver Search Advisor 등록 (한국 시장)

## 분석

- GA4: `NEXT_PUBLIC_GA_ID = G-6N0R68CH0D`
- 섹션 impression 추적: `useSectionImpression` hook (IntersectionObserver) + `section_view` event
- 첫 진입 1회 / threshold 50% / debounce 500ms / 1회 dedup

## 운영 중 사고 / 수정 (1기 중)

- **6/4** preview wipes screenshots 사고 → `tools/preview.mjs` 패치 + lessons 박제
- **6/8** apply silent fail + university optional + refund compact 보강
- **6/8** SuccessBlock 헤드라인 + auto scroll
- **6/8** 국적 필수 + 전화번호 자동 정규화
- **6/12** 한글 IME 깨짐 사고 → modal useEffect deps 정리
- **6/12** nationality 기반 country code 자동 prefix (인도 신청자 +1 오인식 사고)
- **6/14~15** paymentConfirmed 4종 강의장 정보 제거 (다음 안내 메일로 일원화)
- **6/18** mobile fluid typography 빈틈 (PaymentNotice 빡빡함) → 핀포인트 fix
- **6/19** F-시리즈 비자 추가 + 친구 추천 보상 정책 신설
- **6/21~22** B0039 마감 자동 전환 + SSG cache hotfix

상세 timeline: `07-timeline.md`

## 다음 기수 전 고려할 변경

- 가격 anchor 동적화 (현재 `PRICING.discounted` 하드코딩)
- cohort 별 일정 동적화 (현재 SCHEDULE 하드코딩)
- 다음 기수 모집 시작 시 마감 cutoff datetime 갱신 + Pricing / Hero / StickyCTA / Apply 자동 재활성화
- Testimonials 1기 후기로 갱신
- SocialProof 수치 갱신 (1기 수료 후)
- 강사 카드 / 사진 / 회차 매핑 갱신
