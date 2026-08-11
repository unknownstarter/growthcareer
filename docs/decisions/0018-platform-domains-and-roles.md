# ADR 0018 - Platform Domains + 통합 역할 모델 (코어 하드닝)

**Status**: **Draft** (Slice 3/N — 노아 확정 3건 반영: (1) ATS 최소 뎁스 상태머신 + 전이 규칙, (2) Employer 별도 진입점(landing)·어드민 분리, (3) Community 회사 피드 권한. 아직 코딩 X)
**Date**: 2026-07-31
**Deciders**: 노아 + Sophia (Tech Architect). 후속 = Aria (PO) / Iris (Backend) / Sage (Security) 리뷰 예정
**Tags**: platform, domains, iam, roles, admissions, learning, ats, content, community, employer, pro, clean-architecture, state-machine, data-integrity
**Related**: ADR 0005 (LMS 클린아키텍처) / 0007 (사이트맵) / 0008 (URL·Auth 분리) / 0013 (Multi-track + Recruitment) / 0015 0016 (Platform Evolution PO·PD) / 0017 (성능·인증 리팩터·코워크). CLAUDE.md §2.5 §7.4 §7.5.
**Marker**: [gating] — 미래 로드맵 확정 (권한 정책·도메인 경계). 즉시 구현 X. 개별 빌드는 별도 gating.

---

## 이 draft 의 목적 (Slice 2 — 방향 전환)

Slice 1 은 "역할 안 늘림 = employer 안 만듦 (회사 로그인 표면 소멸)" 으로 결론냈다. **노아가 이 방향을 뒤집었다.**

노아 방향 전환 요지:
1. **기업 셀프서비스 = 확정 로드맵**. 회사가 기업 메일로 계정 생성 → 공고 등록 → 지원자 열람 → 지원자 상태 관리 (탈락/서류합격/면접예정/n차/최종합격) → 면접 일정 발송·확인·장소 공유. 회사 로그인 표면을 **명시적으로 원함**. Slice 1 의 "employer 안 만듦" 은 무효.
2. **수강생 → "Pro" 로 통합**. 수강생 = 학습(LMS 수강) + 취업(이력서/포트폴리오 self-manage + candidate) + 커뮤니티(피드 공유) 를 겸하는 **단일 identity**. 기존 student 역할을 Pro 로 리네임·확장.

**핵심 제약(노아)**: 최대 단순화 + 유저 안 헷갈림. Pro 하나가 학습+취업+커뮤니티를 겸하므로 역할 수는 안 늘고 오히려 정리됨. 신규 역할은 Employer 1개.

이 문서는 **하나의 통합 지도**. 개별 ADR (0008 인증, 0013 멀티트랙·채용, 0016 전시, 0017 인증 리팩터) 을 6 도메인 + 통합 역할 모델로 합쳐 코어를 못 박는 상위 인덱스. **개별 ADR 을 대체하지 않음.**

**중요 — 확정 정책 vs 미래 빌드 경계**: 이 ADR 이 "지금 확정" 하는 것은 **권한 정책 + 도메인 경계 + 스키마 소유권 + 상태 전이 규칙** 뿐. Employer 셀프서비스 UI 와 Community 피드는 **후순위 빌드** (스키마 자리만 예약, 코드 X). 아래 §5 빌드 순서에서 명확히 구분.

**Slice 3 확정 3건**:
1. **ATS 상태머신 = 최소 뎁스 + 전이 규칙** (§4b 신규). 고정 6단계 나열 아님. 현재 상태에서 "갈 수 있는 다음 상태만" 드롭다운/칩으로 선택. 면접 라운드 수는 공고별/지원자별 employer 설정.
2. **Employer = Pro 와 물리적으로 분리된 진입점**. 원티드 기업회원처럼 `/employers` 소개 landing → 인증 → employer 어드민. GC 메인·Pro 표면과 안 섞임 (§3b 신규).
3. **Community 피드 = Pro(개인) + Employer(회사) 둘 다 작성 가능**. 링크드인 회사 페이지 방식. actor 타입 구분 (§D6 개정).

---

## 실측 — 지금 코어에 이미 있는 것 (추측 아님)

| 영역 | 상태 | 근거 |
|---|---|---|
| **역할 3계층** | 구현 완료 | `lms-role.ts` 배럴 → super_admin (`user_profiles.is_super_admin`) / program admin (`program_memberships`) / cohort member (`cohort_memberships` role=instructor·student) |
| **두 인증 시스템 분리** | 운영 중 | `middleware.ts` — `/admin/*` Basic Auth (admin·viewer) + `/[locale]/auth/*` + `/[locale]/fan-to-pro/(lms)/*` Supabase Auth |
| **courses·bundles·enrollments** | 엔티티 + 스키마 존재 | `domain/entities/{course,bundle,bundle-course,enrollment,enrollment-course}.ts` |
| **ATS (채용)** | **MVP 구현 완료 (B0072)** | `domain/entities/{job-posting,student-application,recruitment-email-log}.ts` |
| **ATS 상태머신** | **2-value 만 (applied/withdrawn)** | `student-application.ts` L15 — v5 6-value 는 "회사 로그인 표면 소멸" 전제로 폐기됨 |

**결정적 사실 (Slice 2 에서 재해석)**: ATS 는 현재 **employer 역할 없이** 2-value 로 구현돼 있다 (`STUDENT_APPLICATION_STATUSES = ["applied","withdrawn"]`). 노아가 회사 로그인 + 다단계 상태를 원하므로 이 2-value 상태머신은 **다시 확장돼야 한다.** 이건 기존 엔티티 수정을 요구한다 → §열린 질문 Q1 에서 파급 범위 flag. 지금 코드 수정 X, 계획만.

---

## 1. 6 도메인 책임 경계 맵 (Community 신규 추가)

