# B0070 - Instructor Surface Backend Spec (Slice 1 outline)

**Status**: Draft (Iris Slice 1, 노아 확인 대기)
**Date**: 2026-07-06
**Owner**: Iris (Backend) + Luna (Frontend, Slice 3+)
**Approved**: 노아 (2026-07-04, ADR 0013 §단기 B0070 항목)
**Related**: ADR 0005 (Clean Architecture), ADR 0008 (URL/Auth 분리), ADR 0013 §Instructor Surface, CLAUDE.md §7.4
**Marker**: [skip-gating: approved]

---

## 배경

1기 = 운영자 대행 정책. 강사 UI 0. 종강 7/19 후 2기 시작 전 최소 3 페이지 (dashboard / students / sessions) 착수. 권한 가드는 이미 `lms-role.ts` 에 대부분 준비. 신규 route 만 추가하고 기존 admin surface 는 절대 안 건드림 (CLAUDE.md §7.4).

**Phase 1 scope (본 spec)** = 페이지 5 + 신규 use case 4 + 가드 1 신설. materials / assignments 페이지는 Phase 2 (ADR 0013 5 페이지 vs 본 spec 5 페이지 사이 차이는 §노아 확인 필요 결정 1 참조).

---

## Phase 1 페이지 5 (route)

모두 `/[locale]/fan-to-pro/(lms)/[cohortSlug]/instructor/*` 아래. `(lms)` route group + `[cohortSlug]` dynamic segment.

| # | route | 목적 | 가드 (layout) | 가드 (page) |
|---|---|---|---|---|
| 1 | `page.tsx` | 담당 cohort 대시보드 (session 리스트 + 다가오는 과제) | `assertCohortRole(cohortId, "instructor")` | (layout 만) |
| 2 | `students/page.tsx` | 담당 cohort 학생 리스트 (name / attendance / progress) | (layout 상속) | (layout 만) |
| 3 | `students/[id]/page.tsx` | 학생 프로필 (career target + attendance rate) | (layout 상속) | `assertCanReadStudentProfile(studentId)` + student.cohort_id == cohortId 검증 |
| 4 | `students/[id]/career/page.tsx` | career documents read only viewer | (layout 상속) | `assertCanAccessStudentCareer(studentId)` + cohort 검증 |
| 5 | `students/[id]/consultation/page.tsx` | consultation history + review write | (layout 상속) | `assertCanReadStudentNote(studentId)` + cohort 검증 (Note 가드와 권한 동일 - instructor OR admin OR super_admin) |

**layout 파일** = `/[cohortSlug]/instructor/layout.tsx` - cohortSlug 로 cohort 조회 + `assertCohortRole` 1회 (React `cache()` 라 page 재호출 시 free). 존재하지 않는 slug → 404.

**절대 룰 준수**:
- 기존 `/admin/*` (Basic Auth 다크) 및 `/fan-to-pro/(lms)/admin/*` (Supabase 라이트) 변경 X
- 기존 server actions signature 변경 X
- `applicants` shape 변경 X
- 신규 zod 스키마는 신규 use case 파일 안에만 (기존 스키마 재사용 우선)

---

## 페이지별 fetch layer 표 (기존 재사용)

각 page.tsx / layout.tsx 에서 아래 함수만 호출 (모두 기존).

| 페이지 | 함수 | 반환 |
|---|---|---|
| **layout** | `getLmsUser()` | `LmsUser \| null` (session) |
| **layout** | `fetchCohortBySlug(slug)` | `Cohort \| null` (404 판정) |
| **layout** | `assertCohortRole(cohortId, "instructor")` | throw or `LmsUser` |
| **1 dashboard** | `fetchSessionsByCohort(cohortId)` | `Session[]` - 8회차 리스트 |
| **1 dashboard** | `fetchAssignmentsByCohort(cohortId)` | `Assignment[]` - 다가오는 과제 (due_at asc, status=open) |
| **1 dashboard** | `fetchCohortOverview(cohortId)` (선택) | `CohortOverview` (attendance.averageRate 등 5 카드 압축) |
| **2 students** | `fetchCohortRoster(cohortId)` | `CohortRoster` - 이미 존재. student list + attendance matrix + applicant PII |
| **3 student detail** | `fetchStudentById(studentId)` | `Student` (student-repository 기존) |
| **3 student detail** | `fetchStudentProfile(studentId)` | `StudentProfile \| null` |
| **3 student detail** | `fetchStudentCareerTarget(studentId)` | `StudentCareerTarget \| null` |
| **3 student detail** | `fetchAttendanceByStudent(studentId)` | `Attendance[]` (기존 repo) |
| **4 career** | `fetchCareerDocuments(studentId)` | `CareerDocument[]` (최대 3건) |
| **5 consultation** | `fetchConsultationsByStudent(studentId)` | `Consultation[]` |
| **5 consultation** | `fetchReviewsByConsultation(consultationId)` | `ConsultationReview[]` - consultation 별 리뷰 리스트 |

