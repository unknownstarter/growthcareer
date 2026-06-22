# ADR 0010 — applicants 테이블 영구 보존 + LMS additive only

> Status: **Accepted (Recommended)** — supersedes ADR 0009 의 Wave A/B/C
> Date: 2026-06-23
> Owner: 노아 + Sophia review
> 관련: ADR 0005 (Clean Architecture) / 0008 (Program Modularization) / 0009 (data-model-consolidation, partial supersede)

---

## TL;DR

**`applicants` 테이블은 영구히 그대로 둔다.** 모든 schema 변경 (split / rename / column drop) **금지**. LMS 는 `applicants.status` 를 read-only trigger 로 활용해 자체 entity 만 신규 추가한다.

ADR 0009 의 Wave A/B/C (persons + applications + enrollments + person_events 분리) = **Rejected**. 1기 데이터 risk + rollback 어려움 + 마이그레이션 race condition + 동일 사람 dedup 사고 위험.

## 컨텍스트

ADR 0009 가 데이터 모델 정리 4 단계 plan 박제 (persons / applications / enrollments / person_events 분리). 노아 우려:

> "지금 1기때는 아예 못쓰는거야?... 지금 보관되어 있는 정보들이 당연히 없어지거나 무작위로 상태가 변경되거나 하면 절대 안돼! 어떤 위험과 사이드이펙트, 그리고 엣지케이스가 예상되는거야? 기존의 지원자 어드민은 유지한채 LMS를 개선해나갈 수는 없는거야?"

→ 노아 의도: **applicants 안 건드리고 LMS 만 새 모델로 키우기**. 정확히 옳은 판단.

## 결정 1 — `applicants` 영구 불변

```sql
-- 변경 금지 영역
public.applicants  (25 컬럼 그대로)
  ├ identity + PII
  ├ status enum (8값)
  ├ payment audit (paid_amount_krw / depositor_name_observed / ...)
  ├ cancel / refund audit
  ├ cohort_id (XOR with next_cohort_interest)
  └ redacted_at
```

**룰**:
1. **새 컬럼 추가 X** — 1기 운영 안정성 우선. 추후 정말 필요해도 별도 1:1 테이블 (`applicant_extensions`) 권장.
2. **컬럼 drop X** — 운영자 (노아) workflow 안정.
3. **status enum 추가 X** — 8값으로 동결. 추가 단계 필요 시 milestone / event 로.
4. **마이그레이션 X** — schema 자체 마이그레이션 없음. 데이터 split 도 없음.

**예외**:
- 법적 필수 (예: 개인정보보호법 강제 컬럼) 추가 — 별도 ADR 후
- 성능 인덱스 추가 — 데이터 변경 X 라 OK
- comment 갱신 — OK

## 결정 2 — LMS 는 `applicants.status` 를 read-only trigger 로 본다

```
applicants.status = 'paid'
  ↓ (운영자 click 또는 자동 promote)
students INSERT (cohort_id, applicant_id, ...)
  ↓
LMS 의 모든 신규 entity 가 students.id 기반
  ├ student_career_documents (B0037 — 기존)
  ├ student_events (신규)        ← B0041/B0042 의 LMS 버전
  ├ student_milestones (신규)
  ├ student_attendance (기존 attendance)
  ├ materials (cohort 기반)
  ├ announcements (cohort 기반)
  ├ consultations / submissions / feedback / certificates
```

**도메인 경계 명확화**:
- `applicants` = **신청-입금 단계** (모집 surface). Basic Auth 어드민 관할.
- `students` = **수강 단계** (LMS surface). LMS Supabase Auth 관할.
- promote 시점 = `status='paid'` → 운영자 [강좌 확정 일괄] 버튼 (기존) 또는 LMS 자동.
- promote 후: applicants row 는 그대로 (status='enrolled' 토글), students row 가 LMS journey 의 anchor.

## 결정 3 — LMS 신규 entity 는 처음부터 clean

ADR 0005 의 4 레이어 (domain / application / infrastructure / interface) 엄격 준수. LMS 의 모든 신규 entity:

1. **domain/entities/<name>.ts** — zod schema + invariant + state machine (필요 시)
2. **application/queries|use-cases/<name>/<verb>.ts** — server action / read query
3. **infrastructure/supabase/repositories/<name>-repository.ts** — DB CRUD only
4. **interface/components/lms/...** — UI (라이트 토스 톤)

추가:
- **event sourcing 안 함** — 단순 시작.
- **단일 audit 테이블** — LMS 안에서는 `student_events` 하나로. (kind: `message_sent` / `milestone_marked` / `status_changed` / `attendance_marked` 등.) payload = jsonb 또는 type-별 column.
- **milestone 은 별도 안 만들고 events 에 통합** — `event_type='milestone_marked'` 로 단일화 가능. (단 active flag 가 필요하면 별도 view 또는 derived column)

## 사용자 제안에 대한 답변

### "모집 관련 테이블은 그대로 두고 그 테이블에서의 유저 상태에 따라 다른 테이블이 바라보게 해도 되는거고"

→ **YES.** 본 ADR 의 결정 2 가 정확히 그것. `applicants.status` 가 source of truth, LMS 가 read.

### "단계별로 구조를 설계해서 관리할 수도 있고 (이러면 당연히 복제 가능성 때문에 선택 옵션은 아니지만!)"

