# 07 Timeline — 시계열 이벤트 + 인사이트 + 해결

> 1기 (2026-04 ~ 2026-07) 의 주요 이벤트 + 결정 + 사고 + 인사이트 + 해결을 시계열로.
> 최신순 (상단이 최근). 같은 날 안에서는 시간순.
>
> **추가 룰**: 사건 발생 시점에 추가. 사건 / 결정 / 인사이트 / 해결 4축으로.

---

## 2026-07 (강의 진행 + 종강)

_강의 진행하면서 추가_

---

## 2026-06-27 — 첫 강의

_진행 후 추가_

---

## 2026-06-26 (강의 D-1)

_진행 후 추가_

---

## 2026-06-22 — 모집 마감 + 다음 기수 알림 + Playbook 박제

### 00:00 — 1기 모집 마감 (자정 KST)

- **사건**: 2026-06-22 00:00 KST 시점 1기 모집 공식 마감. 최종 paid 11명.
- **결정**: 다음 기수 모집 시 동일 신청 폼 재사용 + 알림 리스트 형태로 운영.
- **인사이트**: 마감 자동 전환 시스템 부재 — 자정 지나도 사이트 자동 변경 안 됨. SSG 빌드 캐시 사고 위험.
- **해결**: B0039 작업 — `isEnrollmentClosed()` + `cutoffAt` ISO datetime + Hero / Pricing / StickyCTA / ApplyForm 자동 전환 + `export const dynamic = "force-dynamic"` + DB status enum 확장 (next_cohort_interest).
- **사고**: `/fan-to-pro` 페이지 SSG 였음. 빌드 시점 (자정 전) isEnrollmentClosed=false 박혀 자정 지나도 정적 HTML 그대로 노출 → hotfix `dynamic = "force-dynamic"`.

### 새벽 — Playbook 작성 (B0040)

- **사건**: 사용자 요청 — "지금까지 프로그램을 기획하고 만들고 마케팅하고 운영하던 모든 프로세스를 docs/playbook/ 폴더로 정리. 시계열 이슈 + 인사이트 + 자동화/기능 후보 추출".
- **결정**: 10 파일 구조 (README + 01 overview + 02-build-tracks/{website,admin,lms} + 03 recruitment + 04 marketing + 05 class-ops + 06 finance + 07 timeline + 08 automation + 09 features + 10 checklist).
- **인사이트**: 1기 운영 동안 lessons / decisions / specs / research / backlog 가 흩어져 있어 다음 기수 운영자가 보기 어려움.
- **해결**: 단일 진입점 README → 카테고리별 분리 → timeline 으로 시계열 회고.

---

## 2026-06-21 (모집 마감 D-day)

### 새벽 (01:11 ~ 01:35) — LMS 자체 구축 결정 + Wave 0

- **사건**: 1기 한정으로 외부 LMS (Teachable / Thinkific / Notion 등) 도입 검토하지 않고 LMS 자체 구축 결정.
- **결정**: Clean Architecture (Layered Pragmatic) + Strangler Fig (ADR 0005). 라이트 토스 톤 + shadcn/ui (ADR 0006).
- **인사이트**: 외부 LMS = 운영 데이터 / UI / i18n 통합 어려움. 우리는 마케팅 + 어드민과 같은 codebase 에서 가는 게 장기적 자산.
- **해결**: 12 commit 으로 Wave 0 완료 (1.5시간) — shadcn primitives + 라이트 토큰 + 6 entity + `/admin/cohorts` 페이지 + 출결 UI.

### 17:30 ~ 19:05 — Wave 1 + ADR 0007 + ADR 0008 (URL 재배치)

- **사건**: Wave 1 시작 후 URL 구조 (`/lms/*`) 가 부적절하다는 사용자 지적 — "lms 라는 식으로 만드냐!"
- **결정**: ADR 0008 — Program 모듈화. `/[locale]/fan-to-pro/(lms)/*` 로 이전. cohort path segment 이름 금지 (8자 nanoid slug). 회원가입 페이지 없음.
- **인사이트**: 진행중 작업도 URL / 디렉터리 구조가 잘못됐다고 판단되면 재배치 필요. 비용은 크지만 6개월 뒤보다 지금이 싸다.
- **해결**: ADR 0007 supersede → 0008. middleware 재설계 + 기존 app/lms 폴더 삭제 + 신규 경로 이전. RLS 정책 + 3계층 권한 (super_admin / program admin / cohort member).