**핵심**: 신규 repository 함수 0. 모두 재사용. 페이지에서 use case 를 통해 호출 (fetch layer 는 존재하지만 use case 로 감싸 권한 가드 + shape aggregate).

**주의 (career 4번)**: `assertCanReadStudentProfile` 이 아니라 **`assertCanAccessStudentCareer`** 사용. career document 는 별도 가드 (PII 강도 더 높음, `lms-role.ts` L246). instructor 도 통과하지만 attachment 다운로드 시 `Content-Disposition: attachment` + audit log 필요 (ADR 0013 §Failure Modes).

---

## 신규 use case 4 (application/use-cases/instructor/)

모두 `"use server"` server action. **첫 줄 가드 의무** (CLAUDE.md §7.4).

### 1. `listCohortStudents(cohortSlug)`

- **파일**: `src/programs/fan-to-pro/application/use-cases/instructor/list-cohort-students.ts`
- **input zod**: `{ cohort_slug: z.string().min(1) }`
- **가드**:
  1. `getLmsUser()` - session 검증
  2. `fetchCohortBySlug(cohort_slug)` - 존재 확인 (없으면 error `cohortNotFound`)
  3. `assertCohortRole(cohort.id, "instructor")` - instructor 자격 (super_admin / program admin 도 통과)
- **fetch**: `fetchCohortRoster(cohort.id)` 재사용
- **output**: `{ status: "ok", data: CohortRoster } | { status: "error", error: string }`
- **주의**: 이미 `fetchCohortRoster` 는 attendance matrix + applicant PII 포함 반환. Instructor 도 PII (email/phone/depositor_name) 노출 필요한지는 §노아 확인 필요 결정 2 참조.

### 2. `readStudentCareer(studentId, cohortSlug)`

- **파일**: `src/programs/fan-to-pro/application/use-cases/instructor/read-student-career.ts`
- **input zod**: `{ student_id: z.string().uuid(), cohort_slug: z.string().min(1) }`
- **가드**:
  1. `assertCanAccessStudentCareer(student_id)` - instructor 통과 (`lms-role.ts` L288 로직 재사용)
  2. cohort 검증 - `fetchCohortBySlug` + student.cohort_id == cohort.id 대조 (**cross-cohort 접근 방지**, URL 파라미터 위조 방어)
- **fetch**: `fetchCareerDocuments(student_id)` 재사용
- **output**: `{ status: "ok", documents: CareerDocument[] } | { status: "error", error: string }`

### 3. `writeConsultationReview(consultationId, body)`

- **파일**: `src/programs/fan-to-pro/application/use-cases/instructor/write-consultation-review.ts`
- **input zod**: `{ consultation_id: z.string().uuid(), body: z.string().min(1).max(4000) }`
- **가드**:
  1. **신규**: `assertCanWriteConsultationReview(consultation_id)` - 아래 §가드 함수 상태 참조
- **fetch/write**: `insertConsultationReview({ consultation_id, instructor_id, body })` + `updateConsultationStatus(consultationId, "reviewed")`
- **트랜잭션 경계**: insert + update 는 논리적으로 한 단위지만 Supabase JS 는 트랜잭션 미지원 → **Postgres function (RPC) 로 감싸는 것 vs 두 문 순차** = §노아 확인 필요 결정 4 참조. Slice 1 결론 대기.
- **output**: `{ status: "ok", review: ConsultationReview } | { status: "error", error: string }`

