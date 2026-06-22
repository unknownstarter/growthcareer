# ADR 0009 — 데이터 모델 통합 + LMS 단순화 + 이중 어드민 deprecation roadmap

> ⚠️ **STATUS: PARTIALLY SUPERSEDED by [ADR 0010](./0010-data-model-applicants-immutable-lms-additive.md) (2026-06-23)**
>
> 본 ADR 의 Wave A/B/C (persons / applications / enrollments split) = **Rejected** by 노아.
> 이유: 1기 데이터 risk + rollback 어려움 + 같은 사람 dedup 사고 위험.
> 대안 (Accepted): applicants 영구 불변 + LMS 만 신규 entity 로 깨끗하게 (ADR 0010).
> 본 ADR 의 단일 audit (person_events) / clean architecture 청소 / Settlement aggregate 아이디어는 ADR 0010 에 부분 흡수.

---

**Status**: PARTIALLY SUPERSEDED by ADR 0010 (Wave A/B/C Rejected, 일부 아이디어 흡수)
**Date**: 2026-06-22
**Deciders**: 노아 + Sophia (Tech Architect)
**Tags**: data-model, clean-architecture, lms, strangler-fig, applicants, milestones, audit, deprecation
**Related**: ADR 0005 (LMS 클린 아키텍처), ADR 0006 (디자인 시스템), ADR 0008 (Program Modularization), ADR 0004 (Operator Toolset)

---

## 컨텍스트

1기 모집 마감 (6/22 0시), paid 11명, 강의 6/27 시작. 1기 운영 중 ad-hoc 으로 박힌 시스템들이 점점 한 테이블 / 한 폴더에 누적. 노아 우려:

1. "DB 구조가 자꾸 덕지덕지 붙어가는 기분"
2. "LMS 는 클린 아키텍처 + 코어 단순화 + 확장성으로 만들어야 할 것 같음"
3. "지원자 어드민의 강사탭이랑 재무탭은 아주 개판"
4. milestone / messages_log audit / status enum 등 분산된 시스템들 통합 검토 필요

본 ADR 은 **현재 모델의 자세한 진단 + 단계적 통합 plan + 이중 어드민 deprecation roadmap** 을 박는다. 1기 운영 중 (~7/25) 은 hard rule (§7.4) 로 큰 refactor 금지. 본 문서는 2기 시작 전 (7월말 ~ 8월) 실행할 plan 의 청사진.

---

## 1. 현재 상태 진단 (객관적 issue)

### 1.1 applicants 테이블 = "God table"

현재 ~25개 컬럼이 한 row 에 모여있음. 책임이 6개로 분기됨.

| 영역 | 컬럼 | 추가된 시점 |
|---|---|---|
| Identity / PII | id, created_at, name, email, phone, birthdate, nationality, university, visa, address, notes | 초기 (B0001~B0006) |
| 동의 (consent) | consent, consent_operations, consent_marketing, consent_content_use | 초기 |
| Application lifecycle (status) | status, notified_at, reminder_count, last_reminder_at, payment_due_at, source | B0007 |
| Payment audit | payment_confirmed_at, paid_amount_krw, depositor_name_observed, paid_confirmed_by | B0007 |
| Cancel / refund audit | cancelled_at, cancel_reason, refunded_at, refund_txn_id | B0007 |
| Privacy lifecycle | redacted_at | B0018 Wave 1 |
| Cohort link (XOR) | cohort_id (nullable), status='next_cohort_interest' | B0039 |

**문제**:
- 한 테이블에 *identity* + *application instance* + *audit trail* + *privacy state* 4가지 책임. 다음 기수 시 같은 사람이 또 신청하면 row 가 또 생긴다 (현재 식별 키는 email 뿐, soft).
- `redacted_at` 박힌 후의 row 는 PII NULL 인데도 같은 테이블에 잔존 → query 마다 `WHERE redacted_at IS NULL` 가드 필요. 깜빡 누락 시 깨진 row 노출.
- payment audit (paid_amount, depositor 등) 은 1 application 당 1회 사건인데 테이블 차원에서는 nullable column 으로만 박혀 있어, "결제는 했지만 환불됨" 같은 상태가 컬럼 5개 조합으로만 유추 가능.
- XOR (cohort_id NULL ↔ status='next_cohort_interest') 가 CHECK constraint 로만 강제. application code 가 status 분기 다 알아야 함.