### 19:33 ~ 22:43 — Wave 1 hotfix 다발 + cohort kickoff

- **사건**: cohort 페이지 500 에러 + LocaleSwitcher LMS 영역 노출 + Wave 2 entity 부재로 자료/공지/컨설팅 페이지 깨짐 + paid 9 → 11 카운트 오차.
- **결정**: 신청자 / cohort 연결 (applicants × cohort 인재풀 모델 정착). 자료/공지/컨설팅 graceful empty state. Wave 2 entity 마이그레이션 defer.
- **인사이트**: 사용자가 "지원자 정보는 기수별로 관리되어야 인재풀이 된다" 비즈니스 로직 명시 — 어시스턴트가 놓친 부분.
- **해결**: B0032 LMS Wave 1 hotfix #1, #2, #3. 강의장 위치 강남 → 마포구 정정 (paymentGuide_noVisa 4종). cohort_expenses + tax_filings 마이그레이션. /fan-to-pro/admin/finance 통합 대시보드. cohort 1 kickoff 메시지 + 원페이저 PDF (3페이지 A4, 토스 톤) + Paged.js v2 박제.

### 22:43 ~ 23:24 — career documents (B0037)

- **사건**: 사용자 요청 — "LMS 가자. 이력서랑 자기소개서랑 포트폴리오 관리".
- **결정**: Wave A+ scope (외부 링크 + 파일 업로드 둘 다). Admin + Student surface 동시 구현. 포트폴리오 단일 (작품 collection X).
- **인사이트**: 학생 surface (`/[cohortSlug]/student/*`) 의 첫 페이지 = career documents. 노아가 student 계정으로 dogfood 하면서 나머지 기능 점진.
- **해결**: Iris 풀 위임 → Sage 보안 검토 pass (H-2 SSRF fix 적용 / H-1 storage path randomness 백로그). 마이그레이션 적용 + commit + push.

---

## 2026-06-19 — 친구 추천 + F-시리즈 비자

- **사건**: paid 학생 catch-up 채널로 친구 추천 / 마케팅 메시지 추가 필요.
- **결정**: referralInvite 메시지 종류 추가 (paid 전용). 약관 §15 추천 보상 정책 박제 (1인당 최대 5명, 소득세법 §84 4호 비과세 한도 5만원). 매칭 시점 결제 완료 후 (카톡 채널 X — 인증 어려움). 매칭 방법 = 결제 안내 답장.
- **인사이트**: 카톡 채널을 매칭 채널로 쓰면 본인 인증 어려움. 결제 안내 메일 답장으로 추천인 이름 받는 게 단순.
- **해결**: 친구 추천 보상 카드 추가. 비자 칩 F-시리즈 추가 (히어로 + 신청 자격 카드, KO+EN 동기화).

---

## 2026-06-18 — 모바일 PaymentNotice + Success block 정리

- **사건**: 모바일 신청자가 PaymentNotice 빡빡함 호소 + SuccessBlock Application ID 노출 (불필요).
- **결정**: PaymentNotice 핀포인트 spacing 보정 + SuccessBlock Application ID 노출 제거.
- **인사이트**: 모바일 fluid typography 시스템이 헤드라인 (display-*) 만 적용. 카드/박스 (PaymentNotice 같은) 는 Tailwind 표준 breakpoint 라 320~640px step change 발생.
- **해결**: 핀포인트 fix + B0030 박제 (deferred — 1기 종료 후 전체 시스템 정비).

---

## 2026-06-15 — 리마인드 톤 + 정렬 우선순위

- **사건**: 기존 리마인드 메시지 톤이 압박적이었음.
- **결정**: "혹시 입금을 잊으신 건 아닌지 리마인드 차원" 톤으로 전환. 어드민 정렬 우선순위 status 기준 (cancelled 최하단).
- **인사이트**: 압박 톤 ≠ 전환율. 부드러운 톤이 입금 회수 더 잘 됨 (개인 경험).
- **해결**: reminder 6종 + 어드민 정렬 alignment.

---

## 2026-06-14 ~ 15 — paymentConfirmed 카피 흐름 정정

