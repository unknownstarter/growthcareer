# ADR 0013 - Multi-Track LMS + Recruitment Pipeline Architecture

**Status**: Proposed (노아 승인 대기)
**Date**: 2026-07-04
**Deciders**: 노아 + Sophia (Tech Architect) + Echo (Research, 병행)
**Tags**: architecture, multi-track, courses, bundles, recruitment, clean-architecture, layered-pragmatic
**Related**: ADR 0005 (LMS Clean Architecture), ADR 0006 (LMS Design System), ADR 0008 (URL/Auth 분리), ADR 0010 (applicants legacy preservation)
**Marker**: [gating] — 진단 + 스키마 변경 제안. 노아 §3 5 우려 재검토 후 승인 필요.

---

## 진단 요약 (한 줄)

현재 스키마는 "1 program (Fan to Pro) -> 1 cohort/기 -> 8 session" 척추로 잘 짜여 있고, `programs` + `program_memberships` + `cohorts.program_id` 는 이미 있어 **N 트랙 확장은 데이터 모델상 이미 준비**. 다만 (1) "단과반/올인원" 개념을 태울 layer 가 없고, (2) 채용 파이프라인 (companies_partners / job_postings / student_applications) 은 0 이고, (3) instructor surface UI 도 0 이다. **DB 최소 변경 3 테이블 신규 + 3 컬럼 추가** 로 3기 이후 스케일까지 가능.

---

## 컨텍스트

노아 (2026-07-04) 발화:
- Growth Career 는 외국인 대상 기수제 직무 교육 + 채용 연계
- 멀티 트랙 (직무별) 확장 예정
- 단과반 = 트랙 안 sub 과정
- 올인원 = 여러 단과반 조합
- 두 유형 학생: 단과반만 vs 올인원 (단과반 조합)

절대 룰 (재확인):
1. **DB 변경 최소** (ADR 0005 Strangler Fig 이어감)
2. **applicants 테이블 보존** (ADR 0010)
3. **attendance / students.display_name 스키마 형태 손대지 않음** (노아 명시)
4. **카피 부호 §6.5** — 문서에서도 준수
5. **그라데이션 금지** (본 문서 시각 자료 포함, 표만 사용)

---

## 노아 5 우려 재진단 (전 세션 §3)

이 항목은 2026-07-04 이전 세션에서 노아가 반복 표명한 다섯 우려에 대한 현재 상태 답이다.

### 우려 1: 22 entity 가 너무 무거운 것 아닌가

**진단**: 무겁지 않다. entity 는 "저장할 데이터 shape" 이지 러닝 코스트가 아니다. 22 entity 중 실제로 UI 를 가진 것은 8~10 개. 나머지는 join 대상. Layered Pragmatic (function-based) 라 class 팽창 X.

**단, 신규 track/course/bundle 도입 시** 22 -> 25 로 증가. 25 를 넘길 이유는 없음. 채용 파이프라인도 3 개 안에서 처리 가능.

### 우려 2: applicants 를 계속 살릴 수 있나 (트랙 늘어도)

**진단**: 살린다. `applicants.program_id` (또는 `applicants.track_id`) nullable 컬럼 1개만 추가하면 트랙별 신청 그대로 담김. 기존 1기 row 는 `program_id = fan-to-pro-track uuid` 로 backfill. 신청 폼도 track 선택 필드만 추가하면 함수 시그니처 안 바뀜.

**Rejected**: applicants 를 폐기하고 `enrollments` 로 대체 -> ADR 0010 위반. 1기 운영 중 사고.

### 우려 3: 단과반 vs 올인원 = enrollment 2 종류인가

**진단**: enrollment 1 종류. `enrollments.course_ids: uuid[]` (배열) 또는 `enrollment_courses` (M:N 조인 테이블). 단과반 = 배열 원소 1개, 올인원 = 여러 개. 결제/수료 판정도 배열 순회로 통일.