각 도메인 = 소유 데이터 + 핵심 state machine + 경계(안 하는 것). 클린 아키텍처 레이어(domain/application/infrastructure/interface)는 6 도메인 공통.

Slice 1 대비 변경: **D4 ATS = employer 셀프서비스 포함하도록 확장 + Interview Scheduling 하위 capability**, **D6 Community 신규**.

### D1. IAM (회원·권한)

- **책임**: 인증 시스템 관리, 역할 판정, 세션, invite 온보딩, PW 정책. **profile type 분리 (Pro vs Employer)**.
- **소유 데이터**: `auth.users`(Supabase), `user_profiles`(is_super_admin, must_change_password, **profile_type ∈ {pro, employer}**, studentId/instructorId FK), `program_memberships`, `cohort_memberships`, **`employer_memberships`**(회사 계정 ↔ 회사 org, 신규 예약). + Basic Auth env 자격(admin·viewer).
- **핵심 상태**: 사용자 lifecycle = `invited → first_login(must_change_password=true) → active`. **Employer 는 self-signup (기업 메일 도메인 검증) → active** (invite 아님, Pro 와 다른 온보딩). viewer = 시각 cutoff 로 자동 만료.
- **경계 (안 함)**: 도메인 데이터(성적·결제·공고) 소유 X. 오직 "누가 무엇에 접근 가능한가" 판정만.
- **레이어**: `authorize()`(domain 순수, ADR 0017) / `resolveAuthContext` Edge·Node 2벌(infrastructure) / `assert*` 파사드(interface 가드). **`assertPro` / `assertEmployer` 신규 파사드 예약.**

### D2. Admissions (모집·결제 CRM)

- **책임**: 지원자 접수, 결제 확인, 코워크(viewer) read, 운영 메시지, 정산 base.
- **소유 데이터**: `applicants`(ADR 0010 보존, additive 만), `enrollments`/`enrollment_courses`(결제 단위), `cohort_expenses`.
- **핵심 상태**: applicant `status` = pending → paid → enrolled (또는 refunded/cancelled/next_cohort_interest). **정산 base = SUM(paid_amount) where status ∈ {paid,enrolled}** (ADR 0017 D5, 시각·수동전환 무관 실데이터).
- **경계 (안 함)**: 수업 진행(출석·과제) X. **`/admin/*` Basic Auth 표면 = 이 도메인. §7.4 변경 금지.**
- **레이어**: 기존 `application/admin-actions.ts` 등 시그니처 보존(§7.4).

### D3. Learning (LMS 수업·Pro 학습)

- **책임**: cohort·session 운영, 출석, 자료·과제·제출·피드백, 컨설팅, 수료증. **Pro 의 "학습 맥락".**
- **소유 데이터**: `cohorts`, `sessions`, `attendance`, `materials`, `assignments`, `submissions`, `feedback`, `consultations`, `certificates`, `student_notes`.
- **핵심 상태**: session = 시각 판정(`ends_at < now` = elapsed, ADR 0017 P-2 + lesson 2026-07-23 — **수동 status="ended" 전환 의존 금지**). 출석률·진도율·수료 자격 = elapsed session 기준 실집계.
- **경계 (안 함)**: 결제/환불 판정 X(Admissions read). 공고·채용 X(ATS). 전시 X(Content). **이력서/포트폴리오 소유 X(Career).**
- **레이어**: `application/use-cases/{admin,instructor,student→pro}/` + `domain/services/`.

### D4. ATS + Employer 셀프서비스 (공고 → 지원 → 파이프라인 → 면접)

Slice 1 대비 **가장 크게 변경**. employer 를 1급 표면으로 승격.

- **책임**: 회사 계정의 공고 등록·공개, Pro 원클릭 지원, **회사의 지원자 파이프라인 상태 관리 (다단계)**, **면접 일정 발송·확인·장소 공유 (Interview Scheduling)**.
- **소유 데이터**: `employer_orgs`(회사 org, 기업 메일 도메인), `job_postings`(org FK 로 전환 — v5 in-line 회사정보 → org 참조. + `interview_rounds` int 기본 1, 선택 1/2/3), `student_applications`(**상태머신 확장** + `current_round` int), `application_events`(상태 전이 감사 로그, 신규), `interview_schedules`(신규), `recruitment_email_log`.
- **핵심 상태**:
  - 공고 = `draft → open(published_at) → closed(closes_at 도달 or 수동)`. 공개 노출 = `isPubliclyVisible`(시각 판정). 공고 생성 시 employer 가 **면접 라운드 수(1/2/3) 를 선택**(옵셔널, 지원자별로 override 가능). §4b 참조.
  - 지원 = **최소 뎁스 상태머신 + 전이 규칙** (노아 확정). 고정 6단계 나열 아님. 서류 합격부터 employer 가 "현재 상태에서 갈 수 있는 다음 상태만" 드롭다운/칩으로 선택. **§4b 에서 enum + 전이 규칙 못 박음.** 각 전이 = `application_events` append (회사의 실제 채용 결정, lesson 2026-07-23 예외 — §Q2).
  - **Interview Scheduling** = ATS 하위 capability. 캘린더 아님. 자체 상태머신: `proposed(회사가 일정 발송) → confirmed(Pro 확인) / declined(Pro 거절, 재조정) → completed`. 장소 = text/URL 공유 (외부 캘린더 통합 X).
- **경계 (안 함)**: 결제 X. Pro 프로필/이력서 write X(Career 가 소유, ATS 는 지원 시 스냅샷 read). 회사 간 지원자 데이터 격리 (org scope RLS). ML 매칭 X(rule-based role_category).
- **레이어**: `application/use-cases/recruitment/{employer,pro}/` + `domain/entities/{job-posting,student-application,interview-schedule}.ts`.

### D5. Content (Insight 공개 허브)

