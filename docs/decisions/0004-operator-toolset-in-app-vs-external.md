# ADR 0004 — 운영 툴셋 in-app vs 외부 SaaS

**Date**: 2026-06-05
**Status**: Accepted
**Deciders**: 사용자(noah) + Aria(PM)
**Related**: B0018 spec (docs/specs/B0018-operator-dashboard-expansion.md), ADR 0002 (Backlog & Spec 시스템), ADR 0003 (결제 채널 + 환불 정책 2층 분리), B0002 (운영 어드민 — deferred)

---

## Context

1기 모집 마감 (6/21) 이후 강의 시작 (6/27) ~ 수료식 (7/25) 까지 50일 운영 기간이 코앞. B0007 (반자동 발송 flow) 이 신청 → 입금 → 환불까지만 커버하므로 다음 영역이 무 가시화 상태.

- 출결 (4주 × 8회, 30명)
- 강사·강사료 정산 (3명, 250만 ~ 300만)
- 재무 (매출·환불·강사료·마진)
- 수료증 (Dropdown 명의 PDF)
- 공연 + 참여확인서 (유니온 픽처스 명의)
- 다중 발송 (broadcast)
- 현금영수증 (10만원 초과 자진발급)
- PII 자동 파기 (PIPA §21)

Echo 리서치 (2026-06-05) 가 두 갈래 옵션을 분석.

1. **외부 SaaS 조합**: Notion (메모) + Sheets (정산) + Stibee (이메일) + 채널톡 (CS) + 외부 PDF SaaS 등
2. **in-app 자체 빌드**: 운영자 페이지 (`/admin/applicants`) 확장 + 신규 테이블 8개

빌드 비용 매트릭스 (Echo §D):
- 8개 critical 기능 중 6개의 빌드 비용 < 외부 SaaS 6개월치
- 2개 (Notion · Google Sheets) 는 외부 유지가 우월
- Stibee · 채널톡 등은 1기 30명 규모에서 over-engineered

병행 제약:
- 노아 1인 운영. 추가 SaaS 학습·구독·결제 부담 0 선호
- B0007 spec 결정 (자동 발송 인프라 도입 안 함) 과 일관성
- 카카오 비즈채널 인증 완료 (알림톡 API 가능) 이지만 1기 critical path 아님

---

## Decision

### 1. 외부 SaaS 추가 도입 0

본 ADR 으로 다음 SaaS 도입 모두 거부:

| SaaS | 거부 사유 |
|---|---|
| **Stibee** (뉴스레터 · 8,900원/월) | 1기 30명 × broadcast 5회 = in-app 4h 빌드로 충분. 6개월 53,400원 < 빌드 시간가치. 2기 200명+ 시점에 재검토 |
| **채널톡** (CS · Early Stage free) | 카톡 채널 (B0008) 으로 CS 결정 완료. SaaS 중복 |
| **Hubspot/Pipedrive CRM** | 30명 규모에 CRM 도입 = 오버 |
| **NicePay·토스결제·Bootpay PG** | 토스뱅크 입금 결정 (ADR 0003) |
| **외부 PDF SaaS** (월 20$) | `@react-pdf/renderer` 4h 빌드로 충분 |
| **Make·Zapier** automation | 운영자 [클릭 → 발송] 패턴 일관성 깨짐 |

### 2. 외부 유지 (in-app 대체 X)

| SaaS | 역할 | in-app 대체 X 이유 |
|---|---|---|
| **Notion** | 운영 SOP · 미팅 기록 · 노트 | 다목적 협업 — 빌드 의미 0 |
| **Google Sheets** | 회계사 공유 | 회계사 외부인 → in-app 권한 줄 수 없음. 단, source of truth = DB. Sheets 는 CSV export 후 임포트 |
| **Google Forms** | 만족도 NPS 폼 | 만족도 폼 빌드 4h 가능하지만 외국인 응답률 / Google 폼 친숙도 우월 |
| **카카오톡 채널** | 1:1 CS | B0008 결정 |
| **카카오 단톡** | 강사·운영 communication | 빌드 0, 일상 도구 |

