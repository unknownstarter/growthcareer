# Spec - B0018 운영자 페이지 확장 (Phase 2)

**Backlog ID**: B0018
**Date**: 2026-06-05
**Lead**: Aria
**Status**: specced (구현 dispatch 는 노아 결정 7건 확정 후)
**Related**: B0007 (반자동 발송 flow), B0008 (카톡 채널 폴백), ADR 0003 (결제 채널 분리), ADR 0004 (외부 SaaS 도입 안 함)

---

## 1. Overview

### 목적

`/admin/applicants` 가 현재 다루는 범위(신청 → 입금 → 환불) 를 **1기 종강+수료식+공연 매칭** 까지 확장한다. 외부 SaaS 도입 0 을 유지하면서 노아 1인 운영의 *실측 작업 비용* 을 최소화한다.

### Why

1. **법적 의무 누락 risk**. 현금영수증 (10만원 초과 자진발급 의무) + PIPA §21 PII 파기 자동화가 현 코드/매뉴얼 어디에도 없음. 1기 시작 전 박제 필수.
2. **강의 시작 6/27 이후 운영 가시성 0**. 출결·강사 정산·수료증·공연 매칭 모두 외부 도구 없이는 노아 머릿속.
3. **2기 자산화 시점**. 1기 데이터·발송 이력·강사 정산·수료증 발급 트래킹이 2기 자동화 ADR 의 입력값.

### 컨텍스트

- 오늘 2026-06-05 · 모집 마감 D-16 (6/21) · 강의 시작 D-22 (6/27) · 수료식 D-50 (7/25)
- 운영자: 노아 1인 (Dropdown 대표) · 강사: 3명 · 수강생: 20~30명 · 강사료: 250만 ~ 300만
- ADR 0004 결정: 외부 SaaS 추가 도입 0 · 신규 테이블 8개 in-app · 단순 broadcast 만 in-app
- 카카오 비즈채널 인증 완료 상태 (알림톡 API 가능하나 1기 critical path 아님)

### 마일스톤 (Wave 분해)

| Wave | 기한 | 대상 | 빌드 누계 |
|---|---|---|---|
| **Wave 1** | 6/14 (토) | 법적 의무 2건 + 다중 발송 (마감 전 리마인드 broadcast) | ~10h |
| **Wave 2** | 6/21 (일) | 강사·강사료 정산 + 재무 대시보드 | ~16h |
| **Wave 3** | 6/27 (토) ~ 7/19 (일) | 출결 기록 (강의 시작 시점부터 회차마다 사용) | ~8h |
| **Wave 4** | 7/25 (토) | 수료증 PDF + 공연 매칭 + 참여확인서 | ~12h |

총 빌드 36~49h. 마감 6/21 전 10h, 강의 시작 6/27 전 누계 26h, 수료식 7/25 전 누계 49h. 1주 2 ~ 3 시간 페이스로 충분.

---

## 2. 신규 테이블 (8개)

```sql
-- supabase/migrations/20260606000000_operator_phase2_tables.sql

create table public.instructors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text,
  bank_name     text,
  bank_account  text,
  tax_mode      text check (tax_mode in ('withholding_3_3','tax_invoice')),
  base_fee_krw  integer not null,
  bonus_per_n   jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  cohort          text not null default 'fan-to-pro-c1',
  idx             integer not null,
  date            date not null,
  starts_at       time,
  ends_at         time,
  instructor_id   uuid references public.instructors(id),
  venue           text,
  notes           text,
  unique (cohort, idx)
);

create table public.attendance (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  applicant_id  uuid not null references public.applicants(id) on delete cascade,
  status        text not null check (status in ('present','late','absent','excused')),
  note          text,
  recorded_at   timestamptz not null default now(),
  recorded_by   text,
  unique (session_id, applicant_id)
);

create table public.applicant_notes (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.applicants(id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  created_by    text
);

create table public.messages_log (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid references public.applicants(id) on delete set null,
  channel       text not null check (channel in ('kakao','sms','email','broadcast')),
  template_id   text not null,
  locale        text not null check (locale in ('ko','en')),
  body_snapshot text,
  sent_at       timestamptz not null default now(),
  sent_by       text
);

create table public.performances (
  id                       uuid primary key default gen_random_uuid(),
  applicant_id             uuid not null references public.applicants(id),
  event_name               text not null,
  event_date               date not null,
  role                     text,
  daily_fee_krw            integer not null default 0,
  paid_at                  timestamptz,
  confirmation_issued_at   timestamptz,
  notes                    text
);

create table public.certificates (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.applicants(id),
  type          text not null check (type in ('completion','performance')),
  issued_at     timestamptz not null default now(),
  issuer        text not null,
  pdf_blob_url  text,
  serial_no     text unique
);

create table public.cash_receipts (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid not null references public.applicants(id),
  amount_krw    integer not null,
  issued_at     timestamptz,
  receipt_no    text,
  hometax_link  text,
  notes         text
);

-- RLS: applicants 와 동일하게 service_role 만 접근. 운영자 페이지가 server action 으로만 진입.
alter table public.instructors enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.applicant_notes enable row level security;
alter table public.messages_log enable row level security;
alter table public.performances enable row level security;
alter table public.certificates enable row level security;
alter table public.cash_receipts enable row level security;
```

