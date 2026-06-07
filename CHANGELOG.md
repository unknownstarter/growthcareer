# Changelog

이 프로젝트의 주요 변경 사항을 날짜순으로 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/) 약식.
세부 diff 는 `git log` 참조.

---

## [2026-05-19]

### Added — 신규 기능
- **GA4 통합** — `@next/third-parties/google` 의 `<GoogleAnalytics />` 를 `app/layout.tsx` 에 박음. `NEXT_PUBLIC_GA_ID` 환경변수 게이트(없으면 미렌더). 측정 ID `G-6N0R68CH0D` Vercel Production env 등록.
- **1기 강의 일정 노출** — `domain/program.ts` 에 `SCHEDULE` 상수 신규(시작 6/13 토 · 모집 마감 6/7 일 · 장소 *수강 확정자 개별 공지* · 토일 4주 8회). Recruitment 섹션의 Capacity strip 위에 Schedule strip 3 셀, ApplyForm Step 2 상단에 시작일·장소 callout 추가.
- **수강신청 완료 기준 Payment 박스** — ApplyForm Step 2 안에 핑크 강조 박스 신설. 토스뱅크 1002-4759-1521 · 예금주 Dropdown · 880,000원 표 + *"입금이 확인되어야 수강 신청이 최종 완료됩니다"* 룰 명시.
- **입금자명 = 신청서 본명** 필수 안내 — "필수" 칩 + 핑크 테두리 분리 박스. 다르면 입금 확인 지연·자리 배정 보류 가능 명시.
- **Faculty 토요일 강사 확정** — 박성철(그린음향, 현장 음향 디렉터) · 이제향(준컴퍼니, 현장 음향 감독·믹싱). Nino(일요일) 와 함께 3인 카드 구성.
- 검증 유틸: `tools/clip-mentor.mjs`, `tools/clip-sections.mjs`, `tools/clip-viewports.mjs` — Playwright 기반 섹션·뷰포트별 단독 캡처.

### Changed — 변경
- **헤드라인 카피** (`recruitment.tsx`): *"이 4주는, 아무에게나 열리지 않습니다"* → 사용자 직접 수정 다단계 → 최종 **"실제 전문가들에게 / 배우는 4주! / 수강 신청 자격"**.
- **Faculty 카드 레이아웃** — `aspect-[4/5]` 풀사이즈 사진 카드 → 112px 원형 아바타 + 텍스트 헤더 단일 스택. 사진 품질 편차 흡수. 사진 없을 시 `Avatar` 컴포넌트 이니셜 폴백.
- **개인정보 동의 문구** — *"신청 처리 및 입금 안내 목적 외 사용되지 않으며"* → **"입력하신 연락처와 개인정보는 교육 프로그램 안내 및 긴급 연락 목적으로만 사용되며"** (사용 목적 구체화).
- **환불 카피** — *"시작일 N일 전 신청자 N명 미만 시"* → **"2026년 6월 7일(일) 기준 신청자 20명 미만 시"** (절대 날짜로 명시).
- **`text-brand-pink` → `text-black`** — "수강 신청 자격" 강조 컬러. violet 섹션 배경 위 핑크/빨강 모두 채도 충돌(눈 피로)로 부적합 → 검은색이 대비도 강하고 시각적 부담 없음. (red-500 거쳐 black 으로 정착.)

### Fixed — 버그·결함
- **한국어 음절 절단 방지** — `body { word-break: keep-all }` 전역 적용. 기존엔 *"실제 전문가들에"* + *"게"* 식으로 syllable 중간이 끊겼음. 폴백으로 `overflow-wrap: anywhere` 로 영문 super-long-word 대응. `h1-h3` 에 `text-wrap: balance` 로 외톨이 줄 방지. 사이트 전체 텍스트에 자동 적용.
- 이재향 → **이제향** (李 濟 享 / Lee, Je-Hyang) 정식 표기 정정. `public/images/instructors/lee-jaehyang.jpeg` → `lee-jehyang.jpeg` 리네임.

