# ADR 0011 — LMS 정식 런칭 아키텍처 (1기 2주차 7/4 출시)

**Status**: Proposed
**Date**: 2026-06-25
**Deciders**: 노아 + Sophia (Tech Architect)
**Related**: ADR 0005 (LMS Clean Architecture) · ADR 0006 (LMS Design System) · ADR 0008 (URL + Auth 분리) · ADR 0010 (applicants 영구 불변 + LMS additive)
**Tags**: lms, launch, lecture-materials, career-profile, storage, onboarding

---

## 1. 컨텍스트

1기 운영 중 (paid 10명, 첫 강의 6/27 토). 1주차 강의 자료 약 400MB PPT 가 Google Drive 모바일 다운로드 사고 발생 → 자체 LMS hosting 필요성이 D+1 사고로 급부상.

**목표**: 2주차 강의 (7/4 토, D+8) 까지 LMS 정식 런칭. 학생 11명이 본인 Supabase Auth 계정으로 로그인하여:
- 강의 자료 다운로드 (회차별)
- 이력서 / 자기소개서 / 포트폴리오 등록 (B0037 Wave A+ 이미 prod)
- 본인 취업 정보 (희망 직무 / 자격증 / 경력 / 학력 / SNS 등) 입력

**시간 박스**: 9일 (6/25 ~ 7/3). Sage 검토 + 노아 manual 테스트 + 학생 invite 흐름 포함.

**불변 제약** (ADR 0010 재확인):
- `applicants` 테이블 영구 불변 — split / dedup / 마이그레이션 사고 회피
- LMS 신규 entity 는 `students.id` 기준으로 추가만 (additive only)
- 신규 권한 / 인증 / PII 표면은 Sage critical 검토 통과 후에만 push

**Echo 리서치 입력** (병행 진행 — 본 ADR 작성 시점 미열람, 비용 단계는 reserved):
- Supabase Pro vs Cloudflare R2 비용 시뮬레이션은 결정 3 의 final 선택에 반영 예정
- 본 ADR 의 결정 3 은 Echo 결과 도착 후 Δ-수정 가능 (interface / RLS / use case 는 변경 없음)

---

## 2. 결정 1 — `lecture_materials` Entity 신설

### 2.1 핵심 결정

신규 entity `lecture_materials` 를 추가. `student_career_documents` (10MB, 단일 row, career 전용) 와 **명시적으로 분리**.

분리 이유:
- 파일 크기 (10MB vs 1GB) 차이가 한 자릿수 이상 → bucket file_size_limit 분기 필요
- 라이프사이클이 다름 (career = 학생 1인 최신본 / material = cohort 자료 누적)
- 권한 다름 (career = 본인+admin / material = cohort 전체 student read)
- audit 모델 다름 (career = 최신 N=1 / material = 다운로드 audit 옵션)

### 2.2 컬럼

```sql
create table lecture_materials (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts(id) on delete restrict,
  session_id uuid references sessions(id) on delete set null,  -- nullable: 회차 미연결 자료 허용

  -- 표시 메타
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  category text not null check (category in ('slide', 'handout', 'recording', 'reference', 'other')),
  display_order int not null default 0,

  -- 파일 XOR 외부 링크 (career-documents 패턴 재사용)
  file_path text,        -- Supabase Storage object path (private bucket)
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes between 1 and 1073741824),  -- 1GB cap
  file_mime text,
  file_original_name text,
  external_url text check (external_url is null or external_url ~ '^https://'),  -- https only
  constraint material_xor check (
    (file_path is not null and external_url is null)
    or (file_path is null and external_url is not null)
  ),

  -- 가시성 (강의 전 미리 공개 vs 강의 후 공개)
  visibility text not null default 'draft' check (visibility in ('draft', 'scheduled', 'published', 'archived')),
  visible_from timestamptz,  -- scheduled 일 때 의무. published 면 무시
  constraint visibility_schedule check (
    visibility <> 'scheduled' or visible_from is not null
  ),

  -- audit
  uploaded_by uuid not null references user_profiles(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index on lecture_materials (cohort_id, display_order);
create index on lecture_materials (session_id) where session_id is not null;
create index on lecture_materials (visibility) where visibility in ('scheduled','published');
```