**결정**: 조인 테이블 (`enrollment_courses`) 채택. 배열 컬럼은 (a) RLS 정책 복잡화 (b) 부분 완료 추적 어려움. Postgres 조인 테이블은 boring & reliable.

### 우려 4: 채용 연계 = LMS 안에 넣나 vs 별도 프로덕트

**진단**: **LMS 안**. 근거:
- 학생 = student_id, 회사 = 새 companies_partners (기존 companies 는 강사 회사, 재사용 X)
- 매칭 = student_career_target (이미 있음) x job_postings x student_applications
- 별도 프로덕트 = repo 분리 + auth 분리 + student_id 동기화 = over-engineering
- 3기까지는 노아 1인 운영. 별도 프로덕트 = 콘텐츠 없이 UI 만 늘어남

**Rejected**: separate recruitment SaaS -> 노아 리소스 초과.

### 우려 5: instructor surface 부재 = 2기 blocker 인가

**진단**: 2기 blocker 는 아님 (1기는 운영자 대행 정책으로 굴러감). **2기 시작 전** UI 만들면 충분. 이미 권한 가드 (`assertCanReadStudentProfile` / `assertCanWriteStudentNote`) 는 준비됨. 페이지 4~5 개만 신설.

---

## 클린 아키텍처 점검 (ADR 0005 대비)

### 응집도

| Layer | 현재 상태 | 신규 track/bundle 시 |
|---|---|---|
| domain/entities | 22 파일, 각 파일 1 aggregate + zod + state machine | +3 (track, course, bundle) = 25. 응집 유지 |
| domain/services | 4 파일 (enrollment-cap, instructor-fee, certificate-eligibility, finance-aggregator) | +2 (course-completion, recruitment-match) |
| application/use-cases | role x action 폴더 | 채용 = 신규 폴더 `application/use-cases/recruitment/` |
| infrastructure/supabase/repositories | entity 별 concrete function | +3 파일 |

**결론**: 응집도 좋음. 신규 개념 얹혀도 layer 경계 유지.

### 결합도

- entities/cohort -> entities/program (FK program_id, 이미 있음)
- entities/student -> entities/enrollment -> entities/course (M:N via enrollment_courses)
- entities/attendance -> entities/session (변경 X)
- entities/consultation -> entities/student (변경 X)

**리스크**: 채용 (companies_partners / job_postings) 이 cohort 와 무관하게 존재. student x company M:N 이 cohort 를 우회하면 격리 룰 (ADR 0008 program admin scope) 어긋남. -> **companies_partners.program_id 필수** 로 해결.

### 중복

- **없음. 단**: 기존 `program.ts` (marketing config, GUARANTEES/SCHEDULE/ENROLLMENT_CAP) 와 신규 `entities/program.ts` (DB row) 는 이름 충돌. 신규 entity 는 `entities/program-row.ts` 또는 `entities/program.ts` + 기존 `domain/program.ts` -> `domain/marketing/program-config.ts` 리네임 권고 (Strangler Fig Step 3 시점).

---

## 필요 스키마 변경 (최소 additive)

**원칙**: 기존 테이블 컬럼 삭제/rename 0. 신규 테이블도 최소 3. 모두 nullable + backfill 가능.

### 신규 테이블 3

| # | 이름 | 목적 | 필드 core |
|---|---|---|---|
| 1 | `courses` | 단과반 (트랙 안 sub 과정) | id, program_id FK, slug (nanoid8), title, description, order_idx, status enum(draft/open/archived), price_krw, session_count, created_at |
| 2 | `bundles` | 올인원 (course 조합) | id, program_id FK, slug, title, description, price_krw (할인가), status, created_at |
| 3 | `bundle_courses` | bundle x course M:N | bundle_id, course_id, order_idx, PRIMARY KEY (bundle_id, course_id) |
| 4 | `enrollments` | 결제 단위 (기존 applicants 승격 후) | id, student_id, cohort_id, bundle_id nullable, purchase_amount_krw, purchased_at, status enum, notes |
| 5 | `enrollment_courses` | enrollment x course M:N (단과반 or 올인원 unpack) | enrollment_id, course_id, completed_at nullable, PRIMARY KEY (enrollment_id, course_id) |

