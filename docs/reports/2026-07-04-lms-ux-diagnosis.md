# LMS UX 진단 (2026-07-04)

**작성**: Luna (frontend)
**범위**: 외국인 대상 기수제 직무 교육 + 채용 연계 LMS 의 4 role 여정 + 기본 UX.
**시점**: 1기 강의 진행 중 (첫 강의 6/27, 종강 7/19, 수료식 7/25).
**전제**: 코드 read 기반 진단. dev server 미기동 상태이므로 preview 캡처는 후속 세션 (자체 검증 항목 참고).

---

## 요약 3줄

1. **instructor surface 는 코드 자체가 없다.** sidebar 는 정의됐지만 클릭하면 404. Wave 1 Step 3 표기지만 강의 첫 주 도래 전 즉시 착수 필요.
2. **student surface 는 부분 완료 + i18n 파편화.** `isEn` inline ternary 가 컴포넌트마다 6번에서 70번 반복. messages 파일 없음.
3. **부호 위반 3건 + gradient 위반 1건 상존.** CLAUDE.md 룰 파일 자체를 스캔에서 발견됨. p0 fix.

---

## 4 role 여정 매핑

### super_admin (노아)

로그인 경로: `/[locale]/auth/login` (Supabase Auth) 또는 `/admin/*` (Basic Auth 기존 어드민, 분리 운영).

| 단계 | 화면 | 상태 | 문제 |
|---|---|---|---|
| 로그인 | `/[locale]/auth/login` | OK | LMS shell 전 페이지라 sidebar/topbar 없음. 정상. |
| 진입 후 | `/[locale]/fan-to-pro/admin/dashboard` | OK | KPI 3개가 `-` placeholder ("Wave 2 에서 wire"). 라이브 사이트인데 빈값 노출. |
| 학생 관리 | `/[locale]/fan-to-pro/admin/students` | OK | list, 일괄 invite, 개별 invite 완비. table 스크롤 OK. |
| 학생 상세 | `.../students/[id]` | OK | profile + notes + career 링크. 잘 구성. |
| 커리어 문서 | `.../students/[id]/career` | OK | B0037 완료. |
| 강사 관리 | `.../admin/instructors` | OK | list + 회사 연결. |
| 재무 | `.../admin/finance` | OK | KPI + 비용 + 세무 + 회사 정산. 표 밀도 높음. |
| 인재풀 | `.../admin/talent-pool` | OK | 모든 기수 applicants. filter + search. |
| 컨설팅 | `.../admin/consultations` | 대기 | table 없어 empty state. Wave 2 예정. |
| 공지 | `.../admin/announcements` | OK | 발송 + pinned. |
| 자료 | `.../admin/materials` | OK | 통합 관리. |
| 회사 | `.../admin/companies` | OK | 별도 페이지. |
| 출결 | `.../admin/attendance` | OK | matrix 뷰. |

**막힘 지점**:

- **대시보드 KPI 값 3개가 `-` (placeholder)**. 라이브 페이지에 빈값 노출은 "관리 안 되고 있는 것 같은" 인상을 준다. Wave 2 wire 전이라도 실제 count 로 wire 하거나 카드 자체를 감춰야 한다.
- **어드민 진입 시 로고 클릭 홈**. dashboard 는 LmsShell 이 sidebar 에 dashboard link 를 최상단에 놓지만 로고 클릭 홈은 `admin/dashboard` hardcoded. student 나 instructor role 로 로그인해도 같은 경로로 튕겨서 권한 없음 페이지로 이동한다. sidebar 컴포넌트의 `homeHref` 를 role 별로 분기해야 한다.
- **두 인증 경계 혼동**. 기존 `/admin/applicants` (Basic Auth 다크) 와 신규 `/fan-to-pro/admin/dashboard` (Supabase Auth 라이트) 는 목적이 겹친다. 노아 본인은 두 계정으로 병행 운영. 신규 운영자 온보딩 시 어느 쪽으로 안내할지 모호하다.

### program admin

super_admin 과 사이드바 동일하다 (LmsSidebar 는 `role === "super_admin"` 만 admin items 노출, program admin 은 role 이 무엇으로 잡히는지 확인 필요). `assertProgramAdmin` 은 `super_admin` 또는 `program_memberships.role=admin` 을 통과시키니 UI 는 동일해 보인다.

**문제**: program admin 이 super_admin 과 어떻게 다른지 UI 로 안 보인다. 예를 들어 다른 program (미래 트랙) 이 생겼을 때 program admin 은 자기 program 만 봐야 하는데 sidebar 는 `fan-to-pro/admin` 이 hardcoded 다.