- **책임**: 우산 전시(성과·스토리·강사·파트너·블로그·코스카탈로그·대기).
- **소유 데이터**: `outcome_reports`(append-only, 감사됨), `partners`, `cohorts.showcase_slug/hero_stat`, MDX(`content/stories`, `content/blog`).
- **핵심 상태**: outcome = 감사 snapshot(`audit_date` NOT NULL, RLS insert super_admin). 전시 = SSG/ISR. waitlist = `force-dynamic`(§7 시각 기반).
- **경계 (안 함)**: 실시간 DB 지표 계산 X(조작·fluctuation 방지, Lambda 교훈). 결제 X. PII X. **Community 피드 X(별도 도메인 — 공개 전시 vs 회원 소셜 구분).**
- **레이어**: `src/programs/growth-career/` (우산 프로그램, ADR 0016). `(marketing)/` route group.

### D6. Community (Pro 피드 + 회사 피드·소셜) — 신규

노아 요구: "Pro 들의 커뮤니티를 만들어서 링크드인처럼 서로 피드 공유." + Slice 3 추가: "링크드인 보면 회사 계정으로도 회사 홍보를 위해 피드를 쓸 수 있으니까 그런 권한에 대해선 생각해봐야 해."

- **책임**: 피드 공유(Pro 개인 + Employer 회사 홍보), 팔로우/연결, 게시물·댓글·반응. **회원 소셜 그래프** (Content = 공개 전시와 분리).
- **작성 주체 = 2 actor 타입** (Slice 3 확정): (a) **Pro 개인 포스트** (개인 페르소나), (b) **Employer 회사 포스트** (회사 페르소나 = 링크드인 회사 페이지 방식). 회사 포스트 작성 권한 = 해당 `employer_org` 멤버(`employer_memberships`). Pro 는 회사 포스트를 팔로우·반응 가능(작성 X). §D6b 참조.
- **소유 데이터**: `pro_profiles`(공개 프로필 = 이력서/포트폴리오의 커뮤니티 노출면, Career 와 공유), `feed_posts`(+ `actor_type ∈ {pro, employer_org}` + `actor_id`), `post_comments`, `post_reactions`, `connections`(팔로우/연결 그래프 = Pro↔Pro + Pro→employer_org 팔로우).
- **핵심 상태**: post = `draft → published → archived`. connection = `pending → accepted / declined`(Pro↔Pro 양방향) 또는 `following`(Pro→회사 단방향 팔로우, 상호 승인 불필요). 실시간 없이 시각·실데이터 판정.
- **경계 (안 함)**: 이력서 원본 소유 X(Career 소유, Community 는 published view read). 채용 파이프라인 X(ATS — 회사 포스트는 홍보용, 공고 지원과 분리). 결제·학습 X. **Employer 는 회사 포스트 작성 목적으로만 Community 에 참여** (개인 소셜 그래프 멤버 아님 — Pro↔Pro 연결에 안 낌).
- **레이어**: `application/use-cases/community/{pro,employer}/` + `domain/entities/{feed-post,connection}.ts`(예약, 후순위 빌드).

### D6b. 회사 피드 권한 정책 (Slice 3 확정, 빌드는 후순위)

노아 확정: Community 피드는 Pro 전용이 아니다. Employer 도 회사 홍보 목적 회사 포스트 작성 권한을 가진다(링크드인 회사 페이지 방식). **지금은 권한 정책만 확정, 피드 빌드는 후순위.**

| 축 | 정책 |
|---|---|
| **작성 주체** | Pro(개인 페르소나) + Employer(회사 페르소나). `feed_posts.actor_type` 로 구분 |
| **회사 포스트 작성 자격** | 해당 `employer_org` 의 멤버(`employer_memberships`) 만. 아무 Employer 가 남의 회사 이름으로 못 씀 (org scope) |
| **Pro 의 회사 포스트 접근** | read + 반응(reaction) + 팔로우(`following`). 작성 X, 댓글은 Pro 로서 가능 |
| **표시** | 회사 포스트 = 회사 로고·이름 페르소나로 렌더 (개인 포스트와 시각적 구분). "Posted by {org.name}" |
| **actor 모델 tradeoff** | polymorphic `(actor_type, actor_id)` vs 별도 `company_posts` 테이블 분리 — §Q(신규) 열린 질문. 현재 draft = polymorphic 단일 `feed_posts` |
| **Employer profile_type 와의 관계** | Employer 는 `/employer/*` 표면에서 회사 포스트 작성 진입 (Pro 피드 표면과 분리). 작성된 회사 포스트는 Pro 피드 타임라인에 함께 노출 |
| **모더레이션** | 회사 포스트도 super_admin 모더레이션 대상 (스팸·홍보 남용 방어) |

**경계**: 회사 포스트 = 홍보(브랜딩)용. 채용 공고는 여전히 ATS(D4). 회사가 "공고 냈어요" 홍보 포스트를 쓸 순 있으나, 지원은 ATS 공고 링크로만 (피드에서 직접 지원 X — 도메인 경계 유지).

### D-shared. Career (Pro 자산 — 이력서/포트폴리오)

Pro 의 이력서/포트폴리오는 3 도메인이 read 하는 **공유 자산**이라 소유권을 명확히 못 박는다.

- **소유**: **Pro (self-manage)**. `career_documents`(이력서/포트폴리오), `pro_profiles`(공개 요약).
- **read 하는 도메인**: ATS(지원 시 스냅샷), Community(공개 프로필 노출), Learning(선택 — 컨설팅 시 강사가 참조).
- **write 는 Pro 만.** 다른 도메인은 read/snapshot 만. 이게 "한 사람 다중 맥락" 헷갈림 방지의 핵심 (자산은 하나, 맥락별로 read).
- **위치 결정**: Career 를 독립 7번째 도메인으로 승격할지, Community 하위로 둘지는 §Q3. 현재 draft = **Pro-owned 공유 자산 (도메인 간 read-only)** 으로 두고, Community/ATS 가 참조.

