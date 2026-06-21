# 02 Build Tracks — LMS (Supabase Auth)

> 신규 LMS. **라이트 토스 톤** (shadcn/ui + Tremor). `/fan-to-pro/(lms)/*` 경로. Supabase Auth.

## 결정 컨텍스트

1기 운영 중에 LMS 자체 구축 결정 (2026-06-21 새벽). 기존 외부 LMS (Teachable / Thinkific / Notion 등) 검토 없이 직접 구축 — 이유:
1. 데이터 누적 시작 (1기부터)
2. 디자인 일관성 (마케팅 + 어드민과 같은 codebase)
3. 운영자 / 강사 / 학생 권한 분리를 코드 단에서 정확히 통제
4. 한국 + 외국인 mix 환경의 i18n 통합

## 아키텍처

**Clean Architecture (Layered Pragmatic)** + **Strangler Fig migration** (ADR 0005)

```
src/programs/fan-to-pro/
├── domain/
│   ├── entities/         (zod + 비즈니스 invariant)
│   └── ...
├── application/
│   ├── use-cases/        (server actions, 명령형 흐름)
│   ├── dto/              (wire format)
│   └── queries/          (read-only queries)
├── infrastructure/
│   ├── supabase/
│   │   ├── repositories/ (DB CRUD)
│   │   └── storage/      (Storage bucket)
│   └── auth/
│       └── lms-role.ts   (assertSuperAdmin / assertProgramAdmin / assertCanAccess*)
└── interface/
    └── components/
        └── lms/          (라이트 디자인 컴포넌트)
            ├── ui/       (shadcn primitives)
            ├── admin/    (어드민 페이지)
            ├── auth/     (로그인 페이지)
            ├── shell/    (sidebar / topbar)
            ├── career/   (이력서/자기소개서/포트폴리오)
            ├── student/  (학생 surface)
            └── ...
```

기존 코드 (`/admin/*` Basic Auth + 마케팅 페이지) 는 그대로. Strangler Fig 으로 점진 이전.

## 디자인 시스템 (ADR 0006)

- **라이트 톤** (`[data-theme="light"]` wrapper)
- **토스 톤** — 12px radius, Primary Blue `#3182f6`, 카드 그림자 약함, padding 여유
- **Pretendard** + **shadcn/ui** primitives + **Tremor** (차트)
- 마케팅 다크와 완전 분리 — route group `(lms)/` 안에서만 라이트

상세: `docs/decisions/0006-lms-design-system.md`

## URL 구조 (ADR 0008)

```
/[locale]/auth/login            → Supabase Auth 통합 로그인 (LMS 전용)
/[locale]/auth/forgot-password
/[locale]/auth/reset-password
/[locale]/auth/callback         → email confirm / oauth redirect

/[locale]/fan-to-pro/(lms)/admin/*  → super_admin / program admin
  /dashboard                    → KPI 대시보드
  /cohorts                      → 기수 목록
  /cohorts/[cohortSlug]         → 기수 상세 (funnel + 신청자 DataTable)
  /students                     → 전체 학생 (활성 cohort)
  /students/[id]/career         → 학생 이력서/자기소개서/포트폴리오 (B0037)
  /talent-pool                  → 인재풀 통합 view (전 기수 신청자 통합)
  /instructors                  → 강사 명단
  /finance                      → 재무 (LMS 버전, 회사 단위 정산)
  /consultations / /announcements / /materials → Wave 2 entity (graceful empty 상태)

/[locale]/fan-to-pro/[cohortSlug]/student/*  → cohort 단위 학생 surface
  /career                       → 본인 이력서/자기소개서/포트폴리오 (B0037)
  ...                           → Wave 1 Step 4 점진

/[locale]/fan-to-pro/[cohortSlug]/instructor/*  → cohort 단위 강사 surface
  ...                           → Wave 1 Step 3 점진 (1기 후)
```

### URL 룰 (중요)

- **cohort path segment 이름 금지** — `/cohorts/` `/groups/` 등 의미 노출 금지. **8자 nanoid alphanumeric** slug 직접 사용. reserved word (admin, apply, auth 등) 회피.
- **회원가입 페이지 없음** — 운영자 invite + `must_change_password` 플래그 + 첫 로그인 강제 PW 변경
- **마케팅 페이지 변경 금지** (`/[locale]/fan-to-pro/(marketing)/*`)

## 권한 3 계층 (ADR 0008)

1. **super_admin** (`user_profiles.is_super_admin = true`) — 글로벌. 모든 program / cohort access.
2. **admin** (`program_memberships` role='admin') — program 단위 (현재 fan-to-pro 1개). 본인 program 의 모든 cohort access.
3. **instructor + student** (`cohort_memberships` role='instructor'|'student') — cohort 단위. 본인 cohort 만 access.

