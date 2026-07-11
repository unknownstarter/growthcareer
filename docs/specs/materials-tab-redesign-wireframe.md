# 자료 탭 재설계 wireframe

**작성**: Luna / 2026-07-11 / **status**: draft (30분 timebox, 노아 확인 대기)
**목적**: `/admin/materials` 진입 시 1기 자동 리다이렉트 없애고 5개 카테고리 통합 랜딩으로 재설계
**노아 승인**: 옵션 A (카테고리 통합 랜딩 + 카테고리별 상세)

---

## 1. 배경 및 원칙

### 문제

기존 `/admin/materials/page.tsx` (56 lines) 는 active cohort 의 `/admin/cohorts/[slug]/materials` 로 즉시 redirect. 결과:

- 사이드바 [자료] 클릭 = 강의 자료 상세로 직행. "자료 탭" 이 존재하지 않는 UX
- 학생 이력서, 포트폴리오, 수료증, 공지 첨부는 각각 다른 경로로만 접근 (students/[id], announcements). 통합 뷰 없음
- 카테고리 개념 소실 = 운영자가 "모든 자료" 를 한눈에 못 봄

### 원칙

- **§7.4 보호**: 기존 `/admin/cohorts/[slug]/materials` (강의 자료 상세) 시그니처와 동작 변경 금지
- **§6.7 인터렉션**: loading.tsx + fade-in stagger + hover transition + motion-safe
- **§6.5 부호**: em dash, interpunct, 곡선 따옴표, 단일 ellipsis 금지
- **최소 침습**: 신규 landing + 5 카테고리 상세만 신설. 기존 페이지 재사용

---

## 2. 라우팅

| Route | 상태 | 역할 |
|---|---|---|
| `/[locale]/fan-to-pro/admin/materials` | 재작성 | 통합 랜딩 (5 카드) |
| `/[locale]/fan-to-pro/admin/materials/lecture` | 신규 | 강의 자료 (기수별 그룹) |
| `/[locale]/fan-to-pro/admin/materials/resumes` | 신규 | 학생 이력서 (학생별 그룹) |
| `/[locale]/fan-to-pro/admin/materials/portfolios` | 신규 | 학생 포트폴리오 (학생별) |
| `/[locale]/fan-to-pro/admin/materials/certificates` | 신규 | 수료증 (기수별) |
| `/[locale]/fan-to-pro/admin/materials/announcements` | 신규 | 공지 첨부 (기수별) |
| `/[locale]/fan-to-pro/admin/cohorts/[slug]/materials` | 유지 | 강의 자료 상세 (기존, 손대지 않음) |

### 사이드바 링크 매핑

기존: `[자료] -> /admin/materials` (즉시 redirect)
신규: `[자료] -> /admin/materials` (통합 랜딩)

강의 자료 CRUD 는 여전히 cohort 상세 안에서만 가능. `/admin/materials/lecture` 는 read-only 나열 + 각 기수 상세로 링크.

---

## 3. 통합 랜딩 UI (`/admin/materials`)

### 레이아웃

```
+-------------------------------------------+
| PageHeader "자료"                          |
| description "카테고리별 자료를 확인하세요"  |
+-------------------------------------------+
| [ Grid 2 x 3 (mobile: 1 x 5) ]            |
|                                           |
| +----------+ +----------+ +----------+     |
| | 강의 자료 | | 이력서    | | 포트폴리오 |     |
| | icon    | | icon    | | icon    |     |
| | 42건    | | 12건    | | 8건     |     |
| | 최근 3  | | 최근 3  | | 최근 3  |     |
| | [전체 >]| | [전체 >]| | [전체 >]|     |
| +----------+ +----------+ +----------+     |
|                                           |
| +----------+ +----------+                 |
| | 수료증    | | 공지 첨부  |                 |
| | icon    | | icon    |                 |
| | ...     | | ...     |                 |
| +----------+ +----------+                 |
+-------------------------------------------+
```

### 카드 컴포넌트 spec

