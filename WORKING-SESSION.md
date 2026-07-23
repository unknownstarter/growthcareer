# Working Session

> **이 파일은 가장 최신 작업 상태를 담는다.** 다음 세션 시작 시 가장 먼저 읽기.
>
> - 큰 작업 끝날 때마다 업데이트
> - 세션 종료 시 완료 항목 표시 + 다음 작업 명시
> - 주 1회 또는 큰 단락마다 `docs/sessions/SESSION-YYYY-MM-DD.md` 로 아카이브 (이 파일은 덮어쓰기)
> - 운영 매뉴얼: [CLAUDE.md](./CLAUDE.md)

---

## 📅 Last updated: 2026-07-23 (코드베이스 기준 재구성)

> ⚠️ 이 파일은 2026-07-04 에서 3주간 미갱신 상태였음. 그 사이 7/5~7/19 작업이 커밋으로만 쌓여 있어, git 기록 + 코드 검증 기준으로 실제 상태를 재구성함. 이전 스냅샷: [`docs/sessions/SESSION-2026-07-04-lms-multitrack-diagnosis.md`](./docs/sessions/SESSION-2026-07-04-lms-multitrack-diagnosis.md).

## 🎯 현재 상태 — 1기 종강 완료 / 수료식 D-2 / 2기 launch D-9

- **1기 종강**: 7/19 (일) 완료
- **수료식 + 네트워킹**: 7/25 (토) — **D-2**
- **2기 launch 목표**: 8/1 (금) — **D-9**
- 사이트: `growthcareer.xyz` 라이브. 1기 모집은 마감 자동 전환 상태 (B0039).

---

## ✅ 최근 완료 (2026-07-05 ~ 07-19) — 코드 검증 완료

### 수료증 시스템 (B0081) — 최근 2주 최대 작업
- 마이그레이션 `20260705000000_certificates_student_based.sql` (student 기반 재설계) + `20260719000000_certificates_verify_token.sql` (verify opaque 10자 nanoid)
- **cohort 일괄 발급** server action `application/certificate/batch-issue-certificates.ts` (super_admin, 순차 실행, idempotent) + admin 버튼
- 개별 PDF 생성 `generate-certificate-pdf.ts` + 도메인 `certificate-eligibility.ts` + verify 쿼리
- 디자인 다수 반복 → 최종: Pretendard 통일 / 모노크롬 / 황재하 서명 필기체 / Certified 인장 (K-pop Blue) / GROWTH CAREER 우산 브랜드 텍스트 로고 / Dropdown 명의
- `tools/` 1기 실 학생 10명 명단 조회 + 10장 PNG 일괄 캡처

### 2기 base + 스키마 (체크포인트 1~3)
- **B0068** courses/bundles 스키마 — `20260705000001_courses_bundles.sql` (courses/bundles/bundle_courses/enrollments/enrollment_courses 5테이블 + 1기 backfill) ✅ done
- **B0069** enrollments/bundle 결제 — fan-out 로직(개별 course vs bundle) + applicants.enrollment_id/bundle_id 컬럼 ✅ done
- **체크포인트 2** 이메일 매칭 — 1기 재지원 자동 인식 (`applicants.previous_applicant_id`)
- **체크포인트 3** Signed Upload URL (500MB/50MB) + 학생 영문 이름 자동 채움

### B0083 전시(showcase) 페이지 — Platform Evolution 첫 조각
- 마이그레이션 `20260706000000_cohorts_showcase.sql` (showcase_slug + hero_stat JSONB + thumbnail + `cohort-thumbnails` bucket)
- `app/[locale]/cohorts/[showcase_slug]/page.tsx` 완성 (SSG + ISR 1h, StoryGrid, MDX story-loader)

### B0072 채용 파이프라인 (스키마 + 일부 UI)
- 마이그레이션 `20260706100000_recruitment_mvp.sql` (job_postings / student_applications / recruitment_email_log + `apply_to_job_atomic()` RPC)
- `/admin/companies` 페이지 완성 (CompaniesDashboard)

### LMS IA 재구성 (P1 + P2)
- P1: instructor 링크 감춤 / `[정산]→[재무]` / profile·career 중복 제거
- P2: `/admin/cohorts` index 재작성 + 다중 cohort 대응 (attendance/students/announcements/materials 를 `/cohorts/[slug]/` 안으로)

### 기타
- **tickets** — LMS 내 티켓 관리 탭 (`20260710000000_tickets.sql`) + 2기 이해관계자별 세분화 티켓 10개
- **stageOpsGuide** — 공연 현장 실무 가이드 이메일 템플릿 (범용 핸드북 톤)
- **CLAUDE.md** §2.6 Agile Dispatch / §6.6 매출 원 단위 / §6.7 인터렉션 디자인 시스템 룰 박제
- **LMS dashboard** 4개 카드 실제 데이터 fetch 연결

