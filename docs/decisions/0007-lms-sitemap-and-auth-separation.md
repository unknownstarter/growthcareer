# ADR 0007 — LMS 사이트맵 + URL 구조 + 권한 분리

**Status**: Accepted
**Date**: 2026-06-21
**Deciders**: 노아 + Sophia + Aria
**Tags**: sitemap, routing, auth, separation, lms

---

## 컨텍스트

ADR 0005 (LMS 클린 아키텍처) + ADR 0006 (LMS 디자인 시스템 = 라이트 + 토스 톤 + shadcn) 박제 완료. 노아 명시 결정 (2026-06-21):

- 기존 어드민 (`/admin/applicants` `/admin/instructors` `/admin/finance`) + Basic Auth = **변경 X**
- 진입 경로 / URL / 접근 ID / 권한 = **그대로**
- 신규 LMS = **완전 새로운 경로** + **라이트 토스풍 대시보드** + 사이트맵 구조 정리
- Wave 1+2+3 **병행 진행 (옵션 C)**

기존 어드민은 트래킹 + 모집 관리 안정성 우선이고, 신규 LMS 는 학생/강사/운영자가 매일 사용하는 운영 시스템. 두 surface 의 **URL + 디자인 + 인증 시스템 완전 분리**.

---

## 결정

### 1. URL 구조 — 두 surface 완전 분리

#### 기존 (변경 X)

```
/                                       # 마케팅 home (다크)
/[locale]/fan-to-pro                    # 마케팅 landing (다크)
/[locale]/fan-to-pro/apply              # 신청 폼 (다크)
/[locale]/fan-to-pro/cowork             # 코워크 viewer 페이지 (다크)
/[locale]/terms                         # 약관 (다크)
/[locale]/privacy                       # 개인정보처리방침 (다크)

/[locale]/admin/applicants              # 어드민 신청자 (다크) — 변경 X
/[locale]/admin/instructors             # 어드민 강사 (다크) — 변경 X
/[locale]/admin/finance                 # 어드민 재무 (다크) — 변경 X
/[locale]/admin/cohorts                 # ⚠️ Wave 0 에 임시 만든 페이지. 향후 /lms/admin/cohorts 로 이전
```

#### 신규 LMS (라이트 + 토스 톤)

```
/lms                                    # LMS landing (로그인 안 한 경우 → /lms/login redirect)
/lms/login                              # 통합 로그인 (admin / instructor / student)
/lms/logout                             # 로그아웃
/lms/forgot-password                    # PW 재설정 magic link 요청
/lms/reset-password                     # PW 재설정 form

/lms/admin                              # LMS 운영자 surface (노아 = super admin)
  /lms/admin/dashboard                  # 운영 KPI (cohort 현황, 출결, 컨설팅, 정산)
  /lms/admin/cohorts                    # 기수 관리 (Wave 0 임시 페이지에서 이전)
  /lms/admin/students                   # 학생 관리 (전체 cohort)
  /lms/admin/instructors                # 강사 관리 (회사 단위) — 기존 /admin/instructors 와 별개
  /lms/admin/companies                  # 회사 관리 (강사 회사) — 신규
  /lms/admin/finance                    # 정산 (회사 단위) — 기존 /admin/finance 와 별개
  /lms/admin/materials                  # 강의 자료 관리
  /lms/admin/announcements              # 공지 관리
  /lms/admin/consultations              # 컨설팅 진행 현황

/lms/instructor                         # 강사 surface
  /lms/instructor/dashboard             # 본인 담당 cohort + 새 제출물 badge
  /lms/instructor/students              # 본인 담당 학생 list
  /lms/instructor/students/[id]         # 학생 상세 + 출결 + 제출물
  /lms/instructor/sessions              # 본인 담당 세션 list
  /lms/instructor/sessions/[id]         # 세션 상세 + 출결 mark + 자료 업로드
  /lms/instructor/consultations         # 컨설팅 review list
  /lms/instructor/profile               # 본인 정보 수정
  /lms/instructor/settings/password     # PW 변경

/lms/student                            # 학생 surface
  /lms/student/dashboard                # 다음 강의 + 출석 현황 + 미제출 과제 + 받은 피드백
  /lms/student/sessions                 # 세션 list
  /lms/student/sessions/[id]            # 세션 자료 + 출결 결과
  /lms/student/assignments              # 과제 list
  /lms/student/assignments/[id]         # 과제 상세 + 제출 (file upload)
  /lms/student/consulting               # 컨설팅 list
  /lms/student/consulting/[kind]        # 이력서/자소서/포폴 업로드 + 받은 review
  /lms/student/announcements            # 공지 list
  /lms/student/materials                # 강의 자료 list
  /lms/student/certificates             # 수료증 + 공연 참여 확인서 다운로드
  /lms/student/profile                  # 본인 정보 수정
  /lms/student/settings/password        # PW 변경
```

