# 08 Automation Candidates — 자동화 후보

> 1기 운영에서 발견된 반복 수동 작업 → 자동화 후보. 우선순위 + 비용 + 보상 정리.
>
> **승격 룰**: 같은 수동 작업 3회 이상 발생 + 노아 시간 cost 충분히 큼 → 후보 등록. 2기 시작 전 우선순위 결정.

---

## 우선순위 매트릭스

| 순위 | 후보 | 1기 발생 횟수 | 절약 시간/회 | 구현 비용 | ROI |
|---|---|---|---|---|---|
| **High** | A1. 입금 확인 토글 + paymentConfirmed 자동 발송 | 11회 | 5분 | 중 | ★★★★★ |
| **High** | A2. 리마인드 자동 발송 (T+1 / D-3 / D-1) | 15회+ | 3분 | 중 | ★★★★ |
| **High** | A3. 다음 기수 알림 리스트 일괄 이메일 | (2기 시작 시 N회) | 30분 (수동 인쇄 → 폼) | 낮음 | ★★★★ |
| Med | A4. 출결 mark 자동화 (학생 self check-in QR) | 회차당 10명 × 8회 = 80회 | 3분 (수동 mark) | 중 | ★★★ |
| Med | A5. 토스뱅크 입금 알림 → applicants 자동 매칭 | 11회 | 10분 (수동 확인 + paid 토글) | 높음 | ★★★ |
| Med | A6. 회계 CSV export 매월 자동 발송 | 매월 1회 | 30분 | 중 | ★★★ |
| Low | A7. 카카오톡 채널 응대 챗봇 (FAQ) | 일 5건+ | 5분 | 높음 (관리 비용) | ★★ |
| Low | A8. 강사 정산 메일 자동 발송 | 매월 1회 (강사별) | 15분 | 중 | ★★ |

---

## A1. paymentConfirmed 자동 발송 ⭐ Top

### 현재 (1기)

운영자가 토스뱅크 알림 → 어드민 `/admin/applicants` 에서 paid 토글 → 메시지 모달 → paymentConfirmed 선택 → SMS + email 1-click 복사 → 본인 클라이언트로 발송. **5~10분 / 신청자**.

### 자동화 안

- paid 토글 시 자동으로 paymentConfirmed 발송 (SMS + email 양쪽).
- 발송 채널: NaverCloud SENS (SMS, 약 20원/건) + Resend (email, 무료 한도 충분).
- 운영자 확인 메일 (cc 본인) 으로 발송 누락 방지.

### 함정

- **메시지 톤 변경 시 즉시 반영** — 현재 templates.ts 수정 + 다음 발송부터 적용. 자동화도 동일.
- **비자 분기 (paymentConfirmed 는 분기 없음)** — paymentGuide 만 noVisa 분기. paymentConfirmed 는 안전.
- **paid 토글 잘못 후 자동 발송** — undo 안 됨. 토글 후 5초 대기 (취소 가능) 패턴 도입.

### 구현 비용

- NaverCloud SENS 가입 + API 키 + Vercel env (1일)
- Resend 가입 + 도메인 인증 + Vercel env (반일)
- paid 토글 트리거 server action (반일)
- 발송 결과 toast / log (반일)
- 총 2~3일

### ROI

11회 × 5분 = 55분 / cohort. 2기 20명 가정 = 100분 절약. 2025년 동안 4기 가정 = 6시간+.

---

## A2. 리마인드 자동 발송 (T+1 / D-3 / D-1)

### 현재

운영자가 어드민 chip 색상 (T+1 황색 / D-3 주황 / D-1 적색) 보고 수동 발송. 신청자 15명 catch-up 시 1시간+.

### 자동화 안

- Vercel Cron (`@vercel/config` v1 의 `crons` field) 매일 09:00 / 14:00 / 20:00 실행.
- T+1 / D-3 / D-1 조건 SQL 쿼리 → 자동 발송.
- 마지막 발송 시각 (`last_reminder_at`) + 발송 횟수 (`reminder_count`) 기록.

### 함정

- **너무 자주 발송** — `reminder_count >= 3` 이면 자동 발송 중단. 운영자 수동 판단.
- **휴면 신청자** — 신청 후 7일 응답 없음 → cancelled 자동 전환 (현재 수동).
- **timezone** — 새벽 발송 X. 09 ~ 21 한정.

