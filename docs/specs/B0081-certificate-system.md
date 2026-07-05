# B0081 수료증 시스템 / Spec

**Status**: Draft (노아 6건 확인 대기 → Iris backend 후속)
**Date**: 2026-07-04
**Owner**: Luna (frontend + 양식 디자인) + Iris (backend server action + PDF pipeline) + Sage (verify URL 공개 여부 검토)
**Related**: ADR 0005 (LMS 도메인), CLAUDE.md §6.5 (카피 부호), 기존 이력서 PDF 인프라 (B0062)

---

## 1. 배경

1기 수료 임박. 7/19 종강 + 7/25 수료식. 학생 10명 (외국인 9명 + 내국인 1명). 실물 인쇄는 노아가 후속 진행 (인쇄 업체 별도). 이번 스코프:

1. 공통 수료증 양식 (A4 세로 HTML 템플릿)
2. 학생 대시보드에 [수료증] 카드 추가 (종강 후 활성화, 그 전 disabled)
3. 학생 본인이 브라우저에서 PDF 로 저장 다운로드 (기존 이력서 방식 재사용 = HTML 렌더 + iframe.contentWindow.print)
4. 운영자 관점: 학생 detail 페이지에서 발급 상태 badge + 미리보기 button
5. 발급번호 발급 규칙 및 verify URL (공개 여부는 노아 결정)

**핵심 가치**: 종강 즉시 수료자가 이력서, 포트폴리오와 함께 첨부 가능한 공식 수료증 확보.

---

## 2. 목표

- 공통 양식 1종 (한/영 병기)
- 종강 + attendance 75% 이상 학생에게만 발급
- 학생 대시보드에서 원클릭 PDF 다운로드
- 발급 이력 DB 기록 (certificates 테이블 이미 존재)
- 실물 인쇄 시 그대로 사용 가능한 A4 규격

---

## 3. 스코프

### 포함 (본 Wave)
- HTML 템플릿 완성 (한/영 병기, 프로페셔널 문서 톤)
- 학생 dashboard 4번째 카드 추가 (수료증)
- `/[locale]/fan-to-pro/[cohortSlug]/student/certificates` 페이지 실제 구현 (현재 ComingSoon 상태)
- `generateCertificatePdfAction` server action (Iris 담당)
- admin 학생 detail 에 발급 상태 badge
- 발급번호 형식 결정 후 발급 로직

### 제외 (미래)
- 공연 참여 확인서 (`kind='performance'`, 별도 발급 주체 = Union Pictures). spec 은 유사 패턴이며 문구만 다름. B0081.2 로 분리
- verify URL 페이지 (`/verify/[serial]`) 는 노아 결정 후 별도 dispatch
- 실물 인쇄 (인쇄 업체 / 종이 / 액자) 는 노아 후속
- 서명 이미지 실제 스캔 (현재 CSS Brush Script 텍스트 placeholder)
- 실물 도장 이미지 (현재 CSS 원형 SEAL text placeholder)
- QR 코드 실제 이미지 생성 (현재 placeholder box)

---

## 4. 양식 디자인

### 4.1 규격

