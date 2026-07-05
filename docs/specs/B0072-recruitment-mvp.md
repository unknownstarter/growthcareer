# B0072 Recruitment MVP Spec v4

**Status**: Draft v4 (Sage 4차 재검토 대기. v3 BLOCK 판정 후 재작업. Case B 삭제 = 스코프 축소)
**Date**: 2026-07-05
**Owner**: Iris (backend) + Luna (frontend) + Sage (security)
**Related**: ADR 0013 (multi-track + recruitment architecture), ADR 0008 (URL/Auth 분리), ADR 0010 (applicants 보존)
**Marker**: [skip-gating: bugfix]. Sage v3 BLOCK 판정 (CRIT 2 + HIGH 4) 후속 fix. **노아 승인 = Option A (Case B 삭제, students only)**.

## v1 → v2 → v3 → v4 변경 로그

### v1 → v2 (2026-07-04 오전)
v1 spec 은 Sage 검토에서 BLOCK 판정 (CRITICAL 5 + HIGH 7 + 권고 7). §7.4 룰상 배포 금지.

주요 재작업:
1. RLS 정책 3 테이블 전면 재작성 (service_role_all + 3분리 policy + WITH CHECK)
2. `LmsUser` type 확장 + role 판정 우선순위 명시 + `user_profiles` CHECK constraint
3. 이력서 접근 = signed URL 5분 TTL + Content-Disposition attachment 만
4. 감사 로그 테이블 (`recruitment_audit_log`) + email 발송 로그 (`recruitment_email_log`) 신설
5. Rate limit 설계 (Upstash Redis)
6. 개인정보처리방침 개정 조항 명시
7. Middleware `parsePath` 에 `partners` kind 확장

### v2 → v3 (2026-07-04 오후)
v2 spec 도 Sage 재검토에서 BLOCK 판정 (CRIT 2 + HIGH 4 + MED 5 + LOW 3). 노아 결정: C-1 = Option A (schema nullable + CHECK). 스코프 확장 X.

주요 재작업 (v3):
1. **C-1**: `student_applications.student_id` nullable + `CHECK (student_id IS NOT NULL OR applicant_id IS NOT NULL)` + UNIQUE(applicant_id, ...) 추가. applicants 지원 매핑 로직 §3 명시 (contact_email 매칭)
2. **C-2**: company UPDATE RLS policy 삭제. authenticated UPDATE grant 없음. 상태 변경은 server action + service_role 만
3. **H-1**: `readApplicantResume` 순서 재작성 (signed URL 성공 후 reviewed_at UPDATE)
4. **H-2**: Storage bucket (student-resumes / companies-logos) RLS SQL 명시 (§8 신규 subsection)
5. **H-3**: `recruitment_audit_log.metadata` 어휘 whitelist + 4KB CHECK + PII 금지 명시
6. **H-4**: Rate limit fail-closed + 회사 이중 key (userId + companyPartnerId)
7. **M-1**: 개인정보처리방침 K-PIPA 조항 보강 (보유기간 3년 + 거부권 + apply modal checkbox)
8. **M-2**: 이력서 MIME whitelist + magic 검증 + CSP 헤더 + IP 해시 audit
9. **M-3**: `logAudit` 트랜잭션 명시 (INSERT + UPDATE 단일 트랜잭션)
10. **M-4**: Middleware partners 분기 lineage 명시 검증 + 마이그레이션 위반 검증 script
11. **M-5**: 세션 timeout 재검토 (access 1h + refresh 7d + idle 30m 서버측 로그아웃)
12. **L-1**: 로고 파일명 = `timestamp + nanoid(8)`
13. **L-2**: Email outbox cron 주기 = `*/1 * * * *` (1분 간격) + SLA 명시
14. **L-3**: `program_admin` 이 자기 프로그램 recruitment_email_log read 허용 (Wave 2)

### v3 → v4 (2026-07-05)
v3 spec 도 Sage 3차 재검토에서 BLOCK 판정 (CRIT 2 + HIGH 4). 노아 결정: **Option A = Case B (applicants 지원) 삭제 = MVP 스코프 = students only**. 승격 흐름은 별도 use case 로 분리.

주요 재작업 (v4):
1. **CRIT 1 (schema drift)**: spec 전체 `applicants.contact_email` → `applicants.email` 통일. 실제 스키마 (`supabase/migrations/20260429000000_applicants.sql:13`) = `email text not null`.
2. **CRIT 2 (Case B 삭제, 노아 승인)**:
   - MVP 스코프 축소 = **students (status='active') only**. applicants (pending/paid) 지원 제거.
   - schema: `student_applications.student_id` = `NOT NULL`. `applicant_id` 컬럼 제거. identity CHECK 제거 (NOT NULL 로 대체). UNIQUE(applicant_id, ...) 제거.
   - RLS 재작성: `p_stu_apps_insert_own` 삭제 → `p_stu_apps_student_insert` (student 만). `p_student_applications_applicant_select` 삭제.
   - `applyToPosting` eligibility check = students.status='active' 만. applicants 매칭 로직 삭제.
   - applicants → students 승격 = 별도 use case (Iris admin promote). MVP 는 노아가 수동 승격.
3. **H-1 (Storage path traversal)**: `student-resumes` bucket RLS 에 `name NOT LIKE '%..%'` CHECK 추가. server action 명시적 path 조립.
4. **H-2 (log_resume_read_atomic 재설계)**: v3 CTE 는 UPDATE 0 row 시 audit 안 남음. plpgsql function 안 status 확인 → UPDATE → INSERT 로 재구성. exception 시 caller 가 signed URL 폐기.
5. **H-3 (idle timeout race + API route 우회)**: last_activity_at 갱신은 `/api/heartbeat` beacon 으로 분리 (middleware read-only). server action 안 `assertCompanyUser` 가 idle 검증 포함 (API route 우회 방어). `last_activity_at IS NULL` = 첫 request → now() 세팅.
6. **H-4 (RLS SECURITY DEFINER)**: Case B 삭제로 applicants 참조 자체 소멸 → subquery 성능 이슈 자동 해결. `user_profiles` subquery 는 그대로 유지 (Postgres planner index 활용).
7. **MED (CSP)**: `Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://*.supabase.co; frame-ancestors 'none'` 명시.
8. **retention 정책**: audit_log 5년 후 자동 파기 (PIPA 삭제 요청 대응). cron job 정의.
9. **middleware profile SELECT 통합**: `supabase.auth.getUser()` 뒤 profile fetch 통합 (성능 개선).

---

## 1. 배경

Growth Career = 외국인 대상 기수제 직무 교육 + 채용 연계. 1기 종강 (7/19) 직전, 유니온픽처스 파트타임 공고 (`docs/share/20260704_union_jd_for_part-time.md`) 즉시 활용 목표.

핵심 가치 명제: 파트너 회사에게 "실제로 우리가 교육한 검증된 외국인 인재풀" 접근.

## 2. 목표

- 노아가 admin 에 회사 회원 승인 + JD 큐레이션
- 회사 담당자 로그인 → 자기 회사 JD CRUD + 지원자 이력서 열람 + 인터뷰 결정
- 학생 로그인 → 채용 탭 → JD 리스트 → 원클릭 지원 (기존 이력서 재사용) → 진행 트래킹

## 3. 스코프

### 포함 (MVP, v4)

- 신규 4th role `company_user` (auth 확장)
- 3 URL 계열 (partners / student jobs / admin recruitment)
- 3 신규 테이블 (companies_partners / job_postings / student_applications)
- 2 신규 부수 테이블 (recruitment_audit_log / recruitment_email_log)
- **지원 자격 = students (status='active') only** (v4: Case B applicants 지원 삭제, Sage 승인)
- PII 전체 열람 (회사) + 이력서 signed URL 다운로드 전용 (5분 TTL)
- 학생 취소: review 전만
- 알림: 지원 시 회사 email + 결정 시 학생 email (email body PII 최소화)
- Rate limit (Upstash Redis)
- 감사 로그 (모든 열람/상태 변경 이벤트)
- Idle timeout (회사 30분, `/api/heartbeat` beacon 기반)

### 3.1 지원 자격 = students only (v4 Case B 삭제)

**MVP 지원 자격**: `students.status = 'active'` **only**.

v3 는 applicants (pending/paid) 도 직접 지원 가능하게 설계했으나 Sage 3차 검토에서 다음 문제 지적:
- `applicants.email = auth.jwt().email` 매칭은 이메일 소유권 검증만으로는 무단 claim 방어 부족 (기존 applicants row 를 새 auth.users 로 hijack 가능)
- `email_confirmed_at IS NOT NULL` 조건 붙여도 magic link 자동 confirm 만족 → 여전히 우회 위험
- RLS INSERT WITH CHECK Case A/B 분기 자체가 attack surface 증가

**v4 결정 (노아 승인)**: MVP 는 승격 완료된 학생만 지원. applicants → students 승격은 **별도 use case** 로 처리 (§3.2 참조).

**지원 시점의 신원 매핑** (`applyToPosting` 안, v4):

1. `auth.uid()` → `user_profiles.student_id` 확인
2. `student_id IS NULL` → `throw ineligibleForApplication` (학생 아님)
3. `students WHERE id = student_id AND status = 'active'` → row 없으면 `throw ineligibleForApplication`
4. 통과 시 `student_applications` INSERT with `student_id` (NOT NULL)

### 3.2 applicants → students 승격 흐름 (별도 use case, MVP 외)

- 노아 (admin) 가 `/admin/students/new` 에서 applicants row 를 선택 → students 로 승격 (기존 B0069 enrollment 흐름)
- 승격 시 `applicants.status = 'enrolled'` + `students` row 생성 + `user_profiles.student_id` 채움
- 승격 후 학생이 `/[cohortSlug]/student/jobs` 접근 가능
- Wave 2 에서 학생 self-service 승격 UX 검토 (지금은 admin 수동)

### 제외 (미래 iterate)

- applicants 직접 지원 (v4 삭제. 승격 필수)
- PII 마스킹 정책 (지금은 파트너 회사 전체 열람. 학생 동의 필수)
- 매칭 알고리즘 (지금은 학생이 직접 지원, filter 만)
- Nova AI (rule-based 도 안 함)
- 회사 회원 자동 가입 (승인제만)
- 카톡 알림 (email 만)
- 이력서 브라우저 프리뷰 (다운로드만)

