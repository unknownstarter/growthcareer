# Data Model — 통합 plan + 운영 매뉴얼

> 본 문서는 [ADR 0009](../../decisions/0009-data-model-consolidation.md) 의 운영 매뉴얼 톤 후속.
> ADR 은 결정 + 트레이드오프. 본 문서는 "실제로 어떻게 진행하는가" 의 실행 매뉴얼.

> **읽는 순서**: ADR 0009 (전략) → 본 문서 (실행) → Wave 진입 시 spec 파일 (T2)

---

## 0. 1줄 요약

1기 운영 중에 ad-hoc 으로 박은 데이터 모델 (applicants God table + 3중 audit + 8값 status enum + 이중 어드민) 을 2기 시작 전 (7/26 ~ 8/31, 4주) **Person aggregate + person_events + Settlement aggregate** 로 통합. Strangler Fig 점진 적용. 1기 운영 중 (~ 7/25) 은 변경 0.

---

## 1. 현재 모델 한눈에

```
[applicants] -- 25 컬럼, God table
  ├── identity / PII (10)
  ├── consent (4)
  ├── status enum (8 values)
  ├── notification audit (4)
  ├── payment audit (4)
  ├── cancel / refund audit (4)
  ├── privacy state (redacted_at)
  └── cohort link (XOR with status)

[students]                    promote 후, career documents 연결
[applicant_milestones]        B0042 — kind toggle (guide_sent / feedback_done)
[messages_log]                B0018 — 발송 audit
[instructors] [companies]     강사 / 회사
[cohorts] [sessions] [attendance] LMS
[cash_receipts]               B0018 현금영수증
[performances]                B0018 공연 매칭
[cohort_expenses] [tax_filings] LMS finance
[student_career_documents]    B0037
[programs] [program_memberships] [cohort_memberships] [user_profiles] LMS auth
```

**총 ~17 테이블**, 1년 전 0 → 1기 마감 시점 17. 한 테이블이 6 책임 가지고 있음 (applicants).

---

## 2. 목표 모델 한눈에

```
[persons]                     identity + PII only (1 row per 사람)
  │
  ├── [applications] × N      cohort 별 신청 instance
  │     status: applied → notified → paid → enrolled
  │            cancelled / refunded
  │     payment_audit (jsonb 또는 별도 컬럼)
  │
  ├── [enrollments] × N       cohort 별 수강 instance (paid 이후)
  │     │
  │     ├── attendance[]
  │     ├── submissions[]
  │     ├── consultations[]
  │     └── certificate (1)
  │
  ├── [career_documents]      단일 최신본 (B0037 그대로)
  │
  ├── [consents] × M          동의 이력 (변경 trail)
  │
  ├── [next_cohort_interests] 다음 기수 알림 신청 (applications 와 분리)
  │
  └── [person_events] × K     모든 lifecycle event timeline

[cohorts]                     기수 (변경 X)
  ├── sessions[]
  ├── materials[]
  ├── announcements[]
  └── events[]

[cohort_settlements]          (신규) 1 row per cohort × company
  ├── instructor_fees[]
  ├── company_invoices[]
  ├── tax_filings[]
  └── cash_receipts[]
```

**총 ~22 테이블** (5 추가, 0 삭제). 책임 단일화 + 같은 사람 N 신청 = N row 분산 해소.

---

## 3. 단계별 실행 매뉴얼

### Phase 0 — 현재 (~ 7/25, 1기 운영 중)

✅ ADR 0009 박제 (= 이 작업)
✅ 본 매뉴얼 박제
❌ 코드 변경 금지 (CLAUDE.md §7.4)

**산출물**: ADR 0009 + 본 매뉴얼 + playbook 9 / 8 / 10 갱신.

### Phase 1 — Wave A (7/26 ~ 8/9, 2주) — Person aggregate 분리

**목표**: applicants 의 25 컬럼 → 4 테이블로 분리.

#### Day 1~2 (7/26 ~ 7/27, 토일) — Pre-flight + 마이그레이션 설계