**즉 신규 5개**. 노아 요청 "최소 3개" 는 아래 통합안으로 다시 축소 가능하지만 권장하지 않음:

**축소안 rejected**: `enrollments` 없이 applicants 에 `course_ids uuid[]` + `bundle_id` 컬럼 추가. -> RLS 복잡화 + 부분 수료 추적 불가 + applicants 를 계속 결제 단위로 오염. ADR 0010 정신 위배.

**권장 = 5개**. 각 테이블 row 수 예상 (3기까지): courses 20, bundles 5, bundle_courses 30, enrollments = 학생 수만큼, enrollment_courses = 학생 수 x 평균 course 수. 부담 없음.

### 채용 파이프라인 신규 3

| # | 이름 | 목적 | 필드 core |
|---|---|---|---|
| 6 | `companies_partners` | 채용 파트너사 (강사 회사 companies 와 분리) | id, program_id FK, name, biz_no, industry, size_bucket, contact_name, contact_email, contact_phone, notes, status enum(active/inactive), created_at |
| 7 | `job_postings` | JD | id, company_partner_id FK, title, role_category (student_career_target enum 재사용), description, requirements, employment_type, location, remote_ok bool, published_at, closes_at, status enum(draft/open/closed) |
| 8 | `student_applications` | 학생 x 지원 트래킹 | id, student_id FK, job_posting_id FK, status enum(prep/applied/interview/offer/hired/rejected/withdrawn), applied_at, current_stage_notes, next_action, next_action_at, updated_at |

### 기존 테이블 컬럼 추가 (nullable, additive)

| 테이블 | 추가 컬럼 | 이유 |
|---|---|---|
| `applicants` | `enrollment_id uuid REFERENCES enrollments(id)` nullable | 승격 시 결제 단위 링크 |
| `applicants` | `bundle_id uuid REFERENCES bundles(id)` nullable | 신청 시 어떤 bundle 선택했는지 |
| `students` | (없음 - display_name 등 유지) | 노아 룰 |
| `cohorts` | `course_id uuid REFERENCES courses(id)` nullable | cohort 가 어떤 단과반의 인스턴스인지 |
| `instructors` | `course_ids uuid[]` nullable | 강사가 어느 단과반 가능한지 (assignment 룰) |

### 절대 안 건드림

- `applicants` (스키마 shape 유지, additive 만)
- `attendance` (완전 보존)
- `students.display_name` (완전 보존)
- `cohorts.slug`, `cohorts.program_id` (기 마이그레이션 그대로)
- 기존 auth: user_profiles / program_memberships / cohort_memberships

### 마이그레이션 순서

1. `20260710_courses.sql` (courses + bundles + bundle_courses)
2. `20260711_enrollments.sql` (enrollments + enrollment_courses + applicants 컬럼 추가 + 1기 backfill)
3. `20260712_recruitment.sql` (companies_partners + job_postings + student_applications)
4. `20260713_backfill_fan_to_pro.sql` (Fan to Pro 를 course 1개 = "K-Pop 공연 4주" 로 등록, 1기 enrollment 재구성)

---

## 채용 파이프라인 설계

### 컴포넌트

- **companies_partners** - 회사 정보 관리 (운영자 CRUD)
- **job_postings** - JD (운영자 등록, student read)
- **student_applications** - 학생 x posting 지원 트래킹 (student write self, admin read all)
- **matching-service** (domain service) - `student_career_target x job_postings.role_category` 매칭 rank

### Interfaces

```
admin surface:
  /fan-to-pro/(lms)/admin/recruitment/companies      list, add, edit
  /fan-to-pro/(lms)/admin/recruitment/postings       list, add JD
  /fan-to-pro/(lms)/admin/recruitment/pipeline       모든 학생 지원 status 매트릭스

student surface:
  /fan-to-pro/[cohortSlug]/student/recruitment       추천 postings (매칭 rank)
                                        /applications 본인 지원 상태

instructor surface (2기+):
  /[cohortSlug]/instructor/students/[id]/recruitment (담당 학생 지원 read only)
```