- **사건**: paymentConfirmed 메시지에 강의장 정보 박혀 있어 다음 안내 메시지 (cohortKickoff) 와 중복.
- **결정**: paymentConfirmed 에서 강의장 정보 제거 → 다음 안내 메시지로 일원화. SMS + email 모두 통일.
- **인사이트**: 메시지 종류별 책임 분리 — paymentConfirmed = "입금 확인 + 다음 안내 일정 예고", cohortKickoff = "구체 강의장 + 일정 + 카톡 + 준비물".
- **해결**: paymentConfirmed 4종 정정 + 다음 안내 일정 (6/21 마감일 + 강의 시작 6/27) 추가.

---

## 2026-06-13 — 어드민 모바일 반응형 Wave 1-4

- **사건**: 노아가 모바일에서 어드민 운영 (외출 중 응대) 시 불편.
- **결정**: 4 Wave 로 분할 진행 — applicants → instructors/finance → 모달/드로어/broadcast → 잔여 다이얼로그.
- **인사이트**: 운영자 본인이 일상 운영하면서 발견한 빈틈은 즉시 fix 가치 큼.
- **해결**: 30분 안에 4 Wave 일괄 push.

---

## 2026-06-12 — nationality 기반 country code 자동 prefix

- **사건**: 인도 신청자 phone 입력 시 "+1" (US) 자동 prefix 되는 사고. 누락 국가 18개 추가 필요.
- **결정**: nationality field 값 기반 country code 매핑 (40개국). 폼 입력 + 어드민 표시 양쪽 정규화.
- **인사이트**: 외국인 유학생 대상 폼이라 영문 nationality 입력 다양. 매핑 테이블 정교화 필요.
- **해결**: phone 자동 prefix + 표시 정규화. 한글 IME 깨짐 사고 (modal useEffect deps) 도 같이 fix.

---

## 2026-06-11 — 어드민 polling 패턴 + 국적 컬럼

- **사건**: 어드민 신청자 명단 30초 polling 도입 후 스피너 깜빡임 거슬림.
- **결정**: polling 결과를 "변경 알림 chip" 으로 표시 (스피너 X). 사용자가 chip 클릭 시 refresh.
- **인사이트**: silent polling + 변경 알림 분리 = UX 깔끔.
- **해결**: chip 패턴 + 신청자 테이블에 nationality 컬럼 추가 (viewer 도 노출).

---

## 2026-06-10 — 인스타 carousel v3

- **사건**: Cowork 측 카드뉴스 외 자체 마케팅 콘텐츠 필요.
- **결정**: "객석에서 백스테이지로 / From Seat to Stage" 시리즈 — 한/영 양립.
- **인사이트**: 모집 마지막 2주 D-7 ~ D-2 가속화. 채널 분산.
- **해결**: SVG / PNG 생성 파이프라인 + 인스타 배포.

---

## 2026-06-09 — viewer role 사고 + 모모 패턴 도입 (lessons 3건)

### viewer role Sage critical 2건 사고

- **사건**: viewer role 신설 commit 후 1분 만에 push → Sage 검토 결과 받기 전 deploy. critical 2건 발견 후 hotfix.
- **결정**: CLAUDE.md §7.4 보강 — "신규 권한 / 인증 / PII 표면 변경 시 Sage 검토 결과 받기 전 push 금지".
- **인사이트**: Sage 를 백그라운드로 띄우고 동시에 push 진행 = 사고. foreground + 결과 확인 필수.
- **해결**: lessons 박제 (`2026-06-09-sage-review-skipped.md`). 메모리 + CLAUDE.md 룰 박제.

### Basic Auth logout 트릭 한계

- **사건**: viewer / admin role 전환 시 logout 깔끔하지 않음. 브라우저 자격 캐시.
- **결정**: realm rotation 트릭 + 12시간 timeout. B0029 (NextAuth 전환) 백로그.
- **인사이트**: Basic Auth 는 본질적으로 logout / session 전환 깔끔하지 않음. 운영자 2명 이상 시 한계 더 명확.
- **해결**: lessons 박제 (`2026-06-09-basic-auth-logout-limitations.md`) + 사용자 설명 룰.

### Vercel CLI 과다 호출

- **사건**: 매 commit 마다 `vercel --prod` 직접 호출 → 일일 quota 빨리 소모.
- **결정**: `git push` 가 default. `vercel --prod` 는 GitHub auto deploy 명백히 실패한 경우만.
- **인사이트**: CI/CD 신뢰. 직접 호출은 사고 대응 시만.
- **해결**: lessons 박제 (`2026-06-09-vercel-cli-overuse.md`) + CLAUDE.md §7 룰.