- [ ] 본 매뉴얼 + ADR 0009 노아 검토 + 결정 사항 5개 (ADR §10) 컨펌
- [ ] 마이그레이션 파일 초안 작성 (`supabase/migrations/`)
- [ ] supabase-verify.mjs 확장 (새 테이블 shape 검증)
- [ ] rollback 마이그레이션 작성 (각 Up 에 대응)

#### Day 3~5 (7/28 ~ 7/30, 월화수) — Step A1: persons 신설

- [ ] `supabase/migrations/<YYYYMMDD>_create_persons.sql`
- [ ] `persons` 테이블 + 기존 applicants 의 identity / PII 컬럼 → persons 로 복사
- [ ] `applicants.person_id` FK 추가
- [ ] zod schema + entity 파일 (`domain/entities/person.ts`)
- [ ] repository 함수 (`infrastructure/supabase/repositories/persons.ts`)
- [ ] supabase-verify.mjs PASS 확인
- [ ] 기존 server actions 그대로 동작 확인 (shim view 통해)

#### Day 6~8 (7/31 ~ 8/2, 목금토) — Step A2: applications 신설

- [ ] `applications` 테이블 (person_id × cohort_id × status × payment audit)
- [ ] 기존 applicants 의 status / payment 컬럼 → applications 로 복사
- [ ] XOR (cohort_id NULL ↔ next_cohort_interest) 는 `next_cohort_interests` 별도 테이블로 분리 (= status enum 7개로 축소)
- [ ] applicants view 로 호환성 유지 (read path)
- [ ] mutation 서버액션도 새 테이블 사용하도록 점진 전환

#### Day 9~10 (8/3 ~ 8/4, 일월) — Step A3: enrollments 신설

- [ ] `enrollments` 테이블 (= students 재명명 + 정리)
- [ ] 기존 students.* + applicants.payment_confirmed_at 등 → enrollments
- [ ] career_documents.student_id → enrollment_id 또는 person_id (결정 필요)

#### Day 11~13 (8/5 ~ 8/7, 화수목) — Step A4: person_events 신설 + 통합 ⚠️ 최대 risk

- [ ] `person_events` 테이블 (person_id × event_type × payload jsonb × occurred_at × actor)
- [ ] event_type per 사건 정의 (15~20 종)
- [ ] zod schema per event_type
- [ ] migration: applicant_milestones + messages_log + applicants.notified_at / payment_confirmed_at / cancelled_at / refunded_at → person_events
- [ ] derived column trigger (applications.status, applications.last_notified_at 등) 박음
- [ ] **데이터 무결성 검증 스크립트** — migrate 후 person_events count 와 원본 count 일치 검증

#### Day 14 (8/8 ~ 8/9, 금토) — Step A5: read path 전환 + verify

- [ ] 운영자 페이지 read query 새 테이블 join 으로
- [ ] **운영자 trial 1주** (= Phase 1 종료 후 검증 기간, 8/10 ~ 8/16 의 일부)
- [ ] typecheck + supabase-verify + 운영자 시나리오 PASS
- [ ] git push → 배포 (Sage 검토 받은 후)

### Phase 2 — Wave B (8/10 ~ 8/16, 1주) — Settlement aggregate

#### Day 1~2 (8/10 ~ 8/11) — cohort_settlements + instructor_fees

- [ ] `cohort_settlements` 테이블 (1 row per cohort × company)
- [ ] `instructor_fees` 테이블 (settlement_id × instructor_id × amount × payment_date × tax_mode)
- [ ] 기존 instructors.fees / instructors.amount → instructor_fees row 로 분리
- [ ] entity / repository / use-case 새 구조

#### Day 3~4 (8/12 ~ 8/13) — LMS finance 페이지 새 모델 사용

- [ ] `/fan-to-pro/(lms)/admin/finance` 가 새 테이블 사용
- [ ] 기존 `/admin/finance` 는 view 로 호환 (변경 0)
- [ ] 회계 CSV export 새 모델 기반

