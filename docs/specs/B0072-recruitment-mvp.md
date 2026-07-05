# B0072 Recruitment MVP / Simplified v3

**Status**: Draft (v5 폐기 → Simplified v1 BLOCK → v2 CONDITIONAL PASS → v3 = Sage HIGH 1 신규 (S-9b) + minor 3 fix)
**Date**: 2026-07-06
**Owner**: Iris (backend) + Luna (frontend) + Sage (security 재검토)
**Related**: ADR 0008 (URL/Auth 분리), ADR 0010 (applicants 보존)
**Marker**: [skip-gating: bugfix]. Sage v2 재검토 CONDITIONAL PASS (CRIT 0 + HIGH 1 신규) 지적 문구 fix.

## Change Log

- **v5** (~1857 line): 회사 회원 계정 + 대시보드 + 이력서 signed URL + audit_log 대규모. Sage BLOCK.
- **Simplified v1** (2026-07-05, ~650 line): v5 폐기. 회사 로그인 표면 삭제, 원클릭 지원 + 이메일 outbox 로 축소. Sage 재검토 = BLOCK (CRIT 0 + HIGH 3).
  - HIGH S-1: 원클릭 지원 modal 문구가 K-PIPA 제17조 필수 4개 항목 부재 (수령자 / 목적 / 항목 / 보유기간 + 거부권).
  - HIGH S-8: `students.resume_url` 참조 = 컬럼 부존재. 실제는 `student_career_documents` 테이블 (doc_type + storage_method + external_url XOR file_path).
  - HIGH S-9: Supabase JS 트랜잭션 없음. `student_applications` INSERT + `recruitment_email_log` INSERT 원자성 미보장 → outbox 없이 application row 만 남는 half-commit risk.
- **Simplified v2** (2026-07-05, 777 line): HIGH 3건 spec 문구 fix. RPC 신설 (`apply_to_job_atomic`), modal 문구 K-PIPA 4항목, `student_career_documents` 참조 정정. Sage 재검토 = CONDITIONAL PASS (CRIT 0 + HIGH 1 신규 S-9b + minor 3).
  - HIGH S-9b: RPC `apply_to_job_atomic` 의 `p_student_id` 인자로 타인 대신 지원 가능. `GRANT EXECUTE TO authenticated` 상태에서 악의적 유저가 devtools 로 다른 활성 학생 id 를 전달하면 성공 = impersonation risk.
  - MED S-1b: K-PIPA 보유기간 문구가 회사 정책에 의존. 회사 온보딩 시 default 보유 기간 필드 필수 프로세스 문서화 필요.
  - MED S-3: `recruitment_email_log.body_snapshot` retention 계획 미정. Wave 2 파기 cron 도입 명시 필요.
  - LOW S-8b: `student_career_documents` doc_type 3개 중 portfolio 제외 근거 문서화 필요.
- **Simplified v3** (2026-07-06, 이 파일): S-9b HIGH fix (RPC 재작성 = `p_student_id` 인자 삭제, auth.uid() 로 내부 조회) + minor 3 문구 반영.

---

## v5 폐기 이유

v5 spec (1857 line) 은 노아의 실제 요청을 오해한 결과 대규모 오버엔지니어링이었다. 20+ 시간 투자에도 방향이 완전히 틀림.

노아 실제 의도 (2026-07-05):

> "올라간 공고는 누구나 볼 수 있다고!!! 대신 지원하려면 회원가입으로 할 수 있는거고, 아닌 사람은 공고에 적혀있는 이메일로 이력서 보내면 되는거고!!!"

v5 는 반대로 아래와 같이 설계되어 있었다:
- 공고 열람도 로그인 필수 (student cohort 매칭까지 강제)
- 회사가 별도 로그인 계정 (`company_user` 4th role) 을 발급받아 자기 회사 JD CRUD + 지원자 열람
- 이력서 signed URL 열람 + PW 정책 + idle timeout + heartbeat beacon + CSP 등 회사 세션 방어 표면 전방위 확대
- companies_partners UPDATE RLS + SECURITY DEFINER RPC + audit_log + email_log 이중 outbox

**정리 = 삭제 항목** (v5 → Simplified):

| 삭제 대상 | 근거 |
|---|---|
| `company_user` 4th role (auth 확장) | 회사는 로그인 자체 없음. JD 는 노아가 admin 에서 대신 등록 |
| `companies_partners` 테이블 | 회사 정보는 `job_postings` 안 in-line 컬럼으로 흡수 |
| `/partners/*` 회사 대시보드 URL 계열 | 존재 이유 소멸 |
| PW 정책 / idle timeout / `/api/heartbeat` beacon | 회사 세션 없음. 학생 auth 는 기존 흐름 재사용 |
| CSP Report-Only → Enforce 전환 워크플로우 | 회사 세션 방어 부속물이라 소멸. 필요 시 별도 B 번호로 |
| Origin 검증 / CSRF 이중 방어 | heartbeat/status API 사라져서 불필요 |
| 이력서 Storage bucket + signed URL 5분 TTL | 이력서는 원클릭 지원 시 이메일 첨부로 회사에 직접 전달. 플랫폼이 저장/서빙 안 함 |
| `recruitment_audit_log` (11 action 어휘 + metadata whitelist + 4KB CHECK + retention 5년 cron) | 회사 열람 표면 소멸로 감사 필요성 급감. Simplified 는 `recruitment_email_log` outbox 로만 관측 |
| SECURITY DEFINER RPC (`log_resume_read_atomic`) | 이력서 열람 자체가 사라짐 |
| Rate limit (Upstash Redis) MVP 필수 항목 | 학생 지원 spam 은 middleware/Firewall 로 후속. MVP 는 Vercel Firewall 기본 규칙 + UNIQUE constraint |
| `user_profiles.company_partner_id` 컬럼 + `user_profiles_lineage_exclusive_chk` 3-way CHECK | company_user role 소멸로 확장 불요. **기존 `user_profiles` 스키마 무변경** |
| 개인정보처리방침 K-PIPA 조항 대규모 개정 (제8조 감사 로그 5년 등) | 감사 로그 소멸. 원클릭 지원 시 회사 이메일 발송 동의 문구만 추가 |
| Middleware `parsePath` 에 `partners` kind 확장 | URL 계열 자체 소멸 |
| applicants → students 승격 재검토 (Case B) | v4/v5 결정 유지 = 승격 완료 학생만 지원. 스코프 그대로 |
| `program_id` FK on `job_postings` | v5 는 회사가 프로그램에 종속됐지만 (파트너), Simplified 는 공고 자체가 program 단위 노출 대상. Keep `program_id`, 회사는 in-line |