### 1.2 status enum 비대 + milestone 과 의미 충돌

`applicants.status` 8개 값:
```
pending → notified → paid → enrolled
             ↓        ↓
          overdue  cancelled / refunded
                       ↓
            (별개) next_cohort_interest
```

`applicant_milestones` (B0042): `guide_sent` / `feedback_done` — boolean-ish toggle.

**문제**:
- status enum 안에 "결정적 lifecycle state" (pending/notified/paid/enrolled) 와 "side effect 표기" (cancelled/refunded/overdue) 와 "별개 사람" (next_cohort_interest) 이 섞여 있음. state machine 으로 그리면 어색.
- milestone 은 본질적으로 "운영자가 이벤트를 마크함" 인데, 같은 패턴을 messages_log 도 가짐 (template_id 가 발송 이벤트). 둘이 별도 테이블.
- next_cohort_interest 는 "신청 안 함" 인데 applicants 에 들어가 있음. 모집 마감 이후 들어온 row 라 paid_amount 등 컬럼 다 NULL. row 의 의미가 흐려짐.

### 1.3 audit / event 패턴 중복

같은 "누가 / 언제 / 무엇을" 패턴을 3개 시스템이 각자 박음:

| 시스템 | 표현 | 위치 |
|---|---|---|
| messages_log (B0018) | row per 발송 (template_id, channel, sent_at, sent_by) | `messages_log` 테이블 |
| applicant_milestones (B0042) | row per mark (kind, marked_at, marked_by) | `applicant_milestones` 테이블 |
| applicants 안의 audit 컬럼 | column per 사건 (notified_at, payment_confirmed_at, cancelled_at, ...) | `applicants` 자체 |

세 시스템이 본질적으로 "applicant_id 에 사건이 발생함" 을 표현하는데 모양이 셋. 운영자 관점에서 "이 applicant 의 timeline" 을 보려면 3 join.

### 1.4 applicants → students promote 분기

`applicants` (paid) → `students` (promote) 두 테이블. career documents (B0037) 는 students 에 연결. milestones (B0042) 는 applicants 에 연결.

**문제**:
- promote 후 같은 사람의 lifecycle event 가 두 테이블에 흩어짐. "applicant 시절 boomarked + student 시절 출결" 이 다른 model.
- 1기 paid 11명이 students 로 promote 됐다 가정 시, applicants row 는 "이미 끝난 그림자" 가 됨. 다음 기수 신청 시 또 row 만들면 같은 사람이 N row 분산.

### 1.5 클린 아키텍처 위반 잔존 (ADR 0005 진단 재확인)

ADR 0005 가 위반 4개 명시했고 일부는 신규 LMS 코드부터 적용 중이지만:

- `application/admin-actions.ts` (기존, Basic Auth 어드민) 가 Supabase client 직접 호출. use case 가 SQL 모양 안다.
- `domain/application.ts` 가 zod + form state + DTO + Result union 4역할. 신규 entity 마다 같은 anti-pattern 반복 위험.
- status 전이 규칙 (`pending → notified` 등) 이 코드 12곳에 흩어짐.

ADR 0005 는 Strangler Fig "수정 시점에 자연 이전" 으로 박았는데, **현재 적용 진척률 ~30%**. 신규 LMS (B0031~B0037) 만 새 구조에 따랐고, 기존 admin-actions / instructor-actions / finance-actions 는 그대로.

### 1.6 이중 어드민 — 기존 (다크, Basic Auth) 의 품질

노아 발화: "지원자 어드민의 강사탭이랑 재무탭은 아주 개판". 객관적 원인:

