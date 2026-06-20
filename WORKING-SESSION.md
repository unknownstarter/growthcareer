# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
>
> - 큰 작업 끝날 때마다 업데이트
> - 세션 종료 시 완료 항목 표시 + 다음 작업 명시
> - 주 1회 또는 큰 단락마다 `docs/sessions/SESSION-YYYY-MM-DD.md` 로 아카이브 (이 파일은 덮어쓰기)
> - 운영 매뉴얼: [CLAUDE.md](./CLAUDE.md)

---

## 📅 Last updated: 2026-06-21

## 🎯 현재 상태 — 1기 모집 마감일 (D-day) + LMS 트랙 신설

- **모집 마감**: 오늘 (6/21 일) 자정
- **현재 결제**: 9명 (PAID) — 폐강 기준 8명 초과, 강의 확정 가능
- **첫 강의**: 6/27(토)
- **종강**: 7/19(일)
- **수료식**: 7/25(토)
- **운영자 페이지 배포 완료**: `/admin/{applicants, instructors, finance}` 모두 가동

### 새로 박힌 결정 (2026-06-21)

- **LMS 자체 구축 결정** — 1기부터 풀 구축, 데이터 누적 시작
- **클린 아키텍처 (Layered Pragmatic)** + Strangler Fig 점진 마이그레이션 (ADR 0005)
- **디자인 시스템 분리** — 기존 다크 (마케팅+어드민 기존) vs 라이트 LMS (토스 톤 + shadcn/ui) (ADR 0006)
- **기존 영역 변경 금지 룰** — CLAUDE.md §7.4 보강 (모집 페이지 / 어드민 3-tab / 기존 server actions)

---

## ✅ 최근 완료 (2026-06-08 ~ 06-21)

### 1기 모집 운영
- **친구 초대 이벤트 (referralInvite)** 어드민 메시지 종류 추가 (paid 전용) — 매칭: 친구 결제 후 결제 안내 메시지에 답장으로 추천인 이름
- 약관 §15 추천 보상 정책 박제 (1인당 최대 5명, 소득세법 §84 4호 비과세 한도 5만원)
- 비자 칩에 F-시리즈 추가 (히어로 + 신청 자격 카드, KO+EN 동기화)
- 어드민 신청자 정렬: status 운영 우선순위 (pending 상단 → cancelled 최하)
- 어드민 통계 chip OVERDUE / CANCELLED / REFUNDED 추가
- 어드민 모바일 반응형 Wave 1-4 (admin-nav / applicants-dashboard / instructors / finance / 모달/드로어 / 다이얼로그 전체)
- 입금 확인 메시지 + 리마인드 6종 톤 정정 (모든 메시지 마지막 "문의사항은 하단의 카카오톡 채널" 통일)
- 이메일 + SMS paymentConfirmed 강의장 정보 제거 (다음 안내 메일로 일원화)
- nationality 기반 phone country code 자동 prefix (40개국, 인도 신청자 +1 자동 인식 사고 해결)
- 어드민 신청자 테이블 nationality 컬럼 추가 (viewer 도 노출)
- 모바일 PaymentNotice spacing 보정 + SuccessBlock Application ID 노출 제거

### 마케팅 + 모집 가속 (D-7 ~ D-2)
- Craigslist Seoul 광고 (한/영 1500자 안 축약)
- 커뮤니티 침투 영문 게시글 (Reddit / FB 그룹 용 짧은 영국식 톤)
- 외국 유학생 커뮤니티 리서치 (Echo): 알럽코 / @student.in.korea / PERPIKA / 한양대 / HUFS / 연세 KLI / VSAK 등 40+ 채널
- 강사 카톡 중간 현황 공유 카피

### 시스템 + 문서
- ADR 0005 — LMS 클린 아키텍처 (Layered Pragmatic + Strangler Fig)
- ADR 0006 — LMS 디자인 시스템 (라이트 + 토스 톤 + shadcn/ui + `(lms)` route group)
- CLAUDE.md §7.4 보강 — LMS 작업 시 기존 영역 보호 룰 추가
- `docs/research/notion-daily-ralph-loop-자동화.md` — 매일 아침 자동 ralph 루프 아키텍처 검토 (1기 종료 후 도입 검토)
- B0030 박제 — 모바일 fluid typography 카드/박스 (deferred)
- B0031~B0036 박제 — LMS Wave 0~5

---

## 🔄 진행 중 / 대기 중

### 1기 모집 마감일 (오늘)

- 친구 초대 이벤트 + NOTIFIED 15명 catch-up 카톡 발송 완료
- 답장 대기 + 매칭 + 신규 결제 catch-up
- 8명 이상 결제 시 강의 확정 (현재 9명 이미 달성, 추가 결제 +α)

### LMS 트랙 (B0031~B0036)