**State machine**: `draft → scheduled → published → archived`. archived 는 student 비가시. published 는 즉시 visible. scheduled 는 `visible_from <= now()` 일 때 student 가시 (Edge Config 캐시 안 함 — 단순 query 시점 비교).

**다운로드 audit (옵션)**: Wave 1 launch 시점에서는 *기록 보류*. 이유: 학생 11명 + 자료 ~30개 = 약 330 row / 기수. audit 부재로 사고 시 누가 다운로드했는지 모를 risk vs row 폭증. **결정**: 본 ADR 에서는 **audit 미도입**. 대신 `signed_url` 생성 시점만 server log (Vercel function log) 에 stdout 으로 남김. Wave 1 후 회고에서 audit table 도입 여부 결정 (3회 사용 사례 룰).

### 2.3 RLS 정책

```sql
alter table lecture_materials enable row level security;

-- SELECT: super_admin, program admin, cohort instructor, cohort student (visible 일 때만)
create policy lm_select_super_admin on lecture_materials for select
  using (exists (select 1 from user_profiles up where up.id = auth.uid() and up.is_super_admin));

create policy lm_select_program_admin on lecture_materials for select
  using (exists (
    select 1 from program_memberships pm
    join cohorts c on c.program_id = pm.program_id
    where pm.user_id = auth.uid() and c.id = lecture_materials.cohort_id
  ));

create policy lm_select_cohort_instructor on lecture_materials for select
  using (exists (
    select 1 from cohort_memberships cm
    where cm.user_id = auth.uid() and cm.cohort_id = lecture_materials.cohort_id
      and cm.role = 'instructor'
  ));

create policy lm_select_cohort_student on lecture_materials for select
  using (
    visibility = 'published'
    or (visibility = 'scheduled' and visible_from <= now())
  ) and exists (
    select 1 from cohort_memberships cm
    where cm.user_id = auth.uid() and cm.cohort_id = lecture_materials.cohort_id
      and cm.role = 'student'
  );

-- INSERT/UPDATE/DELETE: super_admin + program admin 만 (Wave 1 한정 — 강사 본인 upload 는 Wave 2+)
-- 강사 upload 는 결정 5 참조
```

### 2.4 Use case 인터페이스 (application layer)

```ts
// src/programs/fan-to-pro/application/use-cases/material/
uploadMaterial(input: UploadMaterialInput): Promise<Result<Material, UploadError>>
publishMaterial(materialId: Id, publishedBy: UserId): Promise<Result<Material, PublishError>>
scheduleMaterial(materialId: Id, visibleFrom: Date, by: UserId): Promise<Result<...>>
archiveMaterial(materialId: Id, by: UserId): Promise<Result<...>>
listMaterialsForCohort(cohortId: Id, viewer: ViewerContext): Promise<Material[]>  // RLS 가 server-side 필터
issueDownloadUrl(materialId: Id, viewer: ViewerContext): Promise<Result<{url: string, expiresAt: Date}, DownloadError>>
```

`issueDownloadUrl` = Supabase Storage `createSignedUrl(path, 60)` (60초 TTL). 권한 검증은 use case 안에서 추가 한 번 (middleware path + RLS + use case `assertCohortMember()` 3중).

---

## 3. 결정 2 — `student_career_profile` 구조

### 3.1 핵심 결정

**Hybrid**: parent `student_career_profile` 단일 row (PK = student_id) + child tables 4종 (자격증 / 경력 / 학력 / 외부 링크). 자유도 높은 짧은 필드는 parent jsonb 1개 컬럼에 격리.