데이터 모델 원칙:
- `applicants` 무수정. 모든 확장은 신규 테이블 + FK
- RLS 는 applicants 와 동일 (service_role only)
- `messages_log` 는 B0007 의 reminder_count 와 별도. *모든* 발송 audit (broadcast 포함)
- `applicant_notes` 는 applicants.notes 단일 컬럼 deprecated 대체 (마이그레이션은 호환 유지)

---

## 3. Wave 1 — 법적 의무 + 다중 발송 (~10h, 6/14 까지)

### 3.1 현금영수증 audit (B0023 sub-spec, ~2h)

목적: 880,000원 수강료는 10만원 초과 → 거래상대방(소비자) 요청 시 발급 의무 (소득세법 §162-3). 자진발급 = 운영자가 홈택스 사이트에서 수동 발급.

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 자진발급 vs 의무발급 | (a) 신청자 옵션 선택 / (b) 무조건 자진발급 | ⭐ (b) 무조건 자진발급 — 옵션 입력 폼 추가 X, 노아가 홈택스 사이트에서 일괄 발급 |
| 홈택스 연계 | (a) 수동 (홈택스 사이트 직접) / (b) 외부 API | ⭐ (a) 수동 — API 인증 부담 vs 30명 규모 trade-off |
| 운영자 매뉴얼 | docs/operations/cash-receipt.md | ⭐ 작성 (홈택스 url + 입력 필드 매핑) |

빌드:
- `cash_receipts` row 1개 / 신청자 (markAsPaid 직후 자동 INSERT — `issued_at=null` 으로 placeholder)
- 운영자 페이지 drawer 에 [현금영수증 발급] 섹션 — 홈택스 외부 링크 + `receipt_no` 텍스트 입력
- 헤더 카운트: "미발급 N건"

### 3.2 PII 자동 파기 cron (B0024 sub-spec, ~3~4h)

목적: PIPA §21 "수집 목적 달성 후 지체 없이". 학원법은 명시 N개월 없음. 업계 표준 = 1년 이내 보관 후 파기 (분쟁·환불 대비).

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 보유 기간 | (a) 종강 +3개월 / (b) 종강 +6개월 / (c) 종강 +1년 | ⭐ (b) 6개월 — 환불 청구 가능 기간 (전자상거래법 5년 보존은 거래기록 only, PII 별도) |
| 파기 방식 | (a) hard delete / (b) soft delete + anonymize | ⭐ (b) anonymize — `name='[redacted]'`, `email='[redacted]'`, `phone='[redacted]'`, `birth=null`, `address=null` + `redacted_at` 컬럼. 거래 통계는 보존 |
| audit log | (a) 별도 테이블 / (b) Vercel 로그만 | ⭐ (a) `messages_log` 와 동급의 `pii_redactions` 컬럼 1개로 충분. 별도 테이블 불필요 (`applicants.redacted_at` is null check) |
| 파기 트리거 | (a) Vercel Cron 매일 1회 / (b) 운영자 수동 [일괄 파기] 버튼 | ⭐ (b) 수동 — Vercel Cron 도입 안 함 (ADR 0003 일관성). 운영자 페이지 푸터 [보유기간 만료 일괄 anonymize] 버튼 |