### 도메인 간 의존 방향 (한 방향만)

```
Content ──read──▶ Learning ──read──▶ Admissions
                     │                    │
Community ──read──▶ Career(Pro 소유) ◀──read── ATS(+Employer)
                     │                    │
   모두 ────────────┴── IAM (authorize) ◀┘
```

- IAM 은 모두가 의존(판정). 역방향 없음.
- **Career = Pro 소유 자산.** ATS·Community 가 read 만. 아무도 Pro 자산에 write 못 함(Pro 본인 외).
- ATS·Learning·Admissions·Community = 서로 write 금지, read 만.
- Content 는 공개 전시(감사 snapshot). Community 는 회원 소셜(실시간 근사). **둘은 절대 합치지 않음** (공개 vs 회원 경계).
- **이 방향이 깨지면 = 경계 붕괴** (예: ATS 가 Career 원본 write = Pro 자산 침해).

---

## 2. 통합 역할 모델 (Slice 2 개정)

### recommendation: **5 Supabase 역할 + Basic Auth viewer 격리.** student → Pro 통합, Employer 신규.

| 역할 | 정체 | profile_type | 온보딩 |
|---|---|---|---|
| **super_admin** | 플랫폼 최고 운영자 (노아) | (Basic + Supabase 2계정) | 수동 |
| **program admin** | program 별 운영자 | pro (운영 flag) | invite |
| **instructor** | cohort 강사 | pro (instructor flag) | invite |
| **Pro** | **학습 + 취업 + 커뮤니티 통합 유저** (구 student) | **pro** | invite (수강생) / self (미래 오픈 가입) |
| **Employer** | **회사 셀프서비스** (공고·지원자·면접) | **employer** | **self-signup (기업 메일 도메인 검증)** |
| **viewer** | 코워크 read (Basic Auth, 격리) | — (Supabase 아님) | env |

**역할 수 변화**: Slice 1 = 3계층 + viewer. Slice 2 = student 를 Pro 로 통합(이름·권한 확장, 역할 수 유지) + **Employer 1개 신설**. 순증 = 1. 노아 "최대 단순화" 제약 준수.

**Pro = 단일 identity 원칙**: 한 Pro 계정이 학습(수강생) + 취업(candidate) + 커뮤니티(멤버) 를 **같은 로그인**으로 겸함. 역할 분기 없음 = 헷갈림 없음. 수강생이 곧 구직자이고 곧 커뮤니티 멤버.

### 역할 × 도메인 권한 매트릭스 (6 도메인 + Career)

| 역할 | IAM | Admissions | Learning | ATS+Employer | Career(Pro자산) | Community | Content |
|---|---|---|---|---|---|---|---|
| **super_admin** | 전체 | 전체 | 전체 | 전체 공고·지원 read + 회사 org 관리 | 전체 read | 모더레이션 | outcome/partner write |
| **program admin** | 본인 program 멤버십 | 본인 program 지원자 | 본인 program cohort 전체 | 본인 program 공고·지원 read | 본인 program Pro read | (super만 모더) | (super만 write) |
| **instructor** | 본인 profile | X | 담당 cohort 학생·자료·과제·피드백·컨설팅 | X | 담당 Pro career read(컨설팅) | X | X |
| **Pro** | 본인 profile·PW | 본인 enrollment read | 본인 자료·과제 submit·피드백 read | 본인 지원 write + 공개 공고 read + 면접 confirm + withdraw | **본인 이력서/포트폴리오 write** | 개인 피드 write + Pro↔Pro 연결 + 회사 포스트 팔로우·반응·댓글 | 공개 read |
| **Employer** | 본인 회사 org profile | X | X | **본인 org 공고 CRUD + 지원자 파이프라인 전이 + 면접 일정 발송** | 지원자 스냅샷 read(지원 건만) | **본인 org 회사 포스트 write(홍보)** + 반응 | 공개 read |
| **viewer**(Basic·격리) | X | 마스킹된 지원자 현황 read (시각 cutoff) | X | X | X | X | X |

> viewer 는 Supabase 역할 아님 = Basic Auth. **두 인증 시스템 절대 통합 금지**(ADR 0008 재확인).
> Employer 는 **본인 org scope 밖 데이터 완전 격리** (RLS org_id). 다른 회사 공고·지원자 열람 X. Pro 의 Career 자산은 **본인 org 에 지원한 건에 한해 스냅샷 read** (전체 Career DB 열람 X — PII 방어선).

---

## 2b. 인증 시스템: 2-auth → 3-profile-type

Slice 1 은 "2 인증 시스템" (Basic Auth + Supabase Auth). Slice 2 는 그대로지만 Supabase Auth 안이 **2 profile type 으로 분기**한다.

| 축 | Slice 1 | Slice 2 |
|---|---|---|
| 인증 시스템 수 | 2 (Basic + Supabase) | **2 유지** (Basic + Supabase) |
| Supabase profile type | 1 (모두 학습/운영) | **2 (pro / employer)** |
| 표현 | "2-auth-system" | "**2-auth-system + 2-profile-type**" (Basic Auth viewer 포함 시 3 access class) |

- **`/admin/*` Basic Auth = 불변** (ADR 0008). admin·viewer. 변경 금지.
- **Supabase Auth = pro + employer 2 profile type.** `user_profiles.profile_type` 로 분기. 로그인 후 목적지·표면·RLS 가 profile_type 으로 갈림.
- **Pro 온보딩** = 운영자 invite (수강생) + 첫 로그인 PW 변경 (ADR 0008 기존). 미래에 self-signup 오픈 시 별도 gating.
- **Employer 온보딩** = self-signup + 기업 메일 도메인 검증 (invite 아님 — 회사가 스스로 가입). Pro 와 다른 흐름. **신규 인증 표면 = Sage 검토 필수.**
- **profile_type 은 상호배타** (한 계정 = pro XOR employer). 겸직은 §3 참조.