### Infrastructure — 인프라·환경
- **Supabase Production env 점검** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 3종 모두 Vercel 에 등록 확인. `applicants` 테이블 + RLS (service_role 만 INSERT/SELECT) 정상 동작.
- **신규 env**: `NEXT_PUBLIC_GA_ID = G-6N0R68CH0D` (Production).
- **`.gitignore` 보강** — 강사 원본 자료(PDF·XLSX·구버전 이미지) 제외 룰 추가. 개인정보 보호.
- 도메인 `growthcareer.xyz` Production 라이브 — 오늘 5건 배포(`313930c → 703407c → c873014 → ac81fef → 4fqbush7q` 등).

### Docs
- `CHANGELOG.md` 신규 — 본 파일.
- `prd/fan-to-pro.md` — 기존 `kenterbootcamp_prd.md` 의 위치·이름 정리 (HANDOFF 권장 사항 미실행 분).
- `docs/dev-rules.md` 신규 — 코딩 컨벤션 + a11y/타이포/접근성 가드.
- `docs/design-system.md` 신규 — 토큰·컴포넌트·tone 카탈로그.

---

## [2026-05-30]

### Changed — 변경
- **박성철 강사 요일 재배정** — 토요일 → **일요일**. `domain/program.ts` 의 `INSTRUCTORS[park-sungcheol].day` 갱신. Faculty 카드 칩 *"일요일 강사"* 로 노출. PHASE 01 설명 텍스트(`presentation/sections/program.tsx` 의 토일 주제 매핑)는 의도적으로 그대로 유지.

---

## [2026-06-04]

### Added — 신규 기능
- **영문 디폴트화 (B0006)** — `next-intl` 4 + middleware + `/` = en (디폴트), `/ko/*` = 한글. 14 SSG 라우트. 헤더 우상단 `EN | 한국어` 토글. `messages/{en,ko}.json` 470 leaf + 22 섹션. 30개 컴포넌트 `useTranslations` 교체 + 반응형 가드 (clamp / text-wrap balance / nowrap chips). 비자 코드 + K-pop NBHY (U+2011) 보호. `formatKRW` locale-aware. hreflang + sitemap 8 entries + locale-aware metadata.
- **1기 일정 확정 (B0005)** — 마감 **6/21(일) 자정** · 첫 강의 **6/27(토)** · 종강 **7/19(일)** · 수료식 **7/25(토)**. `program.ts` SCHEDULE + `faq.ts` 환불 약관 + `instructor-agreement.md` + 코워크 배너 10 SVG/PNG 재생성.
- **카톡 CS 플로팅 버튼 (B0008)** — 우측 하단 fixed anchor → `pf.kakao.com/_nxhDGX/chat`. SDK 미사용. 카카오 옐로우 + 인라인 SVG + safe-area-inset.
- **FAQ 온라인 강의 항목 (B0010)** — 양 locale 추가. 현장 실무 핵심 → 온라인 미제공 명시.
- **백로그·스펙 시스템 신설 (ADR 0002)** — `docs/tasks/BACKLOG.md` (4 lane Now/Next/Later/Raw) + `docs/specs/` + `docs/decisions/`.
- **CLAUDE.md §6.5 카피·부호 규칙** — em dash · 인터펑크 · 곡선 따옴표 · 단일 ellipsis 금지. 사용자 노출 카피 전부 적용.
- **Hash anchor 본질 검증 (B0014)** — Playwright cold visit. 4/4 케이스 정상 동작 확인.
- **섹션 impression GA4 추적 (B0016)** — `useSectionImpression` (IntersectionObserver) + 15 섹션. event `section_view` + 파라미터 4종. GA4 admin custom dimension 등록.
- **코워크 미팅 결과 박제** — 트래킹 dropped (B0001) · 영문 디폴트 + 카톡 CS 결정 + 카드뉴스 4장 (Cowork 제공 대기).

### Changed — 변경
- **EN recruitment 헤로 폰트 한 단계 다운 (B0013)** — `clamp(2.25rem, 8vw, 6.5rem)`. mobile-sm 5줄 → 4줄. KO 무영향.
- **모바일 카카오 플로터 (B0011)** — 56→48px + bottom 5rem→6.5rem (모바일). recruitment / hero 침범 해소.
- **영문 카피 줄임 (orphan wrap)** — Hero subtitle / recruitment.intro1 / meta description / footer tagline 군더더기 제거.
- **사이트 톤 정리** — `Guaranteed.` 라벨 제거 (법적 리스크) · `cohort` → `class` 영문 전체 · social-proof stat 단위 제거 + nowrap 제거 (서로 침범 해소).