빌드:
- `applicants` 에 `redacted_at timestamptz` 컬럼 1개 추가
- 운영자 페이지 푸터 [일괄 anonymize] 버튼 — `WHERE status in ('enrolled','cancelled','refunded') AND created_at < now() - interval '6 months' AND redacted_at IS NULL`
- 클릭 시 confirm 모달 + 처리 카운트 표시
- 운영 매뉴얼 `docs/operations/pii-retention.md`

### 3.3 다중 발송 (B0025 sub-spec, ~4h)

목적: 마감 D-3 / D-1 시점 미입금자 일괄 리마인드, 강의 시작 D-1 안내, 수료식 안내 등 N명 broadcast.

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 채널 | (a) 이메일만 / (b) 이메일 + SMS / (c) + 카톡 알림톡 API | ⭐ (a) 이메일만 — mailto bulk 는 OS 별 한계 (10명 이상 mailto 깨짐). 따라서 `messages_log` INSERT 만 + 노아가 BCC 로 본인 메일 클라이언트에서 직접 발송. 카톡 알림톡 API 는 2기 이후 |
| 발송 트리거 | (a) 수동 / (b) 사전 예약 | ⭐ (a) 수동 — cron 미도입 일관성 |
| 템플릿 | (a) Stibee / (b) in-app textarea | ⭐ (b) in-app — Stibee 8,900원/월 6개월 = 53,400원 < 빌드 4h 시간가치 trade-off 으로 in-app |
| 1기 vs 2기 alumni 구분 | (a) `cohort` 필드 추가 / (b) 1기 단일 가정 | ⭐ (b) 1기 단일 가정 — 2기 도입 시 cohort 컬럼 추가하는 마이그레이션은 1 SQL |

빌드:
- 운영자 페이지 헤더 옆 [다중 발송] 버튼 → 모달
- 모달: status 필터 + locale 필터 → preview 대상자 카운트
- 본문 textarea + 템플릿 선택 (입금 안내 / 리마인드 / 강의 안내 / 수료식 안내 5종)
- [BCC 메일 본문 복사] 버튼 → 클립보드에 `BCC: a@b, c@d, ...` + subject + body
- 노아가 본인 이메일 클라이언트에 붙여넣고 발송
- 발송 후 [발송 완료] 클릭 → `messages_log` 일괄 INSERT (`channel='broadcast'`, `template_id`, 대상 applicant_id 리스트)
- Sage 인계 사항: BCC 필수 (TO 발송 시 받는 사람들 이메일 노출). 모달 UI 가 BCC 만 가능하도록 (TO 옵션 미제공)

---

## 4. Wave 2 — 강사 정산 + 재무 대시보드 (~16h, 6/21 까지)

### 4.1 강사·강사료 정산 (B0021 sub-spec, ~8~10h)

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 저장 범위 | (a) 이름·계좌만 / (b) + 세금 모드 (`withholding_3_3`/`tax_invoice`) / (c) + 사업자번호 | ⭐ (b) — 강사가 사업자등록 여부에 따라 원천징수 3.3% vs 세금계산서 분기. 계약서 §7 기준 |
| 세금 처리 | (a) 운영자가 매번 결정 / (b) `tax_mode` 컬럼 + 자동 계산 | ⭐ (b) `tax_mode` 컬럼 — instructors INSERT 시 1회 결정 후 정산 시 자동 차감 |
| 정산 트리거 | (a) 종강 후 10영업일 자동 알림 / (b) 운영자 수동 | ⭐ (b) 수동 — 강사료 계약서 §7 "종강 후 10영업일 이내" 는 운영자 obligation, 자동 알림 cron 도입 안 함 |
| audit log | (a) `messages_log` 재사용 / (b) `instructor_payouts` 별도 테이블 | ⭐ (a) 재사용 — `channel='email'`, `template_id='instructor_payout'`. 별도 테이블 안 만듦 |

빌드:
- `instructors` 테이블 + `sessions` 테이블 (사전 입력 — 이제향·Nino·박성철 3명, 8회 강의 매핑)
- 운영자 페이지 신규 탭 `/admin/instructors`
- 강사 리스트 + 강사료 자동 계산 (`base_fee_krw` + `bonus_per_n` jsonb 룰)
  - 예: `{"20": 0, "25": 500000, "30": 1000000}` = 20명 250만 / 25명 300만 / 30명 350만