**유지 항목** (v5 → Simplified):
- `job_postings` 테이블 (in-line 회사 정보로 재구성)
- `student_applications` 테이블 (students only, v4 결정 그대로)
- `recruitment_email_log` 테이블 (원클릭 지원 시 회사 이메일 발송 outbox)
- Admin JD CRUD (기존 super_admin auth 재사용)
- 학생 원클릭 지원 (기존 학생 auth 재사용)

---

## 1. 배경

Growth Career 는 외국인 대상 기수제 직무 교육 + 채용 연계 플랫폼. 1기 종강 (7/19) 직전 유니온픽처스 파트타임 공고 즉시 활용 목표. 파트너 회사에게 "검증된 외국인 인재풀" 접근을 약속하되, 회사 회원 관리 부담은 지지 않는다.

노아 실제 요구:
1. JD 페이지가 웹에 공개돼 누구나 열람 → SEO 로 유입, 파트너사에게도 홍보 자료
2. 학생 = 로그인 상태에서 원클릭 지원 → 시스템이 회사 이메일로 이력서 자동 전달 + 지원 이력 트래킹
3. 비회원 = JD 페이지 하단에 표시된 회사 이메일로 직접 지원 (플랫폼 무관)

핵심 원칙: **회사는 플랫폼 안 계정을 만들지 않는다.** 회사 담당자 email 은 노아가 admin 에서 등록만 하면 되고, 그 이후 회사는 이메일만 받는다.

---

## 2. 4 핵심 요소

1. **JD 공개 페이지**. 익명 누구나 열람. SEO friendly (ISR + revalidate).
2. **JD 관리**. 노아 (super_admin) 가 `/[locale]/fan-to-pro/admin/jobs/*` 에서 수동 등록/수정/공개/마감.
3. **회원 (학생) 원클릭 지원**. 로그인 후 [지원하기] → 확인 modal → 서버가 회사 `contact_email` 로 이력서 첨부 이메일 발송 + `student_applications` INSERT 로 트래킹.
4. **비회원 지원**. JD 페이지에 회사 email 노출. 학생이 직접 이메일 발송. 플랫폼 트래킹 안 함.

---

## 3. 스코프

### 포함 (Simplified MVP)

- `/[locale]/jobs/` = 공개 JD 리스트 (익명)
- `/[locale]/jobs/[slug]/` = JD 상세 (익명)
- `/[locale]/fan-to-pro/admin/jobs/*` = super_admin JD CRUD
- 3 신규 테이블: `job_postings` (in-line 회사) + `student_applications` + `recruitment_email_log`
- 지원 자격 = `students.status = 'active'` only (v4 결정 유지)
- 원클릭 지원 시 이메일 발송 outbox (Vercel Cron 1분 간격)
- 지원 시 학생 동의 modal (회사에게 이력서/자기소개서 전달 명시)

### 제외 (별도 B 번호로 분리)

- 회사 회원 자동/수동 가입 (v5 오버엔지니어링, 삭제)
- 회사 대시보드 (`/partners/*`)
- 이력서 signed URL / Storage bucket
- 지원자 상태 machine (under_review / interview / offer / hired). MVP 는 `applied` / `withdrawn` 두 상태만
- Rate limit / CSP / heartbeat / origin 검증
- 감사 로그 (`recruitment_audit_log`)
- 매칭 알고리즘 / Nova AI
- applicants 직접 지원 (Case B, v4 삭제 유지)

---

## 4. 데이터 모델

### 4.1 신규 테이블 3 개

#### `job_postings` (회사 정보 in-line)

```sql
CREATE TABLE job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES programs(id),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  company_name text NOT NULL,
  company_logo_path text,
  role_category text NOT NULL,
  employment_type text NOT NULL CHECK (employment_type IN ('full_time','part_time','internship','contract','freelance')),
  location text,
  remote_ok boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  requirements text,
  benefits text,
  salary_range text,
  contact_email text NOT NULL,
  published_at timestamptz,
  closes_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_postings_status_published ON job_postings(status, published_at DESC);
CREATE INDEX idx_job_postings_program_status ON job_postings(program_id, status);
CREATE UNIQUE INDEX idx_job_postings_slug ON job_postings(slug);
```

- `slug` = 8자 nanoid alphanumeric (URL 노출용). ADR 0008 의 cohort slug 규칙 따르되 recruitment 는 slug 컬럼 자체가 unique key.
- `contact_email` = 회사 담당자 email. 비회원 지원용 + 원클릭 지원 시 이메일 발송 대상. **노아가 admin 에서 등록 시 검증**.
- `company_logo_path` = 선택. Storage bucket 은 이후 확장 시. MVP 는 URL 만 저장.
- `status` 흐름: `draft` → `open` (published_at 채워짐) → `closed`.
- `closes_at` 은 filter query (RLS policy 안 아님) 로 처리 = client 시각 조작 방어 + planner 안정.
- `description` / `requirements` / `benefits` = markdown text. 렌더는 `next-mdx-remote` 또는 안전한 markdown 라이브러리.
- `view_count` = 익명 열람 카운터. Cron 또는 middleware 로 batch 증가 (MVP 는 detail page 서버 렌더 시 1 씩 증가; 봇 필터 후속).

#### `student_applications` (학생 원클릭 지원 트래킹)

```sql
CREATE TABLE student_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  job_posting_id uuid NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  student_message text,
  email_sent_at timestamptz,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','withdrawn')),
  CONSTRAINT student_applications_student_posting_uk UNIQUE(student_id, job_posting_id)
);

CREATE INDEX idx_student_applications_student ON student_applications(student_id, applied_at DESC);
CREATE INDEX idx_student_applications_posting ON student_applications(job_posting_id);
```

- `status` = MVP 는 2 값만 (`applied` / `withdrawn`). v5 의 6-value 상태머신 (`under_review`/`interview`/`offer`/`hired`/`rejected`) 제거. 회사가 플랫폼에 상태를 입력할 수 없기 때문에 실질적 의미 없음. 회사 - 학생 상태 진전은 회사 이메일로만 진행.
- `student_message` = 학생이 지원 시 자유롭게 남기는 짧은 메시지 (선택, max 1000자, application layer 검증).
- `email_sent_at` = outbox 발송 완료 시각. NULL = 아직 발송 안 됨/실패 재시도 중.
- `UNIQUE(student_id, job_posting_id)` = 중복 지원 방지.

#### `recruitment_email_log` (이메일 발송 outbox)

```sql
CREATE TABLE recruitment_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES student_applications(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_template_key text NOT NULL,  -- outbox worker 가 template key 로 body 렌더 (RPC 는 key 만 전달, PII 최소화)
  body_snapshot text,               -- 발송 시점 렌더된 최종 body. worker 가 sent 시점에 채움
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed','retrying')),
  sent_at timestamptz,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_email_status ON recruitment_email_log(delivery_status, created_at)
  WHERE delivery_status IN ('pending','retrying');
CREATE INDEX idx_recruitment_email_application ON recruitment_email_log(application_id);
```