### 3. in-app 자체 빌드 (8개 critical)

| ID | 기능 | 빌드 | 외부 6M 비용 | 결정 사유 |
|---|---|---|---|---|
| B0019 | 출결 기록 | 6~8h | n/a (외부 솔루션 부재) | 1기 강의 시작 필수 |
| B0020 | 수료증 PDF | 4~6h | 외부 PDF SaaS 120$ | @react-pdf/renderer 충분 |
| B0021 | 강사·강사료 정산 | 8~10h | n/a | 계약서 §7 자동 계산 |
| B0022 | 재무 대시보드 | 4~6h | Sheets free | 운영 시작 즉시 활용 |
| B0023 | 현금영수증 audit | 2~3h | n/a | 소득세법 §162-3 자진발급 의무 |
| B0024 | PII 자동 파기 | 3~4h | n/a | PIPA §21 의무 |
| B0025 | 다중 발송 | 4h | Stibee 53,400원/6M | mailto BCC 패턴 |
| (보너스) | 공연·참여확인서 | 6h | n/a | 수료증 PDF 재사용 |

총 36~49h. 1주 8~10h 페이스로 5~6주. 마감 (6/21) + 강의 (6/27) + 수료식 (7/25) 정렬 가능.

### 4. 신규 테이블 8개

`applicants` 무수정 + 신규 테이블 + FK 으로 확장. RLS 동일 (service_role only).

```
instructors      (강사 정보 + 세금 모드 + 강사료 룰)
sessions         (8회 강의 + instructor_id FK)
attendance       (session_id × applicant_id × status)
applicant_notes  (시간순 1:1 노트 — 기존 single text 컬럼 대체)
messages_log     (모든 발송 audit — broadcast 포함)
performances     (공연 매칭 + 일당 + 참여확인서 발급)
certificates    (수료증 + 참여확인서 통합)
cash_receipts   (현금영수증 audit — 10만원 초과)
```

`applicants` 에 컬럼 1개만 추가: `redacted_at timestamptz`.

### 5. Wave 분해 (B0018 spec §1)

총 빌드를 4 wave 로 분리 + 마일스톤 정렬:

| Wave | 기한 | 대상 | 누계 |
|---|---|---|---|
| 1 | 6/14 | 법적 의무 2건 + 다중 발송 | ~10h |
| 2 | 6/21 | 강사 정산 + 재무 대시보드 | ~16h |
| 3 | 6/27 ~ 7/19 | 출결 | ~8h |
| 4 | 7/25 | 수료증 PDF + 공연 + 참여확인서 | ~12h |

---

## Consequences

### Positive

- **SaaS 비용 0** — Stibee + 외부 PDF + CRM 모두 거부. 1기 운영 cost 변동 0
- **단일 source of truth** — 운영자 페이지 한 곳에서 신청·입금·출결·강사·재무·수료증·공연 통합 가시화. 노아 머릿속 분산 risk 제거
- **2기 자산화** — 1기 발송 이력 (`messages_log`) + 강사 정산 audit + 재무 카드는 2기 자동화 ADR 의 input
- **법적 안정성** — 현금영수증 자진발급 audit + PIPA §21 anonymize 자동화로 행정 지도 risk 0
- **카피·디자인 톤 통제** — 모든 발송·문서가 in-app 템플릿. 외부 SaaS 의 디폴트 디자인 의존 X
- **데이터 폐쇄성** — 외부 SaaS 미사용 → 신청자 PII 가 SaaS provider 에 전송 안 됨 (개인정보처리방침 위탁 항목 추가 불필요)

### Negative

