# ADR 0003 — 결제 채널 + 환불 정책 2층 분리

**Date**: 2026-06-04 (rev 2 — 반자동 발송으로 전환)
**Status**: Accepted
**Deciders**: 사용자(noah) + Aria(PM)
**Related**: B0007 spec (docs/specs/B0007-payment-flow-split.md), B0008 (카톡 채널 폴백 done), ADR 0002 (Backlog & Spec 시스템)

---

## Context

1기 신청 마감 (2026-06-21) 까지 17일 남은 시점. 현재 신청 폼은 제출 직후 토스뱅크 계좌번호를 화면에 즉시 노출한다. 2026-06-04 Cowork 미팅에서 두 가지 문제가 드러났다.

1. **신뢰 신호 분산**. 한국 거주 외국인 타겟은 "결제 = 자리 확정" 메시지가 한 화면에 강력하게 박혀있을 때 의사결정한다. 신청 = 자리 확정으로 오인하면 결제 conversion 이 떨어진다.
2. **운영 가시성 부족**. 신청자 중 누가 진지하게 입금할 사람인지, 누가 단순 호기심인지 운영자(노아 1인) 가 사후 식별할 신호가 부족하다.

동시에 환불 메시지가 **법적 약관** (학원법 시행령 별표 4 + 전자상거래법 §17 + 공정위 기준) 의 5단계 표를 컨펌 모달과 마케팅 카피에 그대로 노출하면 외국인 신청자가 "복잡해서 포기" 한다는 가설.

자동화 채널 선택지는 다음과 같았다.
- 카카오 알림톡 (비즈채널 인증 5~10 영업일, 마감 안 맞을 위험)
- SMS (NaverCloud SENS) (발신번호 등록 2~3 영업일)
- 이메일 (Resend) (도메인 인증 1시간)
- **반자동 (운영자 dashboard 에서 메시지 generate + 노아가 카톡/SMS/이메일 수동 발송)**
- 완전 수동 (운영자 페이지 없이 노아가 신청자 row 보고 매번 본문 작성)

---

## Decision

### 1. 채널: 반자동 발송 (운영자 dashboard 의 메시지 generate + 1-click 복사 + mailto/sms 링크)

- **운영자 페이지에 메시지 generate 기능** 박는다. 각 신청자 row 별로 채널(카톡/SMS | 이메일) + locale(ko/en) + 종류(입금안내/입금확인/T+1/D-3/D-1) 토글 선택 시 본문 자동 채워짐.
- **1-click 복사 버튼** (`navigator.clipboard.writeText`) + **카톡 채널 열기 버튼** + **SMS 앱 열기 버튼** (`sms:{phone}?body=...`) + **메일 앱 열기 버튼** (`mailto:{email}?subject=...&body=...`).
- 노아가 본인의 카톡/SMS/이메일 앱으로 직접 발송. 시스템은 본문 만들기 + 발송 직전 단계까지만 도와줌.
- 발송 완료 후 dashboard 에서 **[발송 완료] 토글** -> status='notified', notified_at 자동 기록.
- **리마인드는 cron 대신 dashboard side 강조**. D-3 / D-1 됐는데 status='notified' 인 신청자는 적색 강조. 노아가 보고 같은 방식으로 메시지 generate 후 수동 발송 -> reminder_count + 1.
- **자동 발송 인프라 (NaverCloud SENS, Resend, Vercel Cron) 도입 안 함**.
- 카톡 채널 (B0008) 은 1:1 문의 폴백으로 유지. 자동 발송 채널 아님.

### 2. 컨펌 모달 신설 + 계좌번호 화면 즉시 노출 폐지

- 신청 폼 step 2 마지막 "신청 완료" 클릭 시 **컨펌 모달** 띄움.
- 모달은 가격(원가 strike + 할인가 + 20% OFF) + 마감일(6/21) + 결제 수단(계좌이체 안내, 계좌번호는 미노출) + 자리 확정 = 결제 완료 기준 + 환불 단순화 메시지를 한 screen 에 배치.
- 체크박스 없음. single-click confirm.
- 모달 [신청 완료] 클릭 = applicants INSERT (status='pending') 만. 발송은 비동기 (노아 수동).
- 완료 화면에 계좌번호 노출 X. 대신 "안내 메시지를 곧 보내드려요" 안내.