## 4. 데이터 모델

### 4.1 신규 테이블 (3 + 2)

#### `companies_partners`

파트너 회사. 강사 회사 `companies` 와 분리 (강사 = 정산 대상, 파트너 = 학생 취업 대상).

```sql
CREATE TABLE companies_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id),
  name text NOT NULL,
  biz_no text,
  industry text,
  size_bucket text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  logo_path text,
  description text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','inactive','rejected')),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_companies_partners_program_status ON companies_partners(program_id, status);
CREATE INDEX idx_companies_partners_contact_email ON companies_partners(contact_email);
```

- **status 흐름**: `pending` (invite 후) → `active` (super_admin 승인) → `inactive` / `rejected`
- **PII**: contact_name / contact_email / contact_phone 은 super_admin + 본인 회사 담당자만 열람

#### `job_postings`

JD.

```sql
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_partner_id uuid NOT NULL REFERENCES companies_partners(id) ON DELETE CASCADE,
  title text NOT NULL,
  role_category text NOT NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('full_time','part_time','internship','contract','freelance')),
  location text,
  remote_ok boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  requirements text,
  benefits text,
  salary_range text,
  published_at timestamptz,
  closes_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_postings_company_status ON job_postings(company_partner_id, status);
CREATE INDEX idx_job_postings_status_published ON job_postings(status, published_at DESC);
```

- **status 흐름**: `draft` → `open` (published_at 채워짐) → `closed`
- **자동 close 처리**: `closes_at` 은 query filter 로 (RLS policy 에서 빼면 planner 안정 + client-side timestamp 조작 방지). Sage C-3 반영.

#### `student_applications` (v4: Case B 삭제, students only)

승격 완료된 학생이 JD 에 지원. `student_id` NOT NULL.

```sql
CREATE TABLE student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,  -- v4: NOT NULL
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','under_review','interview','offer','hired','rejected','withdrawn')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  current_stage_notes text,
  student_message text,
  CONSTRAINT student_applications_student_posting_uk UNIQUE(student_id, job_posting_id)
);

CREATE INDEX idx_student_applications_student ON student_applications(student_id, applied_at DESC);
CREATE INDEX idx_student_applications_posting ON student_applications(job_posting_id, status);
```

- **status 흐름**: `applied` → `under_review` → `interview` / `offer` / `hired` / `rejected`. 학생 자발 취소 = `withdrawn`.
- **취소 컷오프**: `reviewed_at IS NULL` 인 경우만 학생 자발 `withdrawn` 가능 (원자적 UPDATE 로 보장, §8.6).
- **v4 삭제 컬럼/제약**: `applicant_id` (컬럼 자체 없음), `student_applications_identity_chk` (student_id NOT NULL 로 대체), `student_applications_applicant_posting_uk` (applicant_id 없으므로 불필요).
- **v4 승격 후 재지원**: applicant 로 landing 에 등록 → admin 이 students 로 승격 → 학생이 지원. 이 흐름 완료 후 지원. 승격 이전 지원은 원천 불가.

#### `recruitment_audit_log` (권고 2 반영)

모든 채용 관련 열람/상태 변경 이벤트 감사 로그.

```sql
CREATE TABLE recruitment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  actor_role text NOT NULL CHECK (actor_role IN ('super_admin','program_admin','company_user','student','system')),
  action text NOT NULL CHECK (action IN (
    'resume_read',
    'application_status_changed',
    'posting_published',
    'posting_closed',
    'posting_created',
    'posting_updated',
    'company_approved',
    'company_rejected',
    'company_invited',
    'application_withdrawn',
    'application_created'
  )),
  application_id uuid REFERENCES student_applications(id) ON DELETE SET NULL,
  posting_id uuid REFERENCES job_postings(id) ON DELETE SET NULL,
  company_partner_id uuid REFERENCES companies_partners(id) ON DELETE SET NULL,
  ip_hash text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_metadata_size_chk CHECK (octet_length(metadata::text) < 4096)
);

CREATE INDEX idx_recruitment_audit_created ON recruitment_audit_log(created_at DESC);
CREATE INDEX idx_recruitment_audit_actor ON recruitment_audit_log(actor_user_id, created_at DESC);
CREATE INDEX idx_recruitment_audit_application ON recruitment_audit_log(application_id, created_at DESC);
```

- **action 어휘 whitelist (Sage H-3)**: 위 CHECK constraint 로 강제. 새 이벤트 종류는 마이그레이션으로 추가.
- **metadata jsonb 어휘 whitelist** (application layer 강제, DB 강제 X 이유는 jsonb 값 형태 다양성 허용):
  - `action_kind` (필수): action 컬럼 그대로 복제 (join 없이 metadata 로 filter 가능)
  - `old_status` (선택): status_changed 시 이전 값
  - `new_status` (선택): status_changed 시 새 값
  - `reason` (선택): rejected/withdrawn 시 사유 (자유 텍스트 max 500자)
- **metadata 크기 CHECK**: `octet_length(metadata::text) < 4096` (4KB). 임의 payload 폭주 방지.
- **PII 저장 금지** (Sage H-3 강조): metadata / action / user_agent 어디에도 학생 실명·이메일·전화·이력서 URL·주민번호 저장 금지. `application_id` / `posting_id` / `company_partner_id` FK 로 join 하여 조회.
- **ip_hash**: raw IP 는 저장 안 함. `sha256(ip + env.AUDIT_IP_SALT)` 로 해시. IP 자체 K-PIPA 상 개인정보 취급.
- **접근**: super_admin + program_admin 만 조회 (§16 관리 UI).
- **v4 retention 정책 (PIPA 삭제 요청 대응)**:
  - 5년 지난 audit_log row 는 자동 파기.
  - Cron job: `/api/cron/recruitment-audit-retention` (매일 03:00 UTC 실행).
  - SQL: `DELETE FROM recruitment_audit_log WHERE created_at < now() - interval '5 years'`
  - 파기 실행 자체는 audit_log 안 남기지 않음 (self-reference 무한 루프 방지). Sentry 로그로만 관측.
  - **PIPA 삭제 요청 개별 대응**: 학생/회사가 삭제 요청 시 super_admin 이 `/admin/recruitment/audit` 에서 해당 actor_user_id 관련 row 삭제 UI 제공 (Wave 2). MVP 는 supabase SQL Editor 로 직접 처리.

#### `recruitment_email_log` (Sage H-7 반영)

Email 발송 outbox. 트랜잭션 밖에서 발송 (retry + delivery status tracking).

```sql
CREATE TABLE recruitment_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES student_applications(id) ON DELETE SET NULL,
  posting_id uuid REFERENCES job_postings(id) ON DELETE SET NULL,
  company_partner_id uuid REFERENCES companies_partners(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'application_received_to_company',
    'application_status_changed_to_student',
    'company_approved_to_company',
    'company_rejected_to_company',
    'company_invited_to_company'
  )),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_template_key text NOT NULL,
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending','sent','failed','retrying')),
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_email_status ON recruitment_email_log(delivery_status, created_at) WHERE delivery_status IN ('pending','retrying');
CREATE INDEX idx_recruitment_email_created ON recruitment_email_log(created_at DESC);
```

- **outbox pattern**: server action 은 이 테이블에 INSERT 만 (트랜잭션 안). cron / worker 가 pending → send → sent 로 상태 전이.
- **접근**: super_admin 만 조회 (내부 관측용).

### 4.2 기존 테이블 확장 (`user_profiles`)

**Step 0 — 마이그레이션 전 위반 검증 (Sage M-4)**:

기존 `user_profiles` row 가 `student_id + instructor_id` 이미 함께 non-null 인 경우 CHECK 추가 시 마이그레이션 실패. 사전 검증 script:

```sql
-- 마이그레이션 파일 상단 DO block. CHECK 추가 전 위반 row 찾기.
DO $$
DECLARE
  violator_count integer;
BEGIN
  SELECT count(*) INTO violator_count
  FROM user_profiles
  WHERE (
    (CASE WHEN student_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN instructor_id IS NOT NULL THEN 1 ELSE 0 END)
  ) > 1;

  IF violator_count > 0 THEN
    RAISE EXCEPTION 'CHECK violation: % row(s) have both student_id AND instructor_id. Resolve first.', violator_count;
  END IF;
END $$;
```

**Step 1 — 컬럼 추가 + CHECK**:

```sql
ALTER TABLE user_profiles
  ADD COLUMN company_partner_id uuid REFERENCES companies_partners(id);

-- 권고 1: CHECK constraint 로 lineage 상호배타 강제 (Sage C-4).
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_lineage_exclusive_chk
  CHECK (
    (
      (CASE WHEN student_id IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN instructor_id IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN company_partner_id IS NOT NULL THEN 1 ELSE 0 END)
    ) <= 1
  );

CREATE INDEX idx_user_profiles_company_partner ON user_profiles(company_partner_id)
  WHERE company_partner_id IS NOT NULL;
```

- **의도**: 한 user 는 student / instructor / company_user 중 최대 하나만. is_super_admin 은 별도 (겸직 가능하지만 실무상 super_admin 은 별도 계정 권장).
- **super_admin 겸직 이슈**: role 판정 우선순위로 처리 (§5.1); DB 에서 강제하진 않음.
- **위반 발견 시 처리**: DO block 이 exception → 마이그레이션 rollback. 노아 + Iris 수동으로 위반 row 정리 (일반적으로 old test data 이거나 마이그레이션 에러). 정리 후 재실행.

### 4.3 RLS 정책 (전면 재작성; Sage C-1, C-2, C-3, H-3 반영)

기존 pattern (`20260622000002_lms_rls_policies.sql`) 재사용. 각 신규 테이블마다 `service_role_all` + role 별 policy + `WITH CHECK`.

#### `companies_partners`

