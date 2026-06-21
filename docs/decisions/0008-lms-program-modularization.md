# ADR 0008 — LMS Program 모듈화 + URL 구조 + 회원가입 없음

**Status**: Accepted (ADR 0007 supersedes)
**Date**: 2026-06-21
**Deciders**: 노아 + Sophia
**Tags**: program-modular, sitemap, routing, auth, no-signup, cohort-slug

---

## 컨텍스트

ADR 0007 의 `/lms/*` URL 패턴이 program 무관 — 클린 아키텍처 위반 (노아 지적 2026-06-21). 미래 multi-program (Pro to Master 등) 확장 시 부적합. 또한 cohort URL 노출 차원에서 `cohorts` segment 단어 자체가 다음/이전 기수 추측 가능.

추가 노아 결정:
- **회원가입 페이지 없음**. 운영자 (super_admin) 가 학생/강사 invite + 임시 PW 발급. 첫 로그인 시 강제 PW 변경.
- locale = `ko`/`en` (next-intl). growthcareer 와 무관.
- fan-to-pro 만 운영 (현재). 미래 program 자연 확장.

---

## 결정

### 1. URL 구조 (program slug 직접, cohort slug = nanoid)

```
# 통합 로그인 (program 무관, 회원가입 페이지 없음)
/[locale]/auth/login
/[locale]/auth/forgot-password
/[locale]/auth/reset-password
/[locale]/auth/change-password           # 첫 로그인 시 강제 변경
/[locale]/auth/callback                  # Supabase Auth callback

# 마케팅 (그대로, 다크)
/[locale]/                               # home
/[locale]/fan-to-pro                     # 랜딩
/[locale]/fan-to-pro/apply               # 신청 폼

# 기존 어드민 (그대로, Basic Auth — 변경 X)
/admin/applicants
/admin/instructors
/admin/finance

# LMS (라이트, 토스 톤)
/[locale]/fan-to-pro/admin/              # super_admin (글로벌)
  dashboard
  cohorts                                # cohort list (admin 만 의미 노출 OK)
  cohorts/[cohortSlug]                   # cohort detail
  students
  students/[studentId]
  instructors                            # 회사 단위
  instructors/[instructorId]
  companies
  companies/[companyId]
  finance                                # 회사 단위 정산
  materials
  announcements
  consultations

/[locale]/fan-to-pro/[cohortSlug]/instructor/    # 강사 (cohort 단위, segment 이름 없음)
  dashboard
  students / students/[studentId]
  sessions / sessions/[sessionId]
  consultations
  profile
  settings/password

/[locale]/fan-to-pro/[cohortSlug]/student/       # 학생 (cohort 단위, segment 이름 없음)
  dashboard
  sessions / sessions/[sessionId]
  assignments / assignments/[assignmentId]
  consulting / consulting/[kind]
  materials
  announcements
  certificates
  profile
  settings/password

# 미래 program 확장 (자동)
/[locale]/pro-to-master/admin/...
/[locale]/pro-to-master/[cohortSlug]/student/...
```

### 2. cohort slug 형식

**8자 nanoid alphanumeric** (예: `X9aB2pQ7`, `Kx7Mn3pR`).

- 외부 추측 불가 (62^8 ≈ 218조)
- segment 이름 (`cohorts`/`groups`) 노출 X
- 학생 URL 만 보고 "다음 기수 / 이전 기수 / 몇 명" 추측 불가
- DB `cohorts.slug text unique not null`
- 생성 시 reserved word (`admin` `apply` `auth`) 와 충돌 회피 검증

### 3. route group 으로 디자인 분리

```
app/[locale]/fan-to-pro/
├── (marketing)/                        # 다크 그룹
│   ├── layout.tsx                      # data-theme="dark" (또는 기존 className)
│   ├── page.tsx                        # 랜딩
│   └── apply/page.tsx
└── (lms)/                              # 라이트 토스 톤 그룹
    ├── layout.tsx                      # data-theme="light" + LMS Shell
    ├── admin/
    │   ├── layout.tsx                  # super_admin role 가드
    │   ├── dashboard/page.tsx
    │   ├── cohorts/...
    │   ├── students/...
    │   ├── instructors/...
    │   ├── companies/...
    │   ├── finance/...
    │   ├── materials/...
    │   ├── announcements/...
    │   └── consultations/...
    └── [cohortSlug]/
        ├── layout.tsx                  # cohort membership 가드
        ├── instructor/                 # role=instructor 가드
        │   └── ...
        └── student/                    # role=student 가드
            └── ...
```