### 3. 환불 정책 2층 분리

| 층 | 표시 위치 | 내용 |
|---|---|---|
| **마케팅 카피** | 컨펌 모달, 운영자가 보내는 메시지 본문, 외부 카드뉴스 | "마감 전 100% 환불, 마감 후 강좌 취소 시 자동 환불" 단순화 메시지 + 약관 링크 |
| **법적 약관** | `/terms` 페이지, FAQ 환불 항목, `REFUND_POLICY` 도메인 상수 | 학원법 시행령 별표 4 의 5단계 표 그대로 유지 (의무 사항) |

분쟁 시 약관 본문이 우선. 마케팅 카피는 약관 본문의 단순 요약 + 링크.

### 4. 운영자 미니 페이지 자체 빌드 (확장)

- 라우트 `/admin/applicants`. HTTP Basic Auth 단일.
- shadcn 기반 8시간 빌드 (rev 1 의 4시간에서 메시지 generate + 복사 + mailto/sms + 강조 추가로 2배).
- 노아 1인 운영 가정. 향후 B0002 (운영 어드민) 에서 Supabase Auth + role 로 교체.

### 5. 리마인드: cron 없이 dashboard 강조 + 수동 발송

- T+1 (신청 다음날) / D-3 (6/18 토) / D-1 (6/20 토) 시점 도래 시 status='notified' 신청자 row 를 색상 강조 (황색 / 주황 / 적색).
- 헤더에 "리마인드 필요" 카운트 표시.
- 노아가 색상 보고 메시지 generate -> 발송 -> [발송 완료] 다시 클릭 -> reminder_count + 1.

### 6. 미입금 처리: 일괄 cancelled 버튼

마감 (6/21 자정) 후 24시간 (6/22 23:59) 경과 시 운영자 페이지 푸터의 [일괄 cancelled] 버튼 클릭으로 처리. cron 없음.

### 7. Plan B 게이트 없음

반자동 발송으로 전환했으므로 외부 인프라 critical path 자체가 없음. SENS/Resend 심사 일정 의존 사라짐.

---

## Consequences

### Positive

- **결제 conversion 가능성 상승**. 신청 = 의사 표명, 결제 = 자리 확정의 분리가 외국인 trust 신호와 일치.
- **유료 인프라 비용 0**. NaverCloud SENS 단가 (3,600원 / 1기) + Resend (무료 tier 안) 둘 다 0 으로 떨어짐. 1기 대비 운영 cost 절감 자체보다는 셋업 절차 회피가 큼.
- **발신번호 심사 critical path 제거**. SENS 발신번호 등록 2~3 영업일 대기 사라짐. 6/5 (목) 데드라인 부담 없음.
- **빌드 시간 단축**. rev 1 의 5~6일 wallclock -> rev 2 의 2~3일 wallclock. T0/T1/T5/T6/T9 5개 작업 통째로 제거. 운영자 페이지만 8시간으로 확장.
- **법적 안정성**. 약관 본문 무수정 + 마케팅 카피만 단순화 -> 학원법 + 전자상거래법 §17 의무 그대로 충족. 정보통신망법 §50 은 운영자 본인 발송으로 적용 X.
- **카피 톤 직접 통제**. 노아가 발송 직전 textarea 에서 톤 조정 가능. 자동 발송 대비 친근함 / 개인화 여지.

### Negative