---

## 3. 회원 헷갈림 방지 + 한 사람 다중 맥락

한 사람이 여러 맥락일 때. Pro 통합으로 **오히려 단순해짐** (학생/구직자/커뮤니티가 한 identity).

| 원칙 | 내용 |
|---|---|
| **Pro = 단일 identity, 맥락은 URL 로 분리** | 같은 Pro 계정 · `/[slug]/pro/learn/*`(학습) · `/pro/jobs/*`(취업) · `/pro/feed/*`(커뮤니티). **로그인은 하나, 표면은 목적별.** 역할 분기 UI 없음 |
| **Employer 표면 완전 분리** | `/employers` 소개 landing → `/employer/*` (회사 대시보드). Pro 표면과 진입점·URL·RLS·profile_type 전부 격리(§3b). 원티드 기업회원 패턴 |
| **로그인 후 단일 목적지** | `resolveLoggedInDestination` 이 profile_type 우선 판정 → pro 면 Pro 홈, employer 면 Employer 홈. super_admin > program admin > instructor > pro 순은 pro 내부 |
| **Career 자산은 하나** | Pro 의 이력서/포트폴리오 = 단일 원본. 학습·지원·커뮤니티가 각자 read. "여러 곳에 이력서 또 쓰기" 없음 = 헷갈림 방지 |
| **두 계정 별도(노아)** | Basic Auth(모집 CRM) + Supabase(super_admin). cookie scope 분리. ADR 0008 불변 |

### 한 사람이 Pro + Employer 겸직 가능한가? (예: 강사가 회사도 운영)

**recommendation: profile_type 상호배타 유지 (한 계정 = pro XOR employer). 겸직은 별도 계정 2개.**

| 옵션 | 내용 | tradeoff | 판정 |
|---|---|---|---|
| **A (권고)** | 한 계정 = 단일 profile_type. 강사이면서 회사 운영자면 **이메일 다른 계정 2개** (개인메일 Pro + 기업메일 Employer) | 단순. RLS 명료(org scope 침범 0). 헷갈림 0(맥락=계정). 노아 이미 Basic+Supabase 2계정 익숙 | ✅ 채택 |
| B | 한 계정 multi profile_type (토글 전환) | 강력하지만 RLS 복잡(같은 계정이 org 안팎 왕래). Employer 가 자기 회사 공고에 Pro 로 지원 = 이해충돌·자기추천 사고 여지. Sage 대공사 | ❌ 거부 (겸직 수요 3회+ 전엔 X) |

- **근거**: Employer 는 기업 메일로 self-signup 하므로 **이메일 자체가 맥락 구분자**. 강사(개인/운영 메일=Pro) 와 회사운영(기업 메일=Employer) 은 자연히 다른 이메일 → 계정 분리가 오히려 자연스럽다.
- **이해충돌 방어**: 상호배타면 "회사 운영자가 자기 공고에 지원자로 몰래 참여" 가 구조적으로 불가능 (Pro 계정과 Employer 계정이 별개, org scope 격리).
- **1년 뒤 겸직 수요 실증되면**: profile_type 을 array 로 확장 + 맥락 전환 UI. **IAM 도메인만 손댐** (경계 격리).

---

## 3b. Employer 진입점 분리 — 별도 landing → employer 어드민 (Slice 3 확정)

노아 확정: "Employer 는 GC 메인/일반 페이지에 거의 들어올 일 없음. 원티드 기업회원처럼 **별도 소개 진입점(landing)** 에서 시작 → 권한에 맞는 employer 어드민으로 랜딩. Pro 여정과 물리적으로 분리."

### 라우팅 설계

| 표면 | 경로 | 대상 | 인증 |
|---|---|---|---|
| **Employer 소개 landing** | `/employers` (또는 `/business`) | 공고 내려는 회사(비로그인) | public (소개 + 가입 CTA) |
| **Employer 가입/로그인** | `/employers/signup` `/employers/login` | 회사 담당자 | Supabase Auth, profile_type=employer, 기업 메일 도메인 검증 |
| **Employer 어드민** | `/employer/*` | 인증된 Employer | Supabase role 가드(employer profile_type + org scope) |
| Pro 여정 | `/pro/*`, `/[slug]/pro/*` | 학습·취업·커뮤니티 | Supabase, profile_type=pro |

- **소개 landing(`/employers`) = 공개 마케팅 페이지** (원티드 기업회원 소개처럼). GC 메인 네비게이션에는 눈에 안 띄는 진입(footer 링크 정도). Pro 사용자가 실수로 흘러들지 않게.
- **로그인 후 목적지**: `resolveLoggedInDestination` 이 profile_type=employer 판정 → **바로 `/employer` 어드민**. Pro 홈·GC 메인 안 거침.
- **Pro 표면과 URL·네비게이션·profile_type·RLS 전부 격리.** Employer 는 `/pro/*` 접근 시 403(profile_type 불일치). Pro 는 `/employer/*` 접근 시 403.

### 진입점 분리 tradeoff

| 옵션 | 내용 | tradeoff | 판정 |
|---|---|---|---|
| **A (권고)** | `/employers` 독립 landing → `/employer` 어드민. GC 메인과 분리 | 원티드 패턴. Pro/Employer 여정 물리 분리 = 헷갈림 0. 마케팅 메시지도 회사 대상 별도 | ✅ 채택 |
| B | GC 메인에 "기업 회원" 탭 통합 | 진입 발견성은 높으나 Pro(개인 구직자·학생)와 회사가 같은 화면 = 혼선. 노아 "거의 안 들어옴" 의도와 배치 | ❌ 거부 |

- **근거**: Employer 는 방문 빈도 낮고 목적 명확(공고·지원자 관리). Pro 여정(학습·취업·커뮤니티, 매일 방문)과 섞으면 양쪽 다 흐려짐. 원티드도 개인/기업 진입을 물리 분리.
- **1년 뒤 Employer 규모 커지면**: `/employers` landing 을 독립 마케팅 사이트로 확장 or employer_org 하위 role(recruiter 위임) 추가 = **ATS·IAM 만 손댐.** Pro 표면 무영향.