- 강사 탭: B0018 Wave 2 에서 급하게 박힘 (2026-06-07). UI 가 dashboard 라기보다 list + 모달. 회사 단위 정산 (B0034) 들어오면 다 갈아엎어야 함.
- 재무 탭: KPI chip 위주, drill-down X. 회계 CSV export 만 강함. trend / 비교 / 예측 X.
- 두 탭 모두 LMS 신규 어드민 (`/fan-to-pro/(lms)/admin/finance` 등) 과 데이터 모델 다름. 1기 운영 중 = 2 surface 동시 운영 = 운영자 mental overhead.

---

## 2. 클린 아키텍처 원칙 재확인 (ADR 0005 + 본 ADR 보강)

ADR 0005 의 5계층 (domain / application / infrastructure / interface) 유지. 본 ADR 은 다음을 보강:

### 2.1 "Aggregate" 개념 도입 (DDD 약식)

엔티티 13개를 그룹으로 묶어 **3 aggregate** 로 본다. aggregate boundary = transaction boundary = 같이 변경되어야 하는 단위.

| Aggregate | 루트 엔티티 | 포함 |
|---|---|---|
| **Person** | `person` (신규, identity) | application[] / enrollment[] / consents / career_documents |
| **Cohort** | `cohort` | sessions / attendance / materials / announcements / events |
| **Settlement** | `cohort_settlement` (신규) | instructor_fees / company_invoices / cash_receipts / tax_filings |

current 13 entity 들이 이 3 aggregate 에 분배됨.

### 2.2 Event sourcing 약식 — "applicant_events" 통합

§1.3 의 3중 audit 패턴을 단일 `person_events` 테이블로 통합. row = (person_id, event_type, payload jsonb, occurred_at, actor).

**event_type** examples:
- `application.submitted` / `application.notified` / `application.paid` / `application.cancelled` / `application.refunded`
- `application.guide_sent` / `application.feedback_done` (milestone 흡수)
- `message.sent` (template_id, channel 은 payload 안에)
- `enrollment.promoted` / `enrollment.withdrawn` / `enrollment.completed`
- `consent.given` / `consent.revoked`
- `pii.redacted`

장점:
- 단일 timeline view 가능 (person 의 모든 사건)
- 새 audit 사건이 생겨도 컬럼 추가 X — event_type 만 추가
- 운영자 페이지에서 "이 사람의 history" = 단일 query

단점 / 트레이드오프:
- query 복잡도 ↑ (현재 status enum 으로 0.1ms 조회되던 게 event timeline 의 last-event 계산으로 5ms)
- jsonb payload 의 schema drift 위험 → zod schema per event_type 박아야 함
- KISS 원칙 위배 가능성. 1인 개발자 + 11명 운영에 event sourcing 은 over-engineering 일 수도.

**결정 (안)**: hybrid. **status / current state 는 derived column 으로 유지** (read 최적화), **이벤트 trail 은 person_events 에 박음** (audit / replay). materialized view 또는 trigger 로 동기화.

### 2.3 신규 추상화 도입 룰 (CLAUDE.md "3회 반복" 룰 적용)

ADR 0005 의 "3회 반복 사용 사례" 룰 명시 재확인. 본 ADR 의 추상화 도입 결정:

| 추상화 | 사용 사례 수 | 도입? |
|---|---|---|
| Event log (person_events) | 3+ (audit, milestone, messages_log) | ✅ 도입 |
| Aggregate (Person / Cohort / Settlement) | 3 그룹 ↔ 13 entity | ✅ 도입 |
| Repository interface (ADR 0005 의 Option C) | 13 entity | ❌ 거부 (ADR 0005 그대로) |
| CQRS event sourcing 풀 적용 | 1 (audit only) | ❌ 거부 — hybrid |
| State machine library (xstate 등) | 1 (application status) | ❌ 거부 — enum + 함수 충분 |

---

## 3. 단순화 plan (단기 / 중기 / 장기)

### 3.1 단기 (NOW, 1기 운영 중 ~ 7/25) — **변경 금지**

CLAUDE.md §7.4 hard rule. 다음만 허용:
- 기존 코드 동작 변경 0
- 본 ADR + playbook 문서 박제 (= 본 작업)
- 운영자 사고 대응 hotfix (단일 컬럼 추가 / NULL 패치 등)