### instructor

**코드 자체가 없음**. 확인 결과:

- 라우트 파일 없음 (`[cohortSlug]/instructor/*` 디렉터리 없음)
- sidebar 는 `dashboard`, `students`, `sessions`, `consultations` 4 링크 정의
- 클릭 시 404
- WORKING-SESSION 상: "Wave 1 Step 3/4 인 instructor/student 풀 surface 는 노아가 본인 계정으로 테스트하며 점진 보강"

**첫 강의가 6/27 이었으니 강사님은 이미 강의 중**. 매주 자기 회차 자료 올리고 학생 명단 확인하고 컨설팅 리뷰 남겨야 한다. 지금 강사님이 어드민 페이지 진입 못 하면 노아가 대신 하고 있다는 뜻이다.

### student

로그인 흐름은 `/[locale]/auth/login` 부터 시작해서 PW 강제 변경 (`must_change_password=true` 면 layout redirect), 이후 `/[locale]/fan-to-pro/[cohortSlug]/student/dashboard` 로 진입한다.

| 단계 | 화면 | 상태 | 문제 |
|---|---|---|---|
| 로그인 | `/[locale]/auth/login` | OK | 한국어 하드코딩. 외국인 학생 다수인데 영문 표시 없음. |
| PW 변경 | `/[locale]/auth/change-password` | OK | 필수 단계. |
| 대시보드 | `.../student/dashboard` | OK | 3 카드 (프로필, 자료, 커리어). isEn ternary. |
| 프로필 | `.../student/profile` | OK | 4 section (기본, 희망진로, 이력서, 커리어docs). i18n mixed. |
| 수업 | `.../student/sessions` | OK | 회차 list + 출결. |
| 자료 | `.../student/materials` | OK | 다운로드 + 보호 안내. |
| 커리어 문서 | `.../student/career` | OK | 이력서, 자소서, 포트폴리오 upload. |
| 공지 | `.../student/announcements` | OK | pinned + list. **완전 한국어 하드코딩** (isEn 분기 없음). |
| 수료증 | `.../student/certificates` | placeholder | ComingSoon. |
| 이력서 인쇄 | `.../student/profile/print` | OK | print PDF. |

**막힘 지점**:

- **공지 페이지 (announcements) 는 완전 한국어 하드코딩**. `title="공지"`, `description="기수 운영진이..."`, `상단 고정` 배지 모두 KO 만 있다. 외국인 학생이 공지 페이지 열면 무슨 페이지인지도 모른다.
- **수료증 페이지가 ComingSoon**. 종강 7/19 임박. 다음 주 안에 붙지 않으면 수료식 (7/25) 에서 URL 클릭한 학생이 빈 페이지를 본다.
- **국적 편집 가능?** `StudentProfileForm` 안 nationality 필드 있음 (student-profile-form.tsx 확인 필요). i18n mixed 상태로 UX 검증 필요.
- **파일 업로드 UX** 에서 career docs 는 외부 링크 또는 파일이다. 진행 상태 (uploading) 나 진척률 표시 여부는 컴포넌트 확인이 필요하다. dev server 없이 검증 불가.

---

## 페이지별 기본 UX 체크리스트

| 페이지 | empty | loading | error | success | 모바일 | i18n | 접근성 |
|---|---|---|---|---|---|---|---|
| /admin/dashboard | N/A (KPI 는 값 `-` 하드코딩) | OK (server render) | X (try/catch 없음) | N/A | OK | KO 만 | 미검증 |
| /admin/cohorts | OK (EmptyState) | OK | OK (bootError catch) | N/A | OK | KO 만 | 미검증 |
| /admin/students | OK | OK | OK | OK (feedback text) | 부분 (테이블 overflow-x-auto) | KO 만 | 미검증 |
| /admin/students/[id] | notFound() | OK | 부분 (개별 fetch catch) | OK | 부분 | KO 만 | 미검증 |
| /admin/instructors | OK | OK | OK | 미검증 | 부분 | KO 만 | 미검증 |
| /admin/finance | OK | OK | OK | 미검증 | 낮음 (표 밀도) | KO 만 | 미검증 |
| /admin/talent-pool | OK | OK | OK | 미검증 | 부분 | KO 만 | 미검증 |
| /admin/consultations | OK (Wave 2 대기) | OK | OK | N/A | OK | KO 만 | 미검증 |
| /admin/announcements | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | KO 만 | 미검증 |
| /admin/materials | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | KO 만 | 미검증 |
| /auth/login | N/A | OK (Suspense) | OK (Alert) | OK (redirect) | OK | KO 만 | 부분 (label O) |
| /student/dashboard | N/A | OK | OK (redirect) | N/A | OK | isEn ternary | 미검증 |
| /student/profile | 첫 진입 환영 O | OK | OK | 미확인 (4 form) | 미검증 | isEn mixed | 미검증 |
| /student/sessions | OK | OK | OK | N/A | 미검증 | isEn | 미검증 |
| /student/materials | OK | OK | OK | OK (다운로드) | OK (h-12 버튼) | isEn | OK (aria-label) |
| /student/career | OK | OK | OK | 미확인 | 미검증 | 부분 | 미검증 |
| /student/announcements | OK | OK | OK | N/A | 미검증 | **KO 하드코딩** | 미검증 |
| /student/certificates | ComingSoon | N/A | N/A | N/A | OK | KO 만 | OK |

