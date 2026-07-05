# Backlog

> Owner: Aria · Last reviewed: 2026-06-05
>
> 운영 매뉴얼: [docs/decisions/0002-backlog-and-spec-system.md](../decisions/0002-backlog-and-spec-system.md)
>
> **4섹션**: Now (이번 주) / Next (이번 달) / Later (보류·장기) / Raw (T1 dump · 미분류)
> **상태**: raw → specced → approved → in-progress → done · 추가: dropped (안 하기로 결정), deferred (보류)
> **ID 규칙**: B0001, B0002… (단조증가, dropped 도 ID 회수 안 함)
> **링크**: `→ specs/<slug>.md` (T2 spec 본문)

---

## Now  (이번 주)

- **B0018** · 운영자 페이지 확장 Phase 2 (출결·수료증·강사정산·재무·현금영수증·PII파기·다중발송·공연매칭) · status: **specced** · 2026-06-05 specced
  - Spec: [`docs/specs/B0018-operator-dashboard-expansion.md`](../specs/B0018-operator-dashboard-expansion.md)
  - ADR: [`docs/decisions/0004-operator-toolset-in-app-vs-external.md`](../decisions/0004-operator-toolset-in-app-vs-external.md) (외부 SaaS 도입 0 + 신규 테이블 8개 + Wave 4분할)
  - 신규 테이블 8개: `instructors` · `sessions` · `attendance` · `applicant_notes` · `messages_log` · `performances` · `certificates` · `cash_receipts`
  - **Wave 1 (~10h, 6/14 까지)**: B0023 현금영수증 + B0024 PII 파기 + B0025 다중 발송 (법적 의무 + broadcast)
  - **Wave 2 (~16h, 6/21 까지)**: B0021 강사 정산 + B0022 재무 대시보드
  - **Wave 3 (~8h, 6/27~7/19)**: B0019 출결 기록 (강의 시작 시점부터)
  - **Wave 4 (~12h, 7/25 까지)**: B0020 수료증 PDF + 공연 매칭 + 참여확인서
  - **블로커**: 노아 결정 회신 17건 필요 (spec §13). 도착 후 status=approved → Iris 마이그레이션 (T1) 부터 디스패치
  - 출처: Echo 2026-06-05 리서치 (`/admin/applicants` 확장 영역 발굴) + ADR 0004

- **B0005** · 1기 일정 확정 + 강사진 공식 통지 + 사이트 일정 업데이트 · status: **done** · 2026-06-04 완료
  - 신청 마감 **6/21(일) 자정** · 첫 강의 **6/27(토)** · 종강 **7/19(일)** · 수료식+네트워킹 **7/25(토)**
  - ✅ 사이트 코드 업데이트 — `program.ts` SCHEDULE/ENROLLMENT_CAP · `faq.ts` 환불 약관
  - ✅ 코워크 배너 HTML + 10개 SVG + 10개 PNG 재생성 (마감일 6/21 반영)
  - ✅ 강사 계약서 `docs/contracts/instructor-agreement.md` 정정 — 제3조 강의 일정 / 제6조 모집 마감 / 별첨 1 회차 표 + 수료식 7/25 추가
  - ✅ 강사진 8명 재통보 완료 (사용자 수동)
  - 출처: [2026-06-04 코워크 미팅 §13](../research/cowork-partnership-tracking.md)

- **B0006** · 사이트 영문 디폴트화 + 잘 보이는 위치 언어 토글 · status: **done** · 2026-06-04 완료
  - 디폴트 locale `en`, 한국어는 `ko` 라우트
  - **헤더 first-fold (우상단 또는 네비)** 에 언어 전환 UI 노출 — 풋터 숨김 금지
  - 카드뉴스/FAQ/약관 다국어 카피 수급 필요 (B0009·B0010 와 연동)
  - i18n 라이브러리 선택 (next-intl 우선 검토)
  - 출처: 2026-06-04 코워크 미팅 §13 — 타겟 = 한국 거주 외국인

- **B0007** · 신청-입금 분리 플로우 + 반자동 입금 안내 · status: **specced** · 2026-06-04 specced (rev 2 반자동 전환)
  - Spec: [`docs/specs/B0007-payment-flow-split.md`](../specs/B0007-payment-flow-split.md)
  - ADR: [`docs/decisions/0003-payment-channel-and-refund-split.md`](../decisions/0003-payment-channel-and-refund-split.md)
  - 채널: **반자동 (운영자 dashboard 의 메시지 generate + 1-click 복사 + mailto/sms 링크 + 노아 본인 카톡/SMS/이메일 수동 발송)** + 카톡 채널 1:1 폴백
  - 컨펌 모달 신설 (체크박스 X, single-click) + 계좌번호 즉시 노출 폐지
  - 환불 정책 2층 분리 (마케팅 단순화 vs 약관 본문 무수정)
  - 리마인드: cron 없이 dashboard side 색상 강조 (T+1 황색 / D-3 주황 / D-1 적색) + 노아가 보고 수동 발송
  - 운영자 미니 페이지 `/admin/applicants` (Basic Auth) - 메시지 generate + 복사 + mailto + sms + 상태 토글 + 일괄 액션
  - 작업 분해: T2 T3 T4 T7 T8 T10 T11 T12 (rev 1 의 T0 T1 T5 T6 T9 제거)
  - 마일스톤: M2 코어 6/6 (금) · M3 운영자 페이지 6/7 (토) · M4 QA+배포 6/8 (일) · M5 첫 발송 6/9 (월)
  - 인프라 도입 안 함: NaverCloud SENS, Resend, Vercel Cron 전부 제거
  - 출처: 2026-06-04 코워크 미팅 §13 + 2026-06-04 노아 결정 변경 (반자동 전환)

