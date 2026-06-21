# 06 Finance & Tax — 정산 / 세무 / 회계

> 1기 손익 + 정산 / 세무 처리 가이드. 학원 미등록 = 일반 과세 (시나리오 B).

## 1기 손익 분석 (11명 paid 기준)

### 매출 (11 × 880,000원)

- 9,680,000원 (정가 880,000 × 11명)
- (할인 적용분 차감 가능 — 1기는 정가 그대로 가정)
- VAT 포함 (880,000 = 800,000 + VAT 80,000)
- 매출 (excl VAT) = 8,800,000원
- 매출 VAT = 880,000원

### 비용 (1기 예상)

| 항목 | 금액 (KRW) | 비고 |
|---|---|---|
| 강사료 | 5,000,000 | 8회 × 강사 단가 (실제는 강사 3인 분담 — 회사 정산) |
| 강의장 (블루스프링하우스) | 600,000 | 8회 + 수료식 1회 = 9회 × 단가 |
| 네트워킹 파티 (7/25) | 500,000 | 다과 / 음료 / 케이터링 |
| 소계 | 6,100,000 | |

### 손익 (11명 기준)

- 매출 (excl VAT): 8,800,000
- 비용: 6,100,000
- **마진**: 2,700,000원
- 마진율: 약 30%

### 학생당 손익

- 매출 (excl VAT) 1인 = 약 800,000원
- 비용 1인 = 약 554,000원 (6,100,000 / 11)
- 마진 1인 = 약 245,000원

## 세무 (시나리오 B: 학원 미등록 = 일반 과세)

### 부가가치세 (VAT)

- **세율**: 10% (매출 / 매입 모두)
- **신고**: 분기별 (Q1: 1~3월, Q2: 4~6월, Q3: 7~9월, Q4: 10~12월) + 예정 신고 (4월 / 10월)
- **1기 매출**: Q2 (4~6월) 또는 Q3 (7~9월) — 결제일 기준
- **납부**: 매출 VAT - 매입 VAT = 납부세액

**1기 예상 VAT**:
- 매출 VAT: 880,000원
- 매입 VAT (강의장 / 자료 / 마케팅): 약 600,000 × 0.1 = 60,000원 (간이)
- 납부 VAT: 약 820,000원

### 원천징수 (강사료)

- **세율**: 3.3% (소득세 3% + 지방세 0.3%)
- **대상**: 사업소득 (강사가 사업자 등록 안 한 경우) — 회사 사업자 등록한 경우 세금계산서 처리
- **분기**: `companies.vat_issuer` 기준
  - `vat_issuer=true` (회사가 사업자 등록 + 부가세 발행): 세금계산서 받고 강의료 + VAT 송금
  - `vat_issuer=false` (개인 / 비사업자): 3.3% 원천징수 후 송금
- **신고**: 매월 10일 (전월분)

### 종합소득세 (개인 사업자)

- 1년 매출 종합 → 다음 해 5월 종합소득세 신고
- Dropdown 사업자 (개인사업자 가정 — 법인은 별도)

### 세무 일정 시스템 (`tax_filings` 테이블)

- `vat_q1` / `vat_q2` / `vat_q3` / `vat_q4` / `vat_predeclaration_q1` / `vat_predeclaration_q3`
- `income_tax` (종합소득세 5월)
- `withholding_report` (원천징수 매월)

운영: `/fan-to-pro/admin/finance` 의 "세무 일정" 영역 (B0034 Wave 3, Wave 1 Step 2 흡수)

## 정산 시스템

### `cohort_expenses` 테이블

카테고리 (B0034):
- `instructor_fee` — 강사료
- `venue_rental` — 강의장
- `event` — 네트워킹 / 수료식
- `materials` — 자료 / 인쇄
- `marketing` — 광고 / 카드뉴스 / 배너
- `other` — 기타

각 비용 row: `cohort_id` + `category` + `amount_krw` + `vat_included` + `description` + `created_at` + `paid_at`

### 회사 단위 정산 (강사 회사 → 송금)

- `companies` 테이블 (강사 회사)
- 강사 1인 = 1 회사 (또는 회사 1개에 여러 강사 묶임 가능)
- `company_settlements` (계획) — 회사별 합산 정산 + 세금계산서 처리
- 세금계산서 발행 트래킹: `invoice_status` (pending / received / paid) + `invoice_number`
- 송금 기록: `transfer_status` + `transferred_at`

### 회계 CSV export

- 매달 / 분기말 회계사에게 CSV 전달
- refId 마스킹 (B0028, viewer PII 강화) — UUID 그대로 노출 X, short hash (`app-A1B2`) 매핑
- 매핑 테이블 DB 내부만 보존

## 결제 수단

### 1기 = 토스뱅크 계좌이체 only

- **예금주**: Dropdown
- **계좌**: 토스뱅크 1002-4759-1521
- **수단**: 일시납 (분할 X)
- **해외 카드**: X (해외 신청자 한국 친구 통한 송금 안내)

### 다음 기수 검토 후보

- 해외 결제 (Stripe / Toss Payments international) — 노아 결정 필요 (수수료 vs 편의)
- 분할 결제 (2회 / 3회) — 운영 복잡도 증가, 환불 시 분기 처리 어려움
- 카드 직결제 (Toss Payments / KakaoPay) — 수수료 3% 가까이

## 현금영수증

- B0023: 현금영수증 발급 시스템 (B0018 Wave 1)
- 신청자가 현금영수증 요청 시 운영자가 발급
- `cash_receipts` 테이블: applicant_id + amount + issue_date + receipt_number

## PII 파기 (개인정보보호법)

- B0024: PII 파기 시스템 (B0018 Wave 1)
- cancelled / refunded 일정 경과 후 자동 마스킹
- 보존 기간: PIPA §21 기준
- 마스킹된 row 에 `[REDACTED]` chip 노출

## 다음 기수 전 결정 필요 사항

1. **정산 메일 강사 breakdown**: 회사 정산 메일에 강사 개인별 금액 노출 vs 회사 합계만 (노아 보류 결정)
2. **VAT 발행 회사 강사 회사 정보**: 회사명 / 사업자번호 / 주소 / 담당자 이메일 / 계좌 / 부가세 발행 여부 — Wave 3 정산 전 필요
3. **자동 정산 trigger**: 월별 자동 정산 trigger (B0036 Wave 5) — 트리거 = 100명 규모
4. **결제 수단 확장**: 해외 카드 / 분할 / 카드 직결제

## 회계 운영 매뉴얼 (다음 기수 시작 전 노아 manual)

1. 매 신청 / 결제 발생 시: `applicants` 의 payment_audit 컬럼 (paid_amount_krw / depositor_name_observed / paid_confirmed_by / paid_at) 채우기
2. 매 비용 발생 시: `/fan-to-pro/admin/finance` 에서 cohort_expenses entry 추가
3. 매월 말: 회계 CSV 다운로드 + 회계사 전달
4. 매 분기 말: VAT 신고 (회계사 위임 또는 홈택스 직접)
5. 매월 10일: 원천징수 신고 (강사 정산 발생 시)
6. 매년 5월: 종합소득세 신고 (Dropdown 명의)