### Infrastructure
- 강사 계약서 `docs/contracts/instructor-agreement.md` 정정 + 강사진 8명 재통보 (노아 수동).

---

## [2026-06-05]

### Added — 신규 기능
- **자체 인스타 카드뉴스 8장 (B0017)** — 4 카드 × en/ko = 8장 (1080×1080 PNG + SVG). Hook / Benefits / Mentorship (토일 강사 카테고리 + 커리큘럼) / CTA (가격 박스 + 가치 메시지). 우상단 `TUITION 20% OFF` -12deg 회전 스티커. NBHY 비자 코드 보존. 강사명·회사명·방송사명 0 노출. v1~v8 노아 직접 다듬기. 도구: `tools/insta-cards.html` + `tools/clip-insta-cards.mjs` + `tools/build-insta-svgs.mjs`.
- **신청-입금 분리 플로우 + 컨펌 모달 (B0007 T3)** — 사용자 의도: 무신뢰 상태에서 계좌 노출 → 외국인 입장에서 신청 자체 안 함. 신청 폼 step 2 마지막 컨펌 모달 신설. 가격 box (strikethrough + 할인가 + 20% OFF) · 결제 수단 · 선착순 30석 · "수강 신청 완료 = 결제 완료 시점" 강조 · "신청 직후 안내" · 환불 단순화 + 약관 링크 + 신뢰 푸터. 친근 톤 locale-aware. 체크박스 X.
- **반자동 발송 모델 (ADR 0003)** — 자동 SMS/이메일 인프라 미도입. 운영자 dashboard 에서 메시지 generate + 1-click 복사 + mailto/sms 직접 발송. 인프라 비용 0.
- **DB enum + audit 확장 (B0007 T2/T8)** — `applicants.status` 7종 (pending/notified/paid/overdue/cancelled/enrolled/refunded) + 신규 12 컬럼 (payment_due_at, payment_confirmed_at, notified_at, reminder_count, last_reminder_at, paid_amount_krw, depositor_name_observed, paid_confirmed_by, cancelled_at, cancel_reason, refunded_at, refund_txn_id).
- **운영자 page `/admin/applicants` (B0007 T7)** — Basic Auth (timing-safe + 503 locked) + robots 3중 차단 + service_role server-only. 신청자 리스트 + 검색 + 필터 + 메시지 generate + mailto/sms + 상태 토글 7종 + 리마인드 D-3/D-1 강조 + CSV export. server actions 7종 (optimistic concurrency).
- **카카오 비즈채널 인증 완료** (노아 manual) — Dropdown 사업자번호 154-28-02110. 알림톡 자동 자산 (2기).

### Fixed
- **PII 로그 누출 fix** — `submit-application.ts` `console.warn(parsed.data)` 제거 (Vercel 로그 30일 retention).
- **Cache-Control hardening** — `/admin/applicants` `fetchCache = "force-no-store"` 추가.

### Docs
- `docs/specs/B0007-payment-flow-split.md` (rev 2 반자동).
- `docs/decisions/0003-payment-channel-and-refund-split.md`.

### QA / Security
- **Mira QA**: 53/54 PASS. 1 WARN 해소.
- **Sage 보안**: 9 PASS + 1 즉시 fix 완료.

---

## [2026-06-07]

### Added — 신규 기능
- **운영자 페이지 확장 Wave 1 (B0018)** — `/admin/applicants` 에 3 기능 추가:
  - **현금영수증 drawer (T2)** — paid/enrolled/refunded row 만 활성. 발급 금액 + 홈택스 발급번호 + 발급일 + 메모 + 이력 list. 홈택스 외부 링크. server action `recordCashReceipt` + `listCashReceipts`.
  - **PII 일괄 anonymize (T3)** — 헤더 [PII 파기 N] chip. 2단계 confirm (warning → `ANONYMIZE` 텍스트 입력 강제). `anonymize_applicants_past_retention()` RPC → 6개월 경과 PII soft anonymize. redacted row 의 메시지·현금영수증 버튼 자동 숨김, 거래 액션 잔존.
  - **다중 발송 broadcast (T4)** — 신청자 다중 선택 (마스터/개별, redacted 비활성) → mailto: BCC 자동 (헤더 인젝션 차단) → 메일 앱 + `messages_log` 일괄 INSERT. 발송 이력 카운트 + 시간순 list.