### 2. 인증 시스템 분리

| URL prefix | 인증 시스템 | 권한 |
|---|---|---|
| `/` (마케팅) | 없음 | public |
| `/admin/*` (기존 어드민) | **Basic Auth** (변경 X) | admin / viewer (코워크 공유) |
| `/lms/*` (신규 LMS) | **Supabase Auth** (신규) | super_admin / instructor / student |

**완전 분리 이유**:
- 기존 어드민의 viewer (코워크) 공유는 Basic Auth 의 realm + cookie session 으로 안정 운영 중
- 신규 LMS 는 학생 9명 + 강사 3명 + 노아 = 13명 로그인 + PW 재설정 + 본인 정보 수정 → Basic Auth 로 못 함
- 두 시스템 통합 시 운영자가 admin 모드 / super_admin 모드 어디서 동작 중인지 혼란

**노아 (운영자) 접근**:
- `/admin/*` = Basic Auth ID/PW (기존, 변경 X)
- `/lms/*` = Supabase Auth super_admin 계정 (신규, 노아 이메일 + 본인 설정 PW)
- 두 계정 별도 관리. 동시 로그인 가능 (다른 브라우저 또는 다른 cookie scope).

### 3. role 모델 (Supabase Auth)

```
auth.users (Supabase 관리)
  └─ raw_app_meta_data: { role: 'super_admin' | 'instructor' | 'student' }

public.user_profiles
  id (uuid, FK auth.users)
  role enum
  display_name
  email
  phone (optional)
  company_id (nullable, FK companies — instructor 만)
  student_id (nullable, FK students — student 만)
  instructor_id (nullable, FK instructors — instructor 만)
  password_changed_at
  last_login_at
```

| role | 접근 가능 surface | 비고 |
|---|---|---|
| `super_admin` | `/lms/admin/*` 전체 | 노아 1명. 모든 cohort + 학생 + 강사 + 회사 + 정산 |
| `instructor` | `/lms/instructor/*` | 강사 3명 (1기). 본인 담당 cohort + 학생만 |
| `student` | `/lms/student/*` | 학생 9명 (1기). 본인 데이터만 |

### 4. middleware 분리

```
middleware.ts (현 위치)
  ├── /admin/* matcher: Basic Auth + admin / viewer cookie (현 로직 유지)
  └── /lms/* matcher: Supabase Auth + role-based redirect
       ├── /lms/admin/* → require role = 'super_admin'
       ├── /lms/instructor/* → require role = 'instructor'
       └── /lms/student/* → require role = 'student'
```

기존 admin middleware 로직은 그대로 두고, `/lms/*` 케이스만 신규 분기.

### 5. 라우트 그룹 (App Router)

