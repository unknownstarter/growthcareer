# ADR 0005 — LMS 클린 아키텍처

**Status**: Accepted
**Date**: 2026-06-21
**Deciders**: 노아 + Sophia (Tech Architect)
**Tags**: architecture, clean-architecture, lms, layered, strangler-fig

---

## 컨텍스트

1기 9명 결제 확정 (D-day 2026-06-21 마감). 강의 6/27 ~ 7/19. 노아 결정으로 **자체 LMS 풀 구축** 진행. 4-role (admin / viewer / instructor / student) + 13개 신규 entity (cohort / student / session / attendance / assignment / submission / feedback / consultation / consultation-review / announcement / event / certificate / company).

기존 stack: Next.js 16 App Router + Supabase + Tailwind + Vercel + Pretendard. 기존 어드민은 Basic Auth + admin / viewer role + multi-role server actions (`assertAdmin()` 패턴).

LMS 가 복잡한 도메인이라 노아 명시 요구: **클린 아키텍처 기반** 으로 설계. 데이터 채우기는 추후.

추가 노아 제약: **기존 모집 페이지 + 어드민 3-tab 변경 최소** (트래킹 + 모집 관리 안정성 우선).

---

## 진단 — 현재 코드 클린 아키텍처 점검

폴더 이름은 이미 클린 아키텍처 어휘 (`domain` / `application` / `infrastructure` / `presentation`) 차용. 하지만 의존성 규칙 새고 있음.

### 위반 4개

1. **`admin/` 폴더가 layer 중복** — auth (`admin/role.ts`) + repository (`admin/fetch-applicants.ts`) + entity-ish (`admin/types.ts`) + UI (`*.tsx`) 한 폴더 동거. 4개 layer 가 한 디렉토리.
2. **Repository 경계 부재** — `application/admin-actions.ts` 가 Supabase client 를 직접 호출 (`supabase.from('applicants').update(...)`). use case 가 SQL 모양을 안다 = Supabase 교체 비용 = 모든 server action 재작성.
3. **Status 전이 규칙 분산** — `pending → notified → paid → enrolled` invariant 가 `WHERE` 절에 박힘. 12곳 흩어짐. 새 use case 가 같은 패턴 또 박을 위험.
4. **`domain/application.ts` 가 4역할 (zod + form state + DTO + Result union)** — 315 라인. 13 entity 늘면 같은 패턴 4000 라인 파일 13개.

### 잘 된 점

- `assertAdmin()` 패턴 (CLAUDE.md §7.4 룰 준수)
- `calculateInstructorFee` 순수 함수 (도메인 서비스 정석)
- Result union (`{status: 'ok'|'stale'|'error'}`) — throw 회피
- zod 경계 검증 1회 정책 일관

---

## 결정

### 1. 아키텍처 옵션 = B (Layered Pragmatic)

**선택**: concrete repository function (interface X) + function-based use case + Result union.

**거부**:
- Option A (Hexagonal w/ ports) — 13 entity × interface 26 파일 비용 ↑. 1년 내 Supabase 교체 확률 < 5%.
- Option C (Full Clean + DI container) — over-engineering. function-based 충분.

### 2. 폴더 구조

```
src/programs/fan-to-pro/
  domain/                              # 외부 의존성 0 (zod 허용, 그 외 X)
    entities/                          # 13개 entity 파일
      applicant.ts cohort.ts student.ts session.ts attendance.ts
      assignment.ts submission.ts feedback.ts consultation.ts
      consultation-review.ts announcement.ts event.ts certificate.ts
      company.ts instructor.ts
    value-objects/                     # money-krw, status-transitions, kst-date
    services/                          # 도메인 서비스 (pure 함수)
      enrollment-cap-rule.ts
      instructor-fee-calculator.ts
      certificate-eligibility.ts
      finance-aggregator.ts
    errors/
      domain-error.ts                  # DomainError 베이스 + subclass
    program/                           # 기존 program.ts 분리

  application/                         # use case (orchestration)
    use-cases/                         # 동사 (action) 단위
      applicant/ cohort/ attendance/ finance/ certificate/ ...
    queries/                           # CQRS 약식 — read 전용
    dto/                               # wire format

  infrastructure/                      # 외부 시스템 concrete
    supabase/
      client.ts
      repositories/                    # 13 entity × CRUD 함수 (interface X)
      rls-policies/                    # SQL 정책 reference (.sql or .md)
    auth/                              # admin-role 이전
    email/                             # mailto-builder
    kakao/
    storage/                           # signed-url

  interface/                           # Next.js 의존 OK
    server-actions/
      admin/  instructor/  student/
    components/
      shared/                          # theme-agnostic
      lms/                             # 신규 LMS UI
        ui/                            # shadcn primitives
        instructor/  student/  admin/
      admin-legacy/                    # 기존 admin/components 이전 (선택)
    presentation/                      # 기존 marketing site

  messages/
    templates.ts                       # 변경 X
```