권한 가드 helper (`infrastructure/auth/lms-role.ts`):
- `assertSuperAdmin()`
- `assertProgramAdmin(programSlug)` — super_admin OR program admin
- `assertCohortMember(cohortId, role?)` — super_admin OR program admin OR cohort member
- `assertCanAccessStudentCareer(studentId)` — super_admin OR program admin OR student-self (B0037)

서버 액션 첫 줄에 반드시 호출 (1차 가드). RLS 가 2차.

## DB 테이블 (LMS 추가 분)

- `programs` — 프로그램 마스터 (fan-to-pro 1개)
- `program_memberships` — user × program × role='admin'
- `cohort_memberships` — user × cohort × role='instructor'|'student'
- `cohorts` — 기수 (program_id + slug + accepts_signup_now)
- `sessions` — 회차 (cohort_id × 회차 번호 + 강의장 + 시간)
- `students` — 학생 (cohort_id + applicant_id lineage)
- `attendance` — 출결 (session_id × student_id × status)
- `materials` — 강의 자료 (cohort 별 / Wave 2)
- `announcements` — 공지 (cohort 별 / Wave 2)
- `consultations` / `consultation_reviews` — 1:1 컨설팅 (Wave 2)
- `assignments` / `submissions` / `feedback` — 과제 (Wave 2)
- `certificates` — 수료증 (Wave 2)
- `events` — 캘린더 (Wave 2)
- `cohort_expenses` / `tax_filings` — 재무 (B0034 Wave 3, Wave 1 Step 2 흡수)
- `companies` — 회사 (강사 회사 단위 정산용)
- `user_profiles` — 인증 사용자 프로필 (is_super_admin / must_change_password / role / student_id / instructor_id)
- `student_career_documents` — 이력서/자기소개서/포트폴리오 (B0037 Wave A+)

### Supabase Storage

- bucket `career-documents` (private, 10 MiB, MIME allowlist, service_role only)
- Wave 2 도입 시 추가 bucket: `materials` / `assignments` / `submissions`

## Wave 진행 상태 (2026-06-22 기준)

| Wave | 내용 | 상태 |
|---|---|---|
| Wave 0 (B0031) | DB minimum + 출결 UI (admin only) | ✅ done |
| Wave 1 Step 1 (B0032) | Supabase Auth + login + dashboard 골격 | ✅ done |
| Wave 1 Step 2 (B0032) | URL 재배치 + program 모듈화 + admin 9 페이지 + invite + finance | ✅ done |
| Wave 1 Step 3 (B0032) | instructor surface | 🔄 1기 운영 중 노아 본인 강사 계정 테스트 → 점진 보강 |
| Wave 1 Step 4 (B0032) | student surface | 🔄 career documents (B0037) 만 우선. 나머지 페이지 점진 |
| Wave 2 (B0033) | 과제 + 컨설팅 + 수료증 + 캘린더 | ❌ 마이그레이션 defer. 1기 운영 후 |
| Wave 3 (B0034) | 회사 단위 정산 + VAT/원천징수 + 회계 CSV | ✅ Wave 1 Step 2 finance 페이지로 흡수 |
| Wave 4 (B0035) | RLS 본격 + follow-up + 영문 UX + viewer PII 강화 | ❌ 2기 모집 전 (8월) 목표 |
| Wave 5 (B0036) | Realtime + 자동 정산 + 대량 onboarding | ❌ deferred (100명 규모 트리거) |
| career docs Wave A+ (B0037) | 이력서/자기소개서/포트폴리오 단일 최신본 | ✅ done 2026-06-21 |
| career docs Wave B (B0038) | instructor surface + path randomness + magic byte + bidi + 작품 collection | ❌ raw |

## 보안 (Sage 검토)

- **항상**: 새 권한 / 인증 / PII 표면 변경 시 Sage 검토 의무. 검토 결과 받은 후 push (CLAUDE.md §7.4).
- **RLS 정책**: 모든 cohort_id / student_id 보유 테이블에 4 계층 정책 (service_role / super_admin / program admin / cohort member 또는 student-self).
- **Storage**: bucket private + service_role only + signed URL TTL 1h.
- **server action**: 첫 줄에 권한 assert + zod 입력 검증.
- **잔여 위험 (Wave B 백로그)**: storage path randomness (H-1) / magic byte 검증 (M-2) / bidi sanitize (M-3) / locale revalidate (M-4) / error code 매핑 (L-1).

## 강사 access 정책

**1기 한정**: 강사에게 LMS access 안 줌. 노아가 본인 강사 계정으로 사용해보면서 필요한 기능 보강 후 다음 기수부터 강사 access 제공.

**이유**: LMS 가 강사가 쓰기엔 아직 빈 영역 많음 (자료 업로드 / 공지 / 컨설팅 등 Wave 2 미적용). 노아가 직접 dogfood 으로 빈틈 메우는 게 1기 운영에 안전.