---

## 4. 데이터 정합성 + 상태 관리 코어

**절대 원칙 (lesson 2026-07-23)**: 모든 state machine = 물리적 시각 or 실데이터 판정. **운영자 수동 상태 전환에 의존 금지.**

| 도메인 | state machine | 판정 근거 |
|---|---|---|
| Admissions | applicant status | 결제 실데이터(`paid_amount`). 정산 = SUM(실결제) |
| Learning | session elapsed | `ends_at < now`(`getElapsedSessionIds`). 출석률·수료 = elapsed 기준 |
| ATS 공고 | draft/open/closed | 공개 = `isPubliclyVisible`(closes_at > now, 시각) |
| **ATS 지원 (확장)** | 최소 뎁스 8-value + 전이 규칙 (§4b): applied → screening → document_passed → in_interview(current_round) → final_offer / document_rejected / interview_rejected / withdrawn | **회사의 실제 채용 결정 = 수동 전이.** 라운드 = `current_round` int(상태 인코딩 X). lesson 2026-07-23 예외(§Q2): 집계·자동전환 대상 아님. 각 전이 = `application_events` append. 통계 = 상태 count(실데이터), 시각 자동전환 안 함 |
| **Interview Scheduling** | proposed → confirmed / declined → completed | 회사 발송·Pro 확인 = 실 액션. completed = 시각 판정(`scheduled_at < now`) 보조 |
| **Community post** | draft → published → archived | Pro 실 액션. 실시간 없이 실데이터 |
| Content outcome | 감사 snapshot | `audit_date` NOT NULL. 실시간 계산 X |

**정합성 가드**:
- 집계는 실데이터/시각. UI 표시값과 DB 판정값 = 같은 헬퍼 경유.
- mutation = `assert*`(신규 `assertEmployerOrgScope`) + RLS 2중(org_id scope).
- 도메인 간 = read only. Career 원본 = Pro 만 write.
- **ATS 확장 상태는 lesson 2026-07-23 의 "수동 전환 의존 금지" 를 위반하지 않는다** — 출석률처럼 "운영자가 안 눌러서 집계 0" 되는 구조가 아니라, 회사의 실제 채용 결정 그 자체가 데이터. 자동 집계(출석률)는 여전히 시각/실데이터. §Q2 에서 이 구분 확인.

---

## 4b. ATS 지원 상태머신 — 최소 뎁스 + 전이 규칙 (Slice 3 확정)

노아 확정: "최소한의 뎁스." 고정 6단계를 화면에 쭉 나열하는 게 아니라 **현재 상태에서 갈 수 있는 다음 상태만** 드롭다운/칩으로 employer 가 선택. 서류만 보고 최종 합격도 가능(면접 스킵). 헷갈림 방지 = 항상 "지금 여기, 다음 갈 곳" 만 보임.

### 상태 enum (`ApplicationStatus`)

기존 2-value `["applied","withdrawn"]` 를 아래로 확장. **면접 라운드는 상태에 라운드 번호를 인코딩하지 않는다(interview_1/2/3 X). 상태 = `in_interview` 하나 + 별도 `current_round` int 필드.** 근거 = tradeoff 판정 아래.

```
applied            지원 접수 (Pro 원클릭 지원 = 초기 상태)
screening          서류 검토 중 (employer 가 보는 중, 옵셔널 명시 단계)
document_rejected  서류 불합격 (종료)
document_passed    서류 합격
in_interview       면접 진행 중 (current_round 로 n차 표현, interview_schedules 와 연동)
interview_rejected 면접 불합격 (종료, application_events 에 어느 라운드였는지 기록)
final_offer        최종 합격 (종료)
withdrawn          지원자 자진 철회 (종료, Pro 액션)
```

- **종료 상태(terminal)**: `document_rejected`, `interview_rejected`, `final_offer`, `withdrawn`. 이후 전이 없음.
- `current_round` = `in_interview` 일 때만 의미. 공고의 `interview_rounds`(1/2/3) 를 상한으로, 지원자별 override 가능(노아: "공고별 또는 지원자별로 employer 설정").

### 전이 규칙 (state → allowed next states)

```
applied            → screening | document_passed | document_rejected | withdrawn
screening          → document_passed | document_rejected | withdrawn
document_passed    → in_interview | final_offer | document_rejected | withdrawn   (면접 스킵 후 바로 final_offer 허용)
in_interview       → in_interview(next round) | interview_passed→final_offer | interview_rejected | withdrawn
                     (같은 상태 재진입 = current_round++ , 단 current_round < interview_rounds 일 때만)
interview_rejected → (terminal)
document_rejected  → (terminal)
final_offer        → (terminal)
withdrawn          → (terminal)
```

- **UX**: employer 대시보드는 지원자 현재 상태에서 위 allowed-next 만 칩/드롭다운으로 렌더. "다음 단계 선택" = 최소 뎁스. 6단계 전체 나열 X.
- `withdrawn` = Pro 만 트리거(자진 철회). employer 는 rejected 계열만.
- **n차 진행**: `in_interview` 에서 "다음 라운드" 선택 = `current_round++` (같은 상태 유지, round 증가). `current_round == interview_rounds` 도달 후 다음 = `final_offer` 또는 `interview_rejected` 만.

### 면접 라운드 표현 방식 tradeoff (Q1 결정 반영)