### "모모 프로젝트 패턴" 학습

- **사건**: 동시에 3개 lessons 박제 + 안전망 3종 도입.
- **결정**: lessons → CLAUDE.md 룰 / 에이전트 prompt / settings.json hook / 새 skill 중 하나로 역반영 의무 (`docs/lessons/README.md`).
- **인사이트**: 사고 박제만으로는 부족. 다음 사고 방지 시스템에 반영해야 함.
- **해결**: lessons README 인덱스 + 역반영 상태 체크박스.

---

## 2026-06-08 — apply hotfix + 세션 핸드오프 워크플로우

- **사건**: 신청 폼 silent fail / university optional / refund summary 컴팩트화 필요.
- **결정**: hotfix + 동시에 세션 핸드오프 워크플로우 신설 (CLAUDE.md §7.5 박제, WORKING-SESSION.md 단일 파일).
- **인사이트**: 세션이 길어지거나 rate limit 으로 중단될 때 컨텍스트 복원 시스템 필요.
- **해결**: WORKING-SESSION.md + `docs/sessions/README.md` + CLAUDE.md §7.5.

---

## 2026-06-07 — B0018 Wave 2 + B0019 SEO

- **사건**: 운영자 페이지 확장 Phase 2 — 강사 정산 + 재무 / SEO + GEO 최적화.
- **결정**: B0018 Wave 2 (강사 정산 + 재무) + B0019 (JSON-LD 5종 + OG locale + llms.txt).
- **인사이트**: 모집 마감 D-2주 시점 = 운영자 페이지 + SEO 가속화 우선.
- **해결**: 1일에 일괄 push.

---

## 2026-06-05 — B0007 풀 사이클 (반자동 결제 + 운영자 페이지) + B0017 인스타 카드

- **사건**: 신청-입금 분리 + 반자동 입금 안내 풀 사이클 완료.
- **결정**: 자동화 인프라 (NaverCloud SENS / Resend / Vercel Cron) 도입 안 함. 모두 운영자 1-click 복사 + mailto/sms 링크.
- **인사이트**: 자동화는 운영 데이터 충분히 쌓인 후. 1기 = 사람 운영으로 검증.
- **해결**: B0007 T2~T12 commit + Mira QA + Sage 보안 검토 pass.

---

## 2026-06-04 — Cowork 미팅 + 영문 디폴트 + 백로그 시스템

- **사건**: Cowork 파트너십 미팅 (DEEPI + 유니온 픽처스). 외국인 유학생 타겟 명확화.
- **결정**: 영문 디폴트 + 헤더 first-fold 언어 토글 + B0001 코워크 트래킹 drop (12% 정산 모델 X) + 카톡 CS 버튼 + B0007~B0011 백로그 다발 박제.
- **인사이트**: Cowork 측이 12% 정산 트래킹 요구하지 않음. 단순 협력으로 진행.
- **해결**: 영문화 + 백로그 시스템 (B0001~B0030+) + ADR 0002 (backlog and spec system).

### preview wipes screenshots 사고

- **사건**: `pnpm preview` 명령이 `docs/screenshots/` 의 모든 큐레이팅 산출물 wipe.
- **결정**: `tools/preview.mjs` 패치 (서브디렉터리 보존). 큐레이팅 산출물은 반드시 서브디렉터리에.
- **인사이트**: 도구가 의도치 않게 사용자 자산 삭제하는 사고. mitigations 필요.
- **해결**: lessons 박제 (`2026-06-04-preview-wipes-screenshots.md`) + 메모리.

---

## 2026-05-30 — 강사 일정 재배정

- **사건**: 박성철 강사 day 토요일 → 일요일 변경.
- **결정**: 강사 카드 재배치 + 회차 매핑 변경.
- **인사이트**: 강사 일정은 강사 사정 따라 변경 가능 — 사이트 / 약관 모두 동기화.
- **해결**: content fix + CHANGELOG 박제.

---

## 2026-05-26 ~ 28 — 1기 일정 + Pricing 옵션 시도