본 phase 의 목적: **다음 phase 시작 시 plan 공유 의무**. 노아가 본 ADR 검토 → 2기 준비 phase 진입.

### 3.2 중기 (NEXT, 2기 시작 전 7/26 ~ 8월 말) — **점진 refactor + 신규 entity 만 새 모델**

**Wave A (2주, 7/26 ~ 8/9)** — Person aggregate 분리 + applicants 슬림화

목표: `applicants` 의 25 컬럼 → 4 테이블 (`persons` / `applications` / `enrollments` / `person_events`) 로 분리.

| Step | 작업 | Risk |
|---|---|---|
| A1 | `persons` 테이블 신설 (identity + PII만, 같은 사람 1 row) + `applicants → persons` shim view | Low |
| A2 | `applications` 테이블 신설 (person_id × cohort_id × status × payment audit). 기존 applicants row 를 양쪽에 분리 mirror | Med (마이그레이션 검증 필수) |
| A3 | `enrollments` 테이블 신설 (= 기존 students). person_id × cohort_id × promote_at × certificate state | Low |
| A4 | `person_events` 신설 + 기존 audit 컬럼 / milestones / messages_log → event 로 migrate (data preserve) | High (이벤트 패턴 검증) |
| A5 | Server actions / 페이지 read path 를 새 view 로 전환. 기존 코드는 shim 으로 동작 유지 | Med |

**Strangler Fig**: 기존 `applicants` 테이블은 **view 로 남겨두고** read path 만 새 테이블 join. 6개월 후 view 삭제.

**Wave B (1주, 8/10 ~ 8/16)** — Settlement aggregate 분리

목표: 기존 어드민의 강사/재무 탭 + LMS 의 finance 페이지 데이터 모델 통합.

| Step | 작업 |
|---|---|
| B1 | `cohort_settlements` 신설 (1 row per cohort × company). vat_issuer / withholding / invoice_status / transfer_status 포함 |
| B2 | `instructor_fees` 신설 (settlement_id × instructor_id × amount × payment_date) |
| B3 | 기존 instructors.fees + finance KPI 를 새 모델로 read 전환 |
| B4 | LMS `/fan-to-pro/(lms)/admin/finance` 만 이 모델 사용. 기존 `/admin/finance` 는 view 통해 호환 |

**Wave C (1주, 8/17 ~ 8/23)** — 클린 아키텍처 위반 청소

목표: ADR 0005 의 위반 4개 잔여분 해소.

| Step | 작업 |
|---|---|
| C1 | `application/admin-actions.ts` 의 Supabase 직접 호출 → repository 함수 경유 |
| C2 | `domain/application.ts` 4역할 분리 (entity / zod / DTO / Result) |
| C3 | status 전이 규칙 12곳 → `domain/services/application-state-machine.ts` 단일 함수 |
| C4 | `admin/` 폴더 (legacy) 의 layer 중복 분해 → infrastructure/auth/, infrastructure/supabase/repositories/, interface/components/admin-legacy/ |

### 3.3 장기 (LATER, 3기+ 또는 100명 규모) — **이중 어드민 완전 통합**

§5 의 deprecation roadmap 참조.

---

## 4. LMS 통합 plan — applicant_milestones / messages_log / student progression

### 4.1 신규 통합 모델 — Person Lifecycle

```
[Person]                          identity (1 row per 사람)
   │
   ├── [Application] × N          1 신청 instance per cohort
   │       │
   │       └── status: applied → notified → paid → enrolled
   │             cancelled / refunded / next_cohort_interest
   │
   ├── [Enrollment] × N           1 enrollment per cohort (paid 이후)
   │       │
   │       ├── attendance[]
   │       ├── submissions[]
   │       ├── consultations[]
   │       └── certificate
   │
   ├── [CareerDocument]           단일 최신본 (B0037 그대로)
   │
   ├── [Consent[]]                동의 이력
   │
   └── [PersonEvent] × M          모든 lifecycle event timeline
```

### 4.2 PersonEvent 활용 시나리오