| 옵션 | 내용 | tradeoff | 판정 |
|---|---|---|---|
| **A (권고)** | 상태 = `in_interview` 1개 + 별도 `current_round` int 필드 | enum 안 늘어남(상태 8개 고정). 라운드 수 = 데이터(1/2/3). 전이 규칙 단순. 통계 = `in_interview` count + round 분포 | ✅ 채택 |
| B | 상태에 라운드 인코딩 (`interview_1`, `interview_2`, `interview_3`) | enum 이 라운드 수에 종속(3라운드면 상태 3개). employer 가 4차 원하면 enum 마이그레이션. 전이 규칙 폭발 | ❌ 거부 |

- **근거**: 노아 "n차 = 1/2/3 employer 선택". 라운드 수가 **가변 설정값**이므로 상태 enum(코드)에 박으면 설정 바꿀 때마다 마이그레이션. int 필드로 빼면 데이터만 바뀜. "최소 뎁스"(상태 8개 고정) 도 충족.
- **1년 뒤 4차 면접 수요**: `current_round` int 는 무변경, 공고 `interview_rounds` 상한만 4 허용. **enum·전이 규칙 무영향.**

### `application_events` (전이 감사 로그)

```
id, application_id (FK), from_status, to_status, from_round, to_round,
actor_id (누가 전이시켰나 = employer member or Pro), actor_type, note, created_at
```

- 모든 전이 = append (되돌림·조작 방지). 상태 되돌리기 = 새 event. **역전이 = terminal 포함 허용 (노아 확정 2026-07-31): employer 가 실수로 rejected/final_offer 처리 시 복구 가능. 모든 되돌림도 `application_events` 에 append 되어 추적됨.**
- 통계(공고별 통과율 등) = event/현재상태 count(실데이터). **시각 자동전환 없음** = lesson 2026-07-23 예외(회사 실 채용 결정 = 데이터 그 자체).

### 기존 코드 수정 범위 (Q1 재확정 — 지금 구현 X, 빌드 단계 5)

| # | 파일 | 변경 |
|---|---|---|
| a | `domain/entities/student-application.ts` | `STUDENT_APPLICATION_STATUSES` 2-value → 8-value enum + `current_round` 필드 + `allowedNextStatuses(status, round, maxRounds)` 순수 함수 + `isTerminal` |
| b | zod 스키마 | 지원/전이 payload 검증 (전이 규칙 서버측 재확인) |
| c | `application_events` 테이블 | 신규 마이그레이션 + RLS(org scope) |
| d | `job_postings` | `employer_orgs` FK 전환 + `interview_rounds` int. in-line 회사정보 → org 참조 마이그레이션 |
| e | `student_applications` | `current_round` int 추가 마이그레이션 |
| f | 전이 가드 | 기존 `canWithdraw` → `canTransition(from, to, round, maxRounds, actorRole)` 로 일반화 |
| g | B0072 지원 UI | employer 파이프라인 대시보드(allowed-next 칩) + Pro 상태 조회 뷰 |

**이건 §7.4 "기존 함수 시그니처 변경 금지" 저촉 가능**(`student-application.ts` 엔티티 + `canWithdraw`). B0072 는 최근 MVP 라 라이브 모집 CRM(§7.4 보호 대상) 과 분리돼 있으나, 시그니처 변경 호출처 회귀 = Mira 특성화 테스트 후 진행. Sage 필수(신규 인증·PII·org 격리).

---

## 5. 단계별 빌드 순서 (지금 확정 vs 나중 빌드)

### 지금 확정 (이 ADR 승인 = 확정)

- 6 도메인 경계 + Career 공유 자산 소유권
- 역할 모델: student → Pro 통합, Employer 신규, profile_type 상호배타
- 인증: 2-auth + 2-profile-type
- **ATS 지원 상태머신 = 최소 뎁스 8-value + 전이 규칙 + `current_round` int** (§4b). 면접 라운드 = int 필드(enum 인코딩 X)
- **Employer 진입점 = `/employers` landing → `/employer` 어드민, Pro 표면과 물리 분리** (§3b)
- **Community 피드 권한 = Pro(개인) + Employer(회사 홍보) 2 actor** (§D6b). 정책 확정, 빌드 후순위
- 스키마 **자리 예약** (테이블 이름·소유 도메인·RLS 원칙). 실 마이그레이션은 각 빌드 단계에서.

### 나중 빌드 (별도 gating + Sage 검토)

| # | 단계 | 선결조건 | 게이트 |
|---|---|---|---|
| **1** | **권한 코어 하드닝** (IAM) — profile_type 도입 준비 | `authorize()` 순수 추출(ADR 0017) + vitest green | Sage + Mira 매트릭스 diff 0 |
| **2** | **디자인 시스템** (라이트 LMS) | 코어 컴포넌트 | 노아 시각 승인(§6) |
| **3** | **F2P 2기 public** (Admissions·Content) | 2기 라우팅 | §7.4 라이브 회귀 0 |
| **4** | **student → Pro 리네임·확장** (Learning + Career) | profile_type 도입 + career_documents 스키마 | Mira 회귀 + Sage(Career PII) |
| **5** | **ATS 상태머신 확장(§4b) + Employer landing·셀프서비스(§3b)** (D4) | Pro 확정 + employer_orgs 스키마 + 기업메일 검증 | **Sage 필수** (신규 인증·PII·org 격리) |
| **6** | **Interview Scheduling** (D4 하위) | ATS 확장 완료 | Sage(일정·장소 PII) |
| **7** | **Community 피드 (Pro + 회사 포스트, §D6b)** (D6) | Pro 확정 + pro_profiles + employer_orgs | Sage(소셜 그래프·회사 actor·모더레이션) |

**왜 이 순서**: 권한 코어(profile_type) 가 먼저. Pro 확정 후에야 ATS 확장·Community 가능(둘 다 Pro 를 참조). Employer 는 신규 인증 표면이라 Sage 검토 대공사 = 코어 안정 후.

### 전 과정 관통 원칙

- **TDD**: 인증 안전망 green 유지. 신규 도메인 = characterization 먼저.
- **문서화**: 큰 결정 = ADR. 이 문서 = 상위 인덱스.
- **디자인 시스템**: 신규 페이지 = §6.7 5요소 + 라이트 톤.