```sql
ALTER TABLE companies_partners ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON companies_partners FROM anon, authenticated;
GRANT ALL ON companies_partners TO service_role;
GRANT SELECT, UPDATE ON companies_partners TO authenticated;

-- service_role 완전 access (server action 진입점).
CREATE POLICY service_role_all ON companies_partners
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- super_admin: 전체 read/write.
CREATE POLICY p_companies_partners_super_admin_all ON companies_partners
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid() AND up.is_super_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid() AND up.is_super_admin = true
    )
  );

-- program admin: 자기 프로그램 read only.
CREATE POLICY p_companies_partners_program_admin_read ON companies_partners
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM program_memberships pm
       WHERE pm.user_id = auth.uid()
         AND pm.role = 'admin'
         AND pm.program_id = companies_partners.program_id
    )
  );

-- company_user: 자기 회사 read.
CREATE POLICY p_companies_partners_company_user_read ON companies_partners
  FOR SELECT
  USING (
    id IN (
      SELECT company_partner_id FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
  );

-- company_user: 자기 회사 update (status='active' 인 경우만).
CREATE POLICY p_companies_partners_company_user_update ON companies_partners
  FOR UPDATE
  USING (
    status = 'active' AND
    id IN (SELECT company_partner_id FROM user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    status = 'active' AND
    id IN (SELECT company_partner_id FROM user_profiles WHERE id = auth.uid())
  );
```

#### `job_postings`

```sql
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_postings FROM anon, authenticated;
GRANT ALL ON job_postings TO service_role;
GRANT SELECT, INSERT, UPDATE ON job_postings TO authenticated;

CREATE POLICY service_role_all ON job_postings
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY p_job_postings_super_admin_all ON job_postings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );

CREATE POLICY p_job_postings_program_admin_read ON job_postings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM program_memberships pm
       JOIN companies_partners cp ON cp.program_id = pm.program_id
       WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
         AND cp.id = job_postings.company_partner_id
    )
  );

-- company_user: 자기 회사 posting 만 CRUD.
CREATE POLICY p_job_postings_company_user_all ON job_postings
  FOR ALL
  USING (
    company_partner_id IN (
      SELECT company_partner_id FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_partner_id IN (
      SELECT company_partner_id FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
  );

-- student: status='open' + program scope 일치 read only (Sage C-3).
-- closes_at 은 여기서 빼고 query 필터로 처리 (planner 안정 + timestamp 조작 방지).
CREATE POLICY p_job_postings_student_read_open ON job_postings
  FOR SELECT
  USING (
    status = 'open' AND
    EXISTS (
      SELECT 1
        FROM cohort_memberships cm
        JOIN cohorts c ON c.id = cm.cohort_id
        JOIN companies_partners cp ON cp.program_id = c.program_id
       WHERE cm.user_id = auth.uid()
         AND cm.role = 'student'
         AND cp.id = job_postings.company_partner_id
         AND cp.status = 'active'
    )
  );
```

#### `student_applications` (v4: Case B 삭제, students only)

```sql
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON student_applications FROM anon, authenticated;
GRANT ALL ON student_applications TO service_role;

-- v4: authenticated 는 SELECT + INSERT 만. UPDATE / DELETE 는 service_role 만.
GRANT SELECT, INSERT ON student_applications TO authenticated;

CREATE POLICY service_role_all ON student_applications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY p_student_applications_super_admin_read ON student_applications
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );

-- v4: student 본인 지원만 SELECT.
CREATE POLICY p_stu_apps_student_select ON student_applications
  FOR SELECT
  USING (
    student_id = (SELECT student_id FROM user_profiles WHERE id = auth.uid())
  );

-- v4: INSERT = student 본인만. status='applied' 강제.
-- v3 의 Case A/B 분기 삭제. Case A (student 만) 만 남김.
CREATE POLICY p_stu_apps_student_insert ON student_applications
  FOR INSERT
  WITH CHECK (
    status = 'applied'
    AND student_id = (SELECT student_id FROM user_profiles WHERE id = auth.uid())
  );

-- authenticated UPDATE 정책 없음.
-- 학생 withdraw / 회사 status 변경 = server action + service_role 로만.

-- company_user: 자기 회사 posting 의 지원 SELECT.
CREATE POLICY p_stu_apps_company_select ON student_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_postings jp
       JOIN user_profiles up ON up.company_partner_id = jp.company_partner_id
       WHERE jp.id = student_applications.job_posting_id
         AND up.id = auth.uid()
    )
  );
```

**v4 재확인**:
- `GRANT UPDATE ON student_applications TO authenticated` 없음. `SELECT, INSERT` 만.
- 학생 withdraw = server action `withdrawApplication` → service_role → 원자적 UPDATE.
- 회사 status 변경 = server action `updateApplicationStatus` → service_role → 원자적 UPDATE + audit.
- **CI check** (`scripts/check-no-grant-update.mjs`): 마이그레이션 파일 grep 으로 `GRANT UPDATE ... student_applications ... TO authenticated` 존재 시 CI 실패.
- **v4 attack surface 감소**: `applicants` join 완전 제거. subquery 는 `user_profiles.student_id` 만. Postgres planner index (idx_user_profiles_student_id) 활용 가능.
- **v4 Sage 확인 요망**: `p_stu_apps_student_insert` 안 subquery `SELECT student_id FROM user_profiles WHERE id = auth.uid()` 가 RLS re-check 순환 참조 없는지 (user_profiles 는 별도 RLS 적용, auth.uid() 로 self-select 만 허용됨).

#### `recruitment_audit_log`

```sql
ALTER TABLE recruitment_audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON recruitment_audit_log FROM anon, authenticated;
GRANT ALL ON recruitment_audit_log TO service_role;
GRANT SELECT ON recruitment_audit_log TO authenticated;

CREATE POLICY service_role_all ON recruitment_audit_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY p_recruitment_audit_super_admin_read ON recruitment_audit_log
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );

CREATE POLICY p_recruitment_audit_program_admin_read ON recruitment_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM program_memberships pm
       WHERE pm.user_id = auth.uid() AND pm.role = 'admin'
       AND (
         (application_id IS NOT NULL AND application_id IN (
           SELECT sa.id FROM student_applications sa
            JOIN job_postings jp ON jp.id = sa.job_posting_id
            JOIN companies_partners cp ON cp.id = jp.company_partner_id
            WHERE cp.program_id = pm.program_id
         )) OR
         (posting_id IS NOT NULL AND posting_id IN (
           SELECT jp.id FROM job_postings jp
            JOIN companies_partners cp ON cp.id = jp.company_partner_id
            WHERE cp.program_id = pm.program_id
         )) OR
         (company_partner_id IS NOT NULL AND company_partner_id IN (
           SELECT id FROM companies_partners WHERE program_id = pm.program_id
         ))
       )
    )
  );
```

#### `recruitment_email_log`

```sql
ALTER TABLE recruitment_email_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON recruitment_email_log FROM anon, authenticated;
GRANT ALL ON recruitment_email_log TO service_role;

CREATE POLICY service_role_all ON recruitment_email_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- super_admin 만 조회 (내부 관측용).
GRANT SELECT ON recruitment_email_log TO authenticated;
CREATE POLICY p_recruitment_email_super_admin_read ON recruitment_email_log
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );
```

## 5. Auth 4th role

### 5.1 Role 판정 우선순위 (Sage C-4 반영)

`getLmsUser()` 안에서 아래 순서로 판정. 상위 룰에 잡히면 하위 룰 안 봄.

1. `user_profiles.is_super_admin = true` → `super_admin` (겸직 상황도 super_admin 우선)
2. `program_memberships` 에 admin row 존재 → `program_admin`
3. `cohort_memberships` 에 instructor row 존재 → `instructor`
4. `cohort_memberships` 에 student row 존재 → `student`
5. `user_profiles.company_partner_id IS NOT NULL` → `company_user`
6. 위 모두 아님 → `null` 반환 (인증은 됐지만 어떤 role 도 없음 = 로그인 화면으로 유도)

`user_profiles_lineage_exclusive_chk` 제약이 4~5 상호배타 보장. is_super_admin 은 겸직 가능하지만 role 판정에서 최우선.

### 5.2 `LmsUser` type 확장

```typescript
export type LmsRole =
  | 'super_admin'
  | 'program_admin'
  | 'instructor'
  | 'student'
  | 'company_user';  // NEW

export interface LmsUser {
  id: string;
  email: string;
  displayName: string;

  role: LmsRole;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;

  // lineage. 최대 하나만 non-null (CHECK constraint).
  studentId: string | null;
  instructorId: string | null;
  companyPartnerId: string | null;  // NEW

  companyId: string | null;  // 기존 강사용 companies (deprecated 대상, 유지)
}
```

### 5.3 Invite 흐름

기존 `inviteUser` use case 확장:

```typescript
inviteUser({
  email: 'contact@unionpic.net',
  displayName: '유니온픽처스 담당자',
  role: 'company_user',
  companyPartnerId: '<uuid>',  // NEW
  phone: '010-...',
});
```

- Supabase Auth `admin.inviteUserByEmail()` + `user_profiles` INSERT with `company_partner_id`.
- 첫 로그인 시 PW 강제 변경 (기존 `must_change_password` 흐름 재사용).
- redirectTo = `/ko/auth/change-password?next=/ko/partners/dashboard`.

### 5.4 Middleware 확장 (Sage 지적 반영)

`middleware.ts` 갱신 항목:

#### `parsePath` 확장

`ParsedPath` union 에 `partners` kind 추가:

```typescript
type ParsedPath =
  | { kind: "marketing" }
  | { kind: "auth"; subpath: string }
  | { kind: "fan-to-pro-marketing" }
  | { kind: "fan-to-pro-admin" }
  | { kind: "fan-to-pro-cohort"; cohortSlug: string; role: "instructor" | "student" }
  | { kind: "partners"; subpath: string };  // NEW
```

`parsePath` 로직:
```typescript
// /[locale]/partners/*
if (segs[0] === "partners") {
  return { kind: "partners", subpath: segs.slice(1).join("/") };
}
```

#### `handleLms` 확장