- **B0008** · CS 카톡 플로팅 버튼 · status: **done** · 2026-06-04 완료
  - 우측 하단 fixed 단순 anchor → `https://pf.kakao.com/_nxhDGX/chat` 새창. **SDK 불필요**
  - 카카오 옐로우 `#FEE500` + 카톡 아이콘 + aria-label
  - 루트 layout 마운트, 모든 페이지 노출
  - 출처: 2026-06-04 코워크 미팅 §13

---

## Next  (이번 달)

- **B0009** · 인스타 카드뉴스 4장 수신·검수·캡션 협업 · status: **raw** · 2026-06-04 captured
  - Cowork 측에서 카드뉴스 4장 제공 + 캡션 협업 가능
  - 핵심 메시지: 우수 수료생 → 실제 공연 프로젝트 참가 + **수당 지급** 강조 (유니온픽처스 참여확인서 연계)
  - 마감(6/21) 전 게시 완료
  - 출처: 2026-06-04 코워크 미팅 §13

- **B0010** · FAQ 보강 — 온라인 강의 가능 여부 등 · status: **done** · 2026-06-04 완료
  - ✅ "온라인으로 수강할 수 있나요?" FAQ 항목 추가 (`faq.ts` 03 위치 · 한국어 항목 다음)
  - 답변: 현장 실무 체험 핵심 → 온라인 미제공. 한국 거주자만 신청 가능. 비자 가이드 등 보조 자료는 PDF 별도 제공
  - 영문 FAQ 는 B0006 영문화에서 일괄 처리
  - 출처: 2026-06-04 코워크 미팅 §13

- **B0011** · 모바일 카카오 플로터 ↔ sticky CTA ↔ 콘텐츠 z-index 재정렬 · status: **done** · owner: Luna · 2026-06-04 완료
  - Mira Phase 5 검증에서 발견 — mobile-sm (360px) recruitment 첫 카드 / hero 배너 우측이 카카오 노란 버튼과 일시 겹침
  - 적용: 모바일 한정 사이즈 56→48px 축소 + bottom offset 5rem→6.5rem 상향 (sm+ 는 기존 56px / 5rem 유지)
  - 결과: recruitment 첫 카드 헤더 / hero 핑크 배너와 겹침 해소. 데스크탑·태블릿 regression 없음
  - 캡처: `docs/screenshots/i18n/viewport/recruitment-en-mobile-sm.png` `switcher-en-mobile-sm.png` `polish-tablet-*` `polish-desktop-*`

- **B0012** · `middleware → proxy` 컨벤션 마이그레이션 (Next.js 16.2.4 deprecation) · status: **deferred** · 2026-06-04 captured
  - build log 에 `The "middleware" file convention is deprecated. Please use "proxy" instead.` 출력
  - 동작 무영향, 다음 마이너에서 권고
  - **블로커**: next-intl 4.14+ 필요 (현재 미발표). 라이브러리 릴리즈 후 작업
  - 출처: B0006 Phase 5 Mira QA

- **B0014** · Hash anchor scroll 본질 검증 + cold visit fix · status: **in-progress** · owner: Luna · 2026-06-04 captured
  - 외부 마케팅 (Cowork 카드뉴스·이메일·광고) 에서 `growthcareer.xyz/fan-to-pro#apply` cold 진입 시 hash 점프 동작 검증 필요
  - 검증: Playwright cold visit 시뮬레이션 + viewport scroll y-position 측정
  - fix 안: `scroll-behavior: smooth` + 섹션 `scroll-margin-top` + 필요시 layout useEffect
  - Mira preview 도구 (`tools/preview-i18n.mjs`) timing fix 도 함께

- **B0016** · 섹션 impression GA4 추적 · status: **in-progress** · owner: Luna · 2026-06-04 captured
  - 목적: Cowork 마케팅 시작 전 funnel 추적 인프라 구축. 1기 마감(6/21) 전 데이터 수집
  - 발화 정책: 첫 진입 1회 (impression 표준) / threshold 50% / debounce 500ms / 1회 dedup
  - 이벤트: `section_view` (GA4 커스텀) · 파라미터: `section_id`, `section_name`, `section_order`, `locale`, `page_path`
  - 구현: `useSectionImpression` hook 신규 (IntersectionObserver 기반) + Section 컴포넌트 enhance + 모든 섹션 적용
  - GA4 셋업 이미 있음 (`NEXT_PUBLIC_GA_ID = G-6N0R68CH0D`)
  - 검증: GA4 DebugView 또는 console wrapper