거부:
- Option 1 (단일 jsonb 컬럼) — 검색 / index / 보고서 빌드 비용 ↑. 학생 11명일 땐 OK 지만 3기+ 100명 시점 schema 부재가 갉아먹음
- Option 2 (모든 필드 strict columns) — 자격증 / 경력은 N개 → child table 강제. 단일 row 에 자격증_1~5 식 컬럼 폭증 안 됨

### 3.2 Parent table

```sql
create table student_career_profiles (
  student_id uuid primary key references students(id) on delete cascade,

  -- 희망 진로 (자주 검색 + 자주 표시)
  target_roles text[] not null default '{}',          -- ['kpop_marketing', 'pr', 'live_ops'] 등 enum-like
  target_industries text[] not null default '{}',     -- ['entertainment', 'agency']
  target_companies text[] not null default '{}',      -- 자유 입력 (회사명)
  open_to_relocation boolean not null default true,

  -- 학력 (단일 — 최종학력만)
  education_status text check (education_status in ('graduated','enrolled','expected','withdrew','other')),
  education_school text,
  education_major text,
  education_year int check (education_year is null or education_year between 1950 and extract(year from now())::int + 10),

  -- 어학
  language_levels jsonb not null default '{}'::jsonb,
  -- 예: {"en": {"score": 850, "type": "TOEIC"}, "ja": {"level": "N2"}}

  -- 자기 평가 (자유 입력, 짧음)
  self_strengths text check (char_length(self_strengths) <= 1000),
  self_weaknesses text check (char_length(self_weaknesses) <= 1000),

  -- 자유 메타 (확장 여지)
  extras jsonb not null default '{}'::jsonb,
  -- 예: {"availability": "immediate", "salary_min": 32000000}
  -- schema-on-read. 자주 쓰이면 child / column 으로 graduate.

  -- 진행 상태
  completion_percent int not null default 0 check (completion_percent between 0 and 100),
  -- 학생 UX 용. trigger 또는 application 계산. Wave 1 = application 계산 (단순).

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 3.3 Child tables (정확히 4개)

```sql
create table student_certifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  name text not null,
  issuer text,
  acquired_at date,
  expires_at date,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table student_experiences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null check (kind in ('job','intern','project','volunteer','award')),
  title text not null,                    -- 직무 / 프로젝트명 / 수상명
  organization text,                       -- 회사 / 단체 / 주최
  description text check (char_length(description) <= 2000),
  start_date date,
  end_date date,                           -- null = 재직중
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table student_external_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind text not null check (kind in ('linkedin','instagram','x','tiktok','behance','notion','website','other')),
  url text not null check (url ~ '^https://'),
  label text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table student_education_history (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  level text not null check (level in ('high_school','associate','bachelor','master','phd','bootcamp','other')),
  school text not null,
  major text,
  start_year int,
  end_year int,
  status text not null check (status in ('graduated','enrolled','expected','withdrew')),
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
```

**Why parent + child 분리**: parent 1 row 는 학생이 dashboard 진입 시 1 query 로 조회 가능 (faster than join). child 는 학생이 "자격증 추가" 누를 때만 N+1 → 보통 1 ~ 5개. 99% 케이스에서 cheap.

### 3.4 career_documents 와의 관계

- `student_career_documents` (B0037) = 파일 (resume / cover_letter / portfolio 단일 최신본, 10MB)
- `student_career_profiles` + 4 child = 구조화 데이터 (검색·필터·보고서·자동 매칭 가능)

**둘 다 학생당 1:1 또는 1:N. 통합 X.** 이유: 라이프사이클 + 권한 + 파일 크기 모두 다름. career_documents 는 학생이 1주일에 1번 업데이트 (큰 파일). profile 은 학생이 처음 등록 후 가끔 수정 (작은 row).

### 3.5 RLS

- 학생 본인: SELECT / INSERT / UPDATE / DELETE 본인 row 만
- super_admin / program admin / cohort instructor: SELECT 만 (열람 권한)
- 강사가 본인 cohort 학생 profile 열람 = 결정 5 에서 분기

```sql
-- 본인 가드 (4개 table 모두 동일 패턴)
create policy scp_self on student_career_profiles for all
  using (
    exists (
      select 1 from user_profiles up
      where up.id = auth.uid() and up.student_id = student_career_profiles.student_id
    )
  );

create policy scp_admin_read on student_career_profiles for select
  using (
    exists (select 1 from user_profiles up where up.id = auth.uid() and up.is_super_admin)
    or exists (
      select 1 from cohort_memberships cm
      join students s on s.id = student_career_profiles.student_id
      where cm.user_id = auth.uid() and cm.cohort_id = s.cohort_id and cm.role = 'instructor'
    )
  );
```

### 3.6 Use cases

```ts
// application/use-cases/career-profile/
getMyCareerProfile(studentId: Id): Promise<CareerProfileView>
updateCareerProfileBasics(input: UpdateBasicsInput): Promise<Result<...>>
addCertification(input: AddCertInput): Promise<Result<...>>
addExperience(input: AddExperienceInput): Promise<Result<...>>
addExternalLink(input: AddLinkInput): Promise<Result<...>>
addEducation(input: AddEduInput): Promise<Result<...>>
removeChild(kind: ChildKind, id: Id, by: UserId): Promise<Result<...>>
computeCompletionPercent(studentId: Id): Promise<number>  // pure 함수 + repo read
```

---

## 4. 결정 3 — Storage 인프라 (Bucket + 비용 분기)

### 4.1 Bucket 결정

**신규 bucket `lecture-materials`** 생성. 기존 `career-documents` (10MB) 확장 거부.

```
lecture-materials/
  cohort/{cohort_id}/material/{material_id}/{original_name}
```

- `public = false` (private. signed URL only)
- `file_size_limit = 1073741824` (1GB)
- `allowed_mime_types`: 화이트리스트 (pdf, pptx, mp4, mov, key, zip, png, jpg)

거부 이유 (기존 bucket 확장):
- career-documents 의 RLS 정책이 단일 학생 기반 → cohort 전체 read 패턴 추가 시 정책이 합성 복잡도 ↑
- 10MB cap 의 의도 (PII 가 큰 파일에 박힐 risk 차단) 가 cohort 자료와 다름
- 단일 bucket 의 quota / metric 분리 불가 → 비용 추적 어려움

### 4.2 비용 분기 — Echo 리서치 대기

**Option A — Supabase Pro storage (default)**:
- $25/mo 포함 + $0.021/GB-month + egress $0.09/GB
- 1기 자료 30개 × 평균 200MB = 6GB. 학생 11명 × 평균 5회 다운로드 = 330GB egress / 기수
- **추정 월 비용**: $0.13 storage + $29.7 egress = 약 $30 / 기수

**Option B — Cloudflare R2**:
- $0.015/GB-month storage + **egress $0** (강점)
- Supabase 는 metadata 만 보관 (file_path = R2 key + signed url 발급은 R2 SDK)
- **추정 월 비용**: $0.09 / 기수
- 비용 대비 통합 복잡도 ↑ (Supabase Storage RLS X → application layer 권한 검증 책임 ↑)

**결정 (Sophia 권장)**: **Option A (Supabase Pro) — Wave 1 launch**.
이유:
1. 1기 학생 11명 / 기수 30~50 자료 / egress ~330GB → 월 $30 비용은 budget 안. Wave 1 시간 박스 9일에 R2 통합 위험 회피
2. RLS 한 곳 (Supabase Storage policy) 에서 권한 = code reuse ↑
3. Echo 가 다른 결론 (R2 가 압도적) 내면 Wave 2+ 에 migration. file_path 컬럼 그대로, storage 만 swap → 격리됨

**Trigger to migrate**: (a) 학생 수 50명+ 또는 (b) 월 storage 비용 $200+ 또는 (c) Echo 가 R2 의 다른 강점 (예: Korea egress 속도) 발견 시.

### 4.3 Storage RLS 정책 (Supabase Storage)

```sql
-- bucket: lecture-materials
-- object path = cohort/{cohort_id}/material/{material_id}/{filename}

create policy lm_storage_select on storage.objects for select
  using (
    bucket_id = 'lecture-materials'
    and (
      -- super_admin
      exists (select 1 from user_profiles up where up.id = auth.uid() and up.is_super_admin)
      -- cohort member (학생/강사) AND lecture_materials.visibility 가 published 또는 scheduled-due
      or exists (
        select 1
        from lecture_materials lm
        join cohort_memberships cm on cm.cohort_id = lm.cohort_id
        where lm.file_path = storage.objects.name
          and cm.user_id = auth.uid()
          and (
            cm.role in ('instructor','admin')
            or (cm.role = 'student' and (lm.visibility = 'published' or (lm.visibility = 'scheduled' and lm.visible_from <= now())))
          )
      )
    )
  );

-- INSERT/DELETE: super_admin + program admin 만 (instructor 는 Wave 2+)
```

---

## 5. 결정 4 — 학생 Onboarding 흐름

### 5.1 흐름

```
[운영자: /admin/students]
  ↓ "LMS 계정 발급" 버튼 클릭
[server action: inviteStudentToLms(studentId)]
  ↓ assertSuperAdminOrProgramAdmin()
  ↓ generateTempPassword() (24 chars, crypto.randomBytes)
  ↓ supabase.auth.admin.createUser({ email, password: temp, email_confirm: true })
  ↓ INSERT user_profiles (id = auth.user.id, student_id, must_change_password = true, role = 'student')
  ↓ INSERT cohort_memberships (user_id, cohort_id = student.cohort_id, role = 'student')
  ↓ return { email, tempPassword }   ← server action 이 운영자에게 1회 노출. 저장 X
[운영자]
  ↓ 카톡 1:1 또는 이메일로 학생에게 안내 (수동, Wave 1 launch)
  ↓ "https://growthcareer.xyz/ko/auth/login + email + 임시 PW"
[학생 첫 로그인]
  ↓ /auth/login → 성공
  ↓ middleware: user_profiles.must_change_password = true 감지
  ↓ redirect → /auth/change-password (강제)
  ↓ 새 PW 입력 → must_change_password = false
  ↓ /{cohortSlug}/student dashboard 진입
```

### 5.2 권한 가드

`inviteStudentToLms` server action 의 첫 줄:

```ts
async function inviteStudentToLms(studentId: string) {
  await assertSuperAdminOrProgramAdmin();  // CLAUDE.md §7.4 룰
  // ...
}
```

- super_admin = 글로벌
- program admin = `program_memberships` 에서 student 의 cohort 의 program_id 와 매칭 시
- viewer / instructor / student 는 invite 호출 불가

### 5.3 임시 PW 정책

- 24 chars, `crypto.randomBytes(18).toString('base64url')` (alphanumeric + `-_`)
- DB 에 plaintext 저장 금지 — Supabase Auth 가 bcrypt hash. server action return 시 1회 노출
- must_change_password = true 일 때 모든 protected route 에서 /auth/change-password redirect
- 비밀번호 변경 후 must_change_password = false

### 5.4 알림 채널 (Wave 1 launch = manual)

- **Wave 1**: 운영자가 server action 결과 (email + temp PW) 를 받아서 카톡 1:1 또는 이메일로 직접 전송
- **Wave 2+**: 자동 발송 (이메일 우선, 알림톡 옵트인 추가)

이유: 자동 발송은 추가 외부 의존 (이메일 서비스 / 알림톡 API) + temp PW 가 평문으로 transit. Wave 1 의 11명은 운영자가 1:1 채팅 보유 → manual 이 더 안전 + 비용 0.

### 5.5 onboarding 페이지 흐름

`/[locale]/fan-to-pro/(lms)/[cohortSlug]/student` = 학생 dashboard. 진입 시:
- 본인 lecture_materials 목록 (visibility 기반)
- 본인 career profile 완성도 banner ("정보 N% 완성")
- 본인 career documents (resume / cover_letter / portfolio) link
- next session 시각 + 강의장

---

## 6. 결정 5 — 강사 Access 정책 (1기 한정 / 2기+ 분기)

### 6.1 1기 한정 (Wave 1 launch)

- 강사 자료 upload **= 운영자가 대신** (단순, 안전)
  - 운영자가 강사로부터 자료 받아 `/admin/cohorts/{id}/materials` 페이지에서 upload
- 강사 access **= 본인 dogfooding 만** (노아 본인 강사 계정으로 학생 flow 검증)
- 강사 surface 정식 운영 X

### 6.2 Why 1기 한정

- 강사 2명. upload UI 강사용 build = 9일 안에 risk
- 강사가 student career 열람하면 권한 / 컨센트 / 안내 흐름 추가 필요 → 9일 박스 초과
- 운영자 = 노아 1명. 자료 30개 / 기수 = 운영자가 직접 OK

### 6.3 2기+ (Wave 2+)

- 강사 본인 자료 upload (cohort_memberships.role = 'instructor' 기반 RLS)
- 강사 본인 cohort 학생 career profile + documents 열람
- 강사 본인 회차 출결 mark
- 강사 본인 정산 내역 열람 (Wave 3)

### 6.4 1기 → 2기 마이그레이션

- entity / RLS / use case 는 본 ADR 에 이미 정의 (instructor 정책 포함)
- `cohort_memberships.role = 'instructor'` 인 user_profiles 에 invite 발송만 추가
- 코드 변경 = `inviteInstructorToLms` server action 1개 + 강사 surface route 3~4개

---

## 7. 마이그레이션 Plan

### 7.1 순서 (단일 PR 권장 — 하나의 commit으로 atomic)

```
1. supabase/migrations/20260625_lecture_materials.sql
   - lecture_materials table + RLS
   - storage bucket lecture-materials 생성 + storage RLS
2. supabase/migrations/20260625_student_career_profile.sql
   - student_career_profiles + 4 child tables + RLS
3. domain/entities/lecture-material.ts + career-profile.ts (+ child VO)
4. application/use-cases/material/* + career-profile/*
5. infrastructure/supabase/repositories/lecture-material-repo.ts + career-profile-repo.ts
6. interface/server-actions/admin/lecture-materials.ts + student/career-profile.ts
7. /admin/cohorts/[id]/materials 페이지 (super_admin)
8. /{cohortSlug}/student dashboard 확장 — materials list + career profile entry
9. /{cohortSlug}/student/career-profile 페이지 (학생 본인)
10. inviteStudentToLms server action + /admin/students/[id] 의 "LMS 계정 발급" 버튼
```

### 7.2 1기 데이터 무관 (ADR 0010 그대로)

- applicants 테이블 변경 0
- students 테이블 컬럼 추가 0 (career profile 은 별도 table)
- cohorts / sessions / cohort_memberships / user_profiles 컬럼 추가 0
- 신규 table 6 + 신규 bucket 1 추가만

### 7.3 Rollback

마이그레이션 실패 시:
```sql
-- 역순
drop table student_external_links cascade;
drop table student_certifications cascade;
drop table student_experiences cascade;
drop table student_education_history cascade;
drop table student_career_profiles cascade;
drop table lecture_materials cascade;
-- storage bucket: lecture-materials 삭제 (대시보드 또는 SQL)
```

신규 entity 만 drop → 기존 운영 영향 0. Sage critical 확인 항목.

### 7.4 검증 (supabase-verify.mjs 확장)

```js
// tools/supabase-verify.mjs 에 추가
async function verifyLectureMaterials() {
  // INSERT (super_admin) → SELECT (cohort student, visibility=published) → OK
  // SELECT (cohort student, visibility=draft) → 0 rows (RLS)
  // SELECT (non-cohort user) → 0 rows
}
async function verifyCareerProfile() {
  // 본인 INSERT → SELECT 본인 → OK
  // 본인 INSERT → 다른 학생 SELECT → 0 rows
  // super_admin SELECT 모두 → 모두 OK
}
```

---

## 8. 위험 + 대응 (9일 박스)

| 위험 | 영향 | 대응 |
|---|---|---|
| 학생 11명 동시 invite 시 임시 PW 누설 | 계정 탈취 | manual 카톡 1:1 + 첫 로그인 PW 강제 변경 |
| 자료 1GB 업로드 시 timeout | 운영자 UX 실패 | Vercel Function 타임아웃 = `maxDuration: 60` + chunked upload는 Wave 2. 1기는 운영자가 외부 압축 후 < 500MB upload |
| signed URL 만료 (60초) 동안 다운로드 미완 시 실패 | 학생 UX 실패 | TTL = 5분 (300초) 로 launch. download 시작 직후 만료 무관 |
| career profile schema 변경이 잦아짐 | refactor 비용 | parent.extras jsonb 사용. 3회 반복 시 child 또는 column 으로 graduate (CLAUDE.md 추상화 룰) |
| RLS 정책 누락으로 다른 cohort 학생이 자료 다운 | PII / 자산 누설 | Sage critical 검토 + supabase-verify.mjs 자동 검증 |
| Supabase Storage egress 폭증 | 비용 spike | egress monitor + R2 migration trigger 명시 (결정 3.2) |
| 강사가 1기 한정인데 우연히 student dashboard 접근 | route 오류 | middleware 가 `cohort_memberships.role` 기반 라우팅. 강사는 instructor surface deferred → 임시 "Wave 2 준비 중" 페이지 노출 |
| Echo 비용 시뮬레이션이 R2 권장 | 결정 3 재확인 | 본 ADR 결정 3 의 trigger 조건 사전 명시 → Wave 2 launch 후 검토 |

---

## 9. "1년 뒤 바뀌어야 한다면 어디?" — Locality 검증

| 변경 | 손대는 곳 |
|---|---|
| Storage 를 R2 로 swap | `infrastructure/supabase/repositories/lecture-material-repo.ts` 의 `issueDownloadUrl` + `uploadMaterial` 2함수만. domain / use case / RLS 메타 무관 |
| career profile 필드 추가 (예: salary expectation) | parent.extras jsonb 에 키 추가 → 사용 잦아지면 column graduate |
| 강사 자체 upload 활성화 (Wave 2) | RLS 의 INSERT 정책 1줄 + invite use case 1개 추가 |
| 다운로드 audit 도입 | 신규 table `material_downloads` + `issueDownloadUrl` 안에 1줄 |
| Cohort 다중 instructor 화 | RLS 정책 이미 `role = 'instructor'` 기반 → 변경 0 |
| 강의 자료 카테고리 추가 (예: 'quiz') | DDL alter check constraint 1줄 |

### 결합도 약한 곳

- domain entities = pure (Storage / Auth 모름)
- use cases = repository interface 모름 (concrete function 만 알지만 단일 함수 swap 가능 — ADR 0005)
- RLS = SQL 한 곳 집중 (분산 X)

### 결합도 강한 곳 (의도적)

- `lecture_materials.cohort_id` + `cohort_memberships.cohort_id` = cohort 가 사라지면 자료 무의미. ON DELETE RESTRICT 로 강결합 유지
- `student_career_profiles.student_id` PK = cascade. 학생 promote 취소 시 cleanup 자동

---

## 10. Rejected Alternatives

### 10.1 단일 jsonb 컬럼 career profile

- **거부**: schema 불명확 + 검색 / 보고서 비용 ↑. 3기+ 100명 시점 갉아먹음
- Parent + child + extras jsonb 의 hybrid 가 균형

### 10.2 career_documents 와 career_profile 통합 (단일 entity)

- **거부**: 라이프사이클 / 권한 / 파일 크기 모두 다름. 통합 시 RLS 정책 복잡도 ↑

### 10.3 lecture_materials 와 career_documents bucket 공유

- **거부**: file_size_limit 분기 필요 + RLS 정책 합성 복잡 + 비용 추적 분리 어려움

### 10.4 Cloudflare R2 도입 (Wave 1)

- **거부 (Wave 1 한정)**: 9일 박스 + 통합 복잡도 + Supabase Storage RLS reuse 손실
- Wave 2+ 재검토 (trigger 조건 명시)

### 10.5 학생 자동 가입 (회원가입 페이지)

- **거부**: ADR 0008 의 invite-only 정책. 학생 신원 검증 부재 시 spam / fraud risk
- Manual invite + must_change_password 가 9일 박스 + 보안 양립

### 10.6 자동 알림 발송 (Wave 1)

- **거부 (Wave 1)**: 이메일 서비스 + 알림톡 API 통합 = 박스 초과. 11명 = manual 더 효율
- Wave 2+ 도입 (옵트인 알림톡 권장)

### 10.7 강사 surface 1기 정식 운영

- **거부**: UI / 권한 / 컨센트 / 안내 = 9일 박스 초과. 1기는 운영자 대행 + 노아 dogfooding 으로 충분

### 10.8 다운로드 audit table (Wave 1)

- **거부 (Wave 1)**: row 폭증 + 사용 사례 3회 미충족. server log stdout 로 충분
- Wave 1 회고에서 도입 여부 결정

### 10.9 lecture_materials.visibility = 단일 boolean

- **거부**: 강의 전 미리 공개 (scheduled) 와 즉시 공개 (published) 의 UX 가 다름. 4-state 가 표현력 ↑

### 10.10 cohort 외 cross-cohort 자료 공유 (template / 라이브러리)

- **거부 (Wave 1)**: 3회 반복 사용 사례 미관찰. 자료 중복 upload 가 더 단순 (11명 / 자료 30개)
- 2기 운영 후 사용 패턴 보고 도입

---

## 11. 후속 작업

- **Aria**: 본 ADR + Echo 리서치 기반 9일 로드맵 / Wave 분해 (D-by-D)
- **Echo**: Supabase Pro vs R2 비용 시뮬레이션 + Korea egress benchmark
- **Iris**: 마이그레이션 + repository + use case 구현
- **Luna**: 학생 dashboard + career profile form + admin materials 페이지
- **Sage**: RLS 정책 critical 검토 + signed URL TTL + temp PW 흐름 + invite flow IDOR
- **Mira**: supabase-verify.mjs 확장 + 학생 invite → 로그인 → 다운로드 시나리오 PASS
- **Vera**: bucket 생성 + RLS 적용 + env 변수 + Wave 1 deploy

---

## 12. 참조

- ADR 0005 — LMS 클린 아키텍처 (Layered Pragmatic + Strangler Fig)
- ADR 0006 — LMS 디자인 시스템 (라이트 + 토스 톤)
- ADR 0008 — URL + Auth 분리
- ADR 0010 — applicants 영구 불변 + LMS additive
- CLAUDE.md §7.4 — Production 보호 + 기존 영역 변경 금지
- WORKING-SESSION.md — 1기 운영 상태
- B0037 Wave A+ — career documents 단일 최신본 + Storage bucket + RLS 4종
- docs/research/lms-launch-research.md — Echo 비용 시뮬레이션 (병행 중)
