# LMS 전체 진단 — 통합 리포트 (2026-07-04)

> 3 에이전트 병렬 진단 결과 통합. Echo (리서치) + Sophia (아키텍처) + Luna (UX).

## 진단 배경

Growth Career = 외국인 대상 기수제 직무 교육 + 채용 연계. 노아 계획:
- 멀티 트랙 (직무별)
- 단과반 (트랙 안 sub-과정)
- 올인원 (여러 단과반 조합)
- 학생 = 단과 vs 올인원 두 유형

## 진단 요약 (한 줄)

현재 스키마는 이미 program → cohort → session 척추가 잘 짜여 있어 **N 트랙 확장 데이터 모델상 준비됨**. 다만 (1) course/bundle layer 부재, (2) 채용 파이프라인 0, (3) instructor surface UI 0, (4) 외국인 특화 필드 부족. **DB 변경 최소** 원칙으로 신규 테이블 8개 + 기존 컬럼 추가 4개로 확장 가능.

## Part 1. Echo 리서치 (외국인 부트캠프 + 멀티 트랙 + 채용 연계 베스트 프랙티스)

### 외국인 특화 발견

- **E-7-1 학위 요건 완화 (2026)**: KCCI 인증 프로그램 이수 시 1년 경력요건 면제. 우리가 KCCI 인증 = 학생에게 직접 비자 가치.
- **K-CORE (E-7-M) 신설 (2026)**: 최저연봉 KRW 2,600만/년. 진입장벽 낮음.
- **평생직업교육학원 등록 리스크**: 반복 기수 운영이면 등록 대상. 무등록 300만원 벌금.
- **비자 발급 성공률**: 취업률 단일 지표만 있으면 안 됨. "오퍼 받았지만 비자 리젝" 케이스 분리 필요.

### 멀티 트랙 표준

- **4-테이블 계층**: Program → Track → Course → Cohort. Enrollment 항상 최소 단위 (student × course × cohort). Bundle 은 syntactic sugar.
- **Bundle → Enrollment fan-out**: 개별 결제 vs 번들 결제 다른 SKU. DB 상 enrollment 에 origin metadata.
- **수료 판정 = course + bundle 이중**: 개별 attendance 기반 + 번들 = 포함 course completion 계산 (view).

### 채용 파이프라인 표준

- **status 6단계**: prep → resume_ready → applied → interview → offer → hired. append-only history.
- **Partner 엔티티 분리**: JD posting + 학생 추천 + 인터뷰 피드백 3 mutation.
- **KPI 표준 세트**: Time-to-hire / applicant-to-interview / interview-to-offer / offer acceptance / 90-day retention / quality of hire. 부트캠프 특화: placement rate at 6 months + median salary lift.
- **Lambda School 교훈**: 발표 80% vs 실제 30~50% 괴리로 소송·평판 붕괴. "취업률 정의" (분모 = job-seeking grads only?) 사전 공개 문서화 필수.

### 강사 세금

- **3.3% (사업소득)** = 우리 4주 반복 강의 case. 다음달 10일까지 원천징수 신고 의무.
- **8.8% (기타소득)** = 1회성 특강만.
- **세금계산서** = 강사 사업자등록 보유 시. 부가세 10% 별도.

### KPI 표준 (10종)

1. 모집 conversion funnel (6단계)
2. cohort retention (attendance)
3. placement rate at 6 months (Lambda 교훈 반영)
4. median salary lift
5. NPS + CSAT (프로그램 종료 시 + 6개월 후)
6. 강사 활용률
7. 매출 - 비용 - 순익
8. CAC / LTV (부트캠프는 재수강률로 대체)
9. **비자 발급 성공률** (외국인 특화)
10. 파트너 회사 활성도

## Part 2. Sophia 아키텍처 진단 (ADR 0013)

**파일**: [`docs/decisions/0013-multi-track-and-recruitment-architecture.md`](../decisions/0013-multi-track-and-recruitment-architecture.md)

### 현재 강점

- program → cohort → session 척추 이미 정합
- URL 분리 + Basic Auth / Supabase Auth 분리 (§7.4) 로 인증 경계 명확
- Server action + `assertAdmin()` 로 권한 검증 표준화
- `programs` + `program_memberships` + `cohorts.program_id` 이미 존재 = N 트랙 확장 준비됨

### Gap 5건 (핵심)

1. **course / bundle 개념 부재** — cohort 로 단과반 표현 시 개념 혼재
2. **enrollments 분리 안 됨** — applicants 가 결제 단위로 오염 여지 (ADR 0010 정신 위배)
3. **채용 파이프라인 0** — student_career_target 만 있고 companies_partners / job_postings / student_applications 부재
4. **instructor surface UI 0** — 권한 가드는 준비, 페이지 5개 미신설
5. **program admin course/bundle CRUD 없음** — 트랙 스케일 시 super_admin 병목

### DB 변경 스코프 (최소)

**신규 테이블 8개**:
- 수강 확장 (5): courses / bundles / bundle_courses / enrollments / enrollment_courses
- 채용 (3): companies_partners / job_postings / student_applications

**기존 컬럼 추가 4개** (모두 nullable, additive):
- applicants.enrollment_id
- applicants.bundle_id
- cohorts.course_id
- instructors.course_ids