### 4. 회원가입 없음 + 첫 로그인 PW 변경

| 흐름 | 동작 |
|---|---|
| 학생/강사 회원가입 페이지 | **없음** (`/auth/signup` 만들지 X) |
| 학생/강사 onboarding | super_admin 이 어드민 [등록] 클릭 → 이메일 + 임시 PW 입력 → Supabase Auth invite + user_profiles row INSERT (`must_change_password: true`) → 노아가 학생/강사에게 임시 PW 전달 |
| 학생/강사 첫 로그인 | `/auth/login` → 이메일 + 임시 PW → `must_change_password=true` 면 `/auth/change-password` 강제 redirect → 새 PW 설정 → `must_change_password=false` → dashboard 진입 |
| PW 잊어버린 경우 | `/auth/forgot-password` → 이메일 magic link → `/auth/reset-password` 에서 새 PW |

login 페이지 UI: [로그인] 버튼 + [비밀번호 잊으셨나요?] 링크. **[회원가입] 링크 X**.

### 5. 권한 모델 (3 계층)

```
auth.users (Supabase 관리)

public.user_profiles
  id (FK auth.users)
  display_name
  email
  phone (optional)
  is_super_admin boolean default false       # 글로벌 super_admin (노아)
  must_change_password boolean default true  # 첫 로그인 강제 변경
  password_changed_at
  last_login_at
  created_at, updated_at

# program 단위 (super_admin 외 admin — 미래)
public.program_memberships
  user_id (FK user_profiles)
  program_id (FK programs)
  role text check (role in ('admin'))        # admin 만 (instructor/student 는 cohort 단위)
  primary key (user_id, program_id, role)

# cohort 단위 (instructor / student)
public.cohort_memberships
  user_id (FK user_profiles)
  cohort_id (FK cohorts)
  role text check (role in ('instructor', 'student'))
  primary key (user_id, cohort_id, role)
```

| Role | 범위 | 권한 |
|---|---|---|
| **super_admin** | 글로벌 (program 무관) | `is_super_admin=true`. 모든 program/cohort access |
| **admin** | program 별 | `program_memberships (user, program, 'admin')`. 해당 program 의 모든 cohort access |
| **instructor** | cohort 별 | `cohort_memberships (user, cohort, 'instructor')`. 해당 cohort 의 학생 access |
| **student** | cohort 별 | `cohort_memberships (user, cohort, 'student')`. 본인 데이터만 |

### 6. middleware 분기

```
middleware.ts
├── /admin/*               → 기존 Basic Auth 로직 (변경 X)
├── /auth/*                → public (Supabase Auth 페이지)
├── /[locale]/fan-to-pro   → 마케팅 (변경 X)
├── /[locale]/fan-to-pro/admin/*           → super_admin 또는 admin (program=fan-to-pro) 만
├── /[locale]/fan-to-pro/[cohortSlug]/instructor/*  → cohort_memberships role=instructor 만
├── /[locale]/fan-to-pro/[cohortSlug]/student/*     → cohort_memberships role=student 만
└── /[locale]/fan-to-pro/[cohortSlug]/*    → cohort_memberships 행 있음 + must_change_password=false
```

### 7. RLS 정책 — 모든 신규 entity

cohort_id 가 있는 모든 row 는:
- super_admin: 전체 access
- admin: program 별 cohort 만
- instructor: cohort_memberships 행 있는 cohort 만
- student: 본인 학생 row 만

서비스 롤만 RLS bypass (server-side 운영).

---

## DB 모듈화 (새 마이그레이션)

```sql
-- programs (마스터)
create table programs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,             -- "fan-to-pro"
  name text not null,                    -- "Fan to Pro"
  status text not null default 'active', -- active / paused / archived
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into programs (slug, name) values ('fan-to-pro', 'Fan to Pro');

-- program_memberships (user × program × role)
create table program_memberships (
  user_id uuid references auth.users(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, program_id, role)
);

-- cohort_memberships (user × cohort × role)
create table cohort_memberships (
  user_id uuid references auth.users(id) on delete cascade,
  cohort_id uuid references cohorts(id) on delete cascade,
  role text not null check (role in ('instructor', 'student')),
  created_at timestamptz not null default now(),
  primary key (user_id, cohort_id, role)
);

-- cohorts 에 program_id + slug + 모집 상태 추가
alter table cohorts add column program_id uuid references programs(id);
alter table cohorts add column slug text;
alter table cohorts add column accepts_signup_now boolean not null default false;
update cohorts set program_id = (select id from programs where slug='fan-to-pro');
alter table cohorts alter column program_id set not null;
-- slug backfill (1기 = nanoid 8자 — 임시 placeholder, 운영자가 추후 변경 가능)
update cohorts set slug = substr(encode(gen_random_bytes(8), 'hex'), 1, 8) where slug is null;
alter table cohorts alter column slug set not null;
create unique index cohorts_slug_unique on cohorts (slug);

-- instructors 에 program_id 추가
alter table instructors add column program_id uuid references programs(id);
update instructors set program_id = (select id from programs where slug='fan-to-pro');

-- user_profiles 에 is_super_admin + must_change_password 추가
alter table user_profiles add column is_super_admin boolean not null default false;
alter table user_profiles add column must_change_password boolean not null default true;
-- 노아 super_admin true 로
update user_profiles set is_super_admin = true, must_change_password = false where role = 'super_admin';

-- 기존 user_profiles.role 컬럼 deprecate (program/cohort_memberships 로 이전)
alter table user_profiles alter column role drop not null;
-- 기존 role 값은 backfill 후 별도 정리 (super_admin 만 살아있음)
```