- 운영자 페이지 timeline: "이 사람이 언제 신청, 언제 paymentGuide 받음, 언제 paid, 언제 enrolled" 단일 query
- 마케팅 funnel 분석: `application.submitted` → `application.paid` 전환율 (자동 계산)
- 환불 / 취소 history: cancelled 사유 + 환불 시점 단일 query (현재는 컬럼 5개 join)
- 동의 변경 audit: GDPR / 개인정보보호법 대응 (현재 consent 컬럼들은 boolean 만, 시점 / 동의 변경 trail X)

### 4.3 student progression 자동화

기존: "applicant.paid → admin 이 students 에 row 만들고 promote 토글" 수동.
새 모델: `application.status='paid'` event 발생 시 trigger 로 `enrollment` row 자동 생성. cohort 시작일에 `enrollment.started` event. 강의 종료 + 출결 75%+ 시 `enrollment.completed` + `certificate.issued`.

각 단계마다 event 박힘 → 다음 기수 운영 시 자동 progression + 자동 mail / 알림.

---

## 5. 이중 어드민 deprecation roadmap

### 5.1 현재 상황

| Surface | 인증 | 디자인 | 데이터 모델 | 상태 |
|---|---|---|---|---|
| `/admin/*` (Basic Auth, 다크) | Basic Auth (admin/viewer) | 다크 + brand-pink | applicants + instructors + finance (B0018) | 운영자가 매일 사용 |
| `/fan-to-pro/(lms)/admin/*` (Supabase Auth, 라이트) | Supabase Auth (super_admin) | 라이트 + 토스 톤 | cohorts + students + LMS finance | Wave 1 launch, 노아 점진 테스트 중 |

### 5.2 Deprecation 단계

| Phase | 시점 | 작업 | Risk |
|---|---|---|---|
| **Phase 0** (현재 ~ 1기 종료) | ~ 7/25 | 변경 0. 두 surface 병행 운영 | 0 |
| **Phase 1** (2기 시작 전) | 7/26 ~ 8/31 | LMS 어드민에 강사/재무 탭 풀 구축. Wave A + B (§3.2) | Med (모델 통합 검증) |
| **Phase 2** (2기 운영 중) | 9월 ~ 10월 | 기존 `/admin/instructors` + `/admin/finance` 를 LMS 로 리다이렉트. `/admin/applicants` 는 LMS `/admin/applications` 로 리다이렉트. Basic Auth 어드민은 "긴급 fallback" 으로만 유지 | Low (read-only fallback) |
| **Phase 3** (3기 모집 시작) | 11월 ~ 12월 | Basic Auth 어드민 완전 제거. middleware path 제거. LMS 어드민만 사용 | Low (1기 운영 데이터 검증 끝난 시점) |

### 5.3 안전 장치

- **데이터 모델 통합** (Wave A + B) 가 deprecation 의 prerequisite. 두 어드민이 같은 테이블 사용해야 점진 전환 가능.
- **운영자 trial** — Phase 2 시작 전 노아가 LMS 어드민으로만 1주일 운영. 빈틈 발견 시 Phase 2 보류.
- **roll-back plan** — Basic Auth 어드민 코드는 Phase 3 전까지 archive branch 에 보존. 사고 시 즉시 복구 가능.

### 5.4 위반 시 (= Deprecation 무리)

- 1기 운영 중 (~7/25) Phase 1 시도 = §7.4 위반. 운영 사고.
- 데이터 모델 통합 미완료 상태에서 Phase 2 시도 = 두 어드민이 다른 model 사용 → 운영자 인지부조화 + 데이터 불일치 사고.

---

## 6. 마이그레이션 전략 — Strangler Fig 적용 단계

각 Wave 의 핵심 룰:

1. **신규 코드는 새 모델만 사용**. 기존 코드는 손대지 않음.
2. **View / shim 으로 기존 read path 호환**. 기존 server action 시그니처 변경 0.
3. **마이그레이션은 Down 도 작성**. 사고 시 즉시 rollback.
4. **각 Wave 종료 시 typecheck + supabase-verify.mjs + 운영자 1주 trial**.
5. **사고 발생 시 다음 Wave 보류**. Wave 사이 buffer 1주 유지.