- [정산 메시지 생성] 버튼 → mailto: 강사 이메일 + 본문 (송금 안내 + 세금계산서 요청 or 원천징수 안내)
- 노아가 송금 + 송금 완료 토글 → `messages_log` INSERT

### 4.2 재무 대시보드 (B0022 sub-spec, ~4~6h)

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| KPI 카드 우선순위 | (a) 매출·환불·강사료·마진 4장 / (b) + 미수금·차주 환불 예상 6장 | ⭐ (a) 4장 — 6장 짜리는 2기 이후. 1기는 정산 단순 |
| 그래프 | (a) 일별 / (b) 주별 / (c) 카드만 (그래프 X) | ⭐ (c) 카드만 — 30명 규모는 그래프 의미 없음 |
| 회계사 공유 | (a) CSV export / (b) Google Sheets sync API | ⭐ (a) CSV — Sheets API 인증 부담 vs 회계사 월 1회 트랜잭션 trade-off |

빌드:
- 운영자 페이지 신규 탭 `/admin/finance`
- 카드 4장:
  - 매출: `sum(paid_amount_krw)` WHERE `status in ('paid','enrolled')`
  - 환불: `sum(paid_amount_krw)` WHERE `status='refunded'`
  - 강사료: `instructors` 강사료 합계 (수동 입력된 정산 완료 분 only)
  - 마진: 매출 - 환불 - 강사료
- 회계 CSV export 버튼 (applicants + instructors + performances 통합)
- 운영자 노트 텍스트 영역 1개 (기타 비용 자유 기재)

---

## 5. Wave 3 — 출결 기록 (~8h, 6/27 ~ 7/19)

### 5.1 출결 기록 (B0019 sub-spec, ~6~8h)

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 입력 UI | (a) 체크박스 매트릭스 (행 신청자 / 열 회차) / (b) 회차별 페이지 + drag select / (c) 일괄 출석 + 결석자만 토글 | ⭐ (c) — 30명 중 대부분 출석 가정. 결석자만 토글이 가장 빠름 |
| 출결 기준 | (a) 10분 초과 지각 = 결석 / (b) 30분 초과 지각 = 결석 / (c) 단순 binary (출석/결석) | ⭐ (b) 30분 — 부트캠프 표준. `status` enum 4종 (present/late/absent/excused) |
| 결석 SOP | (a) 자동 알림 / (b) 운영자 수동 카톡 | ⭐ (b) — 노아 1인 판단 |

빌드:
- `sessions` 사전 입력 (Wave 2 에서 이미 됨)
- 운영자 페이지 신규 탭 `/admin/attendance`
- 회차 선택 → applicants 리스트 (enrolled 만) → 디폴트 `present` + 결석자만 [late/absent/excused] 토글
- 회차별 출결률 카운트 + 신청자별 누적 출결률 (수료 기준 80% 가정)
- 출결 누적 80% 미만이면 빨간 강조

---

## 6. Wave 4 — 수료증 + 공연 + 참여확인서 (~12h, 7/25 까지)

### 6.1 수료증 PDF (B0020 sub-spec, ~4~6h)

| 결정 항목 | 옵션 | Aria 권장 |
|---|---|---|
| 라이브러리 | (a) `@react-pdf/renderer` / (b) `pdfkit` / (c) Vercel Functions + Puppeteer | ⭐ (a) `@react-pdf/renderer` — JSX 친화, Next.js App Router server action 안에서 sync 생성, Vercel Blob 업로드 |
| 디자인 | (a) 사이트 톤 (분홍·핑크) / (b) 정형식 (흑백 + 인장) | ⭐ (b) 정형식 — 수료증은 제3자 (취업·비자) 제출 가능. 사이트 톤은 신뢰 신호 부족 |
| 발급 시점 | (a) 수료식 당일 자동 / (b) 운영자 [수료증 발급] 버튼 수동 | ⭐ (b) 수동 — 수료 기준 충족 여부 (출결 80%) 노아가 최종 결정 |
| 발송 채널 | (a) 이메일 첨부 / (b) 다운로드 링크 | ⭐ (b) 다운로드 링크 — Vercel Blob URL + 운영자가 mailto: 로 직접 발송 (B0007 패턴 일관) |