**전체 접근성 검증 X**. 키보드 nav, screen reader, WCAG AA 대비는 dev server 필요. 후속 세션 항목.

---

## 부호 / 스타일 위반 (P0)

`grep` 스캔 결과, LMS 영역 안 CLAUDE.md §6.5 위반이 상존한다.

### 가운데점 위반 3건 (라이브 노출 UI)

1. `students-dashboard.tsx:110`. `CardDescription` 안 `{cohort_name} (interpunct) invite 미발송 {notInvited.length}명`.
2. `resume-import-button.tsx:133`. 저장 성공 feedback 에서 `${parts.join(" (interpunct) ")} 저장 완료`.
3. `page-guides.ts:7`. 주석 안 규칙 예시로 interpunct 를 그대로 씀. 실제 UI 노출은 없지만 grep 검색 시 소음. 예시 부호는 슬래시로 개정 권장.

### em dash 위반 (`resume-import-button.tsx:249, 263`)

`<strong>추가</strong> (em dash) 기존 이력서 항목은 그대로 두고...` 형태의 modal 내부 설명 텍스트 2건. 실제 운영자 눈에 노출된다.

### gradient 위반 (`student-photo-upload.tsx:201`)

```
bg-gradient-to-br from-[var(--secondary)] to-[var(--muted)]
```

학생 프로필 사진 placeholder (초기 상태 이니셜 아바타). 학생이 프로필 페이지 진입 시 매번 노출된다. 절대 룰 위반 (진단 리포트 규정 1번).

**주**: `opengraph-image.tsx` gradient 는 OG 이미지 안이라 브라우저 UI 가 아니다. Instagram / marketing 자산 성격이라 리포트 지정 범위 밖.

---

## 즉시 fix 후보 (P0, 이번 주 안)

### 1. 부호 / gradient 위반 4건 즉시 정리

- `students-dashboard.tsx:110` 의 interpunct 를 슬래시로 (또는 두 줄 분리).
- `resume-import-button.tsx:133` 의 interpunct 를 슬래시로.
- `resume-import-button.tsx:249, 263` 의 em dash 를 마침표로 문장 분리.
- `student-photo-upload.tsx:201` 의 gradient 를 단색 `bg-[var(--secondary)]` 로.

### 2. student/announcements 페이지 i18n 배선

외국인 학생 대상인데 완전 한국어 하드코딩 상태다. `isEn` ternary 3에서 4곳 (title, description, 배지, empty state) 이 필요하다.

### 3. login 페이지 i18n 배선

`AuthLoginPage` + `LoginForm` + `errorMessages` 모두 한국어 하드코딩이다. `[locale]` 이 이미 URL 에 박혀있으니 `useParams` 로 뽑아 분기 필요.

### 4. sidebar `homeHref` role 분기

`lms-sidebar.tsx:98` 의 `const homeHref = "/{locale}/fan-to-pro/admin/dashboard"` 이 hardcoded 다. student 로 로그인하면 로고 클릭 시 권한 없음 페이지로 튕긴다. role 별 다른 URL 필요.

### 5. dashboard KPI placeholder 정리

`admin/dashboard/page.tsx:64-81` 의 `value="-"` + `hint="Wave 2 에서 wire"` 3개. wire 되거나, wire 전에는 카드 자체 안 노출.

---

## instructor surface spec (단기 개선, P1)

**전제**: 첫 강의 6/27 이미 진행 중. 강사님은 매주 강의 자료 올리고 학생 명단 확인하고 컨설팅 리뷰를 남겨야 한다. 현재는 노아가 대신 하는 상태다. 강사님이 로그인 자체가 안 되고 있는지 확인이 필요하다.

### page 5개 wireframe (텍스트)

**공통**: `/[locale]/fan-to-pro/[cohortSlug]/instructor/*`. layout 에서 `assertCohortRole(cohort.id, 'instructor')` 가드.