→ **노아의 판단 정확.** 단계별 별도 테이블 (signups → applicants → enrollments → graduates) 은 같은 사람의 4 row 누적 → dedup 어려움 + FK 복잡 + LMS 마다 다른 테이블 join.

대신 본 ADR 의 결정 1+2 = `applicants` 한 테이블 + status 라이프사이클 + LMS 가 status 보고 LMS 테이블 생성 — 중복 0, dedup 0, FK 단순.

## ADR 0009 의 어떤 부분이 살아남는가

| ADR 0009 항목 | 본 ADR 에서 | 이유 |
|---|---|---|
| persons / applications / enrollments split | **Rejected** | applicants 안 건드리는 게 안전. dedup 어려움. |
| person_events 단일 audit | **부분 채택** (student_events 로 LMS 내부만) | LMS 신규 entity 만. applicants 의 messages_log / applicant_milestones 는 그대로. |
| next_cohort_interest 분리 | **Rejected** | 이미 applicants.status enum 안에 들어감 (XOR constraint). 다음 기수 모집 시작 시 처리 (다음 ADR 별도). |
| Settlement aggregate 통합 | **Deferred** | LMS Wave 2 (B0033) 에서 cohort_settlements 신설 가능. 기존 `instructors` 테이블은 그대로. |
| 이중 어드민 deprecation | **Deferred** | 3기 / 4기 운영 안정 후 결정. |
| 클린 아키텍처 청소 | **Accepted** | 신규 LMS entity 만 clean. 기존 코드 청소 점진. |

## LMS Wave 2 (B0033) 시 신규 entity 우선순위

본 ADR 의 결정 3 따라 clean 하게 신설:

1. **student_events** (단일 audit) — kind / payload jsonb / created_at / created_by
2. **student_milestones** (또는 events 에 흡수 검토)
3. **materials** (cohort 기반, Storage)
4. **announcements** (cohort 기반)
5. **consultations / consultation_reviews**
6. **assignments / submissions / feedback**
7. **certificates** (출석률 75% 자동 발급)
8. **cohort_events** (캘린더)

모두 students.id / cohort_id 기반. applicants 안 건드림.

## 위험 / 대안 검토

### 위험 1: applicants 가 시간이 지나며 진짜로 답답해질 수 있음

대안: 별도 1:1 확장 테이블 (`applicant_extensions`) — applicants.id PK + 새 컬럼들. applicants 자체 schema 는 그대로.

### 위험 2: status enum 이 진짜 부족해질 수 있음

대안 1: milestone 시스템 활용 (이미 있음).
대안 2: state machine 을 enum 이 아니라 derived column 으로 (events 의 마지막 event 기반).

### 위험 3: 다음 기수 시 같은 사람 다시 신청 시 row 중복

현재 패턴: 같은 email 로 다시 신청하면 새 applicants row 생성 (cohort_id 다름). dedup 안 함.

대안 (LMS 내부만):
- LMS 가 students promote 시 같은 person 추적 (예: applicants.email + applicants.nationality 매칭)
- `students.previous_applicant_ids[]` 또는 별도 `person_identities` 테이블 (LMS 내부)
- applicants 는 여전히 단일 모집 record

향후 ADR 별도 (예: ADR 0011 student person identity).

## 마이그레이션 (없음)

본 ADR 채택 = **신규 마이그레이션 0건**.

Phase 1 (이전 ADR 0009): applicants split → **취소**
Phase 2 (이전 ADR 0009): settlement 통합 → **LMS Wave 2 에서 분리 작업**

기존 마이그레이션 + 테이블 모두 그대로.

## 결정 요약

| 영역 | 결정 |
|---|---|
| applicants schema | **불변**. column / status enum / 마이그레이션 X |
| LMS 신규 entity | **applicants.status 기반 read-only trigger**. students.id 가 LMS anchor |
| 신규 audit | LMS 안에서 단일 `student_events` (Wave 2). applicants 의 messages_log / milestones 그대로 |
| 클린 아키텍처 | LMS 신규 entity 만 엄격 적용. 기존 코드 점진 |
| Settlement / 이중 어드민 | 본 ADR 범위 외. LMS Wave 2 + 다음 ADR |
| ADR 0009 의 person split | **Rejected** |

## 노아 결정 필요 (간소화)

본 ADR 채택 시 ADR 0009 의 5개 결정 사항 중 대부분 자동 해소:

| 항목 | 결정 |
|---|---|
| Wave A 시작 시점 | 해당 없음 (Rejected) |
| person_events payload schema | `student_events` 에서만 적용. jsonb (유연) 권장 |
| 이중 어드민 Phase 2 시점 | Deferred (3기 / 4기 후) |
| 마이그레이션 down time | 해당 없음 (마이그레이션 X) |
| Wave A/B/C 우선 vs LMS Wave 2 | **LMS Wave 2 우선** (clean 하게 신규 entity 만) |

## 향후 ADR 후보

- **ADR 0011** student_events 단일 audit schema (kind enum + payload jsonb 또는 strict column)
- **ADR 0012** student person identity (다음 기수 시 같은 사람 추적)
- **ADR 0013** Settlement aggregate (cohort × company 정산)
- **ADR 0014** Basic Auth 어드민 deprecation roadmap (3기 / 4기 안정 후)

## 노아 확인 필요

본 ADR 채택 = 1기 데이터 안전 + LMS clean. ADR 0009 의 Phase 1~3 폐기. ADR 0009 자체는 archival 자료로 유지 (Rejected Alternatives 분석 가치).