- **B0031 Wave 0** — DB minimum + 출결 UI (Iris, 5일, 강의 시작 전 ~6/26 완료 목표) ⭐ 다음 작업
- B0032 Wave 1 — Supabase Auth + 강사/학생 로그인 + materials/announcements (Iris+Luna, 6.5일)
- B0033 Wave 2 — 과제 + 컨설팅 + 수료증 + 캘린더 (Iris+Luna, 5.5일)
- B0034 Wave 3 — 회사 단위 정산 (Iris, 4.5일)
- B0035 Wave 4 — RLS 본격 + follow-up + 영문 UX (Iris+Sage, 6일)
- B0036 Wave 5 — Realtime + 자동 정산 (deferred)

### B0018 Wave 3 (출결) — LMS B0031 에 통합됨

기존 B0018 Wave 3 = LMS 의 attendance entity 로 흡수. 별도 작업 X.

### B0018 Wave 4 (수료증 + 공연) — LMS B0033 에 통합됨

기존 수료증 작업 = LMS 의 certificates entity 로 흡수.

---

## 🛠️ 노아 manual action 잔여

### 즉시 (오늘 마감일)

- 친구 초대 이벤트 + catch-up 카톡 답장 응대 (회사 Gmail / 휴대폰 SMS / 카카오톡 채널 주기적 확인)
- 매칭 + 친구 결제 안내 (880,000 → 830,000원 할인)

### LMS Wave 0 사전 결정 보류 항목 (Wave 2~3 안에 컨펌)

1. **Consultation review 권한** — 모든 강사 풀 vs 배정 강사만 vs 학생이 강사 지정
2. **정산 메일 강사 breakdown** — 회사 정산 메일에 강사 개인별 금액 노출 vs 회사 합계만
3. **알림 채널** — 이메일만 vs 알림톡 옵트인 추가

### 강사 2개 회사 정보 (Wave 0 안 채워도 OK, Wave 3 정산 전 필요)

- 회사명 / 사업자번호 / 주소 / 담당자 이메일 / 계좌 / 부가세 발행 여부

### B0019 SEO/GEO 후속

- Google Search Console: `growthcareer.xyz` 등록 + `sitemap.xml` 제출
- Naver Search Advisor 등록 (한국 시장)
- PageSpeed Insights 측정
- Schema.org Validator + Rich Results Test

### B0019 placeholder 정정

- `structured-data.tsx` EducationEvent 시간 (현재 14:00~16:00 placeholder)
- `structured-data.tsx` LocalBusiness 우편번호 (현재 05718 placeholder)

---

## 📁 핵심 파일 / 경로

### LMS 신규 트랙
- **ADR**: `docs/decisions/0005-lms-clean-architecture.md` · `docs/decisions/0006-lms-design-system.md`
- **Backlog**: `docs/tasks/BACKLOG.md` B0031 ~ B0036
- **신규 폴더 (Wave 0 시작 시)**:
  - `src/programs/fan-to-pro/domain/entities/` (13 entity)
  - `src/programs/fan-to-pro/application/use-cases/`
  - `src/programs/fan-to-pro/infrastructure/supabase/repositories/`
  - `src/programs/fan-to-pro/interface/components/lms/ui/` (shadcn primitives)
- **신규 라우트 그룹**: `app/[locale]/(lms)/layout.tsx` (data-theme="light")

### 기존 (변경 금지)
- **Spec**: `docs/specs/B0007-payment-flow-split.md` · `docs/specs/B0018-operator-dashboard-expansion.md`
- **ADR**: `docs/decisions/0001~0004`
- **운영자 페이지**: `app/[locale]/admin/{applicants,instructors,finance}/`
- **마이그레이션**: `supabase/migrations/` 7개 (대학·국적 컬럼 추가 포함)
- **메시지**: `messages/{en,ko}.json` + `src/programs/fan-to-pro/messages/templates.ts`

---

## 📚 다음 세션 시작 시 권장 흐름

1. **이 파일 (`WORKING-SESSION.md`) 먼저 읽기** — 컨텍스트 복원
2. `git log --oneline -15` — 최근 커밋 흐름
3. `git status` — 작업 중 변경 사항
4. `docs/tasks/BACKLOG.md` 의 B0031 (Wave 0) 부터 진행 — LMS 신규 트랙
5. `docs/decisions/0005-lms-clean-architecture.md` + `0006-lms-design-system.md` — LMS 설계 컨텍스트 복원
6. CLAUDE.md / 메모리는 자동 로드

---

## ⚠️ LMS 작업 시 절대 룰 (CLAUDE.md §7.4)

- 기존 모집 페이지 (`app/[locale]/fan-to-pro/*` + `presentation/sections/*`) **변경 금지**
- 어드민 기존 3-tab (`/admin/applicants` `/admin/instructors` `/admin/finance`) **변경 금지**
- 기존 server actions 함수 시그니처 **변경 금지** (내부 구현 Strangler Fig 이전은 OK)
- 신규 LMS = 별도 라우트 그룹 `(lms)/` + 라이트 디자인 + shadcn/ui