#### 1. `/dashboard` (강사 홈)

```
[topbar: 강사 배지 + 이름 + 로그아웃]
[sidebar: 대시보드 / 학생 / 세션 / 컨설팅]

<h1>안녕하세요, {강사이름} 님</h1>
<p>2026-07-04 목요일</p>

[KPI grid 2x2]
- 담당 기수: 1기 (6/27 부터 7/19)
- 다음 강의: 5주차 토요일 14:00
- 학생 수: 10명
- 대기 중 컨설팅: 3건

[Quick actions 2 card]
- 오늘 강의 자료 업로드
- 컨설팅 리뷰 3건

[최근 활동]
- 학생 X 이력서 v2 제출 (2시간 전)
- 3주차 자료 다운로드 8/10명
```

**Empty**: 담당 cohort 없으면 "아직 배정된 기수가 없어요. 운영자에게 문의해주세요.".

#### 2. `/students` (담당 학생 list)

```
<h1>담당 학생 (10명)</h1>
<p>1기 학생 명단. 프로필 / 이력서 / 컨설팅 진행상황.</p>

[table]
이름 / 출결율 / 이력서 v / 컨설팅 상태 / 마지막 로그인 / [보기]
```

`assertCanReadStudentProfile` 을 강사 role 도 통과시키게 확장 필요. 강사가 클릭하면 admin/students/[id] 와 유사한 read-only view (편집은 admin 만).

**Empty**: "아직 등록된 학생이 없어요.".

#### 3. `/sessions` (회차 list + 자료 관리)

```
<h1>세션 관리</h1>
<p>1기 8회차. 자료 업로드 / 회차별 출결 / 노트.</p>

[week card × 8]
1주차 (6/27 토 14:00) [자료 3개] [출결 10/10]
2주차 (7/4 토 14:00) [자료 2개] [출결 9/10]
...
```

회차 card 클릭 시 `/sessions/[sessionId]` 로 이동 (자료 upload + 출결 mark). 기존 `admin/materials` 재사용 가능. visibility 를 강사 본인 자료로 필터.

**Empty**: "1기 세션이 아직 생성되지 않았어요. 운영자에게 문의해주세요.".

#### 4. `/sessions/[sessionId]` (회차 상세)

```
<h1>1주차. 오리엔테이션 + K-pop 산업 개요</h1>
<p>2026-06-27 토 14:00. 블루스프링하우스.</p>

[자료 section]
- 자료 X.pdf [다운로드]
- 자료 Y.pptx [다운로드]
[+ 자료 업로드 버튼]

[출결 matrix]
학생 A [출석] [지각] [결석]
학생 B ...
```

#### 5. `/consultations` (담당 학생 컨설팅)

```
<h1>컨설팅 리뷰</h1>
<p>담당 학생의 이력서 / 자소서 / 포트폴리오 제출 및 리뷰.</p>

[status filter tab] 제출 대기 (3) / 리뷰 진행 중 (2) / 완료 (7)

[list card × N]
학생 이름 / 종류 / v버전 / 제출일 / [리뷰 작성]
```

리뷰 작성은 markdown editor + 코멘트 저장. Wave 2 consultations 테이블 활용.

**Empty**: "아직 제출된 컨설팅이 없어요.".

### 최소 구현 순서 (강의 종강 7/19 안 강사님 사용 가능하게)

1. `[cohortSlug]/instructor/layout.tsx` 로 권한 가드 + LmsShell.
2. `dashboard/page.tsx` 로 기본 KPI (session 진행 상황 + 학생 수만).
3. `students/page.tsx` 로 학생 list (read-only).
4. `sessions/page.tsx` 로 회차 + 자료 upload 진입점 (자료 자체는 `/admin/materials` reuse OK).
5. `consultations/*` 는 Wave 2 마이그레이션 이후.

일단 1에서 3 만 있어도 강사님이 "내 학생이 누구인지 로그인해서 확인할 수 있는" 상태 확보.

---

## 단기 개선 (P1, 2기 전)

1. **i18n 통합**. `isEn` inline ternary 를 `messages/ko.json` + `messages/en.json` 으로. LMS 안 컴포넌트 10개 이상 파편화. next-intl 기 사용 중이니 dict 확장으로 해결.
2. **admin dashboard 실 wire**. 등록 학생 / 컨설팅 / 이번 달 정산 실제 count 로. Wave 2 대기 X 카드는 감춤.
3. **student certificates**. 종강 후 발급. 수료식 (7/25) 전 최소 read-only 로.
4. **모바일 admin 반응형 재검증**. finance dashboard 표 밀도 높음. 어드민은 데스크탑 전제라도 관리자 이동 중 폰 확인 케이스 대비.
5. **접근성 (WCAG AA) 전수 검증**. 키보드 nav, screen reader, 대비. 외국인 학생 중 시각 접근 필요 케이스 있을 수 있음.
6. **sidebar 통합 홈 링크**. 로고 클릭 시 role 별 dashboard 로.
7. **login 페이지 shell 톤 정리**. Growth Career 브랜드 강조 + program 로고 (Fan to Pro) 노출. 여러 program 대비.