### 4. `writeFeedback(submissionId, body, score)`

- **파일**: `src/programs/fan-to-pro/application/use-cases/instructor/write-feedback.ts`
- **input zod**: `{ submission_id: z.string().uuid(), body: z.string().min(1).max(4000), score: z.number().int().min(0).max(100).nullable() }`
- **가드**:
  1. **신규**: `assertCanWriteFeedbackForSubmission(submission_id)` - 아래 §가드 함수 상태 참조
- **fetch/write**: `insertFeedback({ submission_id, instructor_id, body, score })` + submission.status → "reviewed"
- **output**: `{ status: "ok", feedback: Feedback } | { status: "error", error: string }`

---

## 가드 함수 상태 (기존 vs 신규)

### 기존 (재사용 가능)

| 함수 | 위치 | Phase 1 사용처 |
|---|---|---|
| `getLmsUser()` | `lms-role.ts` L56 | 모든 layout / server action |
| `assertCohortRole(cohortId, role)` | `lms-role.ts` L189 | layout - instructor 자격 검증 |
| `assertCanReadStudentProfile(studentId)` | `lms-role.ts` L610 | 페이지 3 (student detail) |
| `assertCanAccessStudentCareer(studentId)` | `lms-role.ts` L246 | 페이지 4 (career), use case 2 |
| `assertCanReadStudentNote(studentId)` | `lms-role.ts` L549 | 페이지 5 (consultation, read 가드로 재사용 - 권한 매트릭스 동일) |
| `fetchCohortBySlug(slug)` | `cohort-repository.ts` L59 | layout 및 use case 전부 (slug → id 매핑) |
| `getCohortMembershipRole(userId, cohortId)` | `lms-role.ts` L307 | 신규 가드 안 (cohort_membership 조회 재사용) |

### 신규 필요 (2개)

#### 신규 가드 1: `assertCanWriteConsultationReview(consultationId)`

**Why**: 현재 `assertCanWriteStudentNote(studentId)` 는 있으나, consultation review 는 (a) 학생 소유의 consultation 이 있어야 하고 (b) 그 학생이 강사의 cohort 학생이어야 함. student_id 를 통해서만 검증 가능 → consultation_id 를 받아서 student_id 를 유도해야 함.

**Signature**:
```ts
export async function assertCanWriteConsultationReview(
  consultationId: string
): Promise<{ user: LmsUser; authorRole: "super_admin" | "admin" | "instructor"; consultation: Consultation }>;
```

**로직**:
1. `getLmsUser()` - session
2. `fetchConsultationById(consultationId)` → `unknownConsultation` if null
3. `assertCanWriteStudentNote(consultation.student_id)` 재사용 → authorRole + user
4. consultation 반환 (호출자가 status 갱신 등에 사용)

**위치**: `src/programs/fan-to-pro/infrastructure/auth/lms-role.ts` 하단에 추가.

**중복 없음**: student 로 승격시켜 note 가드 재사용 = 로직 DRY.

#### 신규 가드 2: `assertCanWriteFeedbackForSubmission(submissionId)`

**Why**: 강사 A 의 cohort 학생의 submission 에만 feedback 작성 가능. submission_id 만 받아서 → assignment → cohort → membership 체인 검증.

**Signature**:
```ts
export async function assertCanWriteFeedbackForSubmission(
  submissionId: string
): Promise<{ user: LmsUser; authorRole: "super_admin" | "admin" | "instructor"; submission: Submission; cohortId: string }>;
```

**로직**:
1. `getLmsUser()` - session
2. submission 조회 → assignment_id → assignment 조회 → cohort_id
3. super_admin → OK
4. program admin (cohort.program_id) → OK
5. cohort instructor (`getCohortMembershipRole(user.id, cohortId) === "instructor"`) → OK
6. else throw

**위치**: `lms-role.ts` 하단.

**주의**: DB round-trip 2 (submission + assignment) - 필요하면 join 쿼리 1회로 최적화 가능. Phase 1 = 정합성 우선, 2 round-trip 로 시작. p95 실측 후 결정.