- Outbox 패턴: server action 은 이 테이블에 INSERT 만 (application INSERT 과 동일 트랜잭션). Vercel Cron 이 pending/retrying 을 sent 로 전이.
- `attachments` jsonb = 이력서 + 자기소개서 참조 (§4.2 `student_career_documents` 에서 fetch). 형식: `[{ doc_type: 'resume'|'cover_letter', storage_method: 'external_url'|'file_upload', external_url?: string, file_path?: string }]`. 없으면 email body 만.
- `body_snapshot` = 발송 시점 문구 그대로 저장 (template 변경돼도 감사 가능).
- **접근**: service_role only. authenticated 는 SELECT 도 안 됨.
- **Retention TODO (S-3 fix)**: MVP 는 무기한 보관. **Wave 2 에서 파기 cron (`channel_email_log_retention`) 도입 필수** — K-PIPA 제21조 파기 원칙 상 회사 채용 절차 종료 후 outbox 발송 기록도 파기 대상. default: `sent` 후 3년 자동 삭제 (`delivery_status='sent' AND sent_at < now() - interval '3 years'` row batch DELETE). `pending`/`retrying` 은 시각 무관 보관, `failed` 는 90일 후 삭제.

#### `apply_to_job_atomic` RPC (SECURITY DEFINER — S-9 + S-9b fix)

Supabase JS 는 트랜잭션 API 를 노출하지 않는다. `student_applications` INSERT + `recruitment_email_log` INSERT 를 두 번의 network round-trip 으로 나누면, 첫 INSERT 성공 + 두 번째 실패 시 outbox 없이 application row 만 남는 half-commit 상태가 된다 (Sage HIGH S-9). SECURITY DEFINER RPC 로 두 INSERT 를 하나의 서버 사이드 트랜잭션에 묶는다.

**S-9b 추가 방어**: v2 시안은 `p_student_id` 를 인자로 받아 함수 안에서 `students.status='active'` 만 검증했다. `GRANT EXECUTE TO authenticated` 상태에서 악의적 유저가 브라우저 devtools 로 `supabase.rpc('apply_to_job_atomic', { p_student_id: '<다른 활성 학생 id>', ... })` 를 직접 호출하면 타인 명의로 지원이 성사되고, outbox 로 이력서 첨부 이메일까지 발송된다 = impersonation. v3 는 `p_student_id` 인자를 **제거**하고 함수 안에서 `auth.uid()` → `user_profiles.student_id` 로 본인 student_id 를 조회한다. 클라이언트가 student_id 를 넘길 수 없으므로 impersonation 원천 차단.

```sql
CREATE OR REPLACE FUNCTION apply_to_job_atomic(
  -- p_student_id 인자 삭제 (S-9b fix). auth.uid() 로 내부 조회.
  p_job_posting_id uuid,
  p_student_message text,
  p_email_recipient text,
  p_email_subject text,
  p_email_body_template_key text,
  p_email_attachments jsonb
) RETURNS uuid AS $$
DECLARE
  v_student_id uuid;
  v_application_id uuid;
BEGIN
  -- auth.uid() 기반 본인 student_id 조회 (S-9b fix: 클라이언트가 student_id 를 넘길 수 없음)
  SELECT student_id INTO v_student_id
  FROM user_profiles WHERE id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'notStudent';
  END IF;

  -- 자격 재검증 (server action 이 이미 확인했더라도 함수 안에서 재확인 = defense in depth)
  IF NOT EXISTS (
    SELECT 1 FROM students
    WHERE id = v_student_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'notEligible';
  END IF;

  -- job_posting status='open' + closes_at 유효 검증
  IF NOT EXISTS (
    SELECT 1 FROM job_postings
    WHERE id = p_job_posting_id
      AND status = 'open'
      AND (closes_at IS NULL OR closes_at > now())
  ) THEN
    RAISE EXCEPTION 'postingClosed';
  END IF;

  -- 중복 지원 방지 (UNIQUE constraint 로도 방어되나 명확한 에러 코드 반환)
  IF EXISTS (
    SELECT 1 FROM student_applications
    WHERE student_id = v_student_id AND job_posting_id = p_job_posting_id
  ) THEN
    RAISE EXCEPTION 'alreadyApplied';
  END IF;

  -- student_applications INSERT
  INSERT INTO student_applications (student_id, job_posting_id, status, student_message)
  VALUES (v_student_id, p_job_posting_id, 'applied', p_student_message)
  RETURNING id INTO v_application_id;

  -- recruitment_email_log INSERT (outbox pattern, 같은 트랜잭션 안)
  INSERT INTO recruitment_email_log (
    application_id, recipient_email, subject, body_template_key, attachments, delivery_status
  ) VALUES (
    v_application_id, p_email_recipient, p_email_subject, p_email_body_template_key,
    p_email_attachments, 'pending'
  );

  RETURN v_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- authenticated 는 EXECUTE 가능. 내부 SELECT/INSERT 는 SECURITY DEFINER 로 RLS bypass.
-- v3: student_id 는 auth.uid() 로 서버가 결정 = 클라이언트가 위조 불가.
GRANT EXECUTE ON FUNCTION apply_to_job_atomic TO authenticated;
```

**주의**:
- `SECURITY DEFINER SET search_path = public` = search_path hijack 방어 (Sage 표준).
- **S-9b 방어**: `p_student_id` 인자 제거. 함수 안 `auth.uid()` → `user_profiles.student_id` 조회로 본인만 지원 가능. 클라이언트 위조 불가.
- `p_email_body_template_key` = template 식별자만 넘김. 실 body 렌더는 outbox worker 가 template key 로 조회 (body 안에 PII 를 최소화).
- 함수 안에서 RAISE EXCEPTION 시 트랜잭션 전체 rollback. half-commit 불가.
- `recruitment_email_log.body_template_key` 컬럼이 추가되어야 함 (아래 §4.1 recruitment_email_log 스키마에 반영 필요 — Iris 마이그레이션에서 컬럼 추가).
- **retention TODO (S-3 fix)**: `recruitment_email_log.body_snapshot` 은 발송 시점 학생 PII (이름/이메일/이력서 URL) 를 담는 최종 렌더 결과다. MVP 는 무기한 보관하나 K-PIPA 제21조 파기 원칙 상 회사 채용 절차 종료 후 outbox 발송 기록도 파기 대상. **Wave 2 에서 파기 cron (`channel_email_log_retention`) 도입 필수**. default: `sent` 후 3년 자동 삭제. cron 은 `delivery_status='sent' AND sent_at < now() - interval '3 years'` row 를 batch DELETE.