- **B0013** · EN recruitment 헤로 폰트 한 단계 다운 검토 · status: **done** · owner: Luna · 2026-06-04 완료
  - mobile-sm 에서 영문 헤로 5줄 → **4줄** (`Who can apply` 1줄로 통합)
  - 적용: `html[lang="en"] .text-display-lg` `font-size: clamp(2.25rem, 8vw, 6.5rem)` + 동일 패턴으로 `text-display-md` 도 한 단계 다운 (`@layer utilities` 에 배치해 Tailwind utility 보다 specificity 우위)
  - `text-wrap: balance` 는 globals.css 의 `h1,h2,h3` 룰로 이미 전역 적용 중. 별도 추가 불필요
  - 한글 페이지 무영향 — `lang="ko"` 분기 적용 안 됨. 데스크탑은 clamp 상한이 7→6.5rem 으로 미세하게만 작아짐 (시각 변화 거의 없음)
  - 캡처: `docs/screenshots/i18n/viewport/recruitment-en-mobile-sm.png` `polish-program-en-360.png` `polish-mentor-en-360.png`

---

## Later  (언젠가 · 보류 · 장기)

- **B0001** · 코워크 제휴 트래킹 구현 — `referral_code` 컬럼 + UTM 캠페인 + 정산 리포트 · status: **dropped** · 2026-06-04 closed
  - 미팅 결과: Cowork 측이 트래킹 시스템 요구하지 않음. 제휴 자체를 트래킹 기반 12% 정산 모델로 진행하지 않기로
  - §3~§9 의 전략 분석은 archival 자료 — 향후 다른 파트너 검토 시 재활용 가능
  - 리서치 노트: [`docs/research/cowork-partnership-tracking.md`](../research/cowork-partnership-tracking.md) §13

- **B0002** · 운영 어드민 — 사업 전반 관리 대시보드 · status: **deferred** · 2026-06-04 captured
  - markdown(Git) + DB(Supabase) 하이브리드 아키텍처 논의됨
  - 모듈 후보: 백로그 뷰어, 신청자 관리, 결제·정산, 파트너 트래킹, 기수 관리, 분석 요약, 강사·커리큘럼, 배포·헬스, 알림
  - 점진 빌드 로드맵 (~10-12일 분량): v0.1 백로그 뷰어 → v0.2 신청자 → v0.3 분석 → v0.4 알림 → v1.0 인증 → v1.1 파트너 정산 → v2.0 파트너 외부 읽기 스코프
  - **사용자 결정 보류** — "잠시 후에 다시 얘기하자" (2026-06-04 대화)
  - ADR 0003 후보

- **B0003** · `.claude/agents/aria.md` 보강 — Aria 의 T1 인테이크 + T2 디스패치 책임 prompt 에 박기 · status: **raw** · 2026-06-04 captured
  - 출처: ADR 0002 §5 "Aria 의 인테이크 책임"

- **B0004** · `.claude/skills/task-master.md` 스킬화 — `/intake`, `/spec`, `/promote`, `/done` 4개 슬래시 커맨드 · status: **deferred** · 2026-06-04 captured
  - 너무 일찍 자동화 금지 — 수동 운영이 일주일 이상 익숙해진 후 패턴 굳으면 박제
  - 출처: ADR 0002 §6

- **B0026** · 강사 `resident_no` (주민번호) 암호화 + UI 마스킹 · status: **raw** · 2026-06-08 captured · owner: Iris
  - 개인정보보호법 §24 고유식별정보 암호화 의무 (Sage Wave 2 MED 지적)
  - DB: pgcrypto AES (서버 사이드 키 관리) · UI: 마지막 4자리만 표시, 변경 시에만 full input
  - 출처: Sage 2026-06-08 Wave 2 보안 검토

- **B0027** · 운영자 toast error 매핑 (Supabase error.message passthrough 제거) · status: **raw** · 2026-06-08 captured · owner: Luna
  - 현재 UNIQUE constraint·FK violation 메시지에 컬럼명·테이블명·인덱스명 그대로 노출 → 자격 유출 시 스키마 탐색 표면
  - `instructor-actions.ts` · `finance-actions.ts` · `admin-actions.ts` 전부 친화 키 (`dbError`) 매핑 + 원본은 server log 만
  - 출처: Sage 2026-06-08 Wave 2 보안 검토