```typescript
if (parsed.kind === "partners") {
  // 로그인 필수.
  if (!user) {
    return lmsNoIndex(NextResponse.redirect(
      new URL(`/${locale}/auth/login?next=${req.nextUrl.pathname}`, req.url), 302
    ));
  }
  // v4 Sage 추가 권고: profile SELECT 통합. auth.getUser() 뒤 첫 profile fetch 에 필요한 컬럼 모두 포함 (idle 검증 포함).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("student_id, instructor_id, company_partner_id, is_super_admin, must_change_password, last_activity_at")
    .eq("id", user.id)
    .single();
  if (!profile) return lmsNoIndex(NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url), 302));

  // v3 Sage M-4: 명시적 lineage 검증. company_partner_id 만 있고 student/instructor 는 null 이어야 함.
  const isPureCompanyUser =
    profile.student_id === null
    && profile.instructor_id === null
    && profile.company_partner_id !== null;

  // super_admin 은 lineage 무관하게 partners 진입 허용 (테스트 + 관리 편의).
  const canAccessPartners = isPureCompanyUser || profile.is_super_admin;
  if (!canAccessPartners) {
    // instructor/student/lineage mismatch → 본인 surface 로 redirect.
    return lmsNoIndex(NextResponse.redirect(new URL(await resolveLoggedInDestination(supabase, user.id, locale), req.url), 302));
  }

  // 첫 로그인 PW 변경 강제 (기존 로직 재사용).
  if (profile.must_change_password && !parsed.subpath.startsWith('change-password')) {
    return lmsNoIndex(NextResponse.redirect(new URL(`/${locale}/auth/change-password?next=/${locale}/partners/dashboard`, req.url), 302));
  }

  // v4 Sage H-3: idle 판정 (read-only, UPDATE 안 함). isSuperAdmin 은 skip.
  if (isPureCompanyUser && profile.last_activity_at !== null) {
    const idleMs = Date.now() - new Date(profile.last_activity_at).getTime();
    if (idleMs > 30 * 60 * 1000) {
      await supabase.auth.signOut();
      return lmsNoIndex(NextResponse.redirect(
        new URL(`/${locale}/auth/login?reason=idle_timeout`, req.url), 302
      ));
    }
  }

  return lmsNoIndex(res);
}
```

**Sage M-4 재확인**: CHECK constraint (§4.2) 로 DB 레벨 상호배타 강제. Middleware 는 DB constraint 신뢰하되 방어적 명시 검증 추가 (2중 방어).

#### `resolveLoggedInDestination` 확장

```typescript
// company_user 케이스 추가.
if (profile.company_partner_id) return `/${locale}/partners/dashboard`;
```

### 5.5 PW 정책 + 세션 timeout (v4 Sage H-3 재작성: middleware read-only + heartbeat 분리 + API route 검증 포함)

**PW 정책**:
- Supabase Auth dashboard 최소 요구 = 최소 10자 + 특수문자 1개 + 숫자 1개 (env override 필요 시 문서화)

**세션 timeout**:
- **회사 (company_user)**:
  - Access token: 1시간 (Supabase 기본 JWT expiry)
  - Refresh token: 7일 (Supabase 기본)
  - **Idle timeout: 30분 무활동 시 서버측 로그아웃**
- **학생/강사**: 기존 유지 (access 1h + refresh 7d + idle 안 함)

**v3 문제** (Sage H-3 지적):
1. middleware 안 UPDATE = read-only 원칙 위반. 성능 이슈 + edge case race
2. `last_activity_at IS NULL` fallback 을 `updated_at` 으로 하면 첫 로그인 즉시 idle 판정될 수 있음
3. `/api/*` route 는 middleware 를 우회할 수 있음 (Route Handler config 에 따라). API 안 idle 검증 없으면 PII 열람 API 우회 가능

**v4 재설계**:

**1. Middleware = read-only**. idle 판정만 하고 UPDATE 안 함.

```typescript
// middleware.ts, handleLms 안 partners 분기.
// v4: read-only. UPDATE 는 별도 /api/heartbeat 로.

// v4: last_activity_at IS NULL = 첫 request. now() 로 간주 (idle 판정 skip).
if (profile.last_activity_at !== null) {
  const idleMs = Date.now() - new Date(profile.last_activity_at).getTime();
  const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분

  if (idleMs > IDLE_LIMIT_MS) {
    // 강제 로그아웃.
    await supabase.auth.signOut();
    return lmsNoIndex(NextResponse.redirect(
      new URL(`/${locale}/auth/login?reason=idle_timeout`, req.url), 302
    ));
  }
}
```

**2. Client heartbeat** — `/api/heartbeat` route + `sendBeacon`:

```typescript
// app/api/heartbeat/route.ts (Node runtime, POST only)
export async function POST(req: Request) {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  // v4: last_activity_at IS NULL 이면 첫 세팅. 아니면 30초 넘게 지났을 때만 갱신 (throttle).
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('last_activity_at, company_partner_id')
    .eq('id', user.id)
    .single();

  // company_user 만 갱신 (학생/강사는 idle timeout 없음).
  if (!profile?.company_partner_id) return new Response(null, { status: 204 });

  const shouldUpdate =
    profile.last_activity_at === null
    || Date.now() - new Date(profile.last_activity_at).getTime() > 30_000;

  if (shouldUpdate) {
    await supabase
      .from('user_profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', user.id);
  }
  return new Response(null, { status: 204 });
}

// app/[locale]/partners/**/layout.tsx 안 client component.
'use client';
useEffect(() => {
  const beat = () => navigator.sendBeacon('/api/heartbeat');
  const iv = setInterval(beat, 60_000);  // 1분마다
  beat();  // 즉시 첫 beat
  return () => clearInterval(iv);
}, []);
```

**3. API route 안 idle 검증** — `assertCompanyUser` 안 포함 (server action / API route 모두 우회 불가):

```typescript
// infrastructure/auth/recruitment-role.ts
export async function assertCompanyUser(): Promise<LmsUser> {
  const user = await getLmsUser();
  if (!user) throw new Error('unauthenticated');
  if (user.role !== 'company_user' && user.role !== 'super_admin') {
    throw new Error('forbidden');
  }

  // v4 Sage H-3: idle 검증 포함 (super_admin 은 skip).
  if (user.role === 'company_user') {
    const supabase = getSupabaseServer();
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('last_activity_at')
      .eq('id', user.id)
      .single();

    if (profile?.last_activity_at !== null) {
      const idleMs = Date.now() - new Date(profile.last_activity_at!).getTime();
      if (idleMs > 30 * 60 * 1000) {
        await supabase.auth.signOut();
        throw new Error('idleTimeout');
      }
    }
  }
  return user;
}
```

**마이그레이션 추가** (§4.2 에 함께):
```sql
ALTER TABLE user_profiles
  ADD COLUMN last_activity_at timestamptz;
```

- **Why idle timeout**: 회사 담당자가 학생 이력서 열람 후 세션 방치 시 PII 노출 최소화.
- **학생 idle 안 하는 이유**: 학생은 자기 정보만 보므로 세션 방치 위험 낮음. UX 우선.
- **v4 개선**: middleware read-only 유지 + client heartbeat 분리 + API route 우회 방어.

## 6. URL 3 계열

### 6.1 `/[locale]/partners/*` (회사 담당자)

```
/[locale]/partners/
  login/            → 자동 redirect 처리, 직접 링크는 /auth/login 으로.
  dashboard/        → 자기 회사 요약 (JD 3개 + 지원자 최근 5명 + 승인 상태)
  postings/
    page.tsx        → JD 리스트 (내 회사)
    new/            → JD 등록
    [id]/           → JD 상세 (수정 + 지원자 리스트)
      applicants/   → 지원자 이력서 열람 + status 갱신
  company/          → 회사 정보 편집 (name / logo / description 등)
```