### 4.2 기존 테이블 확장 = 없음

- `user_profiles` 확장 X (v5 의 `company_partner_id` / `last_activity_at` / 3-way lineage CHECK 다 폐기).
- `students` / `applicants` / `attendance` / `students.display_name` **절대 보존**.
- **이력서/자기소개서는 `student_career_documents` 테이블에서 조회** (Sage HIGH S-8 정정). `students.resume_url` 컬럼은 존재하지 않는다. `student_career_documents` 스키마:
  - `student_id uuid NOT NULL REFERENCES students(id)`
  - `doc_type text NOT NULL CHECK (doc_type IN ('resume','cover_letter', ...))`
  - `storage_method text NOT NULL CHECK (storage_method IN ('external_url','file_upload'))`
  - `external_url text` (`storage_method='external_url'` 일 때만 채움)
  - `file_path text` (`storage_method='file_upload'` 일 때만 채움, Supabase Storage bucket 경로)
  - CHECK constraint XOR: 한 row 에 `external_url` 또는 `file_path` 중 정확히 하나만 non-null.
- 원클릭 지원 시 fetch: `SELECT doc_type, storage_method, external_url, file_path FROM student_career_documents WHERE student_id = ? AND doc_type IN ('resume','cover_letter')`. 없으면 email attachment 없이 본문만 발송 (§8.3 실패 시나리오 재사용).

### 4.3 RLS 정책

기존 pattern (`20260622000002_lms_rls_policies.sql`) 재사용.

#### `job_postings` (공개 SELECT + super_admin write)

```sql
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON job_postings FROM anon, authenticated;
GRANT SELECT ON job_postings TO anon, authenticated;
GRANT ALL ON job_postings TO service_role;

CREATE POLICY service_role_all ON job_postings
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- 공개 read: status='open' + closes_at 유효.
CREATE POLICY p_job_postings_public_read ON job_postings
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'open'
    AND (closes_at IS NULL OR closes_at > now())
  );

-- super_admin: 전체 read/write (draft/closed 포함).
CREATE POLICY p_job_postings_super_admin_all ON job_postings
  FOR ALL
  TO authenticated
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
```

- **의도**: 공개 SELECT policy 는 anon 도 포함해서 로그인 없이 SEO/공유 링크로 진입 가능. status='open' + closes_at 필터로 draft/closed 는 자동 숨김.
- super_admin 은 draft 포함 모든 status 접근 가능.
- INSERT/UPDATE/DELETE 는 super_admin OR service_role 만.

#### `student_applications` (student self SELECT/INSERT)

```sql
ALTER TABLE student_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON student_applications FROM anon, authenticated;
GRANT ALL ON student_applications TO service_role;
GRANT SELECT, INSERT ON student_applications TO authenticated;

CREATE POLICY service_role_all ON student_applications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY p_stu_apps_super_admin_read ON student_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND up.is_super_admin = true)
  );

CREATE POLICY p_stu_apps_student_select ON student_applications
  FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT student_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY p_stu_apps_student_insert ON student_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT student_id FROM user_profiles WHERE id = auth.uid())
    AND status = 'applied'
  );
```

- 학생 self SELECT = status 무관 전체 (자기 지원 이력 트래킹).
- 학생 self INSERT = `status='applied'` 강제. `withdrawn` 전이는 server action + service_role.
- UPDATE/DELETE 는 authenticated 에게 grant 자체 없음 = 학생 취소도 service_role server action 을 거침.

#### `recruitment_email_log` (service_role only)