- **DB 확장 (B0018 T1)** — 신규 8개 테이블 + 1 함수 + seed:
  - `instructors` (강사 3명 seed) · `sessions` (8회 seed: 6/27~7/19) · `attendance` · `applicant_notes` · `messages_log` · `performances` · `certificates` · `cash_receipts`
  - `applicants.redacted_at` + partial index
  - `anonymize_applicants_past_retention()` SECURITY DEFINER (search_path 고정, REVOKE FROM public/anon/authenticated)
  - 모든 신규 테이블 RLS deny-by-default + service_role 전용
  - 외부 연동 대비 nullable 컬럼: `hometax_receipt_no` (홈택스 API 추후) · `pdf_path` (Wave 4 PDF) · 강사 `bank_*`/`phone`/`email`/`business_no`/`resident_no`

### Docs
- `docs/specs/B0018-operator-dashboard-expansion.md` — Wave 4분할 + 8 테이블 SQL + 작업 12 + Mira QA 20 시나리오.
- `docs/decisions/0004-operator-toolset-in-app-vs-external.md` — 외부 SaaS 도입 0 결정.

### QA / Security
- **Mira QA Wave 1**: 21/22 PASS + 16 캡처. 1 minor (T2.4 hometax empty-string → null) 즉시 fix 완료.
- **Sage 보안 Wave 1**: 6 PASS + 1 WARN (redacted dialog 식별자 — Wave 2 backlog) + 2 LOW. **ship 가능, 블로커 0**.

### Infrastructure
- 마이그레이션 `20260607000000_operator_dashboard_tables.sql` Supabase Production 적용 완료.

---

## [2026-06-04]

### Added — 신규 기능
- **코워크 광고 배너 v2 4장** — 기존 6장(`pc-ko/en`, `mw-ko/en`, `app-ko/en`)에 더해 v2 4장(`mw-ko-v2/en-v2`, `app-ko-v2/en-v2`) 추가. **PC 시안의 디자인 언어**(우측 보이그룹 콘서트 이미지 + 강한 좌→우 검정 그라데이션 + 좌상단 회전 핑크 배지 + 인라인 핑크 separator)를 MW/App 사이즈로 일관 적용. 모든 SVG 는 배경 이미지를 base64 로 임베드해 피그마 단독 import 가능. 산출물 위치 `docs/screenshots/kowork/`. 파이프라인 `tools/kowork-banner-pc.html` → `tools/clip-kowork.mjs` → `tools/embed-kowork-images.mjs` → `tools/verify-kowork-svg.mjs`.

### Changed — 변경
- **강사 소개 순서 재배열** — `INSTRUCTORS` 배열을 **이제향 → Nino → 박성철** 순으로 변경. `src/programs/fan-to-pro/domain/program.ts` 한 곳만 수정 (배열을 iterate해서 노출하는 구조라 ID/인덱스 참조 없음 확인 완료). 박성철 강사를 마지막에 배치.

### Fixed — 버그·결함
- **`tools/preview.mjs` 가 `docs/screenshots/` 의 서브디렉터리까지 wipe 하던 문제** — `rm(OUT_DIR, { recursive: true, force: true })` 를 `clearOutDirFiles()` 로 교체. 이제 **top-level 파일만 삭제하고 서브디렉터리는 보존** → `kowork/`, `instructors/` 등 큐레이팅 산출물 폴더가 preview 실행에도 살아남음. 경위는 `docs/lessons/2026-06-04-preview-wipes-screenshots.md` 참조.

### Docs
- `docs/lessons/2026-06-04-preview-wipes-screenshots.md` 신규 — `pnpm preview` 가 코워크 배너 산출물 20장을 통째로 날린 사고의 사후 분석 + 재발 방지 룰.
- `docs/lessons/` 디렉터리 신규 — 향후 사후 분석 문서 보관소.
- `docs/research/kowork-banner-research.md` 보강 — 6월 3일 작성된 코워크 배너 리서치 노트. 매체 스펙·디자인 토큰·문구 안전 글자수·외부 레퍼런스 종합.