- **B0028** · 회계사 CSV 의 `refId` UUID 마스킹 + 운영자 자격 분기 1회 회전 · status: **raw** · 2026-06-08 captured · owner: Vera
  - CSV refId 를 short hash (예 `app-A1B2`) 로 마스킹 + 매핑 테이블은 DB 내부만
  - server action 인증 freshness (Sage HIGH) 잔여 리스크 → 분기 1회 운영자 자격 회전 정책
  - 출처: Sage 2026-06-08 Wave 2 보안 검토

- **B0029** · 운영자 인증 Basic Auth → cookie session 전환 검토 · status: **raw** · 2026-06-09 captured · owner: Sophia → Iris
  - 현재: HTTP Basic Auth + cookie timestamp + realm rotation 트릭. 로그아웃·세션·role 전환 모두 본질적으로 트릭에 의존 (브라우저별 100% 보장 X)
  - 전환 후보: NextAuth / Clerk / Supabase Auth + httpOnly cookie session. 깔끔한 logout, 명확한 세션 expiry, multi-operator 지원
  - 트리거: 운영자 2명 이상 도입 시 또는 코워크 외 외부 공유 추가 요청 시
  - 출처: `docs/lessons/2026-06-09-basic-auth-logout-limitations.md`

- **B0030** · 모바일 fluid typography 카드/박스 전체 적용 · status: **deferred** · 2026-06-18 captured · owner: Luna
  - 현재 fluid 시스템은 display 헤드라인 (h1/h2/h3 + `.text-display-*`) 만 적용. card/box/body 는 Tailwind 표준 breakpoint (`text-xl sm:text-2xl`) 라 320~640px 사이 동일 사이즈로 step change
  - 사용자 지적 (2026-06-18): "화면이 작아지면 그만큼 폰트 사이즈가 반응형으로 줄면서 영역도 그와 함께 반응형이 되어야 함" — 정확. 현재 PaymentNotice 의 모바일 빡빡함이 그 증상
  - 임시 fix: 2026-06-18 commit `9ed4edf` 에서 PaymentNotice 만 핀포인트 spacing/font 보정. SuccessBlock 의 Application ID 노출 제거도 같이.
  - 본 작업: card/box 용 fluid 토큰 신설 (예 `--text-card-headline: clamp(1.125rem, 4vw, 1.5rem)` · `--text-card-body: clamp(0.875rem, 3vw, 1rem)`) → 전 카드 컴포넌트 일괄 적용. PaymentNotice / SuccessBlock / value-cards / pricing / mentor / faq 등.
  - 트리거: 1기 종료 후 (2026-07-22+). 운영 중 디자인 시스템 변경은 risk.
  - 출처: 사용자 점검 요청 2026-06-18

---

## LMS 트랙 (B0031 ~ B0036) — 자체 LMS 구축

ADR 0005 (클린 아키텍처 Layered Pragmatic) + ADR 0006 (라이트 디자인 시스템 shadcn/ui + 토스 톤) 박제.
기존 모집/어드민 변경 금지 룰 = CLAUDE.md §7.4.

- **B0031** · **Wave 0** — LMS DB minimum (cohort + student + session + attendance) + 출결 UI · status: **ready** · 2026-06-21 captured · owner: Iris
  - 4 entity 신규: companies / cohorts / sessions / students / attendance (instructors.company_id FK 추가)
  - 마이그레이션 + Strangler Fig Step 1 (기존 폴더 이전 + shim)
  - `/admin/cohorts` 페이지 (sessions list + 출결 mark UI, admin only)
  - 강사/학생 로그인 X, 자료 업로드 X — 카톡 보강
  - 작업량 5일, 강의 시작 전 (~6/26) 완료 목표
  - Sage critical = 0 (admin only)