### 가드 순서 (경계에서만 검증 룰)

- **layout** 1회: `assertCohortRole(cohort.id, "instructor")` - cohortSlug 단위 자격
- **use case 첫 줄** 1회: 데이터 단위 세분 가드 (`assertCanWriteConsultationReview` 등)
- 내부 repository 호출 시 재검증 X (Iris 원칙: 경계에서만, 내부는 신뢰)

---

## 신규 스키마 (zod)

Phase 1 = **없음**. 모두 기존 entity 스키마 재사용. use case input 은 파일별 local `InputSchema` (기존 use case 패턴).

---

## Failure Modes (Iris)

| 실패 | 영향 | 방어 |
|---|---|---|
| `[cohortSlug]` 위조 (다른 cohort 의 instructor 가 남의 cohort URL 접근) | 다른 cohort 학생 데이터 노출 | layout `assertCohortRole(cohort.id, "instructor")` |
| `students/[id]` 위조 (자기 cohort 아닌 student id) | cross-cohort 학생 read | page 가드 + student.cohort_id == cohortId 대조 |
| `writeConsultationReview` 에서 consultation.student 가 자기 cohort 아님 | 강사 A 가 강사 B 의 학생 review | 신규 `assertCanWriteConsultationReview` (student 승격 → note 가드) |
| `writeFeedback` 에서 submission → assignment → cohort 가 자기 cohort 아님 | 마찬가지 | 신규 `assertCanWriteFeedbackForSubmission` |
| Career document 다운로드 시 외부 유출 | PII (이력서/자소서) | `Content-Disposition: attachment` + audit log (Phase 2 스코프 - Slice 1 스펙 밖) |
| Consultation review 후 학생이 v+1 재제출 → review history 유실 | 컨설팅 이력 왜곡 | consultation.version 단조 증가 유지, review 는 consultation_id 별 리스트 (기존 스키마로 이미 처리) |

---

## Performance Notes

- `fetchCohortRoster` 는 5 병렬 쿼리 (sessions + students + attendances + applicants + student_profiles) - 이미 최적화됨 (기존 admin 도 사용).
- `getLmsUser()` + `getCohortMembershipRole()` + `isProgramAdmin()` 모두 React `cache()` 라 layout + page + use case 가 같은 request 안에서 각각 호출해도 DB 1회.
- p95 추정: dashboard 400~600ms (Supabase 서울 리전 5 병렬 쿼리 기준), student detail 300~500ms, consultation write 200~300ms. **실측 후 캐시 검토**.
- `unstable_cache` 나 Cache Components 는 도입 X - 강의 진행 중 실시간 변동 (출석 매트릭스, 과제 status). 재검토 시점 = Phase 2 완료 후 실측.

---

## 노아 확인 필요 결정 (5)

### 결정 1: Phase 1 스코프 = 5 페이지 vs 3 페이지 (ADR 0013 vs 슬라이스 지시)

- Slice 1 지시문 = "종강 7/19 전 최소 3 페이지 우선 (dashboard / students / sessions)"
- ADR 0013 = 5 페이지 (materials + assignments 추가)
- 본 spec = **5 페이지** 로 잡음 (dashboard + students + student detail + career + consultation)
- 지시문의 "sessions" 는 dashboard 안에 session 리스트 카드로 처리 (별도 페이지 X) - 이게 맞는지 확인
- **materials + assignments 페이지는 Phase 2 (별도 슬라이스)** 로 미룸 - 강의 후반부 (7/19 이후) 는 사용 빈도 낮아짐, 2기 전에 착수 OK
- 확인 필요: **Phase 1 = 위 5 페이지 (materials/assignments 는 Phase 2) 로 확정?**

### 결정 2: Instructor 에게 학생 applicant PII (email / phone / depositor_name) 노출?