**`MaterialCategoryCard`** (신규)

```ts
type Props = {
  title: string;             // "강의 자료"
  description: string;       // "회차별 수업 자료"
  icon: LucideIcon;          // BookOpen, FileText, Briefcase, Award, Megaphone
  count: number;             // 총 개수
  recentItems: {             // 최근 3개
    id: string;
    label: string;           // 예: "1기 / 1주차 오리엔테이션"
    createdAt: string;       // ISO
  }[];
  href: Route;               // 상세 페이지 링크
  animationDelay?: number;   // stagger index (ms)
};
```

**아이콘 매핑** (lucide-react):

- 강의 자료: `BookOpen`
- 이력서: `FileText`
- 포트폴리오: `Briefcase`
- 수료증: `Award`
- 공지 첨부: `Megaphone`

**visual**:
- `border border-[var(--border)] bg-[var(--card)] p-6 rounded-[var(--radius)]`
- hover: `hover:border-[var(--primary)] hover:shadow-md transition-all duration-200`
- 클릭 영역 전체 링크 (a11y: 하나의 `<Link>` 로 카드 전체 감싸기 안 됨. `<Link>` 를 우측 하단 "전체 >" 로만. 카드 자체는 group hover)

### 인터렉션 §6.7

```tsx
// 페이지 fade-in
<PageContainer className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500">

// 카드 stagger (index 0~4)
<div style={{ animationDelay: `${index * 60}ms` }}
     className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
```

---

## 4. 카테고리 상세 페이지 wireframe

### 4-1. `/admin/materials/lecture` (강의 자료 통합)

**목적**: 모든 기수의 강의 자료를 한 페이지에서 확인. CRUD 는 cohort 상세로 링크.

```
+-------------------------------------------+
| PageHeader "강의 자료"                     |
| description "기수별 강의 자료 목록"        |
| [뒤로 자료] link (좌상단)                   |
+-------------------------------------------+
| ▼ 1기 (fan-to-pro-1) / 42건               |
|   [기수 상세에서 관리 >] link              |
|   +----+ +----+ +----+                    |
|   | 1주 | | 2주 | | 3주 |  (회차 카드)      |
|   | 3건 | | 4건 | | 2건 |                  |
|   +----+ +----+ +----+                    |
|                                           |
| ▼ 2기 (fan-to-pro-2) / 0건                |
|   EmptyState "자료 없음"                   |
+-------------------------------------------+
```

**데이터 요구**: 모든 active/upcoming cohort + 각 cohort 의 lecture_materials 회차별 count

### 4-2. `/admin/materials/resumes` (이력서)

**목적**: 등록된 학생 이력서를 학생별로 열람.

```
+-------------------------------------------+
| PageHeader "학생 이력서"                    |
| description "학생별 이력서 등록 현황"       |
+-------------------------------------------+
| [필터: 기수 ▼] [정렬: 최근순 ▼]             |
+-------------------------------------------+
| Table                                     |
| | 학생 | 기수 | 이력서 | 업로드일 | 액션 | |
| | 김수연 | 1기 | file  | 07-08   | [열기]| |
| | 이지원 | 1기 | url   | 07-05   | [열기]| |
+-------------------------------------------+
```

**액션**: [열기] = external_url 이면 새 탭, file_upload 면 signed URL 다운로드.

### 4-3. `/admin/materials/portfolios` (포트폴리오)

resumes 와 동일 구조, `doc_type=portfolio` 필터.

### 4-4. `/admin/materials/certificates` (수료증)

**목적**: 발급된 수료증 열람 + 발급번호 (serial_no) 로 검색.

```
+-------------------------------------------+
| PageHeader "수료증"                         |
| description "발급된 수료증 목록"            |
+-------------------------------------------+
| [발급번호 검색 input] [기수 필터 ▼]          |
+-------------------------------------------+
| Table                                     |
| | 발급번호 | 학생 | 종류 | 기수 | 발급일 | | |
| | GC-...  | 김수연 | 수료 | 1기 | 07-08 | 열기| |
+-------------------------------------------+
```