- **B0032** · **Wave 1** (ADR 0008 기준 재정의) · status: **active** · owner: Iris + Luna + Sage
  - **새 URL 구조**: /[locale]/auth/* (통합 로그인) + /[locale]/fan-to-pro/(lms)/admin/* (super_admin) + /[locale]/fan-to-pro/[cohortSlug]/{instructor,student}/* (cohort 단위, segment 이름 없음)
  - **회원가입 X** — 운영자 invite + 첫 로그인 강제 PW 변경 (must_change_password)
  - **권한 3 계층** — super_admin (글로벌, is_super_admin) / admin (program_memberships) / instructor+student (cohort_memberships)
  - Wave 1 Step 1 (`/lms/*` Supabase Auth + login + dashboard 골격) — 완료. ADR 0008 기준 재배치 필요 (Step 2 첫 작업).
  - Wave 1 Step 2 — 코드 이전 (lms → fan-to-pro/(lms)) + 마이그레이션 (programs/program_memberships/cohort_memberships/cohorts.slug+program_id/instructors.program_id/user_profiles.is_super_admin+must_change_password) + admin 9 페이지 + invite 흐름 + 회사 단위 강사/재무
  - Wave 1 Step 3 — instructor surface (/fan-to-pro/[cohortSlug]/instructor/*)
  - Wave 1 Step 4 — student surface (/fan-to-pro/[cohortSlug]/student/*)
  - shadcn primitives + LMS Shell (sidebar/topbar 공유)
  - 작업량 ~12일 병행, 강의 진행 중 점진 launch
  - Sage critical 의무 — 신규 인증 표면 + PII 표면 + RLS 정책 + 회사 단위 격리

- **B0033** · **Wave 2** — 과제 + 컨설팅 + 수료증 + 캘린더 · status: **active** (병행) · owner: Iris + Luna
  - assignments / submissions / feedback entity
  - consultations / consultation-reviews entity (resume/cover/portfolio version 관리)
  - certificates 발급 흐름 (Dropdown 명의 + 유니온 픽처스 공연 참여 확인서)
  - events (캘린더)
  - 강사 review UI + 학생 받은 피드백 view
  - Storage 도입 (Supabase Storage + signed URL TTL 5분)
  - 작업량 5.5일, **Wave 1 Step 4 와 병행** ~7/19 목표
  - **노아 보류 결정**: consultation review 권한 (모든 강사 풀 vs 배정 강사만)

- **B0034** · **Wave 3** — 회사 단위 정산 + VAT/원천징수 + 회계 CSV · status: **active** (병행, Wave 1 Step 2 의 finance 페이지로 흡수) · owner: Iris
  - company_settlements entity (회사별 합산 정산) — Wave 1 Step 2 의 /lms/admin/finance 에 포함
  - VAT 10% / 원천징수 3.3% 분기 (companies.vat_issuer)
  - 세금계산서 발행 트래킹 (invoice_status / invoice_number)
  - 송금 기록 (transfer_status / transferred_at)
  - 회계 CSV export (refId 마스킹, B0028 와 통합)
  - **/lms/admin/finance** (신규, 라이트, 회사 단위) — 기존 /admin/finance 와 분리
  - 작업량 4.5일, Wave 1 Step 2 안에 통합
  - **노아 보류 결정**: 정산 메일에 강사 개인별 금액 포함 여부

- **B0035** · **Wave 4** — RLS 본격 + follow-up + 영문 UX + viewer PII 마스킹 강화 · status: **raw** · 2026-06-21 captured · owner: Iris + Sage
  - Wave 0~2 의 임시 service-role 패턴 → RLS 정책 전환
  - follow-up (수료생 외부 행사 알림 / 동문 네트워킹)
  - 외국인 학생 onboarding 영문 UX 강화 (magic link 옵션)
  - viewer role PII 마스킹 강화 (B0028 잔여)
  - RLS 테스트 스크립트 (다른 학생 데이터 접근 시도 차단 검증)
  - 작업량 6일, 2기 모집 전 (8월) 완료 목표

- **B0036** · **Wave 5** — Realtime + 자동 정산 + 대량 onboarding · status: **deferred** · 2026-06-21 captured · owner: Iris
  - Supabase Realtime 전환 (제출물/피드백 알림)
  - 자동 정산 trigger (월별)
  - 대량 invite/onboarding 자동화 (100명 규모)
  - Storage 용량/대역폭 모니터링
  - audit log 통합 view
  - 트리거: 100명 규모 (3기+) 또는 강사 10명 이상

- **B0037** · **career docs Wave A+** — 이력서/자기소개서/포트폴리오 단일 최신본 관리 · status: **done** · 2026-06-21 완료 · owner: Iris + Sage
  - 학생 (본인) + 어드민 (전체 학생) 등록·수정·삭제
  - 외부 링크 (Notion/Google Drive) OR 파일 업로드 (PDF/DOCX/PPTX/ZIP/이미지, 10MB) XOR
  - DB: `student_career_documents` + RLS 4종 (super_admin / program admin / student-self / service_role) + Storage `career-documents` private bucket
  - Server actions 4종 (`assertCanAccessStudentCareer` 가드)
  - Admin: `/fan-to-pro/(lms)/admin/students/[id]/career`
  - Student: `/fan-to-pro/[cohortSlug]/student/career` (신규 student surface 첫 페이지)
  - Sage 검토 pass — H-2 SSRF fix 적용 (URL scheme allowlist + private IP 거부)
  - 미적용 (다음 wave): H-1 storage path randomness · 강사 instructor surface · 작품 collection (portfolio_items)
  - 출처: 2026-06-21 노아 요청 / commit `aa02a44`

