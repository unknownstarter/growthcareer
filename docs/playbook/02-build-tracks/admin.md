# 02 Build Tracks — Operator Admin (Basic Auth)

> 1기 모집 운영용 어드민. **다크 톤**. `/admin/*` 경로. Basic Auth.

## 스택

- **Basic Auth** (middleware) — username/password env 기반
- **다크 디자인** — 마케팅 사이트와 동일 톤 (기존 영역, CLAUDE.md §7.4 변경 금지)
- **React Server Components** + Server Actions (Next.js App Router)
- **Supabase service_role** (RLS bypass, 운영자 권한)

## URL 구조

```
/admin/applicants    → 신청자 명단 + 액션 (메시지 발송 / status 토글 / PII 파기)
/admin/instructors   → 강사 명단 + 정산
/admin/finance       → 재무 대시보드 (매출 / 비용 / 마진)
```

## 핵심 기능

### `/admin/applicants`

- 신청자 테이블 (status 우선순위 정렬: pending → notified → overdue → paid → enrolled → refunded → cancelled → next_cohort_interest)
- 30초 silent polling → "변경 알림 chip" 패턴 (스피너 X)
- 통계 chip: PENDING / NOTIFIED / PAID / OVERDUE / CANCELLED / REFUNDED / NEXT COHORT
- **메시지 발송 모달**: paymentGuide / paymentConfirmed / reminderT1 / reminderD3 / reminderD1 / referralInvite / cohortKickoff
  - SMS 또는 email 선택
  - ko / en 선택 (또는 신청자 locale 따라 자동)
  - 1-click 복사 + mailto:// + sms:// 링크 → 노아 본인 카톡/SMS/메일 클라이언트로 수동 발송
- **status 토글**: paid 확인 후 입금 처리 / cancelled / refunded / next_cohort_interest 등
- **PII 파기**: cancelled / refunded 일정 경과 후 PII 마스킹 (PIPA §21)
- **다중 발송**: broadcast 모드 (여러 신청자 선택 → 같은 메시지 일괄 발송 링크)
- **현금영수증**: 발급 토글 + 메모
- **viewer role**: read-only (cowork 공유용). 2026-06-22 정책 변경 — viewer 도 email / phone 전체 노출 (이전: 마스킹). 신청자 직접 contact 가능성 목적. mutation 은 여전히 admin only.

### `/admin/instructors`

- 강사 명단 (실명 + 회사 + 계좌 + 사업자번호 + 부가세 발행 여부)
- 강사별 정산 (회차 × 단가 + VAT 분기)
- 회사 dropdown (companies 테이블 연동)

### `/admin/finance`

- 매출 / 비용 / 마진 KPI
- 강사 정산 합계
- cohort_expenses (강사료 / 강의장 / 행사 / 자료 / 마케팅 / 기타)
- tax_filings 일정 (VAT Q1/Q2 / 사전 신고 / 종합소득세 / 원천징수)

## 권한 / 인증

- **Basic Auth** — `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` env. 운영자 1명 (노아).
- **viewer role** — `BASIC_AUTH_VIEWER_USER` / `BASIC_AUTH_VIEWER_PASS`. read-only.
- middleware (`middleware.ts`) realm rotation 으로 logout 트릭 처리.
- 12시간 cookie session timeout.

### 한계 (lessons)

- Basic Auth 는 본질적으로 logout 깔끔하지 않음 — 브라우저 자격 캐시. realm 변경 + 12시간 timeout 으로 우회.
- 다음 단계 (B0029): NextAuth / Clerk / Supabase Auth + httpOnly cookie 전환 검토. 트리거 = 운영자 2명 이상 또는 외부 공유 추가 시.

## DB 테이블 (Basic Auth 어드민이 다루는)

- `applicants` — 신청자 (B0007 + B0018 확장)
  - 신규 컬럼 시계열로 누적: nationality / cohort_id / payment_audit (paid_amount_krw / depositor_name_observed / paid_confirmed_by / cancelled_at / cancel_reason / refunded_at / refund_txn_id) / reminder_count / last_reminder_at / consent_* / status (8 enum)
- `instructors` — 강사 (B0018 Wave 2)
- `companies` — 회사 (B0031 Wave 0)
- `cohorts` / `sessions` — 회차 (B0031 Wave 0)
- `attendance` — 출결 (B0031 Wave 0)
- `messages_log` — 메시지 발송 이력
- `cash_receipts` — 현금영수증
- `cohort_expenses` / `tax_filings` — 재무 (B0034 Wave 3, B0018 Wave 2 흡수)

## 변경 금지 (CLAUDE.md §7.4)

1. 기존 어드민 3-tab (`/admin/applicants` `/admin/instructors` `/admin/finance`) 의 컬럼/액션/폴링 동작 변경 금지
2. 기존 server actions 함수 시그니처 변경 금지 (`admin-actions.ts` `instructor-actions.ts` `finance-actions.ts` `polling-actions.ts`)
3. `messages/templates.ts` 의 기존 메시지 종류 (paymentGuide / paymentConfirmed / reminder*) 손대지 않음
4. Basic Auth 와 LMS Supabase Auth 절대 통합 금지 — 노아는 두 계정 별도 보유, 다른 cookie scope 동시 로그인

## 다음 기수 전 고려할 변경

- viewer PII 마스킹 강화 (B0028) — 회계사 CSV refId 마스킹
- 강사 `resident_no` (주민번호) 암호화 + UI 마스킹 (B0026, 개인정보보호법 §24 의무)
- toast error 매핑 (B0027) — Supabase error.message passthrough 제거 → schema 노출 차단
- 운영자 인증 cookie session 전환 (B0029) — 트리거 시
