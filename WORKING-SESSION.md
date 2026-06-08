# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
>
> - 큰 작업 끝날 때마다 업데이트
> - 세션 종료 시 완료 항목 표시 + 다음 작업 명시
> - 주 1회 또는 큰 단락마다 `docs/sessions/SESSION-YYYY-MM-DD.md` 로 아카이브 (이 파일은 덮어쓰기)
> - 운영 매뉴얼: [CLAUDE.md §9](./CLAUDE.md)

---

## 📅 Last updated: 2026-06-08

## 🎯 현재 상태 — 1기 모집 운영 중

- **모집 마감**: 6/21(일) 자정 (D-13)
- **첫 강의**: 6/27(토)
- **종강**: 7/19(일)
- **수료식**: 7/25(토)
- **운영자 페이지 배포 완료**: `/admin/{applicants, instructors, finance}` 모두 가동

---

## ✅ 최근 완료 (2026-06-04 ~ 06-08)

### 사이트 핵심
- **B0005** 1기 일정 확정 (모집 6/21·첫 강의 6/27·종강 7/19·수료식 7/25) + 강사진 통지 + 사이트/계약서/배너 정정
- **B0006** 영문 디폴트화 (next-intl, 14 SSG, 헤더 토글 `EN | 한국어`, 30 컴포넌트 i18n)
- **B0008** 카톡 CS 플로팅 버튼 (`pf.kakao.com/_nxhDGX/chat`)
- **B0010** FAQ "온라인 강의 가능 여부" 항목
- **B0013** EN recruitment 헤로 폰트 다운
- **B0011** 모바일 카카오 z-index/위치 조정
- **B0014** Hash anchor cold visit 본질 검증
- **B0016** 섹션 impression GA4 추적 (event `section_view`)
- **B0017** 자체 인스타 카드뉴스 8장 (v1~v8 직접 다듬기)
- **B0019** SEO + GEO 최적화 (JSON-LD 5종 + `llms.txt` + OG locale)

### 신청-입금 분리 + 운영자 페이지 (B0007 + B0018)
- 컨펌 모달 (가격·결제수단·환불 단순화·안내 약속, 친근 톤 locale-aware)
- DB enum 7종 (pending/notified/paid/overdue/cancelled/enrolled/refunded) + audit 컬럼 12개
- 운영자 페이지 `/admin/applicants` — Basic Auth + 신청자 리스트 + 메시지 generate + 1-click 복사 + mailto/sms + 상태 토글 7종 + 리마인드 D-3/D-1 강조 + CSV
- **Wave 1**: 현금영수증 drawer + PII 일괄 anonymize (PIPA §21 6개월 경과 soft anonymize) + 다중 발송 broadcast (BCC + messages_log audit)
- **Wave 2**: 강사 정산 페이지 `/admin/instructors` (CRUD + 정산 기록 + 송금 완료 토글) + 재무 대시보드 `/admin/finance` (KPI 4 카드 + CSV export)
- 신규 9 테이블 (instructors, sessions, attendance, applicant_notes, messages_log, performances, certificates, cash_receipts, instructor_payouts) + anonymize 함수
- Mira QA + Sage 보안 통과 (Wave 1)

### 시스템·운영
- CLAUDE.md §6.5 카피·부호 규칙 (em dash·인터펑크·곡선따옴표·단일ellipsis 금지)
- 백로그·스펙 시스템 신설 (ADR 0002, `docs/tasks/BACKLOG.md` + `docs/specs/` + `docs/decisions/`)
- ADR 0003 결제 채널 + 환불 정책 분리
- ADR 0004 외부 SaaS 도입 0
- 코워크 미팅 결과 박제, B0001 코워크 트래킹 dropped
- 코워크 캡션 4 시나리오 (영문+한글) — 노아가 B (미디엄) 선택해서 Cowork 측 전달
- 카카오 비즈채널 인증 완료 (노아 manual, Dropdown 사업자번호)

---

## 🔄 진행 중 / 대기 중