- **노아 1인 수동 발송 부담**. 1기 30명 x 평균 3회 (입금안내 + 입금확인 + 리마인드 1~2회) = 약 90회 over 18일 (6/4 ~ 6/22). dashboard 의 [복사] + mailto/sms 링크로 1건당 30초 ~ 1분 가정 시 총 누적 45 ~ 90분. 감당 가능하지만 0 아님.
- **단일 발송 실패 시 누락 가능성**. 노아가 [발송 완료] 토글만 누르고 실제 발송을 깜빡할 수 있음. mitigation = dashboard 강조 + 카톡 채널 self-service 폴백.
- **발송 지연 risk**. 자동 발송 대비 신청 시점 ~ 발송 시점 lag (몇 시간 ~ 하루) 발생 가능. 신청자 입장에서 "안내 늦네" 가설. mitigation = 완료 화면 안내 문구로 expectation set + 카톡 채널 즉시 문의 가능.
- **운영자 페이지 보안 의존**. Basic Auth 단일 -> 비밀번호 유출 시 신청자 PII 전체 노출. Sage 검토 + 1기 한정 임시 안.
- **CSV export PII 유출 risk**. 노아 디바이스에 비자 정보 등 다운로드. 운영 매뉴얼로 7일 retention + 파일명 timestamp 권장.
- **컨펌 모달 추가 step 자체가 마찰**. 모달 도입으로 step 3 가 되는 셈. UX A/B 불가 (1기 1회성) -> 모달 카피 톤이 친근하고 짧을 것이 중요.
- **2기 자산화 일부 손실**. rev 1 의 SMS/이메일 자동화 인프라는 2기에 그대로 재사용 가능했으나, rev 2 는 반자동이므로 2기에 자동화 도입 시 별도 작업 필요.

### Open

- 운영자 페이지 URL 가시성 (`/admin/applicants` 그대로 vs `/ops/x9k2/applicants` 류 추측 어려운 path).
- CSV export PII 마스킹 정책.
- 노아 본인 발신 이메일 계정 (개인 Gmail vs Dropdown 도메인 메일) - mailto: 는 기본 클라이언트 사용하므로 운영 매뉴얼 차원.
- 2기 자동화 도입 결정 (SENS + Resend) - 1기 운영 데이터 (발송 누락률, 노아 부담 실측) 기반으로 ADR 별도 작성.

---

## Alternatives Considered

| 대안 | Reject 사유 |
|---|---|
| **완전 자동 발송 (NaverCloud SENS + Resend)** | rev 1 안. 유료 인프라 비용 (~3,600원 SMS + Resend 무료 tier) 자체는 크지 않으나 발신번호 심사 critical path (2~3 영업일) 부담 + 빌드 시간 5~6일 wallclock 부담. 1기 30명 규모는 반자동으로 충분 -> 노아 의지로 rev 2 전환. 2기에는 1기 실측 데이터 기반으로 재검토 |
| **카카오 알림톡 강행** | 비즈채널 인증 심사 5~10 영업일. 마감 (6/21) 까지 critical path 미달. 1기 risk 회피 |
| **완전 수동 (운영자 페이지 없이 노아가 매번 본문 작성)** | 30명 x 4종 메시지 x 2 locale = 매번 본문 작성 시간 비효율 + 본문 일관성 깨짐 + 플레이스홀더 누락 risk. 메시지 generate 만큼은 자동화 필수 |
| **PG (PortOne 등) 즉시 도입** | 사업자 정산 계좌 셋업 + KYC + 가맹점 등록 2~3주. 1기 마감 안 맞음. 2기 이후 별도 검토 |
| **즉시 계좌 노출 유지** | 현재 conversion 측정 데이터 없음. 외국인 trust 신호 가설 검증 없이 유지하면 1기 종료 후 같은 의사결정 다시 해야 함. 이번 기에 분리 + funnel 측정 후 2기에 evidence 기반 결정 |
| **약관 본문도 단순화** | 학원법 시행령 별표 4 의무 위반. 행정 지도 risk. 거부 |

---

## Related

- ADR 0001 — 스택 + 디자인 1차 결정
- ADR 0002 — Backlog & Spec 시스템
- B0007 spec rev 2 — docs/specs/B0007-payment-flow-split.md (반자동 구현 디테일)
- B0008 — 카톡 채널 플로팅 버튼 (done)
- B0005 — 1기 일정 확정 (done, 본 ADR 의 마감 기준)
- `src/programs/fan-to-pro/domain/program.ts` — REFUND_POLICY, ENROLLMENT_CAP, SCHEDULE
- 2026-06-04 Cowork 미팅 노트 — docs/research/cowork-partnership-tracking.md §13
- 2026-06-04 노아 결정 변경 — 반자동 발송 전환 (본 ADR rev 2)