**디자인**: 라이트 톤, Pretendard, Toss 블루 (#3182f6) accent. LMS 컴포넌트 재사용 (Card / Button / Input / Table).

### 6.2 `/[locale]/fan-to-pro/(lms)/[cohortSlug]/student/jobs`

```
/[locale]/fan-to-pro/(lms)/[cohortSlug]/student/jobs/
  page.tsx          → 열린 JD 리스트 (필터: employment_type / remote_ok / role_category)
  [id]/
    page.tsx        → JD 상세 + [지원하기] 버튼
    apply/          → 지원 폼 (선택 메시지 + 이력서 확인 + PII 동의 체크박스)
  applications/     → 본인 지원 목록 + status 트래킹
```

### 6.3 `/[locale]/fan-to-pro/(lms)/admin/recruitment/*`

```
/[locale]/fan-to-pro/(lms)/admin/recruitment/
  page.tsx          → 대시보드 (전체 회사 + JD + 지원 매트릭스)
  companies/
    page.tsx        → 회사 리스트 (승인 대기 + active)
    new/            → 회사 신규 등록 (invite 발송)
    [id]/           → 회사 상세 (승인/거부 + 정보 확인)
  postings/
    page.tsx        → 전체 JD 큐레이션 (feature / hide)
  audit/            → 감사 로그 조회 (§16)
```

## 7. 사용자 흐름

### 7.1 회사 온보딩

1. 노아 (admin) → `/admin/recruitment/companies/new` 접속
2. 회사 정보 입력 (이름 / biz_no / contact_email 등) + `invite` 발송
3. Supabase Auth invite 이메일 → 회사 담당자 클릭 → PW 설정 (최소 10자 + 특수문자 + 숫자) → `/partners/dashboard` 진입
4. 회사가 자기 정보 편집 + 로고 업로드 → 노아에게 승인 요청
5. 노아 → `/admin/recruitment/companies/[id]` → 승인 (status → active)
6. 회사 = JD 등록 가능

### 7.2 JD 등록 → 학생 지원 → 회사 review

**v4 전제**: 지원자 = students.status='active' only. applicants (pending/paid) 는 별도 승격 use case 를 통해 학생이 된 뒤 지원 (§3.2).

1. 회사 → `/partners/postings/new` → JD 작성 (title / description / requirements 등)
2. 저장 → status=draft. publish 버튼 → status=open.
3. 학생 → `/[cohortSlug]/student/jobs` → 리스트 확인 → 상세 진입
4. 학생 [지원하기] → apply modal:
   - 이력서 요약 표시
   - 선택 메시지 입력
   - **필수 체크박스**: "내 개인정보(이름/연락처/국적/비자상태/이력서)를 이 회사에 열람 허용합니다."
5. submit → `applyToPosting` server action → 자격 검증 → INSERT → email outbox INSERT → `recruitment_audit_log` INSERT
6. 회사 → `/partners/postings/[id]/applicants` → 지원자 리스트 확인 → 이력서 열람 (signed URL 5분 TTL) → status 갱신
7. status 갱신 시 email outbox INSERT → 학생 email 로 발송.

### 7.3 학생 지원 취소

- `/[cohortSlug]/student/applications` → 지원 항목 → [취소] 버튼
- 서버: `withdrawApplication(applicationId)` 원자적 UPDATE (Sage H-1)
  - `UPDATE ... SET status='withdrawn' WHERE id=$1 AND reviewed_at IS NULL AND student_id=$2 RETURNING *`
  - rowCount=0 이면 "이미 회사가 확인함 또는 권한 없음" 에러
- 성공 시 `recruitment_audit_log` INSERT.

## 8. Server Actions (use-cases)

모든 mutation 함수는 아래 4 종 가드 함수 중 해당 호출 필수.

### 8.1 표준 가드 함수 (Sage H-6 반영)

`src/programs/fan-to-pro/infrastructure/auth/recruitment-role.ts` 신설.

```typescript
/** company_user 이거나 super_admin. */
export async function assertCompanyUser(): Promise<LmsUser>;

/** 해당 companyPartnerId 를 소유한 company_user 이거나 super_admin. */
export async function assertCompanyUserOwnsPartner(companyPartnerId: string): Promise<LmsUser>;

/** 해당 postingId 의 company 를 소유하거나 super_admin. */
export async function assertCompanyUserOwnsPosting(postingId: string): Promise<LmsUser>;

/** 해당 applicationId 의 posting 의 company 를 소유하거나 super_admin. */
export async function assertCompanyUserOwnsApplication(applicationId: string): Promise<LmsUser>;
```

- 모든 company mutation 함수의 첫 줄에 위 4종 중 하나 호출 필수.
- **CI check**: `application/use-cases/recruitment/company/**/*.ts` 안에 `assertCompany*` 호출 grep 스캔 script 를 pre-commit hook 에 추가.

### 8.2 회사 (company_user)

```typescript
// application/use-cases/recruitment/company/
updateCompanyInfo(companyId, patch)       // assertCompanyUserOwnsPartner
listMyPostings()                          // assertCompanyUser
createPosting(input)                      // assertCompanyUserOwnsPartner(input.companyPartnerId)
updatePosting(postingId, patch)           // assertCompanyUserOwnsPosting
publishPosting(postingId)                 // assertCompanyUserOwnsPosting
closePosting(postingId)                   // assertCompanyUserOwnsPosting
listPostingApplicants(postingId)          // assertCompanyUserOwnsPosting
readApplicantResume(applicationId)        // assertCompanyUserOwnsApplication
updateApplicationStatus(applicationId, nextStatus, notes)  // assertCompanyUserOwnsApplication
```

### 8.3 학생 (student)

```typescript
// application/use-cases/recruitment/student/
listOpenPostings(filter)                  // assertCohortRole (student)
readPostingDetail(postingId)              // assertCohortRole (student) + view_count +1 (원자적 UPDATE)
applyToPosting(postingId, message, piiConsent)  // 아래 §8.4 로직
listMyApplications()                      // getLmsUser (self)
withdrawApplication(applicationId)        // 아래 §8.6 로직
```

### 8.4 `applyToPosting` 자격 검증 (v4: students only)

```typescript
async function applyToPosting(postingId: string, message: string | null, piiConsent: boolean): Promise<Result> {
  const user = await getLmsUser();
  if (!user) throw new Error('unauthenticated');
  if (!piiConsent) throw new Error('piiConsentRequired');

  // v4: students only. student_id 필수.
  if (!user.studentId) throw new Error('ineligibleForApplication');

  await checkApplicationEligibility(user.studentId);

  // Sage 권고: rate limit (§15).
  await enforceStudentApplyRateLimit(user.id);

  // 서버측 INSERT (RLS: student INSERT with status='applied').
  // student_id NOT NULL 강제.
  // ...
  await logAudit({ actor: user, action: 'application_created', applicationId, postingId });
  await enqueueEmail({ kind: 'application_received_to_company', ... });
}
```

`checkApplicationEligibility(studentId)` (v4 재작성):
- `students WHERE id = studentId AND status = 'active'` → row 없으면 `throw ineligibleForApplication`
- v3 applicants 매칭 로직 삭제. applicants 는 승격 완료 (users_profiles.student_id 채움) 후에만 지원 가능.

### 8.5 `readApplicantResume` + `log_resume_read_atomic` RPC 재설계 (v4 Sage H-2)

**v3 문제** (Sage H-2 재지적):
- v3 RPC 는 CTE `WITH updated AS (UPDATE ... WHERE status <> 'withdrawn') INSERT ... SELECT FROM updated` 형태
- UPDATE 가 0 row 반환 (예: withdrawn 상태) 시 INSERT 도 0 row = **audit log 안 남음**
- 반면 signed URL 은 이미 생성됨 → "audit 없이 회사가 이력서 봤음" 상황 가능
- 결과: 감사 부재 = compliance 사고

**v4 재설계** (plpgsql function, status 확인 + UPDATE + INSERT 분리):

```typescript
// server action.
async function readApplicantResume(applicationId: string): Promise<{ signedUrl: string; expiresIn: 300 }> {
  // 1. 권한 검증 + idle 검증 (assertCompanyUser 안 포함, v4 §5.5).
  const user = await assertCompanyUserOwnsApplication(applicationId);

  // 2. Rate limit (fail-closed, 이중 key). v3 Sage H-4.
  const companyPartnerId = user.companyPartnerId ?? await resolveApplicationCompanyPartnerId(applicationId);
  await enforceCompanyResumeReadRateLimit(user.id, companyPartnerId);

  // 3. Resume path 조회 (SELECT 만; UPDATE 안 함).
  const supabase = getSupabaseServer(); // service_role
  const { data: app, error: readErr } = await supabase
    .from('student_applications')
    .select('id, student_id, status, reviewed_at')
    .eq('id', applicationId)
    .single();
  if (readErr) throw readErr;
  if (app.status === 'withdrawn') throw new Error('applicationWithdrawn');

  const resumePath = await resolveResumePath(app);
  if (!resumePath) throw new Error('resumeMissing');

  // 4. Signed URL 생성. 성공 시에만 다음 단계.
  const { data: signed, error: signErr } = await supabase.storage
    .from('student-resumes')
    .createSignedUrl(resumePath, 300, {
      download: `resume-${app.id.slice(0, 8)}.pdf`,  // Content-Disposition: attachment
    });
  if (signErr || !signed?.signedUrl) throw new Error('signedUrlFailed');

  // 5. RPC 안: status 확인 → UPDATE → INSERT 원자적. exception 시 caller 가 signed URL 폐기.
  const ipHash = await hashIp(headers().get('x-forwarded-for'));
  try {
    await supabase.rpc('log_resume_read_atomic', {
      p_application_id: applicationId,
      p_actor_user_id: user.id,
      p_actor_role: user.role,
      p_company_partner_id: companyPartnerId,
      p_ip_hash: ipHash,
      p_user_agent: headers().get('user-agent'),
    });
  } catch (err) {
    // v4: audit 실패 시 signed URL 반환하지 않음. compliance 우선.
    Sentry.captureException(err, { tags: { area: 'recruitment', kind: 'audit_failed' } });
    throw new Error('auditLogFailed');
  }

  return { signedUrl: signed.signedUrl, expiresIn: 300 };
}
```

**RPC 재설계 (v4)**:

```sql
CREATE OR REPLACE FUNCTION log_resume_read_atomic(
  p_application_id uuid,
  p_actor_user_id uuid,
  p_actor_role text,
  p_company_partner_id uuid,
  p_ip_hash text,
  p_user_agent text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_posting_id uuid;
BEGIN
  -- 1. status + posting_id 확인. row lock (FOR UPDATE) 로 race 방어.
  SELECT status, job_posting_id INTO v_status, v_posting_id
    FROM student_applications
   WHERE id = p_application_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'applicationNotFound';
  END IF;

  IF v_status = 'withdrawn' THEN
    RAISE EXCEPTION 'applicationWithdrawn';
  END IF;

  -- 2. UPDATE reviewed_at (COALESCE 로 기존 값 유지).
  UPDATE student_applications
     SET reviewed_at = COALESCE(reviewed_at, now()),
         updated_at = now()
   WHERE id = p_application_id;

  -- 3. INSERT audit log. UPDATE row count 무관하게 INSERT 보장 (v4 fix).
  INSERT INTO recruitment_audit_log (
    actor_user_id, actor_role, action,
    application_id, posting_id, company_partner_id,
    ip_hash, user_agent, metadata
  ) VALUES (
    p_actor_user_id, p_actor_role, 'resume_read',
    p_application_id, v_posting_id, p_company_partner_id,
    p_ip_hash, p_user_agent,
    jsonb_build_object('action_kind', 'resume_read')
  );
END;
$$;

-- 실행 권한.
REVOKE ALL ON FUNCTION log_resume_read_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_resume_read_atomic TO service_role;
```

**Sage H-2 재확인 (v4)**:
- **status 확인 → UPDATE → INSERT 순차**. UPDATE 0 row 이슈 소멸 (v3 CTE 문제).
- **FOR UPDATE row lock**: 동시 read 시 race 방어. 두 회사 담당자가 동시에 열람 시도 → 순차 실행.
- **INSERT 는 UPDATE 결과와 무관하게 실행**. v3 처럼 CTE dependency 없음.
- **exception 발생 시 트랜잭션 전체 rollback**: UPDATE + INSERT 원자성 보장.
- **caller 는 exception 시 signed URL 폐기**: `auditLogFailed` throw = 회사가 URL 못 받음.
- SECURITY DEFINER + search_path 명시: schema hijack 방어.

**Signed URL 재유통 방어**:
- 5분 TTL. 5분 초과 시 401.
- Content-Disposition: attachment (브라우저 렌더 안 함, 다운로드만).
- CSP 헤더 (아래 §8.5.1).

### 8.5.1 CSP 헤더 (v4 Sage MED-2a 명시)

`app/[locale]/partners/**/layout.tsx` (또는 middleware response header) 에 명시:

```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data: https://*.supabase.co; frame-ancestors 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'
```

- **default-src 'self'**: 기본 same-origin 만
- **connect-src 'self' https://*.supabase.co**: Supabase API 호출 허용
- **img-src 'self' data: https://*.supabase.co**: 로고 표시 허용
- **frame-ancestors 'none'**: clickjacking 방어 (X-Frame-Options: DENY 와 동일)
- **object-src 'none'**: `<object>` `<embed>` 차단 (Flash 유물 방어)
- **form-action 'self'**: form submit 을 same-origin 으로 제한

추가 헤더:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

응답 방법: `next.config.js` 안 `headers()` 로 `/partners/*` path 만 매칭. 또는 middleware response 에 setHeader.

### 8.6 `withdrawApplication` 원자적 UPDATE (Sage H-1 반영)

```typescript
async function withdrawApplication(applicationId: string): Promise<Result> {
  const user = await getLmsUser();
  if (!user) throw new Error('unauthenticated');
  if (!user.studentId) throw new Error('notAStudent');

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('student_applications')
    .update({ status: 'withdrawn', updated_at: sql`now()` })
    .eq('id', applicationId)
    .eq('student_id', user.studentId)
    .is('reviewed_at', null)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('cannotWithdraw');  // 이미 reviewed 또는 없음

  await logAudit({ actor: user, action: 'application_withdrawn', applicationId });
}
```

### 8.7 super_admin

```typescript
// application/use-cases/recruitment/admin/
inviteCompanyUser(input)                  // assertSuperAdmin
approveCompany(companyId)                 // assertSuperAdmin
rejectCompany(companyId, reason)          // assertSuperAdmin
listAllCompanies(filter)                  // assertSuperAdmin OR assertProgramAdmin
listAllPostings(filter)                   // assertSuperAdmin OR assertProgramAdmin
featurePosting(postingId)                 // assertSuperAdmin
hidePosting(postingId)                    // assertSuperAdmin
listAuditLog(filter)                      // assertSuperAdmin OR assertProgramAdmin (§16)
```

### 8.8 로고 업로드 (v3 Sage L-1 + M-2 강화)

- Storage bucket: `companies-logos` (public read + authenticated INSERT with prefix check, §8.9 참조)
- Bucket path: `companies-logos/{company_partner_id}/{timestamp}-{nanoid8}.{ext}`
- Server action `uploadCompanyLogo(companyId, file)`:
  1. `assertCompanyUserOwnsPartner(companyId)`
  2. MIME whitelist 검증: `image/png`, `image/jpeg`, `image/webp` 만 (**SVG 금지**; XSS 위험)
  3. **파일 매직 넘버 sniff** (Sage M-2): 클라이언트 MIME header 신뢰 X. 파일 첫 8바이트 읽어 매직 넘버 검증:
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
     - JPEG: `FF D8 FF`
     - WEBP: `52 49 46 46 ... 57 45 42 50`
     - 불일치 시 throw `invalidFileFormat`
  4. 파일 크기 검증: 최대 2MB
  5. **파일명 = `${Date.now()}-${nanoid(8)}.${server-derived-ext}`** (v3 Sage L-1: nanoid 8자 단독 시 충돌 위험. timestamp prefix 로 사실상 unique)
  6. Bucket path prefix 검증 = `companies-logos/${companyId}/` 강제 (server-side + bucket RLS 이중)
  7. 업로드 + `companies_partners.logo_path` UPDATE

### 8.9 Storage bucket RLS SQL (v4 Sage H-1: path traversal 방어)

**`student-resumes` bucket** (private, signed URL only):

```sql
-- Bucket 자체는 private. authenticated read 금지. Signed URL (service_role) 로만.

-- 학생 본인만 자기 prefix 에 INSERT. path = `{student_id}/{filename}`.
-- v4 Sage H-1: path traversal 방어 `name NOT LIKE '%..%'` + 확장자 whitelist.
CREATE POLICY student_resumes_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-resumes'
    AND (storage.foldername(name))[1] IN (
      SELECT student_id::text FROM user_profiles
       WHERE id = auth.uid() AND student_id IS NOT NULL
    )
    -- v4: path traversal 방어. '..' 포함 금지.
    AND name NOT LIKE '%..%'
    -- v4: 파일명 길이 제한.
    AND octet_length(name) < 256
    -- v4: 확장자 whitelist (pdf/docx).
    AND lower(storage.extension(name)) IN ('pdf','docx')
  );

-- authenticated SELECT / UPDATE / DELETE 없음. service_role 만.
CREATE POLICY student_resumes_service_role_all ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'student-resumes')
  WITH CHECK (bucket_id = 'student-resumes');

-- v4: server action `uploadStudentResume` 안 명시적 path 조립 (client-provided name 사용 금지).
-- path = `${studentId}/${timestamp}-${nanoid(8)}.${server-derived-ext}`
-- 예: `550e8400-e29b-41d4-a716-446655440000/1720000000000-a1b2c3d4.pdf`
```

**Server action path 조립 정책** (v4 Sage H-1):

```typescript
// application/use-cases/recruitment/student/uploadStudentResume.ts
async function uploadStudentResume(file: File): Promise<{ path: string }> {
  const user = await getLmsUser();
  if (!user?.studentId) throw new Error('notAStudent');

  // 1. MIME whitelist + magic sniff.
  const buf = Buffer.from(await file.arrayBuffer());
  await assertPdfOrDocxMagic(buf);
  if (buf.byteLength > 5 * 1024 * 1024) throw new Error('fileTooLarge');  // 5MB

  // 2. Server-side path 조립. Client-provided filename 무시.
  const ext = detectExt(buf);  // magic → 'pdf' | 'docx'
  const filename = `${Date.now()}-${nanoid(8)}.${ext}`;
  const path = `${user.studentId}/${filename}`;  // v4: 명시적 조립

  // 3. Path traversal 방어 (server-side 이중 방어. RLS 도 동일 검증).
  if (path.includes('..') || path.includes('\0')) throw new Error('invalidPath');

  const supabase = getSupabaseServer();
  const { error } = await supabase.storage
    .from('student-resumes')
    .upload(path, buf, { contentType: file.type, upsert: false });
  if (error) throw error;

  return { path };
}
```

- **applicant 이력서**: v4 스코프에서 삭제 (Case B 삭제). applicants 는 승격 후 학생 이력서 흐름 사용.

**`companies-logos` bucket** (public read + prefix-restricted INSERT):

```sql
-- Public read (로고는 회사 대시보드에 노출).
CREATE POLICY companies_logos_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'companies-logos');

-- company_user 자기 회사 prefix + 확장자 whitelist + 파일명 길이 제한.
CREATE POLICY companies_logos_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'companies-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_partner_id::text FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
    AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp')
    AND octet_length(name) < 100
  );

-- UPDATE: 기존 로고 교체 (같은 prefix).
CREATE POLICY companies_logos_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'companies-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_partner_id::text FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
  );

-- DELETE: 자기 prefix 만.
CREATE POLICY companies_logos_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'companies-logos'
    AND (storage.foldername(name))[1] = (
      SELECT company_partner_id::text FROM user_profiles
       WHERE id = auth.uid() AND company_partner_id IS NOT NULL
    )
  );

-- service_role 전체.
CREATE POLICY companies_logos_service_role_all ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'companies-logos')
  WITH CHECK (bucket_id = 'companies-logos');
```

**Sage H-2 재확인**:
- `student-resumes` = 학생 본인 INSERT 만 + service_role SELECT (signed URL). authenticated SELECT 없음.
- `companies-logos` = 공개 read + 자기 prefix INSERT/UPDATE/DELETE.
- Prefix check 는 server action + RLS 이중 방어.

## 9. 알림 (email 만, MVP; outbox pattern)

### 9.1 Body 안 PII 최소화 (Sage C-5)

**절대 금지 항목** (email body 안):
- 학생 실명, 국적, 비자 상태, 전화, 이력서 signed URL

**허용 항목**:
- 회사 담당자 이름, 회사 이름
- posting 제목
- posting 상세 페이지 링크 (로그인 필수 페이지)

### 9.2 발송 방법 (outbox pattern; v3 Sage L-2 주기 명시)

1. Server action = `recruitment_email_log` INSERT (delivery_status='pending')
2. **Cron job = `*/1 * * * *` (1분 간격, Vercel Cron)**. `/api/cron/recruitment-email-worker` route:
   - `delivery_status IN ('pending','retrying') AND created_at < now() - interval '5 seconds'` (신규 row race 방지 5초 grace)
   - `attempt_count < 3` 인 row 최대 50개 pull → Resend API 호출
   - 성공 시 `status='sent' + sent_at=now()`, 실패 시 `status='retrying' + attempt_count +=1`
3. `attempt_count >= 3` 이면 `status='failed'`. super_admin 대시보드 alert.
4. 트랜잭션 밖에서 발송 = 롤백 후 유령 이메일 방지 + retry 가능
5. **SLA**: 정상 pending → sent = 1분 이내 (99% 목표). 5분 지연 = super_admin alert. 15분 지연 = 사고.
6. **Idempotency**: `recruitment_email_log.id` 로 Resend `idempotency_key` 전달. Resend 재시도 시 중복 발송 방지.

### 9.3 Email 종류 + body 템플릿

- **application_received_to_company**:
  - to: `companies_partners.contact_email`
  - subject: "새 지원자가 도착했습니다"
  - body: "귀사 [posting 제목] 에 새 지원자가 등록되었습니다. 대시보드에서 확인해 주세요. [로그인 링크]"
- **application_status_changed_to_student**:
  - to: 학생 `user_profiles.email`
  - subject: "지원 상태가 업데이트되었습니다"
  - body: "지원하신 공고 상태가 [status] 로 변경되었습니다. 자세한 내용은 대시보드에서 확인해 주세요. [로그인 링크]"
- **company_approved_to_company**: "Growth Career 파트너 승인 완료"
- **company_rejected_to_company**: "가입 검토 결과 안내"
- **company_invited_to_company**: "Growth Career 파트너 초대"

## 10. 시각 검증 (Luna)

- `/[locale]/partners/dashboard` 캡처
- `/[locale]/partners/postings/[id]/applicants` 캡처
- `/[locale]/fan-to-pro/(lms)/[cohortSlug]/student/jobs` 캡처
- `/[locale]/fan-to-pro/(lms)/[cohortSlug]/student/jobs/[id]/apply` (PII 동의 modal) 캡처
- `/[locale]/fan-to-pro/(lms)/admin/recruitment` 캡처
- `/[locale]/fan-to-pro/(lms)/admin/recruitment/audit` 캡처

`docs/screenshots/b0072-recruitment/` 서브디렉터리에 저장.

## 11. Sage 재검토 대상 (v4)

### v3 지적 사항 fix 확인 (CRIT 2 + HIGH 4 + MED)

| ID | v3 지적 | v4 반영 위치 | 상태 |
|---|---|---|---|
| **CRIT 1** | schema drift — spec `contact_email` vs 실제 `email` | §3.1 v3 매핑 로직 삭제 (Case B 제거) + §17 body 예시 `contact_email` 은 companies_partners 것 (별개, 유지). applicants 참조 자체 제거. | ✅ |
| **CRIT 2** | Case B (applicants 지원) attack surface | §3.1 재작성 (students only), §4.1 `student_applications.student_id NOT NULL`, §4.3 RLS INSERT policy `p_stu_apps_student_insert` 만, §8.4 `applyToPosting` students only | ✅ |
| **H-1** | Storage path traversal | §8.9 bucket RLS `name NOT LIKE '%..%'` + 확장자 whitelist + server action 명시 path 조립 | ✅ |
| **H-2** | log_resume_read_atomic RPC CTE 문제 | §8.5 RPC plpgsql 재설계 (status 확인 → UPDATE → INSERT, FOR UPDATE row lock) + caller exception 시 signed URL 폐기 | ✅ |
| **H-3** | idle timeout race + API route 우회 | §5.5 재작성: middleware read-only + `/api/heartbeat` beacon 분리 + `assertCompanyUser` 안 idle 검증 포함 (API route 우회 방어) + `last_activity_at IS NULL` = 첫 request 취급 | ✅ |
| **H-4** | RLS SECURITY DEFINER (applicants subquery) | Case B 삭제로 applicants 참조 자동 제거. §4.3 재작성 완료. `user_profiles` subquery 는 유지 (Postgres planner index 활용, RLS re-check 순환 없음 명시) | ✅ |
| **MED-2a** | CSP 헤더 부재 | §8.5.1 명시 (default-src / connect-src / img-src / frame-ancestors / object-src / form-action + HSTS + Referrer-Policy + Permissions-Policy) | ✅ |
| **추가** | audit_log retention 정책 | §4.1 `recruitment_audit_log` 아래 5년 자동 파기 cron + PIPA 삭제 요청 개별 대응 | ✅ |
| **추가** | middleware profile SELECT 통합 | §5.4 `last_activity_at` 컬럼 합쳐서 단일 SELECT | ✅ |

### v4 재검토 새 focus (Sage 4차 우선 확인 요망)

1. **Case B 삭제 완전성**: spec 전체에서 `applicant_id` / `applicants` 참조가 recruitment 관련 어디에 남아있지 않은지? (audit_log FK, RLS policy, use case 시그니처, UI 라벨 등)
2. **students only 로 인한 UX 손실**: applicants (pending/paid) 는 승격 완료까지 지원 불가 → 승격 흐름 (§3.2) 이 MVP 밖이므로 실질 지원 가능 pool 이 매우 작을 위험. 승격 use case 를 최소한 MVP 범위 안에 포함해야 하는지 재검토.
3. **log_resume_read_atomic RPC 원자성**: plpgsql `BEGIN ... END` block 이 트랜잭션 경계인지 확인. SECURITY DEFINER + SET search_path 안전한지 검증.
4. **FOR UPDATE row lock 이 deadlock 유발 가능성**: 같은 application 을 여러 회사 담당자가 동시 열람 시 순차 처리. deadlock 위험 vs 순차 처리 성능 tradeoff.
5. **assertCompanyUser 안 idle 검증**: server action 마다 profile SELECT 추가 = N+1 위험. `getLmsUser` 결과 캐싱 (request-scoped) 필요한지 검토.
6. **heartbeat `/api/heartbeat` route 자체의 auth 우회 위험**: sendBeacon = fetch keepalive. CSRF 방어 (SameSite=Lax cookie 로 충분한지)?
7. **CSP 위반 발생 시 fallback**: 배포 후 CSP 에러가 legit component 를 차단할 위험. `Content-Security-Policy-Report-Only` 로 우선 배포 → 위반 로그 수집 → 정책 확정 순서 권장?
8. **audit_log retention cron**: 5년 지난 row 대량 삭제 시 pg_dump 부담. batch delete (LIMIT 10000 반복) 로 나눠야 하는지?
9. **K-PIPA 준수**: 제17조 제3자 제공 (파트너 회사) + audit_log 5년 보관이 PIPA 제21조 파기 원칙과 정합한지 (audit_log 는 법적 근거 있는 보관인지 명시 필요).

## 12. Mira QA 시나리오 (E2E 20; v1 12 → v2 20 확장)

### 기본 흐름 (v1 유지)

1. 노아 → 회사 invite → 회사 담당자 첫 로그인 → PW 변경
2. 회사 정보 편집 (승인 전) 성공
3. 노아 → 회사 승인 성공
4. 회사 → JD 등록 (draft) → publish → 학생 노출
5. 학생 → JD 리스트 확인 → filter 성공
6. 학생 → JD 상세 확인 → view_count +1
7. 학생 → 지원 → 회사 email 발송 (email_log 에 sent)
8. 회사 → 지원자 이력서 열람 → reviewed_at 채워짐 + signed URL 300s TTL
9. 학생 → 취소 시도 (reviewed_at 채워진 후) 차단
10. 학생 → 취소 (reviewed_at 없음) 성공
11. 회사 → status → interview → 학생 email 발송
12. 회사 A 가 회사 B 지원자 접근 시도 차단 (RLS)

### v2 신규 (Sage 지적 커버)

13. **PII 유출 검증**: application_received_to_company email body 에 학생 실명/국적/전화/이력서 URL 없음 (문자열 grep 검증)
14. **Race condition**: 두 브라우저 동시 withdrawApplication + readApplicantResume 하나만 성공 (원자적 UPDATE)
15. **role 겸직**: 노아가 super_admin + company_user 겸직 시나리오 → role='super_admin' 로 판정
16. **PII 동의 미체크**: apply modal 에서 체크박스 안 하고 submit → 서버에서 차단
17. **PW 정책**: 짧은 PW (9자) 로 change-password 시도 → 차단
18. **로고 업로드**: SVG 업로드 시도 → 차단, 5MB 업로드 시도 → 차단, 다른 회사 path 로 업로드 시도 → 차단
19. **Signed URL 재사용**: 5분 지난 후 URL 접근 → 401, 다운로드 링크 열면 attachment 로 다운로드 (브라우저 렌더 X)
20. **감사 로그**: resume_read / status_changed / application_created / application_withdrawn 각 이벤트가 recruitment_audit_log 에 기록됨. program admin 조회 시 자기 프로그램 이벤트만 보임.

### v3 신규 (Sage v2 지적 커버)

21. **applicant 지원 (미승격)**: applicants (pending/paid) 로 로그인 후 apply → student_id=NULL, applicant_id 채워짐. INSERT policy Case B 통과. contact_email 매칭 + email_confirmed_at NOT NULL 조건.
22. **applicant 무단 claim 시도**: 다른 사람 applicants row 의 contact_email 로 새 auth.users 만들어서 지원 시도 → email_confirmed_at 없으면 (magic link 안 클릭) 차단.
23. **student_applications identity CHECK**: student_id=NULL AND applicant_id=NULL 로 INSERT 시도 → CHECK 위반 실패.
24. **UNIQUE 재지원 방지**: applicant 로 지원 → 학생 승격 → 다시 apply 시 UNIQUE (student_id, posting_id) 로 차단 (승격 시 admin 이 applicant_id 를 student_id 로 이관하는 경우) 또는 허용 (분리된 케이스, 문서 확인 필요).
25. **company UPDATE grant 없음**: authenticated 직접 UPDATE 시도 → RLS + grant 부재로 차단. 반드시 server action 경유.
26. **readApplicantResume 실패 시 reviewed_at 안 채움**: signedUrl 강제 실패 시나리오 (bucket 접근 차단) → reviewed_at 그대로 NULL 유지.
27. **Storage bucket path traversal**: 학생이 `../other-student/` prefix 로 이력서 업로드 시도 → RLS 차단.
28. **companies-logos MIME magic 검증**: PNG 확장자 파일에 SVG 내용 → 매직 넘버 sniff 로 차단.
29. **Rate limit fail-closed**: Redis 임시 다운 (mock) → applyToPosting 시도 → `rateLimitCheckFailed` 에러.
30. **회사 이력서 이중 key**: 회사 A 담당자 甲 20회 + 乙 즉시 1회 열람 시도 → 회사 quota (20/분) 초과로 乙 차단.
31. **Idle timeout**: 회사 담당자 로그인 후 30분 방치 → 다음 request 시 강제 로그아웃 + login?reason=idle_timeout redirect.
32. **audit metadata 4KB 초과**: 4KB 넘는 metadata 로 INSERT 시도 → CHECK 위반 실패.
33. **audit metadata PII 검증**: metadata jsonb 안 학생 이름/이메일/전화 저장 시도 (application layer strip) → 이상 값 없이 whitelist keys 만 저장.
34. **cron worker idempotency**: 같은 email_log.id 로 Resend 재시도 → 중복 발송 없음.

## 13. 배포 순서

1. 스키마 마이그레이션 (`20260710_recruitment_mvp.sql`): 5 신규 테이블 + user_profiles 확장 + CHECK constraint + RLS
2. Storage bucket 생성 (`companies-logos`) + RLS
3. Domain entities (companies_partner / job_posting / student_application / recruitment_audit / recruitment_email)
4. Repositories
5. 가드 함수 (`recruitment-role.ts`): 4 종
6. Use cases (17개 + eligibility + rate limit + audit logger + email enqueue)
7. Middleware 확장 (`/partners/*` 가드 + parsePath 확장 + resolveLoggedInDestination)
8. Auth 4th role 처리 (getLmsUser 확장)
9. UI (partners / student / admin) 3 계열
10. Email outbox worker (cron)
11. **Sage 재검토 pass** (§7.4 룰 = deploy 전 필수)
12. Mira E2E pass (20 시나리오)
13. 카피 부호 검사 + 그라데이션 검사
14. typecheck + build pass
15. supabase-verify.mjs pass
16. 개인정보처리방침 페이지 배포 (§17)
17. `git push origin main` → Vercel auto deploy

## 14. 노아 최종 확인 필요

1. **v2 스코프 (§3) 승인**: 감사 로그 + rate limit + 개인정보처리방침 개정 포함 OK?
2. **PW 정책 (§5.5)**: 최소 10자 + 특수문자 + 숫자 OK? (기존 학생/강사에도 소급 적용 안 됨, 신규부터)
3. **개인정보처리방침 개정 (§17)**: 텍스트 draft 는 Aria 요청 예정 vs 노아 직접 작성?
4. **Storage bucket 신설**: `companies-logos` bucket name OK? RLS 는 bucket-level 정책 별도 배포.
5. **감사 로그 UI**: `/admin/recruitment/audit` MVP 는 리스트만 + 필터 (actor / action / date)? feature 확장은 이후.
6. **Rate limit 임계값**: 학생 지원 시간당 5회, 회사 이력서 열람 분당 20회 OK?

## 15. Rate limit 설계 (권고 4)

Upstash Redis 사용 (`@upstash/redis` + `@upstash/ratelimit`). 기존 계약서 흐름에서 이미 계정 있으면 재사용, 없으면 신규 프로비저닝.

```typescript
// infrastructure/ratelimit/recruitment-limits.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';

const redis = Redis.fromEnv();

export const studentApplyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  prefix: 'rl:student:apply',
});

// v3 Sage H-4: 회사 이력서 열람 = userId + companyPartnerId 이중 key.
// 한 회사에서 담당자 여러 명이 있어도 회사 전체 quota 로 제한.
export const companyResumeReadLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  prefix: 'rl:company:resume',
});

export async function enforceStudentApplyRateLimit(userId: string): Promise<void> {
  // v3 Sage H-4: fail-closed. Redis 다운 = 요청 차단.
  try {
    const { success, reset } = await studentApplyLimit.limit(userId);
    if (!success) throw new Error(`rateLimited:studentApply:${reset}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('rateLimited')) throw err;
    // Redis 자체 실패 = fail-closed.
    Sentry.captureException(err, {
      tags: { area: 'ratelimit', kind: 'studentApply' },
      extra: { userId },
    });
    throw new Error('rateLimitCheckFailed');
  }
}