**액션**: [열기] = `/verify/[serialNo]` 로 이동 (기존 공개 검증 페이지 재사용).

### 4-5. `/admin/materials/announcements` (공지 첨부)

**⚠️ 확인 필요**: announcements 테이블에 attachment 컬럼 없음. 신설할지 or 스코프 축소 (공지 링크만 나열) 결정 필요.

**옵션 A** (첨부 컬럼 신설):
```
Announcement + attachments JSONB
| 제목 | 기수 | 첨부 수 | 발행일 |
```

**옵션 B** (스코프 축소, 공지 목록만):
```
| 제목 | 기수 | 발행 상태 | 발행일 | [보기] |
```

노아 확인 대기.

---

## 5. loading.tsx skeleton (§6.7)

### 랜딩 loading

```tsx
// app/[locale]/fan-to-pro/(lms)/admin/materials/loading.tsx
<PageContainer>
  <div className="h-8 w-32 bg-[var(--muted)] rounded animate-pulse mb-6" />
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-48 bg-[var(--card)] border rounded animate-pulse" />
    ))}
  </div>
</PageContainer>
```

### 각 카테고리 상세 loading

table 형 stub (row 8개 pulse).

---

## 6. 컴포넌트 목록 (총 8개 신규)

| # | 컴포넌트 | 위치 | 역할 |
|---|---|---|---|
| 1 | `MaterialCategoryCard` | `components/lms/admin/materials/material-category-card.tsx` | 랜딩 카드 |
| 2 | `MaterialsLandingGrid` | `components/lms/admin/materials/materials-landing-grid.tsx` | 5 카드 stagger 컨테이너 |
| 3 | `LectureMaterialsAllCohortsView` | `components/lms/admin/materials/lecture-materials-all-cohorts-view.tsx` | 기수별 그룹 view |
| 4 | `CareerDocumentsListView` | `components/lms/admin/materials/career-documents-list-view.tsx` | resumes + portfolios 공용 |
| 5 | `CertificatesListView` | `components/lms/admin/materials/certificates-list-view.tsx` | 수료증 table |
| 6 | `AnnouncementsMaterialsView` | `components/lms/admin/materials/announcements-materials-view.tsx` | 공지 첨부 (옵션 확정 후) |
| 7 | `MaterialsCategoryHeader` | `components/lms/admin/materials/materials-category-header.tsx` | 뒤로 링크 + PageHeader wrap |
| 8 | `MaterialsRecentPreview` | `components/lms/admin/materials/materials-recent-preview.tsx` | 카드 안 최근 3개 리스트 |

---

## 7. Iris fetch layer 요구 함수 명세

### 신규 repository 함수

**`career-document-repository.ts`** (신규 추가):

```ts
/** 모든 doc (admin 통합 뷰용). 학생명 join 필요 -> view 또는 별도 함수. */
export async function fetchAllCareerDocumentsByType(
  docType: CareerDocType,
  opts?: { cohortId?: string; limit?: number },
): Promise<(CareerDocument & { student_name: string; cohort_name: string })[]>;

/** count only (랜딩 카드 카운트). */
export async function countCareerDocumentsByType(
  docType: CareerDocType,
): Promise<number>;
```

**`certificate-repository.ts`** (신규 추가):

```ts
export async function fetchAllCertificates(
  opts?: { cohortId?: string; limit?: number },
): Promise<(Certificate & { student_name: string; cohort_name: string })[]>;

export async function countCertificates(): Promise<number>;
```

**`lecture-material-repository.ts`** (신규 추가):

```ts
/** 모든 cohort 의 lecture materials + 회차별 count. */
export async function fetchLectureMaterialsGroupedByCohort(): Promise<{
  cohort: { id: string; slug: string; name: string };
  sessions: { session_no: number; materials_count: number }[];
  total_count: number;
}[]>;

export async function countAllLectureMaterials(): Promise<number>;
```