- **B0038** · **career docs Wave B** — instructor 추가 + path randomness + 안전 강화 · status: **raw** · 2026-06-21 captured · owner: Iris + Sage
  - **H-1 (Sage High)**: storage path 에 nanoid 추가 — `{student_id}/{doc_type}-{nanoid8}.{ext}`. file_path 추측 차단 한 겹 더.
  - **M-2 (Sage Med)**: file magic byte 검증 — 첫 N byte 읽어 PDF/PNG/JPEG/ZIP 표지 일치 확인
  - **M-3 (Sage Med)**: file_name 의 bidi control char (`‪-‮`, `⁦-⁩`) strip + NFC normalize
  - **M-4 (Sage Med)**: locale-aware revalidate (현재 `/ko/` hardcoded → tag-based or both locales)
  - **L-1 (Sage Low)**: server action error 의 message → code 매핑 (auth uuid 누설 차단)
  - Instructor surface — `/[cohortSlug]/instructor/students/[id]/career` (담당 cohort 학생 read-only viewer)
  - 포트폴리오 = 작품 collection (`portfolio_items` 별도 테이블, 작품별 row, 이미지 + 설명 + 연도)
  - 자기소개서 = 구조화 폼 (질문별 답변 fields)
  - 출처: Sage 2026-06-21 B0034 보안 검토

- **B0039** · **1기 모집 마감 자동 전환** — `isEnrollmentClosed()` + cutoff datetime + UI 자동 전환 + DB next_cohort_interest · status: **done** · 2026-06-22 완료 · owner: 메인 어시스턴트
  - `ENROLLMENT_CAP.cutoffAt = "2026-06-22T00:00:00+09:00"` ISO datetime 박음
  - `isEnrollmentClosed(now?)` helper (server + client 양쪽 호출 가능)
  - Hero / Pricing / StickyCTA / ApplyForm 4 surface 자동 전환 (가격 숨김 + "모집 마감" + "다음 기수 알림 받기")
  - ApplyForm 내부: 헤드라인 / lead / chip / summary 4 cell / PaymentNotice / SuccessBlock 모두 closed 변형
  - 클라이언트 setInterval 30s 재확인 — 페이지 열어둔 채 자정 넘기는 사용자 커버
  - 마이그레이션 `20260622000006`: status enum + 'next_cohort_interest', cohort_id NOT NULL → nullable, XOR check
  - **사고 + hotfix**: `/fan-to-pro` SSG cache 로 자정 지나도 전환 안 됨 → `export const dynamic = "force-dynamic"` 박음 (commit `69cbd7b`)
  - 사고 박제: `docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md` + CLAUDE.md §7 시간 기반 페이지 룰
  - 출처: 2026-06-21 노아 발견 / commit `1b1328e` ~ `cd0405a`

- **B0040** · **1기 운영 playbook 박제** — docs/playbook/ 10 파일 · status: **done** · 2026-06-22 완료 · owner: 메인 어시스턴트
  - 기획 / 빌드 / 마케팅 / 운영 전 과정 카테고리 + 시계열 정리
  - 다음 기수 운영 자산 + 자동화 후보 + 기능 개발 후보 추출 기반
  - README + 01 overview + 02-build-tracks/{website,admin,lms} + 03 recruitment + 04 marketing + 05 class-ops + 06 finance + 07 timeline ⭐ + 08 automation candidates + 09 feature candidates + 10 next-cohort checklist
  - 자동화 후보 A1~A8 (paymentConfirmed 자동 / 리마인드 자동 / 다음 기수 일괄 / 출결 self-check / 토스뱅크 자동 매칭 / 회계 CSV / 챗봇 / 강사 정산)
  - 기능 후보 F1~F15 (학생 surface / 강사 surface / 수료증 자동 / UI 재활성화 / instructor career viewer / 자기소개서 구조화 / 작품 collection / 알림톡 / 동문 추천 / magic link / 강사 평가 / Realtime / 대량 invite / fluid typography / 주민번호 암호화)
  - 출처: 2026-06-22 노아 요청 / commit `b9fdf6e`

---

## LMS 정식 런칭 트랙 (B0044 ~ B0047) — 1기 2주차 (7/4 토) 가동

D-9. 1주차 강의 자료 Google Drive 모바일 다운로드 사고 → 자체 LMS 자료 호스팅 시급.
로드맵: [`docs/playbook/12-lms-launch-roadmap.md`](../playbook/12-lms-launch-roadmap.md).
기존 영역 변경 금지 (CLAUDE.md §7.4). Sage 검토 필수 (CLAUDE.md §7.4).

- **B0044** · **LMS Launch Phase 1** — 인프라 + entity · status: **ready** · 2026-06-25 captured · owner: Iris
  - 신규 entity 2개: `lecture_materials` (cohort_id + session_no + file_path + uploaded_by) + `student_career_profiles` (target_role + certifications + experience + education + visa_type)
  - Storage bucket `lecture-materials` private + RLS 4 policies (super_admin write / cohort_memberships read)
  - server actions: `uploadLectureMaterial` / `listLectureMaterials` / `deleteLectureMaterial` / `signLectureMaterialUrl` (TTL 600s) + `upsertCareerProfile` / `getCareerProfile`
  - `assertAdmin` / `assertCohortMember` / `assertCanAccessStudentCareer` (B0037 재사용) 가드 첫 줄
  - Mira Phase 1 self-test (4 시나리오 PASS)
  - 기간: 6/25 (목) ~ 6/27 (토) evening · 2.5일
  - 출처: 노아 요청 2026-06-25 + 로드맵 §3 Phase 1