---

## Iris 호출 작업 분해

**Step 2 (이번 호출)**:
1. 마이그레이션 + entity 박제 (programs / program_memberships / cohort_memberships / cohorts.program_id+slug+accepts_signup_now / instructors.program_id / user_profiles.is_super_admin+must_change_password)
2. 코드 이전 — `app/lms/*` → `app/[locale]/auth/*` + `app/[locale]/fan-to-pro/(lms)/*`
3. middleware 재설계
4. `/auth/change-password` 페이지 신규 + 강제 redirect 로직
5. `/fan-to-pro/admin/` 9 페이지 (dashboard / cohorts / students / instructors / companies / finance / materials / announcements / consultations)
6. invite 흐름 (학생/강사 등록 UI)
7. 회사 단위 강사/재무 개편

**Step 3 (다음 호출)**:
- `/fan-to-pro/[cohortSlug]/instructor/*` surface 전체
- 강사 본인 dashboard / students / sessions / consultations / profile / password

**Step 4 (다음 호출)**:
- `/fan-to-pro/[cohortSlug]/student/*` surface 전체
- 학생 본인 dashboard / sessions / assignments / consulting / materials / announcements / certificates / profile / password

**Wave 2 (병행)**:
- assignments / submissions / feedback entity + UI
- consultations / consultation_reviews entity + UI
- certificates entity + 발급 흐름
- Supabase Storage (signed URL TTL 5분)

---

## Best Practice 적용 (의무)

| 영역 | Standard |
|---|---|
| 데이터 fetching | Server Components + Supabase Server Client |
| Mutation | Server Actions + `useTransition` + `revalidatePath` |
| Forms | React Hook Form + Zod + shadcn `Form` |
| Auth | `@supabase/ssr` + middleware + layout 가드 + RLS 이중 방어 |
| Tables | TanStack Table v8 + shadcn `DataTable` |
| Charts | Tremor |
| Icons | Lucide React |
| Loading | `loading.tsx` + Suspense |
| Error | `error.tsx` |
| Optimistic UI | `useOptimistic` |
| i18n | next-intl + `[locale]` segment |
| File upload | Supabase Storage + signed URL TTL 5분 + MIME + 크기 hard cap |
| RLS | 모든 신규 테이블 RLS enable + role 기반 정책 |
| Date | `date-fns` + KST |
| DataTable | column filters + 검색 + sorting + pagination |
| Toast | shadcn `Sonner` |
| Modal | Radix Dialog (focus trap + ESC + a11y) |
| Password 정책 | NIST 2024 (10자+, 복잡도 X, 만료 X, HIBP 대조) |

---

## Rejected Alternatives

- `/programs/fan-to-pro/...` — `/programs/` prefix 어색, fan-to-pro 직접 noun 더 자연
- `/lms/*` (ADR 0007) — program 무관 + cohort 노출 없음 (사용자 의도 위배)
- `/fan-to-pro/cohorts/c-xxxxxx/...` — `cohorts` segment 단어 노출 (사용자 의도 위배)
- 회원가입 페이지 — 운영자 invite 만, 학생/강사 self-signup X
- 단일 role 컬럼 (user_profiles.role) — multi-cohort / multi-program 케이스 대응 불가

---

## 참조

- ADR 0005 (LMS 클린 아키텍처)
- ADR 0006 (LMS 디자인 시스템 — 라이트 토스 톤)
- ADR 0007 (Superseded by 0008)
- CLAUDE.md §7.4
- B0032 (Wave 1 — 본 ADR 기준 재정의)