### 6.1 마이그레이션 위험 영역 (선행 점검 필수)

| 영역 | 위험 |
|---|---|
| applicants → persons 분리 | 같은 사람 식별 키 (현재 email 만). 정규화 시 중복 row collapse 정확성. |
| status enum → application_state | 'next_cohort_interest' 분리. 마이그레이션 후 기존 row 의 status='next_cohort_interest' 는 person 만 남고 application X 으로 분리. |
| messages_log → person_events | template_id / channel 매핑. 기존 row preserve. |
| applicant_milestones → person_events | kind ('guide_sent', 'feedback_done') → event_type 매핑. |
| `redacted_at` 컬럼 → `person.pii_redacted_at` | redacted row 의 application / event 보존 정책 (= 마스킹 후 보존, person row 만 익명화). |

### 6.2 검증 도구

- `supabase-verify.mjs` 확장 — 새 테이블 shape 검증 + 기존 view 로 read 호환 검증.
- `domain/services/state-machine.test.ts` — status 전이 invariant 검증.
- `infrastructure/supabase/repositories/*.test.ts` — repository 함수 단위 테스트 (Supabase mock).
- E2E (Playwright) — 운영자 페이지 핵심 시나리오 (paid 토글 / 환불 / cohort kickoff 메시지 발송) 자동화.

---

## 7. 우선순위 + ROI

### 7.1 NOW (1기 운영 중, ~ 7/25)

| 작업 | ROI | 시작 가능 |
|---|---|---|
| 본 ADR + playbook 박제 | High (다음 phase 청사진) | 즉시 |
| 코드 변경 | **금지** | X |

### 7.2 NEXT (2기 시작 전, 7/26 ~ 8/31)

| Wave | 작업 | ROI | 작업량 |
|---|---|---|---|
| Wave A | Person aggregate 분리 (persons / applications / enrollments / person_events) | **High** — God table 해소 + audit 통합 + 다음 기수 자동 progression 기반 | 2주 |
| Wave B | Settlement aggregate 통합 (cohort_settlements / instructor_fees) | **High** — 강사/재무 탭 품질 개선 + LMS 통합 prerequisite | 1주 |
| Wave C | 클린 아키텍처 위반 청소 | **Med** — 코드 품질, 신규 entity 추가 비용 ↓ | 1주 |
| **합계** | | | **4주** |

### 7.3 LATER (3기+, 9월 이후)

| 작업 | ROI | 작업량 |
|---|---|---|
| 이중 어드민 deprecation Phase 2 | **High** — 운영자 mental overhead 제거 | 1주 |
| LMS Wave 2~4 (B0033~B0035) 본격 | **High** — 학생/강사 surface 풀 | 5주 |
| Basic Auth → cookie session 전환 (B0029) | Med — 운영자 2명+ 시 트리거 | 1주 |
| 자동화 (paymentConfirmed / 토스뱅크 매칭 / 알림톡) | **High** — 운영자 시간 ↓ | 3주 |

### 7.4 트레이드오프 + 위험

| 결정 | 위험 | 대안 |
|---|---|---|
| Person aggregate 도입 (3 테이블 분리) | 마이그레이션 사고 (같은 사람 식별 정확성). 1주 운영자 trial 보류 | applicants 유지 + 점진 컬럼 정리 (낮은 ROI) |
| person_events 통합 | jsonb payload schema drift. zod schema per event_type 박는 비용 | 기존 3중 audit 유지 (낮은 ROI, 운영자 불편 ↑) |
| 이중 어드민 Phase 2 (9월~10월) | 운영자가 새 LMS 어드민 적응 비용. 사고 시 fallback 필요 | 영구 병행 (장기 mental overhead) |
| Strangler Fig 점진 적용 (4주) | 점진의 위험 = 영원히 안 끝남. deadline + scope freeze 필요 | 빅뱅 (1주, 운영 down time 1일+) — 거부 |

---

## 8. B0040 playbook 갱신 사항

본 ADR 이 박제되면 다음 playbook 파일 갱신:

### 8.1 `docs/playbook/09-feature-candidates.md`

추가 항목:

