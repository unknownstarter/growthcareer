# 04 Marketing — 채널 / 캠페인 / 콘텐츠 시스템

> 1기 모집을 위한 마케팅 채널 + 콘텐츠 + 파트너십.

## 핵심 메시지

> "한 달. 그리고 무대." — K-pop 공연 현장 실무를 4주 안에. 8회 강의 + 수료증 + 멘토 + 실제 공연 참여.

**타겟**:
- 한국 거주 외국인 유학생 (D-2 / D-4 / D-10 / E / F 시리즈)
- K-pop / entertainment 진로 관심
- 대학생 / 졸업생 / 직장 전환 시도자

## Cowork 파트너십

- **DEEPI** (유니온 픽처스 자회사) — 강사 섭외 + 운영 보조
- **유니온 픽처스** — 공연 프로젝트 참여 확인서 발급 + 실제 공연 동행
- **트래킹 시스템 X** — 자동 트래킹 (referral_code / UTM) 도입 안 함 (B0001 dropped). Cowork 측이 자동 트래킹 요구하지 않음.
- **마케팅 수수료 12%** — Cowork 에 결제 인원당 수강료 12% 정산. 1기 = 11명 × 880,000 × 12% = 1,161,600원. 자세한 산정 기준 (VAT 포함/제외, 환불 시 차감, 정산 시점) 은 약정 따라 — `06-finance-tax.md` 참조.
- 핵심 메시지: "우수 수료생 → 실제 공연 프로젝트 참가 + 수당 지급" (유니온픽처스 참여확인서 연계)

리서치: `docs/research/cowork-partnership-tracking.md`

## 채널 (1기 운영)

### 1. 인스타그램 (Cowork 측 카드뉴스)

- B0009: Cowork 측 카드뉴스 4장 + 캡션 협업
- B0017: 8장 인스타 카드뉴스 v8 (자체)
- carousel v3: "객석에서 백스테이지로 / From Seat to Stage" (B0?)
- 핵심: 우수 수료생 → 공연 참가 + 수당 강조 (유니온픽처스 참여확인서)
- 마감(6/21) 전 게시 완료

콘텐츠: `tools/insta-cards*.html` + SVG / PNG 생성 파이프라인

### 2. Reddit / FB 그룹 (영문)

- 영문 게시글 짧은 영국식 톤 (Echo 리서치)
- 외국 유학생 커뮤니티: 알럽코 / @student.in.korea / PERPIKA / 한양대 / HUFS / 연세 KLI / VSAK 등 40+
- 직접 침투 (자동화 안 함)

### 3. Craigslist Seoul

- 한/영 게시글 1500자 안 축약
- 마감 전 마지막 catch-up 채널

### 4. 카카오톡 오픈채팅 / 채널

- 사이트 우측 하단 카카오 채널 버튼 (B0008)
- 채널: `@nxhDGX` (1:1 상담)
- 1기 카톡 오픈채팅: `https://open.kakao.com/o/gCuOABAi` (비번 fan06pro) — paid 학생 한정

### 5. 친구 추천 (referralInvite)

- 약관 §15 박제 (5만원 비과세 한도)
- paid 학생에게만 referralInvite 메시지 발송
- 매칭: 친구가 결제 안내 답장으로 추천인 이름 기재 → 운영자 수동 확인 → 보상 처리

### 6. 직접 영업 (강사 채널)

- 강사 8명에게 본인 SNS / 학생 / 지인 채널 통해 공유 요청
- 강사 계약서에 명시 안 함 — 자율

## 콘텐츠 시스템

### Hero / Landing 카피

- "한 달. 그리고 무대." 메인 카피
- 외국인 유학생 전용 시그널 3면 강화 (Hero / ApplyForm / Meta)
- 비자 칩 (D-2 / D-4 / D-10 / E-시리즈 / F-시리즈)
- 가격 anchor: 880,000원 (정가) → 할인가 (현재 동일)

### 약관 + 개인정보처리방침

- `/privacy` `/terms` 페이지 (B0?)
- 운영 주체 명시: Dropdown (사업자번호 154-28-02110)
- 환불 정책 (학원법 + 공정위 + 전자상거래법)
- §15 추천 보상 정책 (5만원 비과세 한도)

### 인스타 카드뉴스 (자체 + Cowork)

- 자체 v8 (8장) — 가치 제안 / 강사 / 수료 혜택 / 신청 안내
- Cowork v3 (carousel) — "객석에서 백스테이지로"

### 코워크 광고 배너

- `tools/kowork-banner-pc.html` + v2 4장
- 캡처 → 임베드 → 검증 파이프라인 (`tools/preview.mjs`)

### 강사 카드 / 사진

- 자체 촬영 / 본인 제공 사진
- NDA 차원 본문엔 직무로만 표기 (음악 디렉터 / Music Business / Visual Director)
- 카드는 실명 + 사진 노출 (강사 동의)

### 원페이저 PDF (B0032 cohort kickoff)

- `tools/onepager-cohort-1.html` (3페이지 A4, 토스 톤 라이트)
- 커리큘럼 4 phase + 8회 일정 + 멘토 3인 + 운영 정보 + 마무리
- PDF 생성: `tools/pdf-onepager.mjs` (Playwright)
- 마감 후 paid 11명에게 cohortKickoff 메시지에 PDF 링크 첨부 (구글 드라이브)

## SEO / GEO (B0019)

- JSON-LD 5종 (Organization / Course / EducationEvent / WebSite / LocalBusiness)
- OG locale ko_KR / en_US 분기
- llms.txt (AI 크롤러 friendly)
- Google Search Console + sitemap.xml (노아 manual)
- Naver Search Advisor (한국 시장)

## GA4 분석

- `NEXT_PUBLIC_GA_ID = G-6N0R68CH0D`
- 섹션 impression 추적 (B0016) — `useSectionImpression` hook + `section_view` event
- funnel: 진입 → 섹션별 view → apply form scroll → step1 submit → step2 submit → ok

## 1기 운영 인사이트

### 잘 통한 것
- **외국인 유학생 타겟 명확화** — 모집 메시지 + 비자 칩 + 영문 디폴트
- **반자동 결제 흐름** — 운영자 1명이 11명 처리 가능 (피로 수용 가능 수준)
- **친구 추천** — 마감 직전 catch-up 효과
- **Cowork 인스타 카드뉴스** — 도달 + 신뢰 시그널

### 안 통한 것 / 어려웠던 것
- **자동화 X 채널** — 카톡 알림톡 미도입 (8원/건). 다음 기수 검토.
- **Sage 검토 누락 사고** (6/9 viewer role) — Sage critical 2건 발견 후 hotfix. 룰 박제 후 재발 방지.
- **Basic Auth logout 트릭** — 본질적으로 깔끔하지 않음. realm rotation 으로 우회 중 (B0029 잔여).
- **운영자 단일** — 노아 1명 운영. 12시간 시차 응대 어려움.

## 다음 기수 마케팅 변경 후보

- 1기 수료생 testimonials → 신뢰 시그널 강화
- 1기 공연 참여 후기 + 사진 (가능 시)
- 동문 추천 보상 (B0035 follow-up)
- 알림 리스트 (B0039 next_cohort_interest) 활용 — 다음 기수 모집 시작 즉시 일괄 안내
- 알림톡 카카오 비즈니스 도입 검토 (8원/건)
- Instagram 자체 계정 운영 (현재 Cowork 측 의존)
- YouTube short / Reels (수업 sneak peek 영상)