### Data

- student_career_target 이 이미 target_role_category enum 보유 -> job_postings.role_category 재사용
- matching = simple filter (같은 role_category) + rank (경력/자격증 매칭 점수). ML 미도입.

### Failure Modes

| 실패 | 영향 |
|---|---|
| companies_partners.program_id 누락 시 | program admin scope 우회 -> 모든 프로그램 회사 노출. **NOT NULL + RLS 필수** |
| 학생이 다른 학생의 applications 조회 | PII 유출. **RLS student_id = auth.uid()** |
| JD closed_at 지나도 학생에게 노출 | UX 혼란. **isPostingOpen() 도메인 함수** + query 필터 |
| 매칭이 없는 학생 | 빈 상태. **"희망 직무를 등록해 주세요" 카피 + career target 설정 링크** |

---

## 4 role x 4 관심사 매트릭스

| | 수강 (course/bundle) | 콘텐츠 (자료/과제) | 커뮤니케이션 (공지/피드백/컨설팅) | 채용 (파이프라인) |
|---|---|---|---|---|
| **super_admin** | 완전 (모든 programs) | 완전 | 완전 | 완전 |
| **program admin** | 자기 프로그램만 | 자기 프로그램 cohort/자료/과제 | 자기 프로그램 공지/피드백/컨설팅 | 자기 프로그램 companies/postings/applications |
| **instructor** | X (자기 cohort 학생 수강 상태 read) | 자기 cohort 자료 read + 과제/피드백 write | 담당 학생 컨설팅 review write | 담당 학생 지원 read only (2기+) |
| **student** | 본인 enrollment read | 본인 cohort 자료 read + 과제 submit | 본인 컨설팅 write + 공지 read + 피드백 read | 본인 지원 write + 추천 posting read |

### Gap 도출 (현재 vs 목표)

| Role | Gap | 우선순위 |
|---|---|---|
| super_admin | 채용 4열 전체 X | 중장기 |
| program admin | 수강 (course/bundle CRUD) X, 채용 4열 X | 단기 (2기 전) |
| instructor | **UI 4열 전부 X** (권한 가드만 있음) | 단기 (2기 전) |
| student | 채용 (postings 열람/application write) X | 중장기 |

---

## Instructor Surface 실 구현 spec

### 페이지 5

```
/[cohortSlug]/instructor/
    page.tsx                          담당 cohort 대시보드 (session 리스트 + 다가오는 과제)
    students/
      page.tsx                        담당 cohort 학생 리스트 (name/attendance/progress)
      [id]/
        page.tsx                      학생 프로필 (career target + attendance rate)
        career/page.tsx               career documents read only viewer
        consultation/page.tsx         consultation history + review write
    materials/page.tsx                자기 cohort 자료 read + 자기가 올릴 자료 upload
    assignments/
      page.tsx                        과제 리스트 (본인이 발제한 것)
      [id]/submissions/page.tsx       제출물 리스트 + feedback write
```

### Components

- **InstructorShell** (라이트, 토스 톤, shadcn primitives) - 기존 LMS Shell 재사용, sidebar 만 instructor 항목
- **StudentCard** - display_name + attendance rate + last submission
- **FeedbackForm** - body textarea + score (0-100) + submit -> feedback repository

### Interfaces (server actions)

```typescript
// application/use-cases/instructor/
listCohortStudents(cohortSlug): Result<StudentSummary[]>
  -> assertCohortRole(user, cohortSlug, 'instructor')

readStudentCareer(studentId): Result<CareerDocumentSet>
  -> assertCanReadStudentProfile(user, studentId)

writeConsultationReview(consultationId, body): Result<ConsultationReview>
  -> assertCanWriteConsultationReview(user, consultationId)

writeFeedback(submissionId, body, score): Result<Feedback>
  -> assertCanWriteFeedbackForSubmission(user, submissionId)
```