- **B0045** · **LMS Launch Phase 2** — admin + student UI · status: **ready** · 2026-06-25 captured · owner: Luna
  - admin: `/fan-to-pro/(lms)/admin/cohorts/[cohortId]/materials` (자료 upload + list + delete) + `/admin/students/[id]/profile`
  - student: `/fan-to-pro/[cohortSlug]/student/materials` (자료 list + signed URL 다운로드) + `/student/profile` (career profile 폼)
  - 자료 list 컬럼: 회차 / 제목 / 파일명 / 크기 / 업로드 일시 / 다운로드 / 삭제
  - career profile 폼 필드: 희망 직무 (select) / 자격증 / 경력 / 학력 / 비자 (B0006 비자 칩 재사용)
  - LMS shell 사이드바: materials / career / profile 3 항목 (KO + EN 라벨)
  - 모바일 반응형 + 대용량 파일 다운로드 진행률 hint 카피
  - 기간: 6/28 (일) ~ 7/1 (수) · 4일
  - 출처: 로드맵 §3 Phase 2

- **B0046** · **LMS Launch Phase 3** — 보안 + QA + 배포 · status: **ready** · 2026-06-25 captured · owner: Sage + Mira + Vera
  - Sage 보안 검토 (신규 entity + bucket + server actions) — critical = 0, high ≤ 1
  - B0037 패턴 사전 적용 (URL allowlist / private IP 거부 / path randomness nanoid8 / Content-Disposition attachment)
  - Mira E2E 8 시나리오 (KO 4 + EN 4) + 모바일 200MB+ PPT 회귀 (iOS Safari + Android Chrome)
  - Vera invite 흐름 dry-run + prod 배포 (git push)
  - 노아 prod final check (운영자 + 가짜 학생 계정)
  - 기간: 7/2 (목) ~ 7/3 (금) · 2일
  - 출처: 로드맵 §3 Phase 3

- **B0047** · **LMS Launch Phase 4** — 가동 · status: **ready** · 2026-06-25 captured · owner: Vera + 노아
  - 7/4 (토) 09:00 자료 업로드 / 10:00 학생 10명 invite + 카톡/이메일 발송 / 12:00 진입률 체크 / 13:00 smoke check / 14:00 강의 시작 + 강의실 진입 확인 + 다운로드 시연 / 16:00 회고
  - 카피: 로드맵 §8 (한/영 카톡 안내 + 1:1 발송 템플릿)
  - 7/4 ~ 7/11 monitoring — 진입률 / 다운로드 성공률 / career profile 입력률
  - 회고 박제: `docs/sessions/SESSION-2026-07-04-lms-launch.md`
  - 기간: 7/4 (토) 1일 + 7/11 까지 monitoring
  - 출처: 로드맵 §3 Phase 4 + §9 monitoring

---

## LMS 확장 트랙 (B0068 ~ B0075) — 2기+ 멀티 트랙 / 채용 연계

2026-07-04 진단 결과 (Echo + Sophia + Luna). 리서치 + ADR + UX 리포트:
- [`docs/decisions/0013-multi-track-and-recruitment-architecture.md`](../decisions/0013-multi-track-and-recruitment-architecture.md) (Sophia)
- [`docs/reports/2026-07-04-lms-ux-diagnosis.md`](../reports/2026-07-04-lms-ux-diagnosis.md) (Luna)
- [`docs/reports/2026-07-04-lms-diagnosis-summary.md`](../reports/2026-07-04-lms-diagnosis-summary.md) (통합)

**노아 결정 (2026-07-04)**:
1. ✅ 승인 — 신규 테이블 5 (courses / bundles / bundle_courses / enrollments / enrollment_courses)
2. ✅ 승인 — 신규 테이블 3 (companies_partners / job_postings / student_applications)
3. ✅ 승인 — instructor surface 페이지 5개
4. ✅ 승인 — `domain/program.ts` → `domain/marketing/program-config.ts` 리네임
5. ⏳ 보류 — 채용 매칭 = rule-based vs Nova AI (B0075 시작 시점 11월 이후 재확인)

**단기 (2기 시작 전, 8~9월)**:

- **B0068** · courses 스키마 도입 (단과반) · status: **approved** · 2026-07-04 노아 승인
  - 신규 테이블: courses (id, program_id, slug, title_ko, title_en, hours, price)
  - cohorts.course_id 컬럼 추가 (nullable, additive) — 기존 cohort 는 null 유지
  - Strangler Fig 마이그레이션 (기존 cohort 스키마 무손실)
  - 노아 승인 필요 (스키마 변경 결정 1)

- **B0069** · enrollments 승격 — bundle 지원 · status: **approved** · 2026-07-04 노아 승인
  - 신규 테이블: bundles / bundle_courses / enrollments / enrollment_courses
  - applicants.enrollment_id / bundle_id 컬럼 추가 (nullable)
  - 결제 SKU 계층 (개별 course vs bundle) fan-out 로직
  - applicants shape 절대 보존 (ADR 0010)