빌드:
- `@react-pdf/renderer` 컴포넌트 1개 (Dropdown 명의, 이름·기수·발급일·serial_no 변수)
- 운영자 페이지 drawer 에 [수료증 발급] 버튼 (status='enrolled' + 출결 80% 만족 시 활성화)
- 클릭 시 PDF 생성 → Vercel Blob 업로드 → `certificates` INSERT (`type='completion'`, `pdf_blob_url`, `serial_no`)
- mailto 본문에 다운로드 링크 자동 삽입

### 6.2 공연 매칭 + 참여확인서 (~6h)

빌드:
- `performances` 테이블에 직접 운영자가 INSERT (공연 이벤트별 row)
- 출연자 매칭 (applicant_id) + 일당 + 참여확인서 발급 토글
- 참여확인서 발급 = 수료증 PDF 컴포넌트 재사용 (`type='performance'`, issuer='유니온 픽처스')

---

## 7. 작업 분해 (Tasks)

| ID | Wave | 작업 | 담당 | 의존 | 소요 | 검증 |
|---|---|---|---|---|---|---|
| T1 | 1 | 신규 8개 테이블 마이그레이션 + RLS | Iris | - | 2h | supabase-verify.mjs 통과 |
| T2 | 1 | 현금영수증 audit UI + `cash_receipts` 자동 INSERT 후크 | Luna | T1 | 2h | markAsPaid 직후 row 생성 + drawer 표시 |
| T3 | 1 | PII anonymize 일괄 액션 + `redacted_at` 컬럼 | Iris | T1 | 3h | 6개월 경과 row 일괄 anonymize 정확 |
| T4 | 1 | 다중 발송 모달 + BCC 본문 생성 + `messages_log` INSERT | Luna | T1 | 4h | 5종 템플릿 + BCC 클립보드 + 발송 audit |
| T5 | 2 | `instructors` 사전 입력 + `/admin/instructors` 탭 | Luna | T1 | 5h | 3명 강사 row + 강사료 자동 계산 + 정산 메시지 generate |
| T6 | 2 | `/admin/finance` 카드 4장 + CSV export | Luna | T1, T5 | 5h | 카드 4종 정확 + CSV 회계사 포맷 |
| T7 | 2 | `sessions` 8회 사전 입력 | Iris | T1, T5 | 1h | 8 row + instructor_id FK |
| T8 | 3 | `/admin/attendance` 출결 입력 UI | Luna | T1, T7 | 6h | 회차별 출결 토글 + 누적 출결률 |
| T9 | 4 | `@react-pdf/renderer` 수료증 컴포넌트 + Blob 업로드 | Luna | T1 | 4h | PDF 정형식 디자인 + serial_no 유니크 |
| T10 | 4 | `/admin/performances` 공연 매칭 + 참여확인서 발급 | Luna | T1, T9 | 4h | 공연 row + 일당 + 참여확인서 PDF |
| T11 | all | Mira QA 시나리오 (Wave 별 5종) | Mira | T1~T10 | 6h | 각 Wave 종료 시 PASS |
| T12 | all | Sage 보안 검토 (BCC·anonymize·PDF Blob URL 권한·Basic Auth) | Sage | T4, T3, T9 | 3h | 통과 의견 + spec 반영 |

총 45h. 1주 8~10h 페이스로 5~6주. 마일스톤 Wave 1 = 6/14, Wave 2 = 6/21, Wave 3 = 7/19, Wave 4 = 7/25 충분 도달.

### 의존성 그래프

```
T1 (마이그레이션)
 ├─ T2 (현금영수증)   [Wave 1 병렬]
 ├─ T3 (PII)          [Wave 1 병렬]
 ├─ T4 (다중 발송)    [Wave 1 병렬]
 ├─ T5 (강사) ── T6 (재무) [Wave 2 순차]
 │              └ T7 (sessions)
 │                └ T8 (출결) [Wave 3]
 └─ T9 (수료증 PDF) ── T10 (공연 + 참여확인서) [Wave 4 순차]

T11 (Mira) · T12 (Sage) 는 각 Wave 종료마다 invoke
```

병렬 가능: T2 · T3 · T4 (Wave 1) · T5 + T9 (서로 의존성 없음 — 강사 + PDF 동시 빌드 가능)
순차 필수: T1 → all · T5 → T6 · T7 → T8 · T9 → T10