- **사건**: 1기 일정 변경 — 개강 6/20 → 6/27 (변경) / 마감 6/15 → 6/14 → 6/21. Pricing 옵션 B 적용 후 revert.
- **결정**: 모집 마감 6/21(일) 자정 확정. Pricing 옵션 A 유지.
- **인사이트**: 일정 변경은 사이트 + 약관 + 강사 계약서 + 메시지 동기화 필요. UI 옵션 검토는 빠른 try/revert 가능.
- **해결**: program.ts SCHEDULE 갱신 + faq.ts 환불 약관 + 강사 계약서 갱신 + 코워크 배너 재생성 (마감일 반영).

---

## 2026-05-21 — 외국인 유학생 시그널 강화

- **사건**: 타겟 명확화 — 한국 거주 외국인 유학생.
- **결정**: Hero / ApplyForm / Meta 3면에 외국인 유학생 전용 시그널 강화. 출석률 조건 폐기. 동의 3분리.
- **인사이트**: 타겟 좁힐수록 메시지 명확. 자격 게이트 (비자 등) 를 신청 직전으로 이동 = 자격 부적합자 사전 차단.
- **해결**: content + apply form 재배치.

---

## 2026-05-20 — 결제 페이지 25:75 + 동의 분리

- **사건**: 결제 페이지 정보 밀도 부족 + 동의 항목 단일 (필수/선택 구분 X).
- **결정**: 25:75 (왼쪽 정보 / 오른쪽 폼) + 동의 3분리 (개인정보 / 운영·환불 / 마케팅).
- **인사이트**: 동의 분리 = 법적 안전 + 마케팅 동의 별도 (필수 X) = 신청자 신뢰.
- **해결**: apply form + 약관 동기화.

---

## 2026-05-19 — 한글 typography + GA4 + dev rules

- **사건**: 한글 음절 절단 발생.
- **결정**: `word-break: keep-all` 전역 적용. GA4 통합 (`@next/third-parties` + `NEXT_PUBLIC_GA_ID` env gate).
- **인사이트**: 한글은 어절 단위 줄바꿈이 자연스러움. `word-break: keep-all` 가 표준.
- **해결**: typography fix + GA4 + CHANGELOG 시작.

---

## 2026-05-18 — 초기 launch + SEO + content 정비

- **사건**: Growth Career landing 초기 launch. Fan to Pro 첫 트랙.
- **결정**: SEO 메타 (OG / Twitter / favicon / robots / sitemap / canonical). 헤로 / problem / solution / value-cards / mentor / program 카피 초안.
- **인사이트**: 1기 표현 정리 (오해 소지 → "Fan to Pro 는 1기" 박제 후 testimonials disclosure 정리).
- **해결**: 초기 commit 다발.

---

## 패턴 / 인사이트 정리

### 운영 패턴
1. **사용자 본인이 일상 운영하면서 빈틈 발견 → 즉시 fix** = 가장 가치 큰 dev 흐름 (특히 모바일 반응형 / 메시지 톤)
2. **반자동 우선 → 자동화는 데이터 충분히 쌓인 후** (B0007 모델)
3. **타겟 좁힐수록 메시지 명확** (외국인 유학생 → 비자 칩 / 영문 디폴트)
4. **운영 사고는 lessons 즉시 박제 + CLAUDE.md / 메모리 / hook 으로 역반영**

### 빌드 패턴
1. **Clean Architecture (Layered Pragmatic) + Strangler Fig** — 기존 코드 보호하며 점진 이전
2. **두 시스템 완전 분리** — 다크 마케팅+어드민 / 라이트 LMS 토스 톤. 통합 금지
3. **Wave 분할** — 큰 feature 는 Wave 1-N 으로 분할. 강의 운영하며 점진 적용
4. **Sage 검토 → push** 강제. 새 권한 / PII 표면 시 의무

### 사고 패턴
1. **Sage 검토 누락** (6/9) → 룰 박제
2. **Basic Auth 본질적 한계** (6/9) → B0029 백로그
3. **Vercel CLI 과다 호출** (6/9) → 룰 박제
4. **preview wipes screenshots** (6/4) → tool 패치
5. **SSG cache 로 마감 자동 전환 누락** (6/22) → `dynamic = "force-dynamic"` hotfix
6. **한글 IME 깨짐** (6/12) → modal useEffect deps 정리
7. **인도 신청자 +1 prefix 사고** (6/12) → nationality 매핑 추가

→ 자동화 / 기능 후보로 승격: `08-automation-candidates.md` + `09-feature-candidates.md`