- **빌드 시간 36~49h 노아 자기 비용** — Aria + Iris + Luna 디스패치이지만 노아의 리뷰·결정·테스트 시간이 들어감 (주 8~10h 5~6주). 외부 SaaS 도입 대비 시간 +
- **B0002 (운영 어드민) 와 중복 risk** — B0002 가 *통합 어드민* 으로 잡혀있으나 deferred. B0018 은 `/admin/applicants` 확장으로 점진 빌드. 2기 시점에 B0002 으로 통합 마이그레이션 부담 (별도 ADR 필요)
- **수료증·참여확인서 발급의 법적 효력** — PDF + serial_no 만으로 충분한지 (인장·서명·발급기관 직인 등 외부 요구 시) 후속 확인 필요
- **자동화 인프라 부재 → 운영자 부담** — 다중 발송 BCC 도 노아가 본인 메일 클라이언트에서 직접. cron 도입 안 한 일관성의 비용
- **카카오 알림톡 미활용** — 비즈채널 인증은 완료되었으나 1기 활용 안 함. 비즈채널 운영 cost (이용료) 활용 0
- **수료증 PDF 디자인 품질** — `@react-pdf/renderer` JSX 디자인 능력 < Figma → 외부 PDF SaaS. 정형식 흑백으로 단순화하여 risk 감소

### Open

- **수료증 인장·서명 디지털 표현** — Dropdown 사업자 직인 스캔 PNG → PDF 임베드. 별도 결정 필요 시 ADR 0005 분리
- **2기 자동화 도입 시점** — 1기 운영 실측 데이터 (수동 발송 부담 N분 / 누락률 / broadcast 응답률) 기반으로 2기 SaaS / 카카오 알림톡 API 도입 ADR 별도
- **재무 CSV 회계사 포맷** — 회계사 (외부) 가 선호하는 CSV 스키마 미확인. T6 빌드 시 회계사에게 샘플 받기
- **공연 매칭 우수자 선정 기준** — `performances.applicant_id` 결정 기준 (출결 + 강사 추천?) 의 정량화 필요. 운영 매뉴얼 차원
- **`applicant_notes` 마이그레이션** — 기존 `applicants.notes` 단일 컬럼의 데이터 이관 정책. 1기 신청자 적은 시점 (오늘) 에 손 작업 가능 vs 별도 SQL

---

## Alternatives Considered

| 대안 | Reject 사유 |
|---|---|
| **Stibee + Google Sheets + Notion 조합으로 운영** | 6개월 누계 cost 5~10만원 + 데이터 분산. in-app 빌드가 우월 |
| **B0002 (통합 운영 어드민) 풀 빌드 후 이관** | 빌드 cost 80~120h. 1기 마감 (6/21) 까지 미달. 점진 빌드 (B0018) 가 critical path 정합 |
| **외부 PDF SaaS (DocuPilot 등) 도입** | 월 20$ x 12개월 = 240$. `@react-pdf/renderer` 4h 빌드가 우월 |
| **카카오 알림톡 API 즉시 도입** | 비즈채널 운영 + 템플릿 사전 등록 + 발신번호 표시 의무. 1기 30명 규모 critical path 아님. 2기 ADR 분리 |
| **CSV 만 export + Sheets 에서 모든 운영** | 회계사 공유 OK 이지만 출결·강사·수료증 등 trigger-based UI 불가. 데이터 수동 입력 오류 risk |
| **출결 기록만 Sheets 으로 외주** | 30명 × 8회 = 240 cell. Sheets 수동 입력 오류 risk + 누적 출결률 계산 분리 |

---

## Related

- ADR 0001 — 스택 + 디자인 1차 결정
- ADR 0002 — Backlog & Spec 시스템
- ADR 0003 — 결제 채널 + 환불 정책 2층 분리 (반자동 발송 결정)
- B0007 spec rev 2 — 반자동 발송 flow
- B0018 spec — 운영자 페이지 확장 (본 ADR 구현체)
- B0002 — 통합 운영 어드민 (deferred, B0018 으로 점진 빌드)
- B0008 — 카톡 채널 폴백 (done)
- Echo 2026-06-05 리서치 — 외부 솔루션 비교 매트릭스
- 소득세법 §162-3 — 현금영수증 자진발급 의무 (10만원 초과)
- 개인정보 보호법 §21 — 보유기간 만료 시 파기 의무
- 정보통신망법 §50 — 광고성 정보 전송 (BCC 처리 가이드)