- **F16** · Person aggregate 분리 (Wave A) · 작업량 2주 · 우선순위 High · Wave NEXT
- **F17** · Settlement aggregate 통합 (Wave B) · 작업량 1주 · 우선순위 High · Wave NEXT
- **F18** · 클린 아키텍처 위반 청소 (Wave C) · 작업량 1주 · 우선순위 Med · Wave NEXT
- **F19** · 이중 어드민 deprecation Phase 2 · 작업량 1주 · 우선순위 High · Wave LATER

### 8.2 `docs/playbook/08-automation-candidates.md`

추가 항목:

- **A9** · person_events 기반 자동 알림 / mail trigger · Wave A 의존
- **A10** · application → enrollment 자동 promote (paid 시 trigger) · Wave A 의존
- **A11** · enrollment.completed → certificate.issued 자동 trigger · Wave A 의존

### 8.3 `docs/playbook/10-next-cohort-checklist.md`

추가 섹션 — "2기 시작 전 Wave A/B/C 실행 여부 결정 + roll-back plan 검증".

### 8.4 신규 파일 — `docs/playbook/02-build-tracks/data-model.md`

본 ADR 의 §1 (진단) + §3 (단순화 plan) + §4 (LMS 통합) 의 핵심을 운영 매뉴얼 톤으로 박제. 별도 작성 (본 ADR 의 후속 작업).

---

## 9. Rejected Alternatives

| 안 | 거부 이유 |
|---|---|
| 빅뱅 마이그레이션 (1주 down time) | 1기 운영 중 사고 risk. 점진 마이그레이션이 안전. |
| 이벤트 sourcing 풀 적용 (CQRS + event store) | 1인 개발자 + 11명 운영에 over-engineering. hybrid (status + events) 가 KISS. |
| Repository interface 도입 (ADR 0005 Option C) | 13 entity × interface 26 파일 비용 ↑. 1년 내 Supabase 교체 확률 < 5%. |
| State machine library (xstate) | enum + 함수로 충분. lib 학습 + bundle size 비용 ↑. |
| Basic Auth 어드민 즉시 제거 | 1기 운영자 매뉴얼 변경 = mental overhead. 점진 deprecation 안전. |
| applicants 컬럼 점진 정리 (분리 X) | God table 패턴 유지. 다음 기수 시 같은 사람이 N row 분산 문제 미해결. |
| LMS 어드민만 사용 (Basic Auth 즉시 제거) | LMS 어드민 강사/재무 탭 미구현. 운영 down. |

---

## 10. 노아 결정 보류 사항

본 ADR 진행 시 결정 필요:

1. **Wave A 시작 시점** — 2기 시작 전 (7/26 ~ 8/9) vs 2기 모집 시작 후 (8월 중) vs Q4 (9월 이후)
2. **person_events payload schema** — jsonb (유연) vs strict column per event type (검증 강함)
3. **이중 어드민 Phase 2 시점** — 9월 (2기 운영 중) vs 11월 (3기 시작) vs deferred
4. **마이그레이션 down time 허용 범위** — 0 (Strangler Fig 풀 적용) vs 1시간 (단일 마이그레이션 batch)
5. **본 ADR 의 Wave A/B/C 작업 우선순위 vs LMS Wave 2~4 (B0033~B0035) 우선순위** — 어느 게 먼저?

---

## 참조

- ADR 0005 (LMS 클린 아키텍처 — Layered Pragmatic + Strangler Fig)
- ADR 0006 (LMS 디자인 시스템 — 라이트 + 토스 톤)
- ADR 0008 (Program Modularization — cohort slug + 권한 3 계층)
- ADR 0004 (Operator Toolset — in-app vs external)
- CLAUDE.md §7.4 (production 보호 + 기존 영역 변경 금지)
- CLAUDE.md §2 (12단계 워크플로우)
- B0031 ~ B0042 (LMS Wave 0~5 + career docs + milestones)
- `docs/playbook/09-feature-candidates.md` (기능 후보)
- `docs/playbook/02-build-tracks/data-model.md` (본 ADR 의 운영 매뉴얼 후속)