- **B0070** · instructor surface 5 페이지 · status: **approved** · 2026-07-04 노아 승인
  - dashboard / students / sessions / sessions[id] / consultations
  - 강사 로그인 → 본인 cohort 학생만 read + 코멘트 write
  - 권한 가드는 이미 준비됨 (assertCanReadStudentProfile / assertCanWriteStudentNote)
  - 종강 (7/19) 전 최소 dashboard + students + sessions 3 페이지 착수 권장

- **B0071** · admin course/bundle CRUD · status: **approved** · 2026-07-04 노아 승인
  - super_admin + program admin 이 트랙 스케일 시 병목 해소
  - 어드민 신규 탭 or 기존 3-tab 확장 (§7.4 신중)

**중장기 (3기+, 10월~)**:

- **B0072** · 채용 파이프라인 스키마 · status: **approved** · 2026-07-04 노아 승인
  - 신규 테이블 3: companies_partners / job_postings / student_applications
  - status 6단계: prep → resume_ready → applied → interview → offer → hired
  - append-only history 로 취업률 recompute 가능

- **B0073** · admin recruitment 3 페이지 · status: **approved** · 2026-07-04 노아 승인
  - /admin/companies / /admin/postings / /admin/applications
  - Partner 회사 등록 + JD 관리 + 학생 지원 트래킹

- **B0074** · student recruitment surface · status: **approved** · 2026-07-04 노아 승인
  - student/jobs (JD list + 지원) + student/applications (본인 지원 트래킹)
  - 이력서 / 자소서 재사용 (career_documents 기존)

- **B0075** · matching-service · status: **approved** · 2026-07-04 노아 승인 · Nova 후보
  - 학생 target_role + 회사 JD 매칭. 초기 rule-based (도메인 서비스), 추후 Nova AI
  - 노아 승인 필요 (결정 5)

**외국인 특화 (Echo 리서치 반영)**:

- **B0076** · 외국인 프로필 필드 확장 · status: **approved** · 2026-07-04 노아 승인
  - student_profile 에 language_ability / visa_sponsor_needed / preferred_language 컬럼 추가 (nullable)
  - 비자 발급 성공률 KPI 계산의 전제

- **B0077** · KCCI E-7-1 인증 검토 · status: **approved** · 2026-07-04 노아 승인
  - 대한상공회의소 특화 교육 프로그램 이수 시 1년 경력 요건 면제
  - 우리 프로그램이 KCCI 인증 받으면 학생에게 직접 비자 가치
  - 법무법인 자문 필요 (반나절 30만원선)

- **B0078** · 평생직업교육학원 등록 검토 · status: **approved** · 2026-07-04 노아 승인
  - 반복 기수 운영이면 등록 대상 (학원법)
  - 무등록 300만원 벌금 리스크
  - 노아 결정 후 진행

**UX P0 fix (즉시)**:

- **B0079** · student/announcements + login i18n 배선 · status: **approved** · 2026-07-04 노아 승인
  - 완전 한국어 하드코딩 상태, 외국인 학생 접근 시 언어 장벽
  - messages/en 리소스 확장 + next-intl 배선

- **B0080** · Luna 재발 방지 훅 (grep self-check) · status: **approved** · 2026-07-04 노아 승인
  - Luna 이번 세션에서 반성 후에도 초안 룰 위반 (em dash 35, interpunct 6)
  - settings.json PostToolUse hook 으로 Write/Edit 후 자동 grep 검증
  - 위반 시 즉시 fail + Luna 재작성

**2기 재무 프로젝션**:

- **B0082** · 2기 매출 프로젝션 v1.2 (실 재계산) · status: **ADR-drafted** · 2026-07-05 · owner: Aria
  - ADR: [`docs/decisions/0014-cohort2-revenue-projection.md`](../decisions/0014-cohort2-revenue-projection.md)
  - v1.1 오류 4건 정정 (회차 5주, 시간대 분리 세션, 사업자 세금계산서, 페스티벌 티켓 재분류)
  - 시나리오 A~D 재계산 (원 단위): A -15,119,360 / B -4,789,600 / C +5,823,360 / D +18,168,640
  - BEP mix 기준 = 34명 (Baseline B 6명 부족)
  - 노아 결정 4건 대기 (2기 규모, launch 시점, 강사료 재협상, 올인원 할인율)
  - 매출 단위 룰 (원 단위 필수) CLAUDE.md §6.6 신규 후보

---

## Raw  (T1 dump · 미분류)

_여기에 머릿속 할 일을 1줄씩 던지세요. promote 시점에 위 lane 으로 이동._

<!-- 예시
- TBD · 박성철 강사 카드 이미지 교체 검토 · 2026-06-04 captured
- TBD · ...
-->

---

## Done  (최근 처리분 — 한 달 단위로 CHANGELOG 로 이관)

_비어있음_