---

## 8. Done When

12개 충족:

1. supabase 8개 테이블 마이그레이션 적용 + RLS 통과
2. `cash_receipts` 자동 placeholder INSERT + 운영자 drawer 발급 UI 동작
3. `applicants.redacted_at` 컬럼 + 6개월 경과 일괄 anonymize 동작
4. 다중 발송 모달이 BCC 본문 생성 + `messages_log` 일괄 INSERT
5. `instructors` 3명 사전 입력 + 강사료 자동 계산 (20명 / 25명 / 30명 분기)
6. `/admin/finance` 4개 카드 + CSV export 동작
7. `sessions` 8회 사전 입력 (강사 매핑 완료)
8. `/admin/attendance` 회차별 출결 토글 + 80% 미만 빨간 강조
9. 수료증 PDF (`@react-pdf/renderer`) 생성 + Vercel Blob 업로드 + serial_no 발급
10. 공연 매칭 row + 참여확인서 PDF (`type='performance'`, 유니온 픽처스 명의)
11. Mira QA 시나리오 Wave 별 5종 PASS (총 20종)
12. Sage 보안 검토 PASS (BCC 강제 / anonymize 무결성 / Blob URL 권한 / Basic Auth)

---

## 9. Risks + Mitigation

| 리스크 | 영향 | 확률 | 완화책 |
|---|---|---|---|
| **R1 강의 시작 6/27 까지 16일** — 빌드 + QA + 노아 manual action 정렬 빡빡 | 출결 기록 회차 1 누락 | 중 | Wave 분해로 critical path 분산. 출결은 Wave 3 (6/27 시작) 까지만 도달하면 됨 |
| **R2 강사 정보 입력 누락** = 정산 지연 | 강사 신뢰 저하 | 중 | T7 = 6/14 까지 사전 입력 완료. 노아 manual action (계좌 정보 받기) Wave 1 안에 처리 |
| **R3 수료증 PDF 디자인 컨펌 시간** | 7/25 직전 디자인 변경 risk | 낮음 | 정형식 (흑백 + 인장) 으로 단순화. 사이트 톤 옵션 거부 |
| **R4 PII 파기 정책 미정** 시 1기 종료 후 수동 작업 시간 부족 | PIPA 위반 risk | 중 | Wave 1 안에 6개월 보유 + anonymize 정책 박제. 종강 + 6개월 = 2027-01-19 자동 강조 |
| **R5 다중 발송 BCC 누락 → TO 발송** | 수강생 이메일 상호 노출 → 정보통신망법 위반 | 낮음 | UI 가 BCC 만 노출. TO 옵션 자체 제공 X. Sage 검토 |
| **R6 외국인 수강생 unsubscribe 율** | 마케팅 메시지 spam 인식 | 낮음 | broadcast 는 거래 메시지 only (입금 안내·리마인드·강의 안내·수료식 안내). 정보통신망법 §50 적용 X |
| **R7 Vercel Blob 무료 quota 초과** | 수료증 PDF 30개 호스팅 비용 | 낮음 | 30개 x 100KB = 3MB. 무료 quota (1GB) 충분 |

---

## 10. Sage 보안 인계

Wave 별 종료 시 Sage 가 점검:

| Wave | 점검 항목 |
|---|---|
| 1 | (a) 다중 발송 모달 의 BCC 강제 — TO 옵션 UI 부재 확인, (b) PII anonymize 가 진짜 컬럼 NULL · `[redacted]` 으로 덮어쓰는지, (c) 현금영수증 audit 의 `receipt_no` 입력 XSS 방어 |
| 2 | (a) instructors 테이블의 `bank_account` 컬럼 응답 시 마스킹, (b) 재무 CSV 다운로드 path 의 Basic Auth 통과 검증 |
| 3 | (a) attendance 입력 시 applicant_id 검증 (URL 조작), (b) 누적 출결률 계산 SQL injection 방어 |
| 4 | (a) Vercel Blob URL 의 권한 (public read 인지 signed url 인지), (b) serial_no 충돌 시 동작, (c) PDF 메타데이터 PII 노출 |

---

## 11. Mira QA 시나리오 (Wave 별 5종)

각 Wave 종료 후 invoke. 캡처 + DB 검증.

### Wave 1