**절대 안 건드림**:
- applicants shape
- attendance
- students.display_name
- cohorts.slug
- cohorts.program_id
- 기존 auth

## Part 3. Luna UX 진단

**파일**: [`docs/reports/2026-07-04-lms-ux-diagnosis.md`](./2026-07-04-lms-ux-diagnosis.md)

### 4 role 여정 요약

- **super_admin**: /admin (Basic Auth) → 3-tab → 학생 detail → 이력서. LMS 어드민 (라이트) 별도 로그인. 두 인증 경계 혼동 여지.
- **program admin**: super_admin 과 UI 동일. course/bundle CRUD 부재 시 병목.
- **instructor**: **미구현**. 로그인 후 어디로? 자기 cohort 학생 list 접근 X.
- **student**: /auth/login → PW 강제 변경 → dashboard (3 카드). 국적 편집 가능. 파일 업로드 UX 무난. **한/영 하드코딩 = 외국인 접근 장벽**.

### P0 즉시 fix (이번 세션 처리)

1. ✅ **students-dashboard.tsx:110** 가운데점 → 슬래시
2. ✅ **resume-import-button.tsx:133** 가운데점 → 슬래시
3. ✅ **resume-import-button.tsx:249, 263** em dash → 마침표 + 콤마
4. ✅ **student-photo-upload.tsx:201** gradient → 단색
5. ✅ **page-guides.ts:7** 주석 예시 부호 정정

### P0 이월 (B0079)

- **student/announcements + login i18n 배선** — 완전 한국어 하드코딩, 외국인 접근 장벽

### instructor surface spec (B0070)

5 페이지 wireframe (dashboard / students / sessions / sessions[id] / consultations). 종강 (7/19) 전 최소 3 페이지 착수 권장. 강사님이 현재 자기 학생 명단 확인 자체 불가.

### Luna 재발 방지

**중요 발견**: 이번 세션에서 반성 후에도 초안에서 em dash 35건 + interpunct 6건 위반. 습관 강력.

권고 (B0080): settings.json PostToolUse hook 으로 Write/Edit 후 자동 grep 검증. 위반 시 fail + 재작성.

## Part 4. 노아 결정 필요 5건

각 백로그 시작 전 개별 승인 필요 (Feature Intent Gating, CLAUDE.md §2.5).

1. **신규 테이블 5 (수강 확장) OK?** — B0068 전
2. **신규 테이블 3 (채용) OK?** — B0072 전
3. **instructor surface 페이지 5개 OK?** — B0070 전
4. **`domain/program.ts` (marketing) 리네임 vs 유지?** — B0068 전
5. **채용 매칭 = rule-based (도메인 서비스) vs Nova AI?** — B0075 전 (11월 이후)

## Part 5. 백로그 (B0068 ~ B0080)

### 단기 (2기 시작 전, 8~9월)

- B0068 courses 스키마 도입
- B0069 enrollments + bundle 승격
- B0070 instructor surface 5 페이지
- B0071 admin course/bundle CRUD

### 중장기 (3기+, 10월~)

- B0072 채용 파이프라인 스키마 (신규 3 테이블)
- B0073 admin recruitment 3 페이지
- B0074 student recruitment surface
- B0075 matching-service (rule-based → Nova AI 로 진화)

### 외국인 특화

- B0076 외국인 프로필 필드 확장 (language_ability / visa_sponsor_needed / preferred_language)
- B0077 KCCI E-7-1 인증 검토 (법무 상담 30만원선)
- B0078 평생직업교육학원 등록 검토

### UX P0

- B0079 student/announcements + login i18n 배선
- B0080 Luna 재발 방지 훅 (grep self-check PostToolUse)

## Part 6. 이번 세션 즉시 처리 완료

- [x] Luna JD v2 재작업 (그라데이션 X, Toss 라이트 톤)
- [x] students-dashboard.tsx 가운데점 fix
- [x] resume-import-button.tsx 부호 3건 fix
- [x] student-photo-upload.tsx gradient → 단색
- [x] page-guides.ts:7 주석 예시 정정
- [x] BACKLOG.md B0068~B0080 추가
- [x] 3 에이전트 리포트 박제 (Echo + Sophia + Luna)

## Part 7. 원칙 재확인

Growth Career LMS 는 라이브 운영 사이트 (1기 10명). CLAUDE.md §7.4 준수:

- 기존 모집 페이지 카피/디자인 변경 X
- 어드민 3-tab 기존 컬럼/액션/폴링 변경 X
- 기존 server actions 함수 시그니처 변경 X
- 신규 권한/인증/PII 표면 = Sage 검토 후에만 배포

DB 변경 최소 원칙 준수. Strangler Fig 로 신규 layer 추가.

## 참고 자료

Echo 리서치 자료 (17건):
- E-7 비자 완화 (한국이민센터 / VisasUpdate / VisaVerge)
- LMS 스키마 (Red Gate / GeeksforGeeks)
- Thinkific vs Teachable vs LMS
- Coding bootcamp job placement (CareerKarma / Slashdot Lambda 사고)
- Handshake vs RippleMatch
- Recruiter KPIs (Pin)
- 원천징수 (국세청 NTS / 로즈데일리)
- 학원법 (국가법령정보센터 / 법제처)
- Multilingual onboarding (Articulate / G-P)