### Wave 2 QA + 보안 (2026-06-08 완료)
- **Mira QA**: 5 시나리오 PASS / WARN / FAIL→강등 / PASS / WARN. typecheck PASS. 회계 무결성 + PII 보호 + 멱등성 OK
- 캡처 `docs/screenshots/wave2-qa/` (instructors + finance × desktop + mobile)
- **Sage 보안**: pass (critical/high 차단 사유 0). HIGH 1 (server action 인증 freshness — Wave 1 수용 패턴) · MED 3 · LOW 2 모두 backlog (B0026 주민번호 암호화 / B0027 error 매핑 / B0028 CSV refId + 자격 회전)
- **결정**: mailto 정산 메시지 미구현 항목 (Mira #3) → ship + 스펙 강등. 운영자가 외부 메일 클라이언트에서 수동 발송. 종강(7/25) 이후 정산 시점에 다시 판단
- 스펙 §4.1 + §11 Wave 2 시나리오 문구 정정 완료 (코드 = 계약서 §4 = 스펙 일치)
- 잔여 minor: `finance` 운영자 노트 텍스트 영역 미도입 (스펙 §4.2 마지막 bullet 누락). 1기 운영 중 필요해지면 추가

### B0018 Wave 3 (출결) — 6/27 강의 시작 후 진입
- `attendance` 테이블 + 8회 × 30명 출결 UI
- 디폴트 present + 결석자만 토글
- 30분 지각 = 결석 기준

### B0018 Wave 4 (수료증 + 공연) — 7/25 수료식 전
- 수료증 PDF (@react-pdf/renderer, 정형식, 운영자 수동 발급)
- 공연 매칭 + 참여확인서 (유니온 픽처스 명의)

---

## 🛠️ 노아 manual action 잔여

### 즉시 (배포된 운영자 페이지 직접 둘러보기)
- `growthcareer.xyz/admin/applicants`
- `growthcareer.xyz/admin/instructors` (강사 3명 row 의 [편집] → 연락처·이메일·은행 정보 채우기)
- `growthcareer.xyz/admin/finance`

### B0019 SEO/GEO 후속
- Google Search Console: `growthcareer.xyz` 등록 + `sitemap.xml` 제출
- Naver Search Advisor 등록 (한국 시장)
- PageSpeed Insights 측정
- Schema.org Validator + Rich Results Test
- (선택) Bing Webmaster Tools

### B0019 placeholder 정정
- `structured-data.tsx` EducationEvent 시간 (현재 14:00~16:00 placeholder)
- `structured-data.tsx` LocalBusiness 우편번호 (현재 05718 placeholder)

---

## 📁 핵심 파일 / 경로

- **Spec**: `docs/specs/B0007-payment-flow-split.md` · `docs/specs/B0018-operator-dashboard-expansion.md`
- **ADR**: `docs/decisions/0002~0004`
- **Backlog**: `docs/tasks/BACKLOG.md`
- **Changelog**: `CHANGELOG.md` (2026-06-04~06-07 박제됨)
- **운영자 페이지**: `app/admin/` + `src/programs/fan-to-pro/admin/`
- **마이그레이션**: `supabase/migrations/` 5개 (`20260605`, `20260606`, `20260607`, `20260608`)
- **메시지**: `messages/{en,ko}.json` + `src/programs/fan-to-pro/messages/templates.ts`
- **카드뉴스 도구**: `tools/insta-cards.html` + `tools/build-insta-svgs.mjs` + `tools/clip-insta-cards.mjs`

---

## 📚 다음 세션 시작 시 권장 흐름

1. **이 파일 (`WORKING-SESSION.md`) 먼저 읽기** — 컨텍스트 복원
2. `git log --oneline -10` — 최근 커밋 흐름 점검
3. `git status` — 작업 중 변경 사항 확인
4. `docs/tasks/BACKLOG.md` — 다음 작업 우선순위 점검
5. CLAUDE.md / 메모리는 자동 로드되므로 별도 액션 X