#### Day 5~7 (8/14 ~ 8/16) — 운영자 trial + 검증

- [ ] 노아가 LMS 어드민으로만 1주 운영 (Phase 2 deprecation prerequisite)
- [ ] 빈틈 발견 시 fix
- [ ] PASS → Phase 3 진입 결정

### Phase 3 — Wave C (8/17 ~ 8/23, 1주) — 클린 아키텍처 위반 청소

#### Day 1~2 — admin-actions.ts repository 경유

- [ ] `application/admin-actions.ts` 의 Supabase 직접 호출 → repository 함수 경유
- [ ] 같은 패턴을 instructor-actions / finance-actions / polling-actions 에 반복

#### Day 3 — domain/application.ts 4역할 분리

- [ ] entity / zod / DTO / Result 분리
- [ ] 신규 entity (Person / Application / Enrollment) 도 같은 패턴

#### Day 4~5 — status state machine 단일화

- [ ] `domain/services/application-state-machine.ts` 신설
- [ ] status 전이 규칙 12곳 → 단일 함수
- [ ] 테스트 (invariant 검증)

#### Day 6~7 — legacy admin 폴더 layer 분해

- [ ] `admin/role.ts` → `infrastructure/auth/`
- [ ] `admin/fetch-applicants.ts` → `infrastructure/supabase/repositories/`
- [ ] `admin/components/*.tsx` → `interface/components/admin-legacy/`
- [ ] import path 일괄 변경 + typecheck PASS

### Phase 4 — 이중 어드민 Phase 2 (9월 ~ 10월) — Deprecation

ADR 0009 §5.2 의 Phase 2 단계 실행. 노아 결정 시점.

---

## 4. 위험 + 대응 매트릭스

| 위험 | 발생 시점 | 대응 |
|---|---|---|
| persons 분리 시 같은 사람 식별 키 모호 (email duplicate 등) | Wave A Day 3~5 | 사전 데이터 검사 + 사용자 (노아) 수동 merge |
| person_events 마이그레이션 시 row count 불일치 | Wave A Day 11~13 | 검증 스크립트 PASS 전 절대 진행 X. rollback 즉시 |
| Strangler view 호환성 깨짐 (기존 server action 사고) | Wave A 전반 | 운영자 1주 trial + 운영 중 발견 시 즉시 view 패치 |
| settlement 모델 통합 시 기존 강사 정산 데이터 손실 | Wave B Day 1~2 | mirror 패턴 (양쪽 동시 쓰기, 검증 후 단일화) |
| 클린 아키텍처 청소 시 import path 일괄 변경 사고 | Wave C Day 6~7 | typecheck + 운영자 시나리오 PASS 전 push X |
| 이중 어드민 Phase 2 시 운영자 인지부조화 | Phase 4 | LMS 어드민 1주 trial (Wave B 종료 시) 필수 |

---

## 5. 검증 도구 + 체크리스트

### 5.1 supabase-verify.mjs 확장

```js
// 신규 검증
- persons 테이블 shape (10 컬럼)
- applications 테이블 shape (8 컬럼)
- enrollments 테이블 shape (7 컬럼)
- person_events 테이블 shape (5 컬럼) + event_type enum
- applicants view (호환성)
- 마이그레이션 후 row count = 원본 row count
```

### 5.2 도메인 테스트

```ts
// domain/services/application-state-machine.test.ts
- applied → notified 허용
- applied → paid 허용 (직접)
- paid → enrolled 허용
- enrolled → cancelled 거부 (이미 enrolled 면 refund 만 가능)
- 모든 transition invariant 검증
```

### 5.3 E2E 시나리오 (Playwright)

운영자 시나리오 7개:
1. 신규 신청 → applicants 페이지 노출 → paid 토글
2. paymentGuide 메시지 발송 → messages_log 박힘 (= person_events)
3. 환불 처리 → applications.status='refunded' + person_events 박힘
4. cohort kickoff 메시지 발송 (다중)
5. 강사 정산 → instructor_fees row 박힘
6. 회계 CSV export
7. 다음 기수 모집 시작 → 동일 사람이 또 신청 → person_id 같은 row 가 새 applications row 만 추가