export async function enforceCompanyResumeReadRateLimit(
  userId: string,
  companyPartnerId: string,
): Promise<void> {
  // v3 Sage H-4: 이중 key.
  const key = `${userId}:${companyPartnerId}`;
  try {
    const { success, reset } = await companyResumeReadLimit.limit(key);
    if (!success) throw new Error(`rateLimited:companyResumeRead:${reset}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('rateLimited')) throw err;
    Sentry.captureException(err, {
      tags: { area: 'ratelimit', kind: 'companyResumeRead' },
      extra: { userId, companyPartnerId },
    });
    throw new Error('rateLimitCheckFailed');
  }
}
```

- **v3 fail-closed**: Redis 연결 실패 = `rateLimitCheckFailed` throw. 서비스 가용성보다 abuse 차단 우선. Sentry alert 로 노아 즉시 인지.
- **회사 이중 key**: 회사 A 담당자 甲 + 乙 각각 20회/분 = 회사 전체 40회 위험. 이중 key 로 회사 전체 quota 로 강제 (같은 회사면 같은 key).
- **환경 변수**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Vercel env 에 preview/prod 각각 추가.
- **Redis 다운 대응**: 즉시 Sentry alert → 노아 확인 → Upstash 대시보드 상태 확인 → 필요 시 임시 코드 배포로 `ratelimitBypassMode=true` env flag 로 우회 (긴급 hotfix 시나리오).

## 16. 감사 로그 조회 UI (권고 2 + 권고 7)

`/[locale]/fan-to-pro/(lms)/admin/recruitment/audit`:

- 리스트 UI: created_at DESC, 필터 (actor_role / action / date range / company / posting / application)
- 접근 제어: super_admin = 전체, program_admin = 자기 program 관련 이벤트만 (`recruitment_audit_log` RLS 참조)
- 페이지네이션: 50건 / 페이지
- CSV export: super_admin 만

Program admin 접근 매트릭스 (권고 7):

| 대상 | super_admin | program_admin (자기 프로그램) | company_user | student |
|---|---|---|---|---|
| companies_partners | 전체 CRUD | 자기 프로그램 read | 자기 회사 read/update | X |
| job_postings | 전체 CRUD | 자기 프로그램 read | 자기 회사 CRUD | 자기 프로그램 open read |
| student_applications | 전체 read | 자기 프로그램 read | 자기 회사 posting SELECT + UPDATE | 본인 SELECT/INSERT |
| recruitment_audit_log | 전체 read + CSV | 자기 프로그램 관련 read | X | X |
| recruitment_email_log | 전체 read | Wave 2: 자기 프로그램 관련 read | X | X |

**v3 Sage L-3**: `program_admin` 이 자기 프로그램 recruitment_email_log read 허용 = Wave 2. MVP 는 super_admin 만. 이유: MVP 는 노아만 email log 확인하면 충분, program_admin 은 Wave 2 에 program 승인 시 부여.

## 17. 개인정보처리방침 개정 사항 (v3 Sage M-1 K-PIPA 보강)

**필수 개정**: 학생이 파트너 회사에 지원할 때 어디까지 열람 허용되는지 K-PIPA 요건 준수 명시. `docs/legal/privacy-policy.md` (또는 UI 페이지) 개정 항목:

### 신규 조항 (v3 draft, K-PIPA 준수)

> **제7조 (파트너 회사에 대한 개인정보 제공)**
>
> **1. 제공 목적**: 회원은 Growth Career 의 채용 연계 기능을 통해 파트너 회사의 채용 공고에 지원할 수 있으며, 이 경우 파트너 회사가 회원의 지원 자격을 검토하고 채용 프로세스를 진행할 목적으로 개인정보를 제공받게 됩니다.
>
> **2. 제공되는 개인정보 항목**:
> - 성명, 국적, 비자 상태, 연락처(전화, 이메일)
> - 이력서 및 자기소개서 (파일 다운로드 형태)
> - 학습 이력 (수강한 프로그램명 및 수료 여부)
>
> **3. 제공받는 자**: 회원이 지원한 각 파트너 회사 (개별 지원 시점에 각 회사 명시)
>
> **4. 보유 및 이용 기간**: 파트너 회사는 지원 시점부터 채용 프로세스 종료 후 **3년간** 보관 후 파기합니다. 다만, 관련 법령에 특별한 규정이 있는 경우 해당 기간까지 보관합니다.
>
> **5. 동의 거부 권리**: 회원은 각 공고에 지원할 때마다 위 개인정보의 제공에 대해 **동의를 거부할 권리**가 있습니다. 다만, 동의를 거부할 경우 해당 공고에는 지원할 수 없습니다. (지원 자체가 개인정보 제공을 필수 전제로 하기 때문)
>
> **6. 파기 절차 및 방법**: 회원이 지원을 취소하거나 파트너 회사와의 채용 프로세스가 종료된 후 3년이 경과한 개인정보는 파트너 회사가 파기합니다. 회원은 파트너 회사에 직접 파기를 요청할 수 있으며, Growth Career 는 파기 요청 창구 역할을 지원합니다.
>
> **7. 파트너 회사의 개인정보 처리**: 파트너 회사는 각 회사의 자체 개인정보 처리방침에 따라 회원의 개인정보를 처리하며, 회원은 각 파트너 회사에 별도 문의하여 자세한 정책을 확인할 수 있습니다.

### K-PIPA 요건 매핑 (Sage M-1)

| K-PIPA 조항 | v3 반영 위치 |
|---|---|
| 제17조 개인정보의 제공 (목적, 항목, 제공받는 자) | §17 항목 1, 2, 3 |
| 제21조 파기 (보유기간) | §17 항목 4, 6 |
| 제22조 동의 방법 (거부권 + 거부 시 불이익) | §17 항목 5 |
| 제39조의5 개인정보 처리 위탁 | (파트너 회사는 위탁이 아닌 제3자 제공으로 분류) |

### Apply modal 노출 요건 (Sage M-1)

각 공고 지원 시 **별도의 체크박스** (회사별로 개별 동의):

```
[  ] (필수) 위 파트너 회사에 다음 개인정보를 제공하는 것에 동의합니다.
    - 제공 항목: 성명, 국적, 비자 상태, 연락처, 이력서
    - 제공 목적: 채용 검토 및 진행
    - 보유 기간: 채용 프로세스 종료 후 3년
    - 거부 권리: 거부 시 이 공고에 지원할 수 없습니다.
    → 자세한 내용: [개인정보처리방침 제7조 새 탭]
```

- 체크 없이 submit → server action `applyToPosting` 첫 줄 `if (!piiConsent) throw 'piiConsentRequired'`
- 동의 시점 audit log 기록: `action='application_created'`, `metadata.pii_consent_at=now()`
- 회사별 별도 동의 (같은 학생이 회사 A 지원 시 동의 → 회사 B 지원 시 다시 동의)

- 배포 순서: 개인정보처리방침 페이지 배포 → 학생 apply modal 노출.
- 기존 학생/applicants 는 apply 첫 시도 시 modal 로 노출 + 체크박스 강제.
- 노아 최종 문구 확인 필요 (§14 항목 3).

## 18. Rejected Alternatives

- **회사 회원 없이 노아 중개 (Slice 1)**: 노아 요청으로 rejected.
- **채용 전용 별도 프로덕트**: 학생 id 동기화 비용, over-engineering.
- **카톡 알림 즉시 도입**: Wave 2 로 이월.
- **매칭 알고리즘**: MVP 는 학생이 직접 지원 (filter 만).
- **PII 마스킹**: MVP 는 전체 열람 + 학생 동의 필수. 정책은 이후 iterate.
- **이력서 브라우저 프리뷰**: XSS + 재유통 위험. 다운로드 (Content-Disposition attachment) 만.
- **client-side 이력서 서명 검증**: signed URL TTL 신뢰 + 서버 로그로 audit.
- **audit_log 를 Postgres 대신 별도 log service**: MVP 단계는 Postgres 로 충분. 볼륨 증가 시 Iris 재검토.
- **email 트랜잭션 안 발송**: 롤백 시 유령 이메일 위험. outbox pattern 채택.

## 19. 향후 iterate (out of MVP scope)

- 파트너 회사 지원자 export CSV (직접 다운로드 대신 audit_log 남기고 발송)
- 학생 다중 이력서 (지원 시점별 스냅샷)
- 파트너 회사 팀 계정 (한 회사에 여러 담당자)
- 지원 상태 커스텀 파이프라인 (회사별 stage 재정의)
- 매칭 알고리즘 (Nova 참여)
- 카톡 알림 (Wave 2)