### 구현 비용

- Cron job 설정 (반일)
- SQL 쿼리 + 발송 로직 (1일)
- 발송 로그 + dashboard 알림 (반일)
- 총 2일

### ROI

매 cohort 모집 기간 (4주) × 일 30분 = 14시간 절약 / cohort.

---

## A3. 다음 기수 알림 리스트 일괄 이메일 ⭐ 즉시 가치

### 현재

`status='next_cohort_interest'` 인 row 누적 (1기 6/22 이후). 2기 모집 시작 시 수동으로 메일 일괄 작성 + BCC.

### 자동화 안

- `/fan-to-pro/admin/cohorts/[2기]` 페이지에 [알림 리스트 일괄 발송] 버튼.
- 본문 template (예: nextCohortAnnouncement) 미리 정의.
- BCC 자동 + 발송 후 status 변경 (`next_cohort_interest` → `notified`).

### 함정

- **GDPR / 옵트인 검증** — 신청 시점 marketing 동의 (`consent_marketing`) 받았는지 확인. 동의 없는 경우 발송 X.
- **개인화** — 이름 / 국적 별 분기 어려움. 단일 본문이 안전.

### 구현 비용

- nextCohortAnnouncement template 추가 (반일)
- 어드민 일괄 발송 버튼 + Resend 또는 BCC 링크 (반일)
- 총 1일

### ROI

2기 모집 시작 시점에 즉시 효과. N명 × 5분 (수동 발송) 절약.

---

## A4. 학생 출결 self check-in (QR)

### 현재

회차마다 운영자가 student 10명 status dropdown 으로 mark.

### 자동화 안

- 회차 시작 시 동적 QR 코드 노출 (강의장 화면).
- 학생이 본인 LMS 로그인 → QR 스캔 → 자동 attendance INSERT.
- 5분 grace period 후 자동 absent.

### 함정

- **QR 공유 / 대리 출석** — 위치 기반 (강의장 WiFi MAC 또는 GPS) 검증. 다음 기수 검토.
- **학생 LMS access 사전 필요** — 강사도 마찬가지. 학생 onboarding (must_change_password) 흐름 사전 완료.

### 구현 비용

- QR 생성 + scan endpoint (1일)
- 출결 self-mark UI (1일)
- 위치 검증 (선택, 1일)
- 총 2~3일

---

## A5. 토스뱅크 입금 자동 매칭

### 현재

운영자가 토스뱅크 알림 → 입금자명 / 금액 확인 → applicants 의 paid 토글 + paid_amount_krw + depositor_name_observed 수동 입력.

### 자동화 안

- 토스뱅크 → Slack webhook (또는 email) → parsing → applicants 자동 매칭.
- 매칭 기준: 입금자명 (= 신청서 이름) + 금액 (= PRICING.discounted).
- 일치 시 paid 자동 토글. 불일치 시 운영자 수동 확인 chip.

### 함정

- **부분 입금 / 오입금** — 자동 토글 X. 운영자 확인.
- **친구 추천 할인** — 자동 매칭 어려움 (할인 적용 금액). 운영자 수동.
- **토스뱅크 API** — 공식 API 제한적. 알림 메일 / SMS parsing 필요.

### 구현 비용

- 알림 채널 (Slack webhook 또는 IFTTT email parsing) 1~2일
- parsing + 매칭 로직 1일
- 매칭 결과 dashboard 1일
- 총 3~4일

### ROI

11회 × 10분 = 110분 / cohort. 자동 매칭 정확도 70% 가정 시 70분 절약.

---

## A6. 회계 CSV 자동 생성 + 발송

### 현재

매월 말 운영자가 어드민에서 CSV 다운로드 → 회계사 이메일 첨부 → 발송.

### 자동화 안

- Vercel Cron 매월 1일 09:00 → 이전 달 CSV 자동 생성 + Resend → 회계사 이메일.
- refId 마스킹 (B0028) 적용.

### 함정

- **회계사 이메일 변경** — env 또는 어드민 설정에 보관.
- **마스킹 매핑 테이블 보안** — DB 내부만, 외부 노출 X.