### 5.4 배포 전 5종 체크 (CLAUDE.md §7.4)

각 Wave 종료 시 의무:
1. Mira QA 통과
2. Sage 보안 검토 통과 (마이그레이션 = 새 PII 표면)
3. typecheck + build PASS
4. 카피 부호 검사 (em dash 등) — 본 작업 무관
5. supabase-verify.mjs PASS

---

## 6. ROI 비교 — Wave A/B/C vs LMS Wave 2~4

ADR 0009 §10.5 결정 보류 항목: "본 ADR Wave A/B/C 우선 vs LMS Wave 2~4 (B0033~B0035) 우선".

### 6.1 Wave A/B/C 먼저 (4주, 7/26 ~ 8/23)

**Pro**:
- 데이터 모델 통합 = LMS 학생/강사 surface (Wave 2) 구축 시 깨끗한 모델 사용 가능
- person_events 기반 자동화 (paymentConfirmed / 알림톡 / progression) 토대
- 다음 기수 신청자 = 같은 사람 1 row 자동 처리

**Con**:
- LMS Wave 2 (학생/강사 surface) 가 2기 모집 전 (8월 말) 까지 X
- 2기 모집 시작 시 학생/강사 LMS 없음 = 1기와 동일하게 카톡 운영

### 6.2 LMS Wave 2~4 먼저 (5주, 7/26 ~ 8/30)

**Pro**:
- 2기 시작 시 학생/강사 LMS 풀 가동
- 운영자 UX 즉시 개선

**Con**:
- 학생/강사 surface 가 기존 데이터 모델 (God table) 위에 박힘 → 나중에 통합 시 재작업
- person_events 부재 → 자동화 후보 (A9 / A10 / A11) 보류

### 6.3 추천 (= 본 매뉴얼 default)

**Wave A 만 먼저 (2주) + LMS Wave 2 부분 (학생 surface 핵심 3 페이지, 2주) 병행 → Wave B/C 는 9월**

근거:
- Wave A 의 Person aggregate = 가장 큰 risk + 가장 큰 ROI. 가장 먼저 박아야 다음 모든 작업의 기반.
- LMS 학생 surface 핵심 (announcements / materials / sessions) 만 먼저 = 2기 학생 만족도 ↑
- Wave B/C 는 9월로 미뤄 2기 운영 중에 점진 적용

**=> 4주 = Wave A (2주) + LMS 학생 surface 부분 (2주) → 8/23 완료 → 8/24 ~ 8/31 2기 모집 준비**

---

## 7. 다음 액션 (노아 컨펌 후)

1. ADR 0009 + 본 매뉴얼 검토
2. ADR 0009 §10 결정 사항 5개 컨펌 (특히 Wave 시작 시점 + 우선순위)
3. Wave A Pre-flight (7/26 ~ 7/27) 시작 시점 컨펌
4. playbook 09 / 08 / 10 갱신 작업 시작
5. 1기 운영 매뉴얼 (CLAUDE.md §7.4) 그대로 유지

---

## 참조

- [ADR 0009](../../decisions/0009-data-model-consolidation.md) — 전략 + 트레이드오프
- [ADR 0005](../../decisions/0005-lms-clean-architecture.md) — LMS 클린 아키텍처
- [ADR 0008](../../decisions/0008-program-modularization.md) — Program Modularization
- [09-feature-candidates.md](../09-feature-candidates.md) — 기능 후보 (F16~F19 추가 예정)
- [08-automation-candidates.md](../08-automation-candidates.md) — 자동화 후보 (A9~A11 추가 예정)
- [10-next-cohort-checklist.md](../10-next-cohort-checklist.md) — 2기 체크리스트
- `WORKING-SESSION.md` — 현재 작업 상태
- CLAUDE.md §7.4 — production 보호 룰