### 3. 의존성 규칙

```
interface  →  application  →  domain  ←  infrastructure (entity 사용)
                ↑
              infrastructure (concrete repository)
```

| 룰 | 위반 시 증상 |
|---|---|
| `domain/` 에서 `@supabase/*` import 금지 | domain 테스트 시 Supabase mock 필요 = 비용 ↑ |
| `application/use-cases/*` 에서 `next/*`, `react` import 금지 | use case 가 Next 종속 → cron / queue 재사용 X |
| `infrastructure/` 안에 비즈니스 if-else 금지 | SQL + TS 양쪽 중복 = 동기화 깨짐 |
| `interface/server-actions/*` 안에 SQL 직접 작성 금지 | repository 우회 → mutation 중복 |
| `interface/components/*` 안에 `supabase.from()` 금지 | 권한 우회 + 캐시 불일치 |

### 4. 마이그레이션 전략 — Strangler Fig (점진)

빅뱅 거부 이유: 1기 강의 운영 중. 기존 admin-actions 12개 + 신청 폼 깨지면 즉시 사고.

| Step | 시점 | 작업 |
|---|---|---|
| **Step 1** | Wave 0 시작 직전 (1~2일) | 폴더 골격 + 기존 파일 이전 + **shim 1줄 (re-export)**. 동작 변경 0 |
| **Step 2** | Wave 0 본격 | 신규 entity (cohort/session/attendance) 부터 새 구조에 박음. 기존 admin-actions 손대지 않음 |
| **Step 3** | Wave 1~2 | 기존 admin-actions 를 수정 시점에 자연 이전. 무조건 리팩터 금지 |

### 5. 핵심 추상화

| 결정 포인트 | 옵션 | 결정 |
|---|---|---|
| Repository | A. Supabase 직접 / B. concrete function / C. interface+impl | **B** — 13 entity × interface 비용 과다 |
| Use Case | A. class / B. function / C. server action 자체 | **B** — function. class 는 DI 컨테이너 없으면 boilerplate |
| DTO vs Entity | A. 동일 / B. 별도 | **B** — entity = behavior, DTO = wire format |
| Error | A. throw / B. Result union / C. neverthrow lib | **B** — 현재 패턴 유지. domain 안에서는 throw DomainError, use case 경계에서 Result 변환 |
| Permission | A. middleware / B. use case assertXxx / C. 둘 다 | **C** — middleware = URL 차단 (1차), use case = mutation 차단 (2차). viewer role 사고 (2026-06-09) 의 lesson |
| Transaction | A. Supabase RPC / B. application manual / C. 무시 | **B → 필요 시 A** — 단일 statement 는 manual OK. 다중 mutation 은 Postgres function |
| Auth subject | A. env / B. Supabase Auth / C. JWT | **A 유지 (Wave 0) → B (Wave 1)** — 학생/강사 로그인 추가 시 Supabase Auth |

### 6. 13 entity invariant + state machine

각 entity 파일 안에 박음. (세부는 각 entity 파일 주석에)