- A4 세로 (210mm x 297mm)
- 여백 22mm (좌우) + 22mm (상) + 40mm (하, verify 영역 확보)
- 이중 테두리 (외부 1mm 및 내부 6mm inset, 둘 다 연한 회색 solid)
- Pretendard (한글, CDN) + Times New Roman/Georgia (영문 세리프, 시스템)
- **그라디언트 없음** (solid 색만)
- Toss 블루 (#3182f6) accent 3곳 (brand dot 및 serial no 및 seal ring)
- 배경 흰색 + 카드 f9fafb (프로그램 정보 박스)

### 4.2 섹션 구조 (위 부터 아래)

1. **Header**: Growth Career 브랜드 + "Fan to Pro / K-Pop Live Production" 서브 + 우측 발급번호
2. **Title**: "CERTIFICATE OF COMPLETION" (세리프) + "수 료 증" (하단 letterspacing 6)
3. **Recipient**: "This certifies that / 아래 사람은" 라벨 + 한글 이름 (28pt bold) + 영문 이름 (13pt italic)
4. **Program Info Box**: 3행 (Program / Duration / Cohort), 한/영 병기
5. **Attest 문구**: 한/영 병기 (아래 §5)
6. **Footer**: 좌측 발급일 + Dropdown 사업자 정보. 우측 서명 + Toss 블루 인장 원
7. **Verify strip**: 하단 border-top + Verify URL + QR box

### 4.3 필드 (server action 이 채우는 데이터)

| 필드 | 소스 | 형식 |
|---|---|---|
| 발급번호 | 자동 생성 | `GC-FTP-1기-001` (§노아확인 §2) |
| 한글 이름 | `student_profiles.name_ko` (fallback: `students.display_name`) | 텍스트 |
| 영문 이름 | `student_profiles.name_en` | 텍스트 (없으면 hide) |
| 프로그램명 | 고정 (cohort.program_id 참조 programs.name) | 한/영 병기 |
| 기간 | `cohorts.starts_on` 부터 `cohorts.ends_on` | "YYYY년 MM월 DD일 부터 YYYY년 MM월 DD일 까지" |
| 회차수 | `cohorts` sessions count | "총 N회차" |
| 기수 | `cohorts.name` (예: "1기") | 문자열 |
| 발급일 | `cohorts.ceremony_on` (fallback: server now) | "YYYY년 MM월 DD일 / Month D, YYYY" |
| 발급 주체 | 고정. Dropdown (드롭다운) / 154-28-02110 | 문자열 |
| 서명 | Static placeholder ("Noah" Brush Script) | 이미지 파일 필요 (§노아확인 §4) |
| 인장 | Static CSS 원형 "DROPDOWN SEAL 2026" | placeholder |
| Verify URL | `growthcareer.xyz/verify/{serial}` | 발급번호 base64 인코딩 X (raw serial) |
| QR | Verify URL 을 인코딩 | 실제 QR PNG (Iris) |

---

## 5. 확인 문구 (한/영 병기)

### 5.1 완성 초안 A (노아 확인 §1)

**한글**:
> 위 사람은 Growth Career 의 Fan to Pro 4주 K-pop 공연 실무 교육 과정을 성실히 이수하였음을 증명합니다.

**English**:
> This is to certify that the above named person has successfully completed the Fan to Pro 4-week K-Pop Live Production program of Growth Career.

### 5.2 대체 문구 후보 B (노아 선택)

**한글 후보 B (더 격식)**:
> 위 사람은 Growth Career (운영주체 Dropdown) 이 개설한 Fan to Pro 4주 K-pop 공연 실무 교육 과정의 전 회차를 수료하였기에 이를 증명합니다.

**English 후보 B**:
> This is to certify that the above named individual has fulfilled all requirements of the Fan to Pro 4-week K-Pop Live Production Program organized by Growth Career (operated by Dropdown).

---

## 6. 발급 자격 (도메인 룰)

기존 `canIssueCompletion` (certificate.ts entity) 재사용:

```ts
attendance_rate >= 75%
&& cohort.status === "completed"
&& (student.status === "active" || student.status === "completed")
```

**엣지 케이스**:
- attendance 75% 미달 시 발급 불가. UI 는 "출석률 미달로 발급이 어렵습니다. 운영자에게 문의 요청" 표시
- cohort 아직 in_progress 시 "종강 후 발급됩니다" disabled 표시
- 학생 자퇴 (status='withdrawn') 시 발급 불가

---

## 7. 컴포넌트 구조 (Luna 담당)

### 7.1 학생 dashboard 카드 (`/[locale]/fan-to-pro/[cohortSlug]/student/dashboard`)

**변경**: 기존 3 items 배열에 4번째 항목 추가.

```tsx
{
  href: `${base}/certificates` as Route,
  icon: Award,  // lucide-react
  title: isEn ? "Certificate" : "수료증",
  desc: isEn
    ? "Download your completion certificate as PDF after the program ends."
    : "종강 후 수료증을 PDF 로 다운로드하실 수 있어요.",
}
```

Grid 는 `lg:grid-cols-3` 이므로 4번째 카드는 두 번째 행 시작. `lg:grid-cols-4` 로 바꾸면 한 줄에 4개 배치. **노아 결정 (§노아확인 §6.1) 필요**. 우선 `lg:grid-cols-3` 유지 (모바일 스크롤 최소화).

### 7.2 학생 certificates 페이지 (`/[locale]/fan-to-pro/[cohortSlug]/student/certificates/page.tsx`)

**현재 상태**: `ComingSoon` 만.

**변경 후 구조** (server component):

```
PageContainer
  PageHeader
  ├ 발급 가능 case:
  │   CertificateStatusCard (발급 정보 요약)
  │   CertificatePreviewFrame (iframe src=HTML)
  │   CertificatePrintButton ("PDF 로 저장 / 인쇄", 기존 ResumePrintButton 패턴)
  ├ 발급 조건 미달 case:
  │   CertificateBlockedCard (이유 표시. attendance / cohort 진행 중 / 자퇴)
  └ 종강 전 case:
      CertificateComingSoonCard ("YYYY년 MM월 DD일 이후 발급됩니다")
```

**신규 컴포넌트** (`src/programs/fan-to-pro/interface/components/lms/student/`):
- `certificate-preview-frame.tsx`: iframe wrapper, `srcdoc={html}` + id
- `certificate-print-button.tsx`: 기존 `resume-print-button.tsx` 와 동일 패턴 (iframe.contentWindow.print) 재사용 가능. 재사용 시 이름만 generic 하게 리팩터 or copy
- `certificate-status-card.tsx`: 발급 가능 상태 표시
- `certificate-blocked-card.tsx`: 자격 미달 표시
- `certificate-coming-soon-card.tsx`: 종강 전 표시

### 7.3 admin 학생 detail 발급 상태 badge

`/[locale]/fan-to-pro/(lms)/admin/students/[id]/page.tsx` 의 `PageHeader.action` 옆 또는 profile view 상단에:

```tsx
<CertificateStatusBadge
  cohortStatus={cohort.status}
  attendanceRate={attendanceRate}
  hasCertificate={certificateExists}
/>
```

**Badge 상태**:
- `발급됨` (녹색): 이미 발급 완료
- `발급 가능` (파랑): 조건 통과, 아직 발급 X
- `출석률 미달 X%` (빨강): 75% 미달
- `종강 대기` (회색): cohort 아직 진행 중
- `자퇴` (회색): student status 이상

**신규 컴포넌트** (`src/programs/fan-to-pro/interface/components/lms/admin/`):
- `certificate-status-badge.tsx`

### 7.4 HTML 템플릿 (Luna 완성)

`src/programs/fan-to-pro/application/certificate/certificate-html-template.ts`:
- 기존 `resume-html-template.ts` 와 유사 패턴
- `renderCertificateHtml(data: CertificateBuildData): string` export
- CSS inline (기존 이력서 방식 = @import Pretendard CDN + solid 색만)

`tools/certificate-preview.html` 을 그대로 참조. static data 를 함수 파라미터로 치환.

---

## 8. Server Action Interface (Iris 담당 후속)

### 8.1 학생 다운로드용

```ts
"use server";

import { assertCanReadStudentProfile } from "@/src/programs/fan-to-pro/infrastructure/auth/lms-role";
import { z } from "zod";

const InputSchema = z.object({
  student_id: z.string().uuid(),
});

export type GenerateCertificatePdfResult =
  | {
      status: "html-only";
      html: string;
      filename: string;  // "certificate_HongGildong_2026-07-25.html"
      serial_no: string;
      attendance_rate: number;
    }
  | {
      status: "not-eligible";
      reason: "attendance_below_threshold" | "cohort_in_progress" | "student_inactive";
      attendance_rate: number | null;
    }
  | { status: "error"; error: string };

export async function generateStudentCertificatePdfAction(
  input: unknown,
): Promise<GenerateCertificatePdfResult>;
```

**동작**:
1. `assertCanReadStudentProfile(student_id)`: student self / super_admin / program admin / cohort instructor
2. student 참조 cohort 참조 sessions/attendances fetch (`Promise.all`)
3. `canIssueCompletion` 검사. 실패 시 `not-eligible` return
4. certificate 이미 발급됐으면 기존 `serial_no` 재사용. 없으면 새 발급번호 생성 (cohort_id 별 순차)
5. `insertCertificate` (idempotent, `(student_id, kind)` UNIQUE)
6. `renderCertificateHtml(buildData)` 참조 HTML string
7. return `{ status: "html-only", html, filename, serial_no, attendance_rate }`

### 8.2 admin 미리보기용

```ts
export async function previewCertificateForAdminAction(input: {
  student_id: string;
}): Promise<GenerateCertificatePdfResult>;
```

동일 로직. 발급번호는 preview 시 실제 발급 X (dry-run). 실제 발급은 별도 mutation:

```ts
export async function issueCertificateForStudentAction(input: {
  student_id: string;
}): Promise<{ status: "ok"; serial_no: string } | { status: "error"; error: string }>;
```

권한: `assertProgramAdmin('fan-to-pro')` + `assertCanIssue` 도메인 룰 통과.

### 8.3 발급번호 생성 로직

`generateCertificateSerialNo(cohort_name, student_seq)`:

```
`GC-FTP-${cohort_name}-${String(seq).padStart(3, "0")}`
// 예: GC-FTP-1기-001
```

seq 는 cohort 내 발급 순서 (created_at ASC). 첫 발급자 = 001. transaction 안에서 `MAX(seq) + 1` 로 계산 (동시성 없음. admin 단일 조작 또는 학생 self-serve 하나씩).

**대안 형식** (§노아확인 §2):
- `GC-FTP-2026-06-001` (연월 기반)
- `GC-FTP-C1-001` (Cohort 1 표기)
- `GC-FTP-01-001` (기수 2자리)

---

## 9. 데이터 흐름

```
학생 dashboard 페이지
  └ certificates 카드 click
       └ /[locale]/.../student/certificates 이동
            ├ server: fetchStudent > fetchCohort > fetchAttendances > canIssue
            ├ eligible?
            │   NO: BlockedCard render
            │   YES: generateStudentCertificatePdfAction 호출
            │        HTML 받음 iframe srcdoc
            │        PrintButton onClick iframe.contentWindow.print()
```

---

## 10. Mira QA 시나리오

### 10.1 학생 관점
- [ ] 종강 전 dashboard 카드 표시되지만 클릭 시 "종강 후 발급됩니다" 메시지
- [ ] 종강 후 + attendance >= 75% dashboard 카드 클릭 미리보기 + [PDF 저장] 버튼
- [ ] 종강 후 + attendance < 75% "출석률 미달" 메시지 + 운영자 문의 안내
- [ ] 종강 후 + student.status='withdrawn' "발급 대상 아님" 메시지
- [ ] PDF 저장 버튼 클릭 브라우저 print dialog 열림 PDF 저장 성공
- [ ] 한글 이름 미입력자 (name_ko null) display_name (닉네임) fallback
- [ ] 영문 이름 미입력자 영문 이름 라인 hide (한글 이름만)
- [ ] 발급번호 unique 확인 (동일 학생 재요청 시 같은 번호 반환)
- [ ] 로그아웃 상태 certificates 페이지 접근 시 login 리다이렉트
- [ ] 다른 학생 ID 로 접근 시도 시 403

### 10.2 admin 관점
- [ ] /admin/students/[id] 진입 시 발급 상태 badge 표시
- [ ] "발급 가능" 학생 badge 파랑
- [ ] "출석률 미달 60%" 학생 badge 빨강 + 정확한 %
- [ ] [수료증 미리보기] 버튼 클릭 팝업으로 HTML 렌더
- [ ] admin 에서 직접 발급 시 발급번호 순차 부여
- [ ] non-admin viewer 계정으로 발급 button 안 보임

### 10.3 인쇄 검증
- [ ] Chrome print preview 에서 A4 정확히 1 페이지
- [ ] 인장 (Toss 블루 원) 색상 유지 (background-print)
- [ ] 이중 테두리 인쇄 유지
- [ ] Pretendard 폰트 fallback 정상
- [ ] QR 코드 인쇄 시 스캔 가능 크기 (18mm x 18mm)

---

## 11. 카피 부호 self-check

**본 spec 파일 및 HTML 템플릿 (`tools/certificate-preview.html`)**:
- em dash: 0
- en dash: 0
- interpunct: 0
- ellipsis (단일 문자): 0
- 곡선 따옴표: 0
- 실사용 CSS gradient: 0

self-check 스크립트:
```
grep -c "EMDASH" docs/specs/B0081-certificate-system.md tools/certificate-preview.html
grep -c "ENDASH" docs/specs/B0081-certificate-system.md tools/certificate-preview.html
grep -c "INTERPUNCT" docs/specs/B0081-certificate-system.md tools/certificate-preview.html
grep -c "ELLIPSIS" docs/specs/B0081-certificate-system.md tools/certificate-preview.html
grep -ci "linear-gradient|radial-gradient" tools/certificate-preview.html
```
모두 0 확인. (실제 grep 시 위 EMDASH 자리에 해당 유니코드 문자 넣어 실행)

---

## 12. 노아 확인 필요 6건

### §1 확인 문구 (한/영)

§5 초안 A vs B 중 선택. 또는 노아 손댐. **추천**: A. 이유:
- 더 간결하며 이력서 첨부 시 읽기 쉬움

### §2 발급번호 형식

`GC-FTP-1기-001` vs `GC-FTP-2026-06-001` vs `GC-FTP-C1-001` vs `GC-FTP-01-001`

**추천**: `GC-FTP-1기-001`. 이유:
- "1기" 라는 표현이 한국 수강생, 기업에게 명확
- 서수 (2기, 3기...) 확장 자연
- 외국인은 한자 "기" 익숙지 않을 수 있으나 발급번호 자체가 정보 열람용이 아님

### §3 verify URL

`growthcareer.xyz/verify/GC-FTP-1기-001` 접근 시 어떤 정보 노출?

**옵션 A** (전체 공개): 이름 (한/영) + 프로그램 + 기간 + 발급일 + 발급 주체
- 장점: 채용사가 링크만으로 진위 확인
- 단점: 이름 등 PII 공개 (외국인 학생 sensitivity 있음)

**옵션 B** (익명): "본 발급번호는 유효합니다. 발급일 2026-07-25, 프로그램: Fan to Pro"
- 장점: PII 노출 X
- 단점: 채용사가 이름 매칭 못 함

**옵션 C** (verify 없음, QR 제거): 실물 수료증 자체만 신뢰

**추천**: 옵션 B. PII 보호 + verify 기능 제공. 채용사가 세부 매칭 원하면 노아에게 이메일 문의.

**Sage 검토 대기**: verify URL 공개 여부는 §7.4 CLAUDE.md 룰상 새로운 공개 PII 표면. Sage 검토 후 반영.

### §4 서명 이미지

**옵션 A**: 노아 손 서명 스캔 후 PNG 로 업로드 (Iris backend 가 static assets 로 embed)
**옵션 B**: 현재 CSS Brush Script 폰트 텍스트 유지 (지금 template = "Noah")

**추천**: 옵션 A. 실물 인쇄물의 신뢰도 확보. 노아 서명 스캔 후 `public/brand/signature-noah.png` (200 x 60px, transparent bg).

### §5 수료 조건 (attendance 임계)

현재 `attendance.ts` 도메인 상 `COMPLETION_ATTENDANCE_THRESHOLD = 0.75` (8회 중 6회) 확정. **재확인 필요**:
- 75% 유지? 결석 2회까지 수료 가능
- 상향 (85%)? 결석 1회까지 (엄격)
- 하향 (50%)? 결석 4회까지 (관대)

**추천**: 75% 유지. 이미 도메인 확정이며 1기 실제 출석률 대비 합리적.

### §6 학생 dashboard grid 배치

**§6.1**: 4번째 카드 추가 시 grid layout
- 옵션 A: `lg:grid-cols-3` 유지 (4번째는 다음 행 시작. 첫 행 3개 + 둘째 행 1개)
- 옵션 B: `lg:grid-cols-4` (한 줄에 4개 배치. 카드 폭 좁아짐)
- 옵션 C: `lg:grid-cols-2` (첫 행 2개 + 둘째 행 2개, 균형)

**추천**: 옵션 A. 기존 3개는 자주 쓰는 것이며 4번째 (수료증) 는 종강 후만 활성화되므로 별도 행에 두는 게 위계상 자연.

**§6.2**: 카드 아이콘 (lucide-react)
- Award (트로피 없는 상장 모양) **추천**
- GraduationCap (졸업모)
- ScrollText (두루마리)

**§6.3**: 종강 전 카드 disabled 처리
- 옵션 A: 카드 자체 표시 X (종강 후에만 4번째 카드 등장)
- 옵션 B: 카드 표시하되 opacity-50 + "종강 후 발급" 뱃지 (**추천**, 학생이 미리 인지)

---

## 13. 파일 산출물

### 이번 dispatch (Luna)
- `tools/certificate-preview.html`: HTML 프로토타입 (완료)
- `docs/specs/B0081-certificate-system.md`: 본 spec (완료)
- `docs/screenshots/b0081/certificate-a4-preview.png`: 렌더링 검증 캡처 (완료)

### Iris 후속 dispatch
- `src/programs/fan-to-pro/application/certificate/certificate-html-template.ts`: 함수화된 HTML 렌더러
- `src/programs/fan-to-pro/application/certificate/build-certificate-data.ts`: data fetch 통합
- `src/programs/fan-to-pro/application/certificate/generate-certificate-pdf.ts`: server action
- `src/programs/fan-to-pro/application/certificate/issue-certificate.ts`: admin 발급 mutation
- `src/programs/fan-to-pro/application/certificate/generate-serial-no.ts`: 순차 발급번호
- `src/programs/fan-to-pro/interface/components/lms/student/certificate-preview-frame.tsx`
- `src/programs/fan-to-pro/interface/components/lms/student/certificate-print-button.tsx`
- `src/programs/fan-to-pro/interface/components/lms/student/certificate-status-card.tsx`
- `src/programs/fan-to-pro/interface/components/lms/student/certificate-blocked-card.tsx`
- `src/programs/fan-to-pro/interface/components/lms/admin/certificate-status-badge.tsx`
- `app/[locale]/fan-to-pro/[cohortSlug]/student/dashboard/page.tsx` (4번째 카드 배선)
- `app/[locale]/fan-to-pro/[cohortSlug]/student/certificates/page.tsx` (ComingSoon 참조 실제 구현)
- `app/[locale]/fan-to-pro/(lms)/admin/students/[id]/page.tsx` (badge 삽입)

### Sage 후속
- verify URL 공개 여부 검토 (§노아확인 §3)
- 새 server action 3종 `assertX` 권한 검증 audit

### Mira 후속
- §10 QA 시나리오 실행

---

## 14. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|---|---|---|---|
| Pretendard CDN 인쇄 시 미로드 (폰트 fallback) | 중 | 중 | OS 폰트 fallback 확인 (Apple SD Gothic Neo, Malgun Gothic) |
| Chrome print preview 에서 배경색 미인쇄 (기본 옵션) | 높음 | 중 | 인쇄 다이얼로그에서 "배경 그래픽" 체크 안내 문구 |
| verify URL 공개 시 PII 노출 사고 | 낮음 | 높음 | §노아확인 §3 옵션 B (익명) + Sage 검토 |
| 학생이 종강 전 발급 시도 (400, UX 혼란) | 중 | 낮음 | UI 에서 disabled + coming-soon card 로 예방 |
| 발급 후 서명, 인장 실물 없이 인쇄한 학생 항의 | 중 | 중 | 페이지 상단에 "실물 인쇄 수료증은 7/25 수료식에서 배포됩니다" 안내 |
| 인쇄 시 QR 잘림 | 낮음 | 낮음 | @page margin 0 + 컨테이너 padding 관리 확인 (이미 세팅) |

---

## 15. 시간 박싱 + 후속

- 본 dispatch (Luna): 90분 안 (완료)
- 노아 6건 확인: 5분 (spec 리뷰 후 답신)
- Iris 후속 dispatch: 90분 (backend 배선)
- Sage 후속: 30분 (verify URL 공개 검토)
- Mira QA: 30분 (7/19 이후 실제 종강 후 실행)

**타깃**: 7/22 이전 학생 dashboard 활성화. 7/25 수료식 당일 학생 self-serve 다운로드 가능.