**`announcement-repository.ts`** (신규 추가, 옵션 확정 후):

```ts
export async function countAnnouncementsWithAttachments(): Promise<number>;
export async function fetchAnnouncementsWithAttachments(): Promise<Announcement[]>;
```

### 통합 landing fetch (server component)

```ts
// 랜딩 페이지 단일 fetch (병렬)
const [
  lectureCount, lectureRecent,
  resumeCount, resumeRecent,
  portfolioCount, portfolioRecent,
  certCount, certRecent,
  announcementCount, announcementRecent,
] = await Promise.all([...]);
```

---

## 8. 노아 확인 필요 (3~5건)

### Q1. 공지사항 자료 카테고리 스코프

announcements 테이블에 attachment 컬럼 없음. 옵션:
- **A** (첨부 스키마 신설): migration + attachments JSONB 컬럼. 공지 작성 UI 도 수정 필요
- **B** (스코프 축소): "공지 첨부" 대신 "공지 자료" 로 rename, 첨부 없는 공지 목록만 보여줌
- **C** (5번째 카드 제거): 4 카테고리로 축소

**Luna 추천**: 옵션 B (단기 최소 침습). 옵션 A 는 별도 슬라이스로 분리.

### Q2. 이력서/포트폴리오의 열람 권한

학생의 이력서와 포트폴리오는 PII. 운영자만 열람 가능해야 함.
- 다운로드 시 audit log 남길지?
- Sage 검토 필요 여부?

### Q3. 강의 자료 통합 뷰의 편집 정책

`/admin/materials/lecture` 에서 CRUD 를 허용할지, cohort 상세로만 링크할지?
- **Luna 추천**: read-only + cohort 상세 링크. 편집 UI 중복 회피

### Q4. 수료증 카테고리에서의 발급 액션

발급은 지금 어디서 하는지 확인 필요. `/admin/materials/certificates` 에서 [발급] 버튼을 재현할지, read-only 로만 둘지?
- **Luna 추천**: read-only. 발급은 기존 위치 유지 (Sage sensitive)

### Q5. 사이드바 [자료] 링크 이름

기존: "자료" 단일 링크
신규: 통합 랜딩이므로 그대로 유지 OK
- 서브 메뉴로 5 카테고리를 펼칠지, 랜딩만 링크할지?
- **Luna 추천**: 랜딩만 링크. 사이드바 depth 증가 회피

---

## 9. 후속 슬라이스 예상

- **Slice 2 (Iris)**: repository 함수 신설 (§7 명세) + 랜딩 loader
- **Slice 3 (Luna)**: 랜딩 페이지 + MaterialCategoryCard + loading.tsx
- **Slice 4 (Luna)**: 5 카테고리 상세 페이지 순차 구현
- **Slice 5 (Mira)**: 5 카테고리 통합 시나리오 QA
- **Slice 6 (Sage)**: 이력서/포트폴리오 PII 열람 audit 검토

---

## 10. 리스크

| Risk | 완화 |
|---|---|
| 기존 `/admin/materials` redirect 를 기대하는 링크 잔존 | grep 으로 모든 참조 확인 후 재작성 |
| 학생 PII 자료 통합 뷰 = 열람 감사 필요 | Sage 검토 (Slice 6) |
| 랜딩 fetch 병렬 5개 = latency | count 만 우선, recent 는 Suspense 안 지연 로드 검토 |
| `/admin/materials/lecture` 와 cohort 상세 중복 | read-only 로 분리, CRUD 는 cohort 상세로만 |

---

## 11. 시각 검증 (§6)

Slice 3 완료 후 `pnpm preview` 로 자체 캡처. 대상:
- 랜딩 (5 카드) 다크/라이트
- 랜딩 loading.tsx
- 각 카테고리 상세 loading.tsx
- 모바일 1 x 5 grid
- hover transition (카드 border color)

---

**status**: 노아 확인 대기 (Q1~Q5). 실 구현은 승인 후 Slice 2 부터.