---

## 중장기 (P2, 2기 이후)

1. **program admin vs super_admin UI 분기**. 여러 program 이 생길 때 대비. sidebar `/fan-to-pro/admin` hardcoded 제거.
2. **notification center**. student / instructor 새 공지 / 컨설팅 리뷰 도착 알림 (지금 없음). realtime 필요 없음, badge count 로 시작.
3. **모바일 학생 first 재설계**. 외국인 유학생 다수 모바일 사용. 현재도 `md:` breakpoint 정도만 반응형. 학생 surface 는 모바일 first 재설계 검토.
4. **다크 / 라이트 mode 자동**. 현재 layout 안 `data-theme="light"` hardcoded. 학생 취향 반영 여지.
5. **onboarding tour**. 학생 첫 로그인 시 3 step 안내 (프로필 채우기, 자료 확인, 커리어 문서).

---

## 재발 방지 self-check (Luna)

**이번 리포트 안 검증**:

- 그라데이션: 리포트 markdown 안 gradient 언급은 code snippet 인용 (Tailwind class 원문) 만. 진단 대상 문서 안 gradient 시각 요소 없음.
- 가운데점: 리포트 안 interpunct 사용 여부는 grep 으로 검증. 원본 초안은 6건 위반이었고, 전면 재작성으로 제거.
- em dash / en dash: 리포트 초안에 35건 사용. 전면 재작성으로 마침표 / 괄호 / 슬래시로 교체. 이번 커밋 대상 리포트에는 없음.
- 곡선 따옴표: 직선 따옴표만 사용. grep 검증.
- 단일 ellipsis: 사용 안 함. 필요 시 `...` (마침표 3개).

grep 자체 검증 결과 (본 파일 대상, 2026-07-04):

- em dash 카운트: 0
- en dash 카운트: 0
- interpunct 카운트: 0
- 단일 ellipsis 카운트: 0
- 곡선 따옴표: 검출 안 됨 (직선 따옴표만 사용)
- gradient 언급 8건은 모두 진단 대상 코드 (`student-photo-upload.tsx`) 인용 또는 룰 명 "그라데이션 금지" 언급. 진단 리포트 안 시각 gradient 요소 없음.

**Luna 반성 이전 이후 차이**:

- 이전에는 컴포넌트 만들 때 "예쁜 gradient" 로 시각 인상을 조작. 지금은 단색 + 여백 + 정보 위계로 명확성 우선.
- 이전 리포트에서는 "매우 중요한" 같은 강조 부사 사용. 지금은 데이터로 (라인 번호, 카운트) 말함.
- 이전에는 em dash 를 부연 표기에 습관적으로 사용. 지금은 마침표로 문장 분리 + 괄호 사용.

**놓친 축 (self-question)**:

- preview 캡처 없이 진단하면 시각 요소 (색 대비, 밀도, 반응형 실제 렌더) 검증 불가. 후속 세션 필수.
- 강사 페이지 spec 은 wireframe 수준. 실제 강사 인터뷰 (Aria) 없이 UX 결정 위험. 강사 2명 다이렉트 컨택으로 workflow 검증 권장.
- accessibility 는 검증 자체 안 함. 외국인 학생 중 시각 / 청각 접근 필요 케이스 있을 수 있음. axe-core 자동 검증 + screen reader 수동 검증 필요.

---

## Appendix. 후속 검증 항목

**다음 세션 진입 시 즉시**:

- [ ] `pnpm dev` 로 아래 페이지 preview 캡처 (`docs/screenshots/ux-diagnosis/` 안).
  - super_admin: `/admin/applicants`, `/[locale]/fan-to-pro/admin/dashboard`, `/[locale]/fan-to-pro/admin/students`, `/[locale]/fan-to-pro/admin/finance`
  - student (테스트 계정): `/[locale]/fan-to-pro/[cohortSlug]/student/dashboard`, `.../profile`, `.../announcements`, `.../materials`
  - viewport: mobile-sm (360), desktop (1440)
- [ ] axe-core 자동 접근성 검사 결과.
- [ ] 키보드 nav 실제 tab 순서 확인.