---

## 🔄 다음 할 일 — 2기 launch (8/1) 전 실제 갭

> 코드 검증 기준. "approved 인데 실제 미착수" 항목이 진짜 남은 일.

### 🔴 최우선 — 미착수
- **B0070 instructor surface** — `/fan-to-pro/[cohortSlug]/instructor/*` 디렉토리 **0개**. 권한 가드(assertCanReadStudentProfile/assertCanWriteStudentNote)만 준비됨. dashboard/students/sessions/sessions[id]/consultations 5페이지. 2기 강사 로그인 필요하면 필수.
- **B0079 student i18n** — login (`auth/login`) + student/announcements 완전 한국어 하드코딩. next-intl 설치·라우팅은 됐으나 useTranslations 배선 0. 외국인 학생 언어 장벽.

### 🟡 부분 완료 — UI 마저
- **B0073 admin 채용 UI** — `/admin/companies`만 됨. `/admin/postings` + `/admin/applications` 미착수.
- **B0074 student 채용 surface** — `/student/jobs` + `/student/applications` 미착수 (스키마·RPC 는 준비됨).

### 🟢 전략 결정 대기 (노아)
- **ADR 0014** 2기 프로그램 구성 + 매출 프로젝션 — 결정 5건 대기 (단과 660 vs 550 / 강사 재협상 확신도 / 폐강 8명 / launch 8/1 유지 등)
- **ADR 0015 Platform Evolution PO** — 결정 7건 대기 (전시 사이트 진화 방향)
- **ADR 0016 Platform Evolution Architecture** — 결정 10건 대기 (14 신규 라우트 / outcome_reports·partners 테이블 / MDX 콘텐츠 계층)
- **B0075 채용 매칭** — rule-based vs Nova AI (11월 이후 재확인)

---

## 🛠️ 노아 manual action 잔여

### 즉시 (수료식 7/25 전)
- 수료증 10장 실제 학생 전달 방식 확정 (일괄 발급 코드는 완료, verify 링크 배포/발송은 수동)

### 프로세스 부채 (이번 세션 처리 중)
- ✅ WORKING-SESSION 재작성 (이 파일)
- 🔄 BACKLOG 상태값 실제 코드에 맞게 정정 (B0068/69/81/83 done, B0070/73/74/79 실제 미착수 명시)
- 미반영 lesson: `2026-07-12-pdf-guidebook-pitfalls.md` (🚧) 역반영 완료 확인 필요

### 기존 잔여 (B0019 SEO/GEO)
- Google Search Console `growthcareer.xyz` 등록 + sitemap 제출 / Naver Search Advisor
- `structured-data.tsx` placeholder 정정 (EducationEvent 시간 / LocalBusiness 우편번호)

---

## 📁 핵심 파일 / 경로

### 최신 마이그레이션 (7월)
- `supabase/migrations/20260705000000_certificates_student_based.sql` · `20260719000000_certificates_verify_token.sql`
- `20260705000001_courses_bundles.sql` · `20260706000000_cohorts_showcase.sql` · `20260706100000_recruitment_mvp.sql` · `20260710000000_tickets.sql`

### 최신 전략 문서
- **ADR 0013** multi-track + recruitment · **0014** 2기 프로그램+매출 · **0015** platform evolution PO · **0016** platform evolution architecture
- **진단 리포트**: `docs/reports/2026-07-04-lms-diagnosis-summary.md`

### 신규 surface
- 수료증: `src/programs/fan-to-pro/application/certificate/`
- 전시: `app/[locale]/cohorts/[showcase_slug]/`
- 채용 admin: `app/[locale]/fan-to-pro/(lms)/admin/companies/`

### 기존 (변경 금지 — CLAUDE.md §7.4)
- 모집 페이지 `app/[locale]/fan-to-pro/(marketing)/*` · 어드민 3-tab `/admin/{applicants,instructors,finance}`
- 기존 server actions 시그니처

---

## 📚 다음 세션 시작 30초 체크 (CLAUDE.md §7.5)

1. 이 파일 먼저 읽기
2. `git log --oneline -15`
3. `git status`
4. `docs/tasks/BACKLOG.md` — 다음 우선순위 (B0070 instructor / B0079 i18n / B0073·74 채용 UI)
5. `docs/lessons/README.md` 인덱스 — 미반영(❌/🚧) lesson 우선