---

## 이 결정이 1년 뒤 바뀌어야 한다면 (어디를 손대나)

- **Pro/Employer 겸직 수요 실증**: profile_type array 화 + 맥락 전환 UI. **IAM 도메인만 손댐.**
- **면접 4차+ 수요**: 공고 `interview_rounds` 상한만 확대. `current_round` int·상태 enum·전이 규칙 무변경(§4b A 채택 이유).
- **Employer 규모 폭증 (recruiter 위임)**: employer_org 하위 role(admin/recruiter) 추가. **ATS·IAM 만.** `/employers` landing 은 독립 마케팅 사이트로 분리 가능.
- **회사 피드 스키마 독립 필요**: polymorphic `feed_posts` → `company_posts` 분리(§Q2b). **Community 도메인만.**
- **Community 확장 (그룹·DM)**: D6 안에서. 다른 도메인 무영향.
- **채용 = 외부 SaaS 로 아웃소싱**: ATS 폐기, `student_applications` 만 유지. IAM/Learning/Community 무영향.
- **가장 손대기 쉬운 곳**: Content(SSG). **가장 어려운 곳**: IAM `authorize()`(모두 의존) + profile_type 분기 + ATS org 격리 RLS(회사 간 PII).

---

## Rejected Alternatives

- **~~ATS employer 역할 안 만듦~~ (Slice 1 결정)** — **노아가 뒤집음.** 기업 셀프서비스 = 확정 로드맵. employer 를 1급 역할로 승격.
- **면접 라운드를 상태 enum 에 인코딩(`interview_1/2/3`)** — 라운드 수가 가변 설정값이라 enum 이 종속되면 설정 변경마다 마이그레이션. `in_interview` 1상태 + `current_round` int 로 분리(§4b).
- **ATS 상태를 고정 6단계 화면 나열** — 노아 "최소 뎁스" 위반. 현재 상태 → allowed-next 만 칩/드롭다운. 서류만 보고 final_offer 스킵 허용.
- **Employer 를 GC 메인에 "기업 회원" 탭 통합** — Pro(개인·매일)와 회사(저빈도·목적명확) 여정 혼선. `/employers` 별도 landing 으로 물리 분리(§3b, 원티드 패턴).
- **Community 피드 = Pro 전용** — 노아 "회사 계정도 홍보 피드 작성". Employer 회사 포스트 권한 추가(§D6b, 링크드인 회사 페이지). 단 피드에서 직접 지원 X(ATS 경계 유지).
- **student 이름 유지** — 노아 "Pro 로 통합". 학습+취업+커뮤니티 겸하는 identity 에 student 는 너무 좁음.
- **한 계정 multi profile_type (Pro+Employer 토글)** — RLS 복잡 + 자기공고 지원 이해충돌. 겸직 = 계정 2개(이메일 구분자).
- **Community 를 Content 에 합침** — 공개 전시(감사값) vs 회원 소셜(실시간 근사) 경계 붕괴. Lambda 조작 사고 재발 여지. 분리 유지.
- **Career 를 ATS 하위로** — Career 는 Pro 자산(학습·커뮤니티도 read). ATS 종속시키면 소유권 왜곡. Pro-owned 공유 자산으로.
- **두 인증 시스템 통합(Basic + Supabase)** — 운영자 혼란 + viewer 사고(ADR 0008 불변).
- **6 도메인 별도 repo** — 노아 1인 운영 초과. 모노레포 program 경계로 충분(ADR 0013).

---

## Open — 노아 확인 필요 (이 draft 승인 게이트)

1. **[해소 완료]** ATS 상태머신 = §4b 에서 확정. 8-value enum + 전이 규칙 + `current_round` int + `application_events`. 파급 범위(a~g) = §4b 표. **노아 확정 (2026-07-31): (i) 면접 라운드 = `current_round` int 방식(A) 채택. (ii) 상태 되돌림(역전이) = terminal 포함 허용, 모든 전이는 `application_events` 감사 로그에 append.**
2. **lesson 2026-07-23 예외 판정**: ATS 다단계 상태는 "회사의 실제 채용 결정 = 수동 전이" 라 출석률식 자동집계 대상 아님. 이 수동 전환은 lesson 위반 아님(집계가 아니라 회사 실 액션 기록)으로 보는 게 맞나? Sage·Mira 재확인.
2b. **회사 피드 actor 모델 (신규, §D6b)**: `feed_posts` 를 polymorphic `(actor_type, actor_id)` 단일 테이블로 갈지 vs `company_posts` 별도 테이블 분리할지. 현재 draft = polymorphic 단일 테이블(타임라인 통합 쉬움, 쿼리 단순). 별도 테이블 = 회사 포스트 스키마 독립성(홍보 전용 필드) 이나 타임라인 UNION 필요. **피드 빌드 후순위라 지금 정책만 확정, 스키마 확정은 D6 빌드 시.**
3. **Career 위상**: Pro 이력서/포트폴리오 = 독립 7번째 도메인으로 승격 vs Pro-owned 공유 자산(현재 draft) 유지? 현재 = 공유 자산 (ATS/Community/Learning read).
4. **Pro/Employer 겸직 = 계정 2개** (recommendation A) 확정? 강사가 회사도 운영하는 케이스 = 이메일 별도 계정 2개.
5. **profile_type 상호배타 + Employer self-signup(기업메일 검증)** 방향 OK? Pro=invite, Employer=self-signup 온보딩 이원화.
6. **빌드 우선순위**: Pro 통합(4) 을 먼저 vs Employer 셀프서비스(5) 를 먼저? 현재 = Pro 먼저(ATS·Community 가 Pro 참조하므로).
7. **이 ADR = 상위 인덱스** 위상 OK? (개별 ADR 대체 X, 통합 지도)