### Data

- 기존 entity 재사용 (cohort_memberships / student / career_document / consultation / feedback / submission)
- 신규 entity 0

### Failure Modes

| 실패 | 영향 |
|---|---|
| assertCohortRole 누락 | 다른 cohort 학생 데이터 노출. **모든 server action 첫 줄 assert** (CLAUDE.md §7.4) |
| 강사가 자기 학생 careerdocument 다운로드 -> 외부 유출 | PII. **Content-Disposition attachment + audit log** (B0038 M-4 관련) |
| 강사가 review 후 학생이 다시 수정하면 history 누락 | UX. **consultation.version 단조 증가 유지 + 각 version 별 review** |

---

## 권고 - 즉시 / 단기 / 중장기

### 즉시 (1기 운영 중 - 사이트 안 건드림)

- **DB 변경 0** - 1기 마감 (2026-06-22 자정 지남) + 강의 진행 중. 새 마이그레이션 = 리스크
- **문서만** - 본 ADR 승인 + BACKLOG B0068~B0075 박제
- `programs` 도메인 entity 뽑기 (`domain/entities/program-row.ts`) - 코드만, 스키마 X. 기존 marketing config (`domain/program.ts`) 는 안 건드림

### 단기 (2기 시작 전 - 8월 ~ 9월)

**B0068** - **courses / bundles 스키마 + backfill** (Iris)
- `20260810_courses.sql` 마이그레이션
- Fan to Pro 4주 = course 1개 등록
- domain entities/course.ts + bundle.ts
- Sage 검토 (program_id 격리 RLS)

**B0069** - **enrollments 승격 흐름** (Iris)
- `20260811_enrollments.sql`
- applicants.enrollment_id + bundle_id 컬럼
- 1기 backfill (기존 paid applicant -> enrollment + enrollment_course 로 이관)
- 신청 폼에 course/bundle 선택 UI 추가 (2기용, 1기 modal 은 그대로)

**B0070** - **instructor surface 5 페이지** (Luna + Iris)
- `/[cohortSlug]/instructor/*` 라우트 + 컴포넌트 5
- 서버 액션 4 개 (list / read / review write / feedback write)
- Mira E2E 8 시나리오

**B0071** - **admin course/bundle CRUD** (Luna + Iris)
- `/admin/courses` + `/admin/bundles` (관리)
- program admin scope 격리

### 중장기 (3기 이후 - 10월 ~)

**B0072** - **채용 파이프라인 스키마** (Iris + Sage)
- companies_partners + job_postings + student_applications
- RLS 4 종 (super_admin / program admin / student self / instructor readonly)
- 회사 정보 PII 검토

**B0073** - **admin recruitment 3 페이지** (Luna)
- companies / postings / pipeline 매트릭스

**B0074** - **student recruitment surface** (Luna)
- 추천 postings + 본인 applications 트래킹

**B0075** - **matching-service 도메인 서비스** (Sophia + Nova)
- role_category filter + 경력/자격증 rank
- 학생 UI 에 "추천 이유" 노출

---

## 노아 승인 필요 결정

**본 ADR 승인 = 스키마 변경 승인 아님**. 단계별로 별도 승인 필요.

1. **[결정 1] 신규 테이블 5 (courses/bundles/bundle_courses/enrollments/enrollment_courses) OK 인가**
   - 대안: applicants 에 course_ids 배열 + bundle_id 컬럼 (Rejected 사유 §스키마 변경 참조)
   - 승인 필요 시점: **B0068 시작 전 (8월 초 예상)**

2. **[결정 2] 채용 파이프라인 신규 테이블 3 (companies_partners/job_postings/student_applications) OK 인가**
   - 대안: 별도 채용 SaaS (Rejected)
   - 승인 필요 시점: **B0072 시작 전 (10월 예상)**