```sql
ALTER TABLE recruitment_email_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON recruitment_email_log FROM anon, authenticated;
GRANT ALL ON recruitment_email_log TO service_role;

CREATE POLICY service_role_all ON recruitment_email_log
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

- authenticated / anon SELECT 도 안 됨. 관측 UI 필요 시 별도 admin server action 이 service_role client 로 조회.

### 4.4 마이그레이션 순서 (Iris draft 용)

파일 1개: `supabase/migrations/20260706000000_recruitment_mvp.sql`

Section:
1. CREATE TABLE `job_postings` + indexes
2. CREATE TABLE `student_applications` + indexes
3. CREATE TABLE `recruitment_email_log` + indexes
4. ALTER TABLE ENABLE RLS × 3
5. GRANT / REVOKE × 3
6. CREATE POLICY (job_postings 2 + student_applications 4 + recruitment_email_log 1) = 총 7
7. (선택) seed 예제 JD 1건 = 유니온픽처스 파트타임 (draft status)

**검증 (supabase-verify.mjs)**:
- 익명 client 로 `SELECT FROM job_postings WHERE status='open'` = row 반환.
- 익명 client 로 `SELECT FROM job_postings WHERE status='draft'` = 0 row.
- 학생 client 로 `INSERT INTO student_applications VALUES (다른 student_id, ...)` = RLS violation.
- authenticated (non-super-admin) client 로 `INSERT INTO job_postings` = RLS violation.

---

## 5. URL 계열

### 5.1 공개 JD 페이지

- `/[locale]/jobs/` = 공개 리스트. ISR (`revalidate = 300`, 5분). 필터 = role_category / employment_type / remote_ok.
- `/[locale]/jobs/[slug]/` = 상세. ISR (`revalidate = 300`). slug 는 `job_postings.slug`.

**Rendering 원칙**:
- Server Component 로 익명 Supabase client 사용 (anon key). RLS 가 status='open' + closes_at 필터.
- 학생 로그인 상태이면 [지원하기] 버튼 활성. 비로그인이면 [지원하려면 로그인] + 회사 이메일 fallback.
- Metadata (title / description / og:image) 는 `job_postings` 컬럼에서 생성.
- `sitemap.xml` 에 published_at 있는 `open` posting slug 자동 포함.

### 5.2 학생 지원 이력

- `/[locale]/fan-to-pro/[cohortSlug]/student/applications` = 자기 지원 이력 (선택, Wave 1.5). MVP 는 dashboard 카드로 요약 (`applied: N건`).

### 5.3 Admin JD CRUD

- `/[locale]/fan-to-pro/admin/jobs/` = 리스트 (draft 포함 전체).
- `/[locale]/fan-to-pro/admin/jobs/new` = 신규 등록 form.
- `/[locale]/fan-to-pro/admin/jobs/[id]/edit` = 수정 form + [공개] / [마감] 버튼.

**Auth 가드**:
- middleware.ts 에 `/[locale]/fan-to-pro/admin/*` = super_admin OR program_admin. 기존 lms admin 가드 재사용.
- Server actions 모두 `assertSuperAdmin()` 첫 줄 (§7.4 룰).

---

## 6. Server Actions

### 6.1 공개 read (익명 OK)

```typescript
// application/use-cases/recruitment/list-published-jobs.ts
export type ListPublishedJobsInput = {
  programId?: string;
  roleCategory?: string;
  employmentType?: string;
  remoteOnly?: boolean;
  limit?: number;
  offset?: number;
};

export async function listPublishedJobs(input: ListPublishedJobsInput): Promise<JobPostingListItem[]>;

// application/use-cases/recruitment/read-job-by-slug.ts
export async function readJobBySlug(slug: string): Promise<JobPostingDetail | null>;
```

- 익명 Supabase client (anon key) 로 조회. RLS 가 방어.
- `readJobBySlug` = detail. 조회 성공 시 side effect 로 `view_count++` (fire-and-forget, `void`). middleware/후속에서 봇 필터.

### 6.2 학생 원클릭 지원

```typescript
// application/use-cases/recruitment/apply-to-job.ts
export type ApplyToJobInput = {
  jobPostingId: string;
  studentMessage?: string; // max 1000 chars
};

export type ApplyToJobResult =
  | { ok: true; applicationId: string }
  | { ok: false; error: 'not_authenticated' | 'not_student' | 'not_active' | 'already_applied' | 'job_not_open' | 'internal' };

export async function applyToJobAction(input: ApplyToJobInput): Promise<ApplyToJobResult>;
```

절차:
1. `assertCohortRole('student')`. 기존 lms auth 재사용. 없으면 `not_authenticated`.
2. `user_profiles.student_id` fetch. NULL 이면 `not_student`.
3. `students WHERE id = student_id AND status = 'active'`. row 없으면 `not_active`.
4. `job_postings WHERE id = jobPostingId AND status = 'open' AND (closes_at IS NULL OR closes_at > now())`. row 없으면 `job_not_open`. `contact_email` 도 함께 fetch.
5. **첨부 문서 조회** (S-8 정정): `SELECT doc_type, storage_method, external_url, file_path FROM student_career_documents WHERE student_id = ? AND doc_type IN ('resume','cover_letter')`. 결과를 `attachments` jsonb 배열로 매핑:
   ```json
   [
     { "doc_type": "resume", "storage_method": "external_url", "external_url": "https://..." },
     { "doc_type": "cover_letter", "storage_method": "file_upload", "file_path": "student-docs/uuid/cover.pdf" }
   ]
   ```
   문서가 하나도 없으면 빈 배열 `[]` 전달 (본문만 발송).

   **포트폴리오 제외 근거 (S-8b fix)**: `doc_type='portfolio'` 는 원클릭 지원 시 첨부 X. 이유: 채용 파이프라인 = 이력서 + 자기소개서만 자동 전달 (회사가 채용 검토 1차에 요구하는 표준 문서). 포트폴리오는 회사 요청 시 학생이 별도로 공유하는 후속 단계 문서 = 파일 크기 큰 케이스 많고 형태 다양 (URL/PDF/영상 링크). Wave 2 에서 회사 회신 시 "포트폴리오 요청" 버튼 신설 후 학생 승인 흐름으로 전달 예정.

6. **RPC 호출** (S-9 + S-9b 정정): `supabase.rpc('apply_to_job_atomic', { p_job_posting_id, p_student_message, p_email_recipient, p_email_subject, p_email_body_template_key, p_email_attachments })`. **`p_student_id` 인자 없음** (v3 S-9b fix) — RPC 함수가 `auth.uid()` 로 본인 student_id 를 내부 조회. 클라이언트가 타인 student_id 를 위조 전달할 수 없음. RPC 안에서 `student_applications` INSERT + `recruitment_email_log` INSERT 가 하나의 서버 사이드 트랜잭션. RPC 성공 시 `applicationId` return.
7. RPC 에러 매핑:
   - `notStudent` → `not_student` (S-9b: user_profiles.student_id 없음)
   - `notEligible` → `not_active` (defense in depth 로 함수 안 재검증 실패)
   - `postingClosed` → `job_not_open`
   - `alreadyApplied` → `already_applied`
   - 기타 → `internal`
8. 성공 시 return `{ ok: true, applicationId }`.

**주의**: server action 은 template body 를 렌더하지 않는다. `p_email_body_template_key` = 식별자 (예: `'recruitment.application.v1'`) 만 넘기고, outbox worker (§8.1) 가 sent 시점에 실 body 렌더 + `body_snapshot` 채움. RPC 인자로 PII (학생 이름, 이메일, 이력서 URL) 를 body 문자열로 넣지 않음 = RPC 로그 최소화.

### 6.3 학생 지원 취소

```typescript
// application/use-cases/recruitment/withdraw-application.ts
export async function withdrawApplicationAction(applicationId: string): Promise<Result>;
```

- `assertCohortRole('student')`.
- application row 소유자 확인 (`student_id` 매칭).
- `email_sent_at IS NULL` 인 경우만 취소 허용 (아직 회사에 이메일 발송 전만). 이미 발송된 후에는 회사 이메일로 직접 취소 요청 안내.
- `UPDATE student_applications SET status = 'withdrawn' WHERE id = ? AND email_sent_at IS NULL`. affected rows 0 이면 `already_sent`.
- pending 상태의 `recruitment_email_log` 도 `failed` 로 전이 (worker 가 skip).

### 6.4 Admin CRUD

```typescript
// application/use-cases/recruitment/admin/*
createJobPostingAction(input): Result<{ id }>;
updateJobPostingAction(id, patch): Result;
publishJobPostingAction(id): Result;   // status='open' + published_at=now()
closeJobPostingAction(id): Result;     // status='closed'
```

- 모두 `assertSuperAdmin()` 첫 줄 (§7.4).
- `createJobPostingAction` = slug 자동 생성 (nanoid 8자) + UNIQUE 충돌 시 재시도 3회.
- `publishJobPostingAction` = draft → open 만 허용. contact_email 형식 검증.
- `closeJobPostingAction` = closes_at 을 now() 로 세팅 + status='closed'.

---

## 7. 원클릭 지원 flow (사용자 여정)

1. 학생 로그인 (기존 supabase auth) → `/[locale]/jobs/[slug]` 진입.
2. Detail page 하단 [지원하기] 버튼 클릭.
3. Confirm modal 오픈 (**K-PIPA 제17조 개인정보 제3자 제공 동의**, Sage HIGH S-1 정정):

   제목: "이 공고에 지원할까요?"

   본문 (4개 필수 고지 항목):
   > 지원하시면 아래 정보가 회사에 전달됩니다. 이 동의는 지원 진행에 필요한 것으로, 동의를 거부하실 수 있으나 그 경우 이 공고에 지원할 수 없습니다.
   >
   > **1. 제공받는 자**: {company_name} (담당자 이메일 {contact_email})
   > **2. 제공 목적**: 이 공고에 대한 채용 검토 및 결과 회신
   > **3. 제공 항목**: 이름, 이메일, 국적, 기수 정보, 이력서, 자기소개서, 지원 메시지 (작성 시)
   > **4. 보유 및 이용 기간**: {company_retention_period}. 회사가 온보딩 시 명시한 기간 (일반: 채용 절차 종료 후 3~5년). 이후 파기 또는 인재풀 보관 여부는 회사 자체 정책 (회사에 직접 확인).
   >
   > 발송 후에는 플랫폼에서 취소할 수 없습니다. 취소가 필요하시면 회사 이메일로 직접 요청하세요.

   선택 필드: 자기소개 메시지 (max 1000자, 선택).

   체크박스 (필수, 둘 다 체크해야 [지원하기] 활성):
   - [ ] 위 개인정보 제3자 제공 내용을 확인했으며 동의합니다. (K-PIPA 제17조)
   - [ ] 발송 후 플랫폼에서 취소할 수 없음을 이해합니다.

   버튼: [취소] / [지원하기 = 두 체크 시 활성].

   **접근성**: 4항목은 스크린리더 순차 낭독 가능하도록 `<dl>` 시맨틱 마크업 (`<dt>` = 항목명, `<dd>` = 내용). 체크박스는 개별 `<label>` 로 연결. modal 은 `role="dialog"` + `aria-labelledby` + focus trap.

   **거부권 명시**: "동의를 거부하실 수 있으나 그 경우 이 공고에 지원할 수 없습니다" 문구는 K-PIPA 제17조 제2항의 거부권 고지 의무 대응. 개인정보처리방침 update (§12 step 10) 에서도 동일 문구 반영.
4. Submit → `applyToJobAction` 호출.
5. 응답 처리:
   - `ok: true` → "지원 완료. 결과는 회사에서 이메일로 연락드립니다." toast. 버튼 상태 `[지원 완료]` 로 잠금.
   - `already_applied` → "이미 지원한 공고예요. 이력 페이지에서 확인." toast.
   - `not_active` → "1기 수강생만 지원할 수 있어요." toast.
   - `job_not_open` → "지원 마감된 공고예요." toast.
6. Background: Vercel Cron (1분 간격) 이 `recruitment_email_log` pending → 발송 → sent 전이. 실패 시 `retrying` (max 3회) → `failed`.

---

## 8. 이메일 발송 (outbox)

### 8.1 발송 workflow

- Vercel Cron: `/api/cron/recruitment-email-outbox` = `*/1 * * * *`.
- Handler:
  1. `SELECT * FROM recruitment_email_log WHERE delivery_status IN ('pending','retrying') ORDER BY created_at LIMIT 50`.
  2. 각 row 마다 이메일 provider (Resend or SES; 기존 kenter 재사용) 호출.
  3. 성공 → `UPDATE ... SET delivery_status='sent', sent_at=now()`.
  4. 실패 → `UPDATE ... SET delivery_status='retrying', retry_count = retry_count + 1, error_message = ?`. retry_count >= 3 이면 `failed`.
  5. `application_id` 매칭 row 의 `student_applications.email_sent_at` 도 성공 시 갱신.

### 8.2 이메일 본문 template

- Subject: `[Growth Career] {title} 지원 접수 - {student_name}`
- Body:
  - 발신자: no-reply@growthcareer.xyz
  - 학생 정보 (이름, 이메일, 국적, cohort).
  - 학생 message (있을 시).
  - Attachment 처리 (S-8 정정): worker 가 `recruitment_email_log.attachments` jsonb 를 순회.
    - `storage_method='external_url'` → 본문에 링크 표기 (`이력서: <a href="...">외부 링크</a>`). 다운로드/base64 인코딩 X.
    - `storage_method='file_upload'` → Supabase Storage 에서 `file_path` 로 fetch → base64 인코딩 후 이메일 첨부.
    - 두 케이스 혼합 가능 (예: 이력서 external + 자기소개서 upload).
  - 문서 fetch 실패 시 email 은 본문만 발송 + `recruitment_email_log.error_message` 에 fetch 실패 doc 기록.
- template 변경 시 `body_snapshot` 에는 발송 시점 원문 그대로 저장.

### 8.3 실패 시나리오

- Resend 5xx → retry.
- 잘못된 recipient_email (bounces) → `failed` + super_admin 알림 (Wave 2, MVP 는 로그만).
- Attachment fetch 실패 (`file_upload` 케이스 Storage 오류) → email 은 실패한 attachment 를 제외하고 발송. 본문에 "이력서 첨부에 실패했습니다. 회사가 요청 시 학생이 직접 회신 예정" 안내 + `recruitment_email_log.error_message` 에 doc_type 기록.
- 학생 문서 전무 (`student_career_documents` row 0건) → email 본문에 학생 message 만 포함하여 발송. 회사가 이력서 요청 시 회사가 학생에게 직접 회신.

---

## 9. 비회원 지원 (플랫폼 무관)

- JD 상세 페이지 하단에 회사 이메일 표시:
  > "회원이 아니시라면 위 회사 이메일로 이력서를 직접 보내주세요: <a href="mailto:...">{contact_email}</a>"
- 로그인 유도 링크 병기: "회원 가입 후 지원하면 이력이 대시보드에서 관리돼요."
- 플랫폼은 이 경로로 지원한 사용자를 트래킹하지 않음. `job_postings.view_count` 는 여전히 카운트.
- **spam 방어**: `contact_email` 은 이미 회사가 노아에게 제공한 것. mailto 링크만 노출 (텍스트 스크레이핑 위험은 회사 자체 관리 책임). 필요 시 Wave 2 에서 obfuscation 검토.

---

## 10. Sage 검토 대상 (v5 대비 대폭 감소)

### 10.1 자동 해결된 v5 이슈

v5 spec 의 Sage CRITICAL/HIGH 대부분은 회사 회원 표면 자체가 소멸하면서 자동 해결.

| v5 이슈 | Simplified 상태 |
|---|---|
| CRIT: applicants → student RLS INSERT hijack | Case B 유지 삭제로 해결 |
| HIGH: 이력서 signed URL Content-Disposition | 이력서 서빙 자체 없음 (이메일 첨부 only) |
| HIGH: idle timeout race + API route 우회 | 회사 세션 없음 |
| HIGH: rate limit fail-closed | 학생 지원은 UNIQUE constraint 로 spam 상한 있음 |
| MED: CSP Report-Only → Enforce | 회사 세션 없음, MVP 제외 |
| MED: 개인정보처리방침 K-PIPA 개정 5조 | 원클릭 지원 동의 modal 1개로 축소 |
| MED: audit_log metadata 어휘 whitelist | audit_log 삭제 |
| LOW: 로고 파일명 timestamp+nanoid | logo_path 는 URL 저장만 |

### 10.2 남은 검토 대상 (Simplified v3 후 예상 CRIT 0 + HIGH 0)

| ID | 예상 severity | 이슈 | v3 상태 |
|---|---|---|---|
| S-1 | HIGH → PASS 후보 | 원클릭 지원 시 이력서를 이메일 첨부로 3자 제공 = K-PIPA 동의 문구 | v2 §7 modal 문구에 K-PIPA 제17조 4항목 (제공받는 자 / 목적 / 항목 / 보유기간) + 거부권 명시 반영. 재검토 대상 |
| S-1b | MED → PASS 후보 | K-PIPA 보유기간 문구가 회사 정책 의존 | v3 §7 modal 문구 `{company_retention_period}` placeholder + §12 step 11 에 회사 온보딩 default 보유 기간 필드 필수 프로세스 명시. 재검토 대상 |
| S-2 | HIGH | 학생 지원 spam (한 학생이 다수 공고 지원, 봇 자동화 방어). UNIQUE constraint 로 posting 당 1건 상한 있지만 계정 다중 생성 시 취약. Vercel Firewall + rate limit middleware 필요 여부 | 미해결. Wave 2 검토 |
| S-3 | MED → PASS 후보 | `recruitment_email_log.body_snapshot` 에 학생 PII (이름/이메일/이력서 URL) 평문 저장 → retention 정책 부재 | v3 §4.1 recruitment_email_log Retention TODO 명시 (Wave 2 파기 cron `channel_email_log_retention` 필수, sent 후 3년 default). 재검토 대상 |
| S-4 | MED | `job_postings.contact_email` 노출 = 회사 담당자 개인정보. 공개 페이지에 mailto 로 노출 = 회사 사전 동의 필요 | 회사 온보딩 시 동의 절차 문서화 필요 |
| S-5 | MED | slug 예측 가능성 (nanoid 8자). draft 상태 slug 우연 열람 방어. RLS 로 status='open' 필터 되므로 방어 OK, 문서화만 필요 | 문서화 완료 (§4.1) |
| S-6 | LOW | admin server action 첫 줄 `assertSuperAdmin()` 강제 (§7.4) 누락 검증 script | 미해결. Wave 2 |
| S-7 | LOW | ISR revalidate=300 = closed 후에도 5분간 공개 페이지 stale. `revalidateTag` 로 즉시 무효화 | 미해결. Wave 2 |
| S-8 | HIGH → PASS 후보 | `students.resume_url` 참조 = 컬럼 부존재 | v2 §4.2 / §6.2 / §8.2 모두 `student_career_documents` (doc_type + storage_method + external_url XOR file_path) 참조로 정정. 재검토 대상 |
| S-8b | LOW → PASS 후보 | `student_career_documents` doc_type 중 portfolio 제외 근거 문서화 필요 | v3 §6.2 step 5 하단에 portfolio 제외 근거 명시 (채용 파이프라인 1차 = 이력서 + 자기소개서. portfolio 는 Wave 2 회사 요청 승인 흐름으로 분리). 재검토 대상 |
| S-9 | HIGH → PASS 후보 | Supabase JS 트랜잭션 없음 = half-commit risk | v2 §4.1 에 `apply_to_job_atomic` SECURITY DEFINER RPC 신설. §6.2 step 6 이 RPC 호출로 재작성. 재검토 대상 |
| S-9b | HIGH → PASS 후보 | RPC `p_student_id` 인자로 타인 대신 지원 impersonation risk | v3 §4.1 RPC 재작성 = `p_student_id` 인자 삭제, 함수 안 `auth.uid()` → `user_profiles.student_id` 조회. §6.2 step 6 client 호출도 인자에서 삭제. 재검토 대상 |

### 10.3 Sage 재검토 대비 timeline

- Iris 마이그레이션 draft → supabase-verify 통과 → Sage 검토 요청.
- 예상 결과: PASS (CRIT 0) 또는 CONDITIONAL PASS (HIGH 1~2 문구 fix).
- 배포 전 5종 체크 (§7.4) 통과 후 Vera push.

---

## 11. Mira QA 시나리오 (12)

| # | 시나리오 | 기대 결과 |
|---|---|---|
| 1 | 익명 사용자가 `/jobs/` 접근 | 200 + status='open' JD 만 리스트 |
| 2 | 익명 사용자가 draft slug 로 `/jobs/[slug]` 접근 | 404 |
| 3 | 익명 사용자가 closed slug 로 접근 | 404 (closes_at < now()) |
| 4 | 로그인 학생 (status='active') 이 [지원하기] 클릭 | modal 뜸 |
| 5 | modal 에서 동의 후 submit | `student_applications` INSERT + `recruitment_email_log` INSERT + toast "지원 완료" |
| 6 | 같은 학생 같은 공고 재지원 | `already_applied` toast, INSERT X |
| 7 | applicants (status='pending') 로 로그인 → 지원 시도 | `not_active` toast |
| 8 | 학생이 발송 전 취소 (email_sent_at IS NULL) | status='withdrawn' + email_log 도 failed |
| 9 | 학생이 발송 후 취소 시도 | `already_sent` toast (취소 불가) |
| 10 | 노아 admin 이 draft JD 등록 | `/admin/jobs/` 에서 draft 표시. 공개 페이지 노출 X |
| 11 | 노아 admin 이 publish 클릭 | published_at 채워지고 status='open'. 공개 페이지에 즉시 노출 (revalidateTag) |
| 12 | Vercel Cron 1분 후 pending email 이 sent 로 전이 + 회사 이메일 수신 확인 | delivery_status='sent' + sent_at 채워짐 |
| 13 | (S-9b 방어) 학생 A 로그인 상태에서 devtools 로 `supabase.rpc('apply_to_job_atomic', {...})` 인자에 학생 B 의 student_id 를 넘길 시도 | RPC 시그니처 자체가 `p_student_id` 인자 없음 = 호출 자체 실패. auth.uid() 로 서버가 결정하므로 학생 A 명의 지원만 성사 |

---

## 12. 배포 순서

1. **Iris 마이그레이션 draft** = `supabase/migrations/20260706000000_recruitment_mvp.sql`. 로컬 supabase reset 으로 shape 검증.
2. **supabase-verify.mjs** 통과 (§4.4 검증 4건).
3. **Sage 재검토 요청** = Simplified spec + 마이그레이션 draft + application layer skeleton. CONDITIONAL PASS 이상 받은 후 다음 step.
4. **Luna JD 공개 페이지** = `/[locale]/jobs/` + `/[locale]/jobs/[slug]`. ISR 설정.
5. **Luna admin JD CRUD** = `/[locale]/fan-to-pro/admin/jobs/*` (기존 admin 다크 톤 유지).
6. **Iris server actions** = list/read/apply/withdraw/create/update/publish/close.
7. **Iris email outbox** = `/api/cron/recruitment-email-outbox` + Resend integration.
8. **Mira QA** (§11 12건 통과).
9. **Sage 최종 통과** (§7.4 5종 체크).
10. **개인정보처리방침 update** = 원클릭 지원 시 회사 이메일 3자 제공 동의 조항 1개 추가.
11. **회사 온보딩 form 필드 확정 (S-1b fix)** = 회사가 JD 를 등록하기 위해 노아에게 제출하는 온보딩 form 에 **default 보유 기간 필드 필수 항목** 추가. 일반값 = "채용 절차 종료 후 3~5년". 이 값은 `job_postings.company_retention_period` 컬럼 (Wave 2 신설 예정) 또는 admin 등록 시 텍스트 입력으로 캡처하여 modal 문구 `{company_retention_period}` placeholder 에 치환. MVP 는 admin 등록 form 에 free-text 필드로 우선 도입.
12. **Vera prod deploy** = git push (main branch trigger).
13. **노아 수동 검증** = 유니온픽처스 JD 실제 등록 + 본인 학생 계정으로 지원 flow 왕복.

---

## 13. 1년 뒤 바뀔 곳

Sophia 원칙 §4 = "이게 1년 뒤 바뀌어야 한다면 어디를 손대게 되나?"

- **회사 self-service 대시보드 도입** = `job_postings.company_name` in-line 을 별도 `companies_partners` 테이블로 승격 마이그레이션. `company_partner_id` FK 추가. 이 시점에 v5 아이디어 다시 검토 (그때는 실 수요 데이터로 판단).
- **지원자 상태 machine 도입** = `student_applications.status` 를 6-value 로 확장 + `recruitment_audit_log` 도입. MVP 는 2-value 로 충분.
- **이력서 저장/서빙** = 이메일 첨부 → Storage bucket + signed URL 전환. Sage 재검토 필요.
- **매칭 알고리즘** = `job_postings.role_category` × `students.desired_role` 매트릭스 → 추천. Nova 참여.
- **rate limit** = Vercel Firewall 기본 규칙으로는 부족해질 시 Upstash Redis.
- **회원 감사 로그** = admin 회사 이메일 등록 이력, JD 공개/마감 이력.

**공통 원칙**: 위 확장들은 모두 별도 B 번호로 분리. 스코프 확장으로 인해 이 spec 을 재작성하지 않는다.

---

## 14. Rejected Alternatives

### A. v5 회사 회원 계정 유지

- **거부 이유**: 노아 명시 요청 = "회사는 로그인 없이 이메일만 받음". 4th role 도입은 오버엔지니어링. 실 수요 검증 전 auth 확장은 유지 비용 큼.
- **재고 조건**: 회사 수 30 개 이상 + 회사 담당자가 자기 JD CRUD 를 원한다는 실 요청 3건 이상 누적 시.

### B. 회사 정보 별도 테이블 (companies_partners)

- **거부 이유**: MVP 는 회사당 JD 평균 1~2 개 예상. in-line 컬럼이 join 비용 없이 SEO 렌더에 유리.
- **재고 조건**: 한 회사가 다수 JD 를 등록하면서 회사 프로필 (로고, 소개, 재직자 인터뷰) 을 별도 페이지로 노출할 때.

### C. 이력서 저장/서빙 (Storage + signed URL)

- **거부 이유**: 이메일 첨부는 회사 workflow 와 정합 (기존 채용 프로세스 그대로). Storage + signed URL 은 회사 대시보드 존재 전제.
- **재고 조건**: 회사 대시보드 도입 시 동반.

### D. 지원자 상태 machine (under_review / interview / offer / hired)

- **거부 이유**: 회사가 플랫폼에 상태를 입력할 방법이 없음. 학생 유의미한 정보 없이 UI 만 복잡.
- **재고 조건**: 회사 대시보드 도입 시 동반.

### E. audit_log + retention cron

- **거부 이유**: 회사 열람 표면 소멸. `recruitment_email_log` 로 outbox 발송 관측만으로 충분.
- **재고 조건**: 감사가 필요한 회사 세션 표면이 도입될 때.

### F. Rate limit MVP 필수

- **거부 이유**: UNIQUE(student_id, job_posting_id) 로 posting 당 1건 상한. 학생 계정 자체는 노아 invite 기반 = spam 위험 낮음.
- **재고 조건**: 학생 self-signup 도입 또는 회사 이메일 스팸 신고 접수 시.

### G. Case B (applicants 직접 지원)

- **거부 이유**: v4 결정 그대로. applicants → students 승격은 노아 수동. 이메일 소유권 hijack 위험 회피.
- **재고 조건**: 자동 승격 use case 도입 시 동반 재검토.

---

## 부록: v5 대비 삭제된 섹션

v5 spec 의 다음 섹션들이 Simplified 에서 삭제됨:

- §3.1 지원 자격 사용자 분기 3-way (Case A/B/C). Case B 삭제 유지되었으므로 서술 자체 불요
- §4.1 companies_partners 테이블 정의
- §4.1 recruitment_audit_log 테이블 정의 (11 action 어휘 + metadata whitelist + 4KB CHECK + retention cron)
- §4.2 user_profiles 확장 (`company_partner_id` + 3-way CHECK constraint)
- §4.3 companies_partners RLS (super_admin/program_admin/company_user 4 policy)
- §4.3 job_postings company_user_all RLS
- §5.1 LmsUser type 확장 (`lastActivityAt`)
- §5.2 getLmsUser last_activity_at 편입
- §5.5 `/api/heartbeat` beacon + Origin 검증
- §7.x 회사 회원 초대 흐름
- §8.x 이력서 signed URL 서빙 (5분 TTL + Content-Disposition attachment)
- §8.5.1 CSP Report-Only → Enforce 2주 전환 워크플로우
- §8.6 원자적 status 전이 (log_resume_read_atomic RPC)
- §12 rate limit (Upstash Redis)
- §16 audit 관리 UI (super_admin)
- §17 개인정보처리방침 K-PIPA 대규모 개정 (제8조 감사 로그 5년 보관 등)
- Middleware `parsePath` `partners` kind 확장
- Storage bucket RLS SQL (student-resumes / companies-logos, path traversal 방어)
- 로고 파일명 timestamp+nanoid 규칙

**요약**: v5 = 1857 line, Simplified v2 = 777 line, Simplified v3 = 804 line. 삭제 비율 ~57% (v3 는 v2 대비 +27 line, S-9b RPC 재작성 + minor 3 문구 반영으로 인한 증가).