- `fetchCohortRoster` 는 admin 용으로 만들어져 applicant PII 포함 반환
- Instructor 도 필요한 필드: 이름 (`display_name`, `name_ko`), 출석률, career target
- 불필요한 필드: `email`, `phone`, `depositor_name_observed`, `paid_amount_krw`, `payment_confirmed_at` - **강사에게 노출 시 PII 유출 위험**
- 옵션 A: `fetchCohortRoster` 를 그대로 사용하고 use case 에서 필드 마스킹 (email/phone/deposit 제거)
- 옵션 B: 신규 `fetchCohortRosterForInstructor(cohortId)` 를 만들어 처음부터 PII 필드 없이 반환 (더 안전, Sage 검토 통과 쉬움)
- **Iris 권고 = 옵션 B** (경계 명확, applicant join 자체를 하지 않음)
- 확인 필요: **옵션 B 로 진행?**

### 결정 3: 페이지 3 (student detail) 에 attendance 매트릭스 8회차 다 보여주기 vs 요약만?

- Admin roster 는 8 컬럼 attendance matrix 표
- Instructor 개별 student detail = 요약 (rate + present count) + 8회 상태 리스트 (present/late/absent) 로 충분
- 옵션 A: admin 처럼 매트릭스 표
- 옵션 B: 요약 카드 + 회차별 status 리스트 (row 형태)
- **Iris 권고 = 옵션 B** - 강사 UX 는 개인 학생 파악이 목적, admin 은 반 전체 개요가 목적. UI 다름
- 확인 필요: **옵션 B (요약 + 리스트) 로 진행?**

### 결정 4: `writeConsultationReview` 트랜잭션 = RPC vs 순차 문?

- insert review + update consultation.status → "reviewed" 는 논리적으로 한 단위
- 옵션 A: Postgres function `submit_consultation_review(cid, iid, body)` 신설 (트랜잭션 원자성 보장)
- 옵션 B: 순차 문 2개 - insert 후 update. insert 성공 + update 실패 시 status 불일치 (review 는 남았는데 consultation.status 는 submitted)
- **Iris 권고 = 옵션 A** - 정합성 우선. Postgres function 은 마이그레이션 1개 파일로 박제 가능
- 확인 필요: **옵션 A (Postgres function 신설) 로 진행?** (신규 마이그레이션 파일 1개 필요 - Sage 검토 대상)

### 결정 5: `writeFeedback` 후 submission.status → "reviewed" 갱신?

- feedback insert 후 submission 을 reviewed 로 자동 전이할지 vs 별도 액션으로 분리
- 옵션 A: 자동 전이 (feedback 있으면 reviewed) - 강사가 여러 feedback 남기면 이미 reviewed 인 상태
- 옵션 B: 명시적 "리뷰 완료" 액션 별도 (강사가 명시적으로 트리거)
- **Iris 권고 = 옵션 A** - feedback = review 의 산출물이므로 첫 feedback insert 시점에 전이. UX 간단
- 확인 필요: **옵션 A (자동 전이) 로 진행?**

---

## Slice 2 (구현) 예상 시간

- 신규 use case 4 파일 작성 + zod input + 가드 호출 + 테스트: **90분**
- 신규 가드 2 함수 (`lms-role.ts` 추가) + 단위 검증: **45분**
- 신규 Postgres function (결정 4 옵션 A 채택 시) + 마이그레이션 파일 + supabase-verify: **30분**
- layout / page 5 (Luna 대기 X, 최소 skeleton - Luna 가 UI 다듬음): **60분**
- typecheck + 부호 검사 + Mira 자체 스모크: **30분**

**총 Slice 2 예상 = 4시간~4시간 30분**. Slice 3 (Luna UI 다듬기 + Mira E2E 8 시나리오) 는 별도.

**병렬 가능 여부**: 신규 가드 2 는 use case 4 의 blocker → 가드 먼저. Postgres function 은 use case 3 의 blocker → 결정 4 답 받은 뒤 시작.

---

## Followups (본 spec 밖)

- Career document 다운로드 audit log + `Content-Disposition: attachment` - Phase 2 (B0070-2 슬라이스 별도)
- materials / assignments 페이지 - Phase 2
- p95 실측 후 캐시 검토 - Slice 2 완료 후
- 신규 use case 파일 위치 `application/use-cases/instructor/` 는 기존 `application/student-profile/` 등 flat 폴더 패턴과 다름 - ADR 0005 §2 폴더 룰 재확인 (기존 flat vs role-based sub-folder)