3. **[결정 3] instructor surface 페이지 5 개 OK 인가 (ADR 0006 라이트 톤)**
   - 대안: 강사에게도 admin UI 개방 (권한만 좁힘) - Rejected (혼란)
   - 승인 필요 시점: **B0070 시작 전 (8월 중)**

4. **[결정 4] `domain/program.ts` (marketing config) 를 `domain/marketing/program-config.ts` 로 리네임 vs 유지**
   - 신규 `domain/entities/program-row.ts` 와 이름 충돌 완화
   - 대안: 신규를 `entities/program.ts` 로 두고 기존을 그대로 -> import 헷갈림
   - 승인 필요 시점: **B0068 시작 전**

5. **[결정 5] 채용 매칭 = 도메인 서비스 (rule-based) vs 별도 Nova AI**
   - 3기까지는 rule-based 로 충분
   - 4기 (100명+) 이후 AI 검토
   - 승인 필요 시점: **B0075 시작 전 (11월 이후)**

---

## Rejected Alternatives

- **applicants 를 폐기하고 enrollments 로 대체**: ADR 0010 위반. 1기 사고 리스크.
- **courses 없이 cohorts 로 단과반 표현**: 단과반 = 반복 가능한 커리큘럼 단위, cohort = 특정 기수. 개념 혼재.
- **bundles 없이 courses 조합을 프론트에서만 계산**: 결제 amount / 할인가 / 수료 판정 로직이 프론트/백엔드에 분산. 사고 확률 높음.
- **채용을 별도 프로덕트 (repo/domain 분리)**: 노아 1인 운영 리소스 초과. 학생 id / auth 동기화 비용.
- **companies_partners = 기존 companies 재사용**: companies = 강사 회사 (정산 대상). 채용 파트너 = 학생 취업 대상. 다른 aggregate. 재사용 시 컬럼 오염.
- **enrollment 를 배열 (course_ids uuid[]) 로 처리**: RLS 정책 복잡 + 부분 완료 추적 X. 조인 테이블이 boring & reliable.
- **matching = ML 모델부터**: 3기 학생 30~100 명 스케일에 ML 오버킬. rule-based 로 시작.

---

## 참조

- ADR 0005 (LMS Clean Architecture Layered Pragmatic + Strangler Fig)
- ADR 0006 (LMS Design System - 라이트, shadcn/ui, 토스 톤)
- ADR 0008 (URL/Auth 분리 - 3 권한 계층)
- ADR 0010 (applicants legacy preservation)
- CLAUDE.md §2.5 (Feature Intent Gating - 이 ADR 은 gating 대상)
- CLAUDE.md §7.4 (기존 영역 변경 금지)
- WORKING-SESSION.md (Wave 1 Step 3/4 잔여)
- docs/lessons/README.md (미반영 lesson 없음 기준)

---

## 이 결정이 1년 뒤 바뀌어야 한다면

**어디를 손대게 되나**:

1. **트랙 다변화 실패** (Fan to Pro 만 남고 확장 X) -> courses/bundles 테이블은 계속 유지, 신규 program insert 안 함. 오버헤드 0 (사용 안 하는 것 뿐).
2. **채용 대신 파트너 매칭 (알선) 모델로 전환** -> job_postings 를 `partner_offers` 로 rename + student_applications enum 확장. 이관 스크립트 1개.
3. **강사가 자기 회사 소속 학생만 봐야 함 (기업 교육 B2B 전환)** -> instructor.company_id 이미 있음. cohort_memberships 에 company scope 필터 추가만.
4. **채용 = 외부 SaaS 로 outsource** -> student_applications 만 남기고 companies_partners / job_postings 폐기 (nullable 안 지움, 사용 중단). 학생 지원 트래킹은 자체 유지.

**가장 손대기 쉬운 지점**: courses/bundles (rule-based 라 UI 만 바꾸면 됨). 가장 손대기 어려운 지점: enrollments (결제 amount 이력 - 회계 감사 대상, 이관 시 백업 필수).
