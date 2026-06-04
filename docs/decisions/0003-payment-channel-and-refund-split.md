# ADR 0003 — 결제 채널 + 환불 정책 2층 분리

**Date**: 2026-06-04
**Status**: Accepted
**Deciders**: 사용자(noah) + Aria(PM)
**Related**: B0007 spec (docs/specs/B0007-payment-flow-split.md), B0008 (카톡 채널 폴백 done), ADR 0002 (Backlog & Spec 시스템)

---

## Context

1기 신청 마감 (2026-06-21) 까지 17일 남은 시점. 현재 신청 폼은 제출 직후 토스뱅크 계좌번호를 화면에 즉시 노출한다. 2026-06-04 Cowork 미팅에서 두 가지 문제가 드러났다.

1. **신뢰 신호 분산**. 한국 거주 외국인 타겟은 "결제 = 자리 확정" 메시지가 한 화면에 강력하게 박혀있을 때 의사결정한다. 신청 = 자리 확정으로 오인하면 결제 conversion 이 떨어진다.
2. **운영 가시성 부족**. 신청자 중 누가 진지하게 입금할 사람인지, 누가 단순 호기심인지 운영자(노아 1인) 가 사후 식별할 신호가 부족하다.

동시에 환불 메시지가 **법적 약관** (학원법 시행령 별표 4 + 전자상거래법 §17 + 공정위 기준) 의 5단계 표를 컨펌 모달과 마케팅 카피에 그대로 노출하면 외국인 신청자가 "복잡해서 포기" 한다는 가설.

자동화 채널은 다음 중 선택해야 했다.
- 카카오 알림톡 (비즈채널 인증 5~10 영업일, 마감 안 맞을 위험)
- SMS (NaverCloud SENS) (발신번호 등록 2~3 영업일)
- 이메일 (Resend) (도메인 인증 1시간)
- 완전 수동 (노아 1인이 모든 신청자에게 카톡 1:1 발송)

---

## Decision

### 1. 채널: SMS + 이메일 자동 이중 발송 + 카톡 1:1 폴백

- **NaverCloud SENS (SMS LMS)** + **Resend (이메일)** 을 동시 자동 발송. 둘 중 하나라도 성공하면 `payment_guided` 로 전환.
- **카톡 채널 (B0008)** 은 1:1 문의 폴백. 자동 발송 채널 아님.
- 알림톡 reject 이유: 비즈채널 심사 일정이 critical path 와 충돌. 1기 한정 risk 회피.

### 2. 컨펌 모달 신설 + 계좌번호 화면 즉시 노출 폐지

- 신청 폼 step 2 마지막 "신청 완료" 클릭 시 **컨펌 모달** 띄움.
- 모달은 가격(원가 strike + 할인가 + 20% OFF) + 마감일(6/21) + 결제 수단(계좌이체 안내, 계좌번호는 미노출) + 자리 확정 = 결제 완료 기준 + 환불 단순화 메시지를 한 screen 에 배치.
- 체크박스 없음. single-click confirm.
- 모달 [신청 완료] 클릭 = applicants INSERT + SMS/이메일 자동 발송 트리거.
- 완료 화면에 계좌번호 노출 X. 대신 "문자/메일 확인 부탁드려요" 안내.

### 3. 환불 정책 2층 분리

| 층 | 표시 위치 | 내용 |
|---|---|---|
| **마케팅 카피** | 컨펌 모달, SMS/이메일 본문, 외부 카드뉴스 | "마감 전 100% 환불, 마감 후 강좌 취소 시 자동 환불" 단순화 메시지 + 약관 링크 |
| **법적 약관** | `/terms` 페이지, FAQ 환불 항목, `REFUND_POLICY` 도메인 상수 | 학원법 시행령 별표 4 의 5단계 표 그대로 유지 (의무 사항) |

분쟁 시 약관 본문이 우선. 마케팅 카피는 약관 본문의 단순 요약 + 링크.

### 4. 운영자 미니 페이지 자체 빌드

- 라우트 `/admin/applicants`. HTTP Basic Auth 단일.
- shadcn 기반 4시간 빌드. 노아 1인 운영 가정.
- 향후 B0002 (운영 어드민) 에서 Supabase Auth + role 로 교체. 본 빌드는 1기 한정 throwaway 가능 디자인.

### 5. 리마인드 cron 하이브리드 3회

T+1 (신청 다음날 같은 시각) / D-3 (6/18 토 23:00) / D-1 (6/20 토 23:00). 23:00 = 외국인 한국 거주자 모바일 확인 시간대 + 거래성 메시지로 야간 발송 허용.