```
app/[locale]/
├── (marketing)/                        # 다크 그룹 (현 상태, route group)
│   ├── page.tsx                        # 마케팅 home
│   └── fan-to-pro/*
├── admin/                              # 기존 어드민 (다크, Basic Auth) — 그대로
│   ├── applicants/
│   ├── instructors/
│   ├── finance/
│   └── cohorts/                        # ⚠️ Wave 0 임시. 향후 /lms/admin/cohorts 로 이전
├── (lms)/                              # 라이트 그룹 ⭐ 신규
│   ├── layout.tsx                      # data-theme="light" wrapper
│   └── lms/
│       ├── layout.tsx                  # Supabase Auth provider + role guard
│       ├── login/page.tsx
│       ├── forgot-password/page.tsx
│       ├── reset-password/page.tsx
│       ├── admin/                      # super_admin 전용
│       │   ├── layout.tsx              # admin sidebar + topbar
│       │   ├── dashboard/page.tsx
│       │   ├── cohorts/
│       │   ├── students/
│       │   ├── instructors/
│       │   ├── companies/
│       │   ├── finance/
│       │   ├── materials/
│       │   ├── announcements/
│       │   └── consultations/
│       ├── instructor/                 # instructor 전용
│       │   ├── layout.tsx              # instructor sidebar
│       │   ├── dashboard/page.tsx
│       │   ├── students/
│       │   ├── sessions/
│       │   ├── consultations/
│       │   ├── profile/page.tsx
│       │   └── settings/password/page.tsx
│       └── student/                    # student 전용
│           ├── layout.tsx              # student sidebar
│           ├── dashboard/page.tsx
│           ├── sessions/
│           ├── assignments/
│           ├── consulting/
│           ├── announcements/page.tsx
│           ├── materials/page.tsx
│           ├── certificates/page.tsx
│           ├── profile/page.tsx
│           └── settings/password/page.tsx
```

### 6. 디자인 시스템

ADR 0006 그대로 적용 — `(lms)` route group 안은 라이트 + 토스 톤 + shadcn/ui. 기존 `admin/` 은 다크 그대로.

### 7. Wave 0 임시 페이지 이전

`/admin/cohorts` (Wave 0 에 만든 임시 라이트 페이지) → 향후 Wave 1 진행 시 `/lms/admin/cohorts` 로 이전. Strangler Fig 패턴 — 기존 위치에 redirect 만 남기거나 삭제.

---

## Sage critical 후보

- 신규 인증 표면 (Supabase Auth)
- 학생/강사 로그인 = PII 표면 확대
- middleware 분리 시 admin/lms 경계 누설 risk
- RLS 정책 — admin / instructor / student 각 cohort 분리

→ Wave 1 시작 전 Sage 검토 의무 (CLAUDE.md §7.4).

---

## 노아 보류 결정 (Wave 1 진행 중 컨펌)

1. **노아 super_admin 이메일** — 어떤 이메일로 가입? (hello@dropdown.xyz 또는 개인)
2. **강사 3명 이메일** — invite 발송 위해 (이미 어드민 instructors 에 입력되어 있을 가능성)
3. **학생 9명 이메일** — applicants 테이블에서 자동 backfill
4. **첫 로그인 시점** — 강의 시작 6/27 전 vs 강의 진행 중

---

## Rejected Alternatives

- **`/admin/*` 와 `/lms/admin/*` 통합** — 두 인증 시스템 합치면 운영자 혼란 + Basic Auth viewer 사고 재발 risk
- **Supabase Auth 만 사용 (Basic Auth 폐기)** — 기존 코워크 viewer + admin 운영 안정성 깨짐
- **`/admin/lms/*` 형태** — `/admin/*` prefix 안에 들어가면 기존 Basic Auth middleware 와 충돌. `/lms/admin/*` 으로 명확히 분리

---

## 참조

- ADR 0005 (LMS 클린 아키텍처)
- ADR 0006 (LMS 디자인 시스템)
- CLAUDE.md §7.4 (기존 영역 보호 룰)
- B0031 (Wave 0 완료)
- B0032 ~ B0034 (Wave 1~3, 옵션 C 병행)