### 구현 비용

- Cron + CSV 생성 + Resend 발송 (1일)
- 총 1일

---

## A7. 카카오톡 채널 챗봇

### 현재

카카오톡 채널 1:1 상담. 일 5~10건. 대부분 FAQ 수준 (가격 / 일정 / 비자 / 환불 등).

### 자동화 안

- 카카오 비즈니스 알림톡 + 챗봇 (Kakao i Open Builder)
- FAQ 분기 (가격 / 일정 / 비자 / 환불 / 결제 / 수료 등)
- 분기 외 = 사람 대기

### 함정

- **카카오 비즈니스 가입 비용** — 알림톡 8원/건 + 챗봇 라이선스 (확인 필요)
- **챗봇 관리 비용** — FAQ 업데이트 + 새 분기 추가 = 운영 cost
- **외국인 영문 응대** — 한국어 챗봇 제한적

### 구현 비용

- 카카오 비즈니스 가입 (반일)
- 챗봇 FAQ 작성 + 분기 설정 (3~5일)
- 총 5일+

### ROI

일 5건 × 5분 = 25분 / 일. 30일 = 12.5시간 / 월. 챗봇 정확도 70% 가정 시 9시간 절약.

**Caveat**: 외국인 학생 응대는 사람 직접이 신뢰 시그널. 챗봇 = 한국인 신청자 중심으로만.

---

## A8. 강사 + Cowork 정산 메일 자동 발송

### 현재

매월 운영자가 강사별 회차 × 단가 계산 + Cowork paid 인원 × 12% 계산 → 정산서 작성 → 이메일 발송. 강사 3인 + Cowork 1건 × 30분 = 2시간+.

### 자동화 안

- 매월 1일 자동 trigger.
- **강사 정산**: 어드민에서 강사별 회차 confirm 후 정산서 PDF 자동 생성 + Resend → 강사 이메일.
- **Cowork 수수료 정산**: 매 cohort `status=completed` 시 자동 계산 (paid 인원 × 수강료 12%) + Cowork 정산 메일 자동 생성.
- 회사 정산 (강사 1인 = 1 회사) 분기 처리.

### 함정

- **정산 메일에 강사 개인별 금액 노출 여부** — 노아 보류 결정 (회사 합계만 vs 강사 breakdown)
- **Cowork 수수료 산정 기준** — VAT 포함/제외, 환불 시 차감 여부, 정산 시점 (월별 vs cohort 종료 후) 약정 따라 자동 분기
- **VAT / 원천징수 분기** — `companies.vat_issuer` 기반 자동 계산
- **세금계산서 발행** — 회사 측 수동 (자동 X)

### 구현 비용

- 정산 PDF template — 강사 / Cowork 두 종류 (1.5일)
- Cron + 자동 생성 + 발송 (1일)
- cohort_expenses 자동 INSERT (Cowork 수수료 계산 trigger) (반일)
- 총 3일

---

## 자동화 안 할 것 (의도)

| 작업 | 왜 안 하나 |
|---|---|
| 신청 폼 자동 답장 | 신청 직후 페이지 success 메시지로 충분 (운영자 1-click 으로 paymentGuide 발송 — 자동화 X 의도) |
| 친구 추천 보상 자동 매칭 | 매칭 시점 운영자 판단 필요 (친구가 답장에 추천인 이름 기재) |
| 가격 동적 조정 | 1기 한정. 다음 기수 시 가격 결정 = 운영자 판단 (자동화 X) |

---

## 구현 우선순위 (2기 시작 전)

1. **A3 (다음 기수 알림 일괄 이메일)** — 즉시 가치 + 구현 1일
2. **A1 (paymentConfirmed 자동 발송)** — 운영 시간 절약 + 구현 2~3일
3. **A2 (리마인드 자동 발송)** — 운영 시간 절약 + 구현 2일
4. **A6 (회계 CSV 자동 발송)** — 매월 발생 + 구현 1일
5. (4기 이후 또는 학생 30명+) — A4 / A5 / A7 / A8

→ 다음 기수 모집 시작 (2026-08 가정) D-2주 시점에 A1/A2/A3/A6 구현 완료 목표.