### 6. 미입금 처리: 수동 검토 + 24h grace

마감 (6/21 자정) 후 24시간 (6/22 23:59) grace. 그 사이 입금 들어오면 운영자 paid 토글 가능. 이후 자동 cancelled cron 트리거.

### 7. Plan B 게이트 없음

풀 자동화 가정. 노아 결정 (6/4). SENS 심사 지연 시 이메일 단독 + 카톡 폴백으로 degrade. 게이트 별도 없음.

---

## Consequences

### Positive

- **결제 conversion 가능성 상승**. 신청 = 의사 표명, 결제 = 자리 확정의 분리가 외국인 trust 신호와 일치.
- **운영자 부담 manageable**. 운영자 페이지에서 row 검색 + 토글 1클릭. 입금 1건당 약 30초 목표.
- **2기 자산화**. SMS/이메일 인프라 + 운영자 페이지 + cron 은 2기에 그대로 재사용. 1기 초기 투자가 운영 cost 곡선을 평탄화.
- **법적 안정성**. 약관 본문 무수정 + 마케팅 카피만 단순화 -> 학원법 + 전자상거래법 §17 의무 그대로 충족.
- **자동화 가시성**. `payment_guide_sms_sent_at`, `paid_at`, `reminder_*_sent_at` 컬럼으로 funnel 추적 가능.

### Negative

- **자동화 빌드 5~6일 wallclock**. T0 SENS 심사 + T1~T11 구현 + Mira/Sage QA 합산. 마감 (6/21) 까지 9일 여유 -> 슬랙 약 3일.
- **NaverCloud SENS 심사 critical path**. 6/5 (목) 안에 신청 못 하면 SMS 자동화 risk. 이메일 + 카톡 폴백으로 degrade 가능하나 conversion 손실 우려.
- **운영자 페이지 보안 의존**. Basic Auth 단일 -> 비밀번호 유출 시 신청자 PII 전체 노출. Sage 검토 + 1기 한정 임시 안.
- **CSV export PII 유출 risk**. 노아 디바이스에 비자 정보 등 다운로드. 운영 매뉴얼로 7일 retention + 파일명 timestamp 권장.
- **컨펌 모달 추가 step 자체가 마찰**. 모달 도입으로 step 3 가 되는 셈. UX A/B 불가 (1기 1회성) -> 모달 카피 톤이 친근하고 짧을 것이 중요.

### Open

- T0 SENS 발신번호 등록 시 표기 발신자명 결정.
- 운영자 페이지 URL 가시성 (`/admin/applicants` 그대로 vs `/ops/x9k2/applicants` 류 추측 어려운 path).
- CSV export PII 마스킹 정책.
- 2기 이후 PG 도입 결정 (PortOne / 토스페이먼츠) -> 본 spec 의 계좌이체 + 운영자 토글 구조를 자동 webhook 으로 교체할지 ADR 별도 필요.

---

## Alternatives Considered

| 대안 | Reject 사유 |
|---|---|
| **카카오 알림톡 강행** | 비즈채널 인증 심사 5~10 영업일. 마감 (6/21) 까지 critical path 미달. 1기 risk 회피. |
| **완전 수동 (노아가 카톡 1:1 발송)** | 30명 x 4회 (입금안내 + T+1 + D-3 + D-1) = 120건 수동 발송. 마감 직전 시간 폭발 + 노아 다른 운영 업무 마비. |
| **PG (PortOne 등) 즉시 도입** | 사업자 정산 계좌 셋업 + KYC + 가맹점 등록 2~3주. 1기 마감 안 맞음. 2기 이후 별도 검토. |
| **즉시 계좌 노출 유지** | 현재 conversion 측정 데이터 없음. 외국인 trust 신호 가설 검증 없이 유지하면 1기 종료 후 같은 의사결정 다시 해야 함. 이번 기에 분리 + funnel 측정 후 2기에 evidence 기반 결정. |
| **약관 본문도 단순화** | 학원법 시행령 별표 4 의무 위반. 행정 지도 risk. 거부. |

---

## Related

- ADR 0001 — 스택 + 디자인 1차 결정
- ADR 0002 — Backlog & Spec 시스템
- B0007 spec — docs/specs/B0007-payment-flow-split.md (구현 디테일)
- B0008 — 카톡 채널 플로팅 버튼 (done)
- B0005 — 1기 일정 확정 (done, 본 ADR 의 마감 기준)
- `src/programs/fan-to-pro/domain/program.ts` — REFUND_POLICY, ENROLLMENT_CAP, SCHEDULE
- 2026-06-04 Cowork 미팅 노트 — docs/research/cowork-partnership-tracking.md §13