| Entity | Invariant | State |
|---|---|---|
| Cohort | min_to_open ≤ capacity, start_at < end_at | draft → open → enrollment_closed → in_progress → completed / cancelled |
| Student | applicant.status ∈ {paid, enrolled} 만 promote | active → withdrawn / completed |
| Session | start_at ∈ cohort 기간, instructor 가 cohort instructor pool ∈ | scheduled → in_progress → ended / cancelled |
| Attendance | status ∈ {present, late, absent}, (student, session) unique | mark 1회 + 운영자 정정 |
| Material | cohort_id required, published_at ≤ now 일 때 student visible | draft → published → archived |
| Assignment | due_at > created_at | open → closed |
| Submission | (student, assignment, version) unique, version 단조 증가 | draft → submitted → reviewed |
| Feedback | instructor 가 cohort pool ∈, submission student ≠ instructor | 작성 1회 + 수정 |
| Consultation | version 단조 증가, student required | drafted → confirmed |
| ConsultationReview | (모든 강사 풀 vs 배정 강사만) — **노아 결정 보류** | open → closed |
| Announcement | cohort 또는 student[] 타깃, published_at ≤ now | draft → published |
| Event | start < end | scheduled → completed / cancelled |
| Certificate | attendance ≥ 75% && payment=paid && cohort.completed | issued (불가역) |
| Company | vat_issuer bool → 정산 부가세 분기 | active → inactive |
| Instructor | tax_mode ∈ {withholding_3_3, tax_invoice} | active → inactive |

---

## Wave 분해

| Wave | 시점 | 작업량 | 핵심 |
|---|---|---|---|
| Wave 0 | D-6 ~ D-0 (6/21~26) | 5일 | DB minimum (4 entity: cohort/student/session/attendance) + /admin/cohorts 출결 UI |
| Wave 1 | D+1 ~ D+14 (6/28~7/11) | 6.5일 | Supabase Auth 전환 + 강사/학생 로그인 + materials/announcements + PW 변경 |
| Wave 2 | D+15 ~ D+22 (7/12~7/19) | 5.5일 | assignments / submissions / feedback + consultations + certificates + events |
| Wave 3 | D+22 ~ D+30 (7/20~7/28) | 4.5일 | 회사 단위 정산 (settlements) + VAT/원천징수 + 회계 CSV |
| Wave 4 | 8월 (2기 모집 전) | 6일 | RLS 본격 + follow-up + 영문 UX + viewer PII 마스킹 |
| Wave 5 | 100명 (3기+) | 7일 | Realtime + 자동 정산 + 대량 onboarding |

**총 ~35일** (1기 운영 + 2기 준비 + 3기 스케일 다 포함).

### Wave 0 = 강의 시작 전 5일 MVP

- companies + instructors.company_id (Wave 3 정산 미리 준비)
- cohorts (1기 row) + sessions (8개)
- students (paid 9명 promote) + attendance
- /admin/cohorts 페이지 (sessions list + 출결 mark UI)
- **강사/학생 로그인 X (Wave 1), 자료 업로드 X (Wave 1)** — 카톡 보강

→ 1기 down time = 0, Sage critical = 0 (admin only)

---

## 노아 보류 결정 (Wave 2~3 안에 컨펌)

1. **Consultation review 권한** — 모든 강사 풀 vs 배정 강사만 vs 학생이 강사 지정
2. **정산 메일 강사 breakdown** — 회사 정산 메일에 강사 개인별 금액 노출 vs 회사 합계만
3. **알림 채널** — 이메일만 vs 알림톡 옵트인 추가

---

## Rejected Alternatives

- Nx 풀 모노레포 (노아 1인에 over-engineering)
- Prisma / Drizzle ORM (학습곡선 + 마이그레이션 이원화)
- CQRS event sourcing (attendance 가 3-tuple 로 충분)
- DI container (tsyringe / awilix) — function-based 에 boilerplate
- GraphQL (REST/server action 충분)
- Clerk / Auth0 (ADR 0004 외부 SaaS 도입 0 위배)

---

## 참조

- `docs/research/notion-daily-ralph-loop-자동화.md` — 자동화 아키텍처 검토
- CLAUDE.md §2 (12단계 워크플로우)
- CLAUDE.md §7.4 (PII 보호 + 기존 영역 변경 금지)
- ADR 0001 (stack 결정)
- ADR 0004 (operator toolset in-app vs external)
- WORKING-SESSION.md
- B0031 ~ B0036 (Wave 0~5 백로그)