1. 신청자 1명 markAsPaid → `cash_receipts` row 자동 생성 → drawer 에 [현금영수증 발급] 표시
2. 현금영수증 `receipt_no` 입력 → `cash_receipts.issued_at` 자동 기록
3. 다중 발송 모달 → status='notified' 필터 → 3명 선택 → BCC 본문 클립보드 정확
4. [발송 완료] 클릭 → `messages_log` 3 row INSERT (`channel='broadcast'`)
5. 가짜 applicant 1명 created_at 6개월 전 → [일괄 anonymize] → name/email/phone `[redacted]`, redacted_at 기록

### Wave 2

1. instructors 3명 사전 입력 → `/admin/instructors` 리스트 표시
2. 수강생 25명 가정 → 강사료 자동 계산 = 300만 (bonus_per_n 룰 적용)
3. [정산 메시지 생성] → mailto 본문에 송금 안내 + 세금 모드 분기 정확
4. `/admin/finance` 카드 4종 (매출 880만 x N / 환불 / 강사료 / 마진) 정확
5. CSV export → applicants + instructors + performances 통합 다운로드

### Wave 3

1. session 1회차 출결 → 디폴트 present, 결석자 1명만 absent 토글 → DB 반영
2. 4회차까지 누적 → 누적 출결률 계산 정확
3. 출결 80% 미만 신청자 빨간 강조
4. 결석 = `excused` 토글 시 비고 입력 가능
5. 회차별 출결률 카운트 헤더 표시

### Wave 4

1. 수료자 (출결 80% 충족) drawer 의 [수료증 발급] 활성화 / 미충족자 비활성화
2. [수료증 발급] 클릭 → PDF 생성 + Vercel Blob 업로드 + `certificates` INSERT
3. PDF 다운로드 → 정형식 디자인 + Dropdown 명의 + serial_no 표시
4. 공연 row INSERT + applicant_id 매칭 + 일당 입력
5. [참여확인서 발급] → 유니온 픽처스 명의 PDF + `certificates` (`type='performance'`) INSERT

---

## 12. Open Questions (노아 결정 필요)

본 spec 구현 dispatch 전 **7건 + 추가 3건** 답변 필요. §13 참조.

---

## 13. 노아 결정 회신 form

각 결정에 옵션 + Aria 권장안 ⭐ 표기. 이 form 의 답 7건이 spec dispatch 의 입력값.

```
[B0023 현금영수증]
1) 자진발급 vs 의무발급: ⭐ 자진발급 / 의무발급 / 보류
2) 홈택스 연계: ⭐ 수동 / 외부 API / 보류
   답:

[B0024 PII 파기]
3) 보유 기간: 종강+3개월 / ⭐ 종강+6개월 / 종강+1년
4) 파기 방식: hard delete / ⭐ anonymize / 보류
5) 트리거: cron / ⭐ 수동 [일괄 anonymize] 버튼
   답:

[B0025 다중 발송]
6) 채널: ⭐ 이메일 BCC / 이메일 + SMS / + 카톡 알림톡 API
7) 템플릿: ⭐ in-app textarea / Stibee
   답:

[B0021 강사 정산]
8) 세금 모드 컬럼: ⭐ 추가 (withholding_3_3/tax_invoice) / 추가 안 함
9) 정산 트리거: 종강 +10영업일 자동 / ⭐ 수동
   답:

[B0022 재무 대시보드]
10) KPI 카드: ⭐ 4장 (매출·환불·강사료·마진) / 6장
11) 회계사 공유: ⭐ CSV / Google Sheets API
    답:

[B0019 출결]
12) 입력 UI: 체크박스 매트릭스 / drag select / ⭐ 디폴트 present + 결석자만 토글
13) 출결 기준: 10분 지각 / ⭐ 30분 지각 / binary
    답:

[B0020 수료증 PDF]
14) 라이브러리: ⭐ @react-pdf/renderer / pdfkit / Puppeteer
15) 디자인: 사이트 톤 / ⭐ 정형식 흑백
16) 발급 시점: 수료식 자동 / ⭐ 운영자 수동
17) 발송: 이메일 첨부 / ⭐ 다운로드 링크 + mailto
    답:
```

이 form 의 답이 도착하면 Aria 가 spec status = approved 로 전환 후 Wave 1 부터 Iris·Luna 디스패치.
