# 12. LMS 정식 런칭 로드맵 — 1기 2주차 (7/4 토) 가동

> Owner: Aria · Captured: 2026-06-25 · D-9 to launch
>
> 본 문서는 Fan to Pro 1기 학생 11명을 2026-07-04 (토) 2주차 강의부터 LMS 본격 사용하게 만드는 9일 plan 이다. 1기 한정 minimum + 2기+ 확장 가능 구조 (ADR 0010 정신).
>
> 관련 문서:
> - 운영 매뉴얼: [`CLAUDE.md`](../../CLAUDE.md) §7.4 (production 보호), §6.5 (카피 룰)
> - 현재 상태: [`WORKING-SESSION.md`](../../WORKING-SESSION.md)
> - 백로그: [`docs/tasks/BACKLOG.md`](../tasks/BACKLOG.md) B0044~B0047
> - 디자인: [`docs/decisions/0006-lms-design-system.md`](../decisions/0006-lms-design-system.md)
> - URL 분리: [`docs/decisions/0008-url-structure-and-auth-separation.md`](../decisions/0008-url-structure-and-auth-separation.md)

---

## 0. 입력 산출물 상태 (2026-06-25 시점)

| 입력 | 상태 | 비고 |
|---|---|---|
| Echo `docs/research/lms-launch-research.md` | ❌ 미작성 | 본 로드맵에 fallback 가정 박음 (아래 §A.fallback) |
| Sophia `docs/decisions/0011-lms-launch-architecture.md` | ❌ 미작성 | 본 로드맵에 fallback 가정 박음 (아래 §B.fallback) |
| B0037 career documents Wave A+ | ✅ done (2026-06-21) | student career surface + admin career surface 살아있음 |
| LMS Wave 1 (Auth + admin LMS 골격) | ✅ done | login + /fan-to-pro/(lms)/admin/* (super_admin) |
| student surface `/career` | ✅ done | `app/[locale]/fan-to-pro/[cohortSlug]/student/career` |
| Supabase Storage `career-documents` bucket | ✅ done | private + RLS 4종 |

→ **Aria 의 결정**: Echo + Sophia 가 본 시점에 안 나왔으므로, 본 로드맵은 그들의 산출물 **없이도 진행 가능한 minimum** 으로 작성. 그들이 나오면 §A.fallback / §B.fallback 을 그 산출물로 대체 + Phase 1 Day 1 의 entity / Storage 결정 재검토.

---

## 1. 목표 + 성공 기준

### Goal
**2026-07-04 (토) 2주차 강의 시작 (14:00) 전까지** 1기 학생 11명이 본인 계정으로 LMS 에 로그인하여 (a) 강의 자료 다운로드 (200MB+ 대용량 PPT 안전), (b) 이력서/자기소개서/포트폴리오 (B0037) 단일 최신본 관리, (c) 취업 필요 정보 (희망 직무 / 자격증 / 경력 / 학력 / 비자) 등록 — 3개 핵심 기능 가동.

### Why
- Google Drive 모바일 다운로드 1주차 사고 재발 방지 (실측 400MB PPT 안 받아짐)
- 1기 운영 안정성 + 2기 모집 (8월) 전 학생 surface 본격 자산화
- 외국인 학생 (D-2/D-4/D-10/E/F 비자) 영문 UX 동등 보장 필수

### 성공 기준 (Done When)
1. 학생 11/11 명 7/4 (토) 13:00 까지 LMS 첫 로그인 + PW 변경 완료
2. 강의 자료 (PPT / 추가 자료) Storage 업로드 + 학생 11명 다운로드 시 모바일 포함 성공률 100%
3. 학생 11명 중 최소 8명 (73%) 이 career profile (job preference + visa) 최소 1 field 입력
4. Sage critical = 0, high ≤ 1 (즉시 fix 가능)
5. 7/4 강의 시간 (14:00~16:00) 동안 LMS down 0 분, 자료 다운로드 에러 0 건
6. 2기+ 확장 시 변경 없이 강사 invite 만 추가하면 강사 surface 가동 가능한 구조

---

## 2. Scope — 1기 한정 cut down vs 2기+ 확장

### 1기 한정 (D-9 안 들어가는 것)

| 영역 | 1기 한정 (do) | 2기+ (defer) |
|---|---|---|
| 자료 업로드 | 운영자 (노아) 가 admin LMS 에서 강사 대신 업로드 | 강사가 본인 cohort surface 에서 직접 업로드 |
| 강사 access | 없음 (admin 만) | 강사 surface 풀 가동 (B0032 Step 3) |
| 출결 | 노아 admin 에서 manual mark | 학생 self check-in (B0040 자동화 후보 A4) |
| 알림 | 카톡 + 이메일 (수동, 기존 admin 메시지 종류 활용) | 알림톡 자동 (B0040 A1) |
| 캘린더 | 정적 (B0040 playbook §07 timeline) | events entity (B0033 Wave 2) |
| 과제 | 카톡 (1기 운영 그대로) | assignments entity (B0033) |
| 컨설팅 | 카톡 (1기 운영 그대로) | consultations entity (B0033) |
| 수료증 | 7/25 manual (Dropdown 명의 PDF) | certificates entity (B0033) |
| Realtime | X (새로고침) | Supabase Realtime (B0036 Wave 5) |

### RBAC (4 계층 권한, ADR 0011 §5.6)

| Role | 1기 LMS 활성 여부 | 핵심 권한 |
|---|---|---|
| **super_admin** (노아) | ✅ | 모든 entity RW + 모든 cohort |
| **admin (program admin)** | ✅ (현재 노아 본인 = 동일 계정) | program 단위 RW |
| **instructor** | ❌ 1기 NO / 2기+ ✅ | 1기는 운영자 대신 자료 upload + 코멘트 입력. 2기+ 본인 surface |
| **student** | ✅ | 본인 자료 다운로드 + career documents/profile 입력. student_notes 는 read X (운영 private) |

### 1기 핵심 (must ship by 7/4)

1. **자료 다운로드** (학생 + 운영자 업로드)
2. **career documents** (B0037 이미 done — 회귀만 확인)
3. **career profile** (취업 정보 폼 — 신규 entity)
4. **운영 코멘트 (student_notes)** — admin / 강사 의견 입력 (1기는 운영자 only 입력, 학생은 read X)
5. **학생 invite + 첫 로그인 강제 PW 변경** (must_change_password 흐름은 LMS Wave 1 에 박혀있음 — invite UI 만 검증)

→ 5개 surface 만. 그 외는 전부 cut.

---

## 3. Phase 분할 (Day-by-Day Plan)

> 시간 가정: 1인 개발자 (노아) 가 하루 6~8h 실작업. 도메인 에이전트 (Iris/Luna/Sage/Mira/Vera) 는 노아가 메인 어시스턴트를 통해 호출.

### Phase 1 — 인프라 + Entity (Day 1~3 / 6/25 목 ~ 6/27 토)

> 6/27 토는 1주차 강의 day. 강의 끝난 후 (16:00~) 만 작업 가능. 그래서 Phase 1 의 실작업은 6/25~6/26 2일 + 6/27 evening 0.5일 = 2.5일.

| Day | 담당 | 작업 | 산출물 | 검증 기준 |
|---|---|---|---|---|
| **6/25 목** | Iris | DB 마이그레이션 신규 — `lecture_materials` entity + `student_career_profiles` entity | `supabase/migrations/20260625_*.sql` 2개 | `supabase-verify.mjs` PASS · `pnpm typecheck` PASS |
| 6/25 목 | Iris | Storage bucket `lecture-materials` 생성 + RLS (super_admin write / cohort_memberships read) | bucket + 4 policies | supabase dashboard 확인 |
| 6/25 목 | Iris | server actions: `uploadLectureMaterial` / `listLectureMaterials` / `deleteLectureMaterial` / `signLectureMaterialUrl` (signed URL TTL 10분) | `application/lecture-material-actions.ts` | unit-level: `assertAdmin` + `assertCohortMember` 가드 박음 |
| **6/26 금** | Iris | server actions: `upsertCareerProfile` / `getCareerProfile` (학생 본인 + admin) | `application/career-profile-actions.ts` | `assertCanAccessStudentCareer` (B0037 헬퍼 재사용) |
| 6/26 금 | Iris | DB 마이그레이션 — `student_notes` entity + RLS 4 정책 (super_admin / program admin / instructor read + own author write / student NO) | `supabase/migrations/20260626_student_notes.sql` | ADR 0011 §5.5 schema 그대로 |
| 6/26 금 | Iris | server actions: `createStudentNote` / `listStudentNotes` / `updateStudentNote` / `deleteStudentNote` / `togglePinStudentNote` + `assertCanWriteStudentNote` / `assertCanReadStudentNote` 가드 신설 | `application/student-note-actions.ts` + `infrastructure/auth/lms-role.ts` 보강 | author_role 자동 추론 (user.is_super_admin / program admin / instructor) |
| 6/26 금 | Luna | shadcn primitives 확인 — Form / Input / Select / Textarea / Badge (이미 있으면 skip) | - | 컴포넌트 import 가능 |
| **6/27 토 evening** | Mira | Phase 1 자체 테스트 — server action 시그니처 + RLS 가드 검증 | 결과 리포트 | 4 시나리오 (admin upload / student download / 비-cohort 차단 / IDOR 차단) PASS |

**Phase 1 cut line**: Storage 권한 / RLS / server action 가드 가 박혀야 다음 phase 가능. 안 끝나면 7/4 launch 위험 → 이 시점에 cut down 결정 (예: career profile 을 7/11 로 defer + 자료 다운로드 만 우선).

### Phase 2 — UI (Day 4~7 / 6/28 일 ~ 7/1 수)

| Day | 담당 | 작업 | 산출물 | 검증 기준 |
|---|---|---|---|---|
| **6/28 일** | Luna | admin LMS — `/fan-to-pro/(lms)/admin/cohorts/[cohortId]/materials` 페이지 (자료 upload + list + delete) | `app/[locale]/fan-to-pro/(lms)/admin/cohorts/[cohortId]/materials/page.tsx` | 노아가 본인 super_admin 으로 PPT 1개 업로드 성공 |
| 6/28 일 | Luna | 자료 list 컬럼: 회차 (1~8) / 제목 / 파일명 / 크기 / 업로드 일시 / 작업 (다운로드 / 삭제) | - | 모바일 반응형 확인 |
| **6/29 월** | Luna | student LMS — `/fan-to-pro/[cohortSlug]/student/materials` (cohort 내 자료 list + 다운로드) | `app/[locale]/fan-to-pro/[cohortSlug]/student/materials/page.tsx` | 학생 가짜 계정으로 다른 cohort URL 시 403 |
| 6/29 월 | Luna | 다운로드 = signed URL 새 탭 + 진행률 hint (대용량 안내 카피) | - | 200MB+ 파일 모바일 (iOS Safari + Android Chrome) 다운로드 PASS |
| **6/30 화** | Luna | student career profile 폼 — `/fan-to-pro/[cohortSlug]/student/profile` | `app/[locale]/fan-to-pro/[cohortSlug]/student/profile/page.tsx` | 폼 필드 검증 + draft autosave (옵션) |
| 6/30 화 | Luna | career profile 필드 — 희망 직무 (select) / 자격증 (textarea) / 경력 (textarea) / 학력 (textarea) / 비자 (select, B0006 비자 칩 재사용) | - | KO + EN 카피 동기화 |
| **7/1 수** | Luna | admin LMS — `/fan-to-pro/(lms)/admin/students/[id]/profile` (학생 career profile view, read-only 또는 edit) | - | super_admin only |
| 7/1 수 | Luna | admin LMS — `/fan-to-pro/(lms)/admin/students/[id]` 에 "운영 코멘트" 패널 추가 (student_notes timeline + 작성 form + pin toggle) | `interface/components/lms/admin/student-notes-panel.tsx` | 학생 본인 surface 에서 read X 검증 |
| 7/1 수 | Luna | student LMS shell — 사이드바에 materials / career / profile 3 항목 + 다국어 라벨 | `interface/components/lms/student-nav.tsx` | KO + EN 라벨 정합 |

**Phase 2 cut line**: 6/30 시점에 자료 다운로드 + career documents (B0037 done) 만 동작하면 7/4 가능. career profile 폼은 7/4 후 (7/11 2주차 강의 후) defer 옵션. 노아가 Day 5~6 시점에 진척 보고 결정.

### Phase 3 — 보안 + QA + Invite 흐름 (Day 8~9 / 7/2 목 ~ 7/3 금)

| Day | 담당 | 작업 | 산출물 | 검증 기준 |
|---|---|---|---|---|
| **7/2 목 AM** | Sage | 신규 entity (lecture_materials / student_career_profiles) + Storage bucket + server actions 보안 검토 | 검토 리포트 | critical = 0 |
| 7/2 목 PM | Iris | Sage 지적 fix (high 1건 이내 예상 — signed URL TTL / path randomness / file scheme allowlist 등 B0038 패턴) | fix commit | Sage 재검토 PASS |
| **7/3 금 AM** | Mira | E2E QA — admin 업로드 → 학생 다운로드 → career profile 입력 → admin view full flow | QA 리포트 | 시나리오 8개 (KO 4 + EN 4) PASS |
| 7/3 금 AM | Mira | 모바일 다운로드 회귀 — iOS Safari (시뮬레이터 또는 실기기) + Android Chrome 200MB+ PPT | - | 100% 성공 |
| 7/3 금 PM | Vera | invite 흐름 dry-run — 노아가 본인 계정 + 가짜 학생 계정 1개 만들어서 invite email → 첫 로그인 → PW 변경 PASS | 흐름 캡처 | 5분 안 첫 로그인 |
| 7/3 금 PM | Vera | 배포 — `git push` (GitHub auto deploy) + production smoke test | 배포 로그 | `growthcareer.xyz/fan-to-pro` + `(lms)` 라우트 모두 200 |
| 7/3 금 저녁 | 노아 | 본인 운영자 계정으로 prod 에서 PPT 1개 업로드 + 자기 가짜 학생 계정으로 다운로드 final check | - | 모바일 PASS |

**Phase 3 cut line**: Sage critical 1건 이상 → 그 fix 끝날 때까지 prod 배포 금지. 7/4 가동 위험 → Phase 4 의 invite 를 학생 5명 (외국인 1~2 + 한국인 3~4) 으로 축소 + 나머지는 7/11 2주차 후 invite (cut down 안).

### Phase 4 — 가동 (Day 10 / 7/4 토)

| 시각 | 담당 | 작업 | 산출물 | 검증 기준 |
|---|---|---|---|---|
| **7/4 토 09:00** | 노아 | 강의 자료 2주차 PPT + 보조 자료 admin 에서 업로드 | Storage 에 자료 박힘 | 다운로드 가능 |
| 7/4 토 10:00 | 노아 | 학생 11명 invite — admin LMS 의 invite UI 또는 직접 user_profiles row 생성 + temp PW 박음 | 11개 row | must_change_password=true |
| 7/4 토 10:00 | 노아 | 카톡 오픈채팅 + 1:1 SMS / 이메일로 안내 발송 (§8 카피 사용) | 11명 모두 발송 확인 | 답장 / 읽음 트래킹 |
| 7/4 토 13:00 | 노아 | 강의 시작 1시간 전 — LMS smoke check (학생 1명 본인 계정으로 다운로드 PASS 확인) | - | 자료 받아짐 |
| 7/4 토 13:30 | Mira | 강의 시작 30분 전 — production sentry / vercel 로그 점검 | - | error 0 |
| 7/4 토 14:00 | 노아 | 강의 시작 — 강의실에서 학생들이 LMS 본인 계정 진입 확인 | 11/11 로그인 | 100% |
| 7/4 토 14:30 | 노아 | 강의 중 자료 다운로드 시연 + 학생 본인 휴대폰으로 다운로드 받게 함 | - | 사고 0 |
| 7/4 토 16:00 | 노아 | 강의 후 회고 — 학생 진입률 + 다운로드 성공률 + 미해결 이슈 기록 | `docs/sessions/SESSION-2026-07-04-lms-launch.md` | 5단락 |

---

## 4. 의존성 그래프

```
DB migration (Iris, 6/25)
  ├─ Storage bucket (Iris, 6/25)
  │    └─ server actions upload/list/delete (Iris, 6/25)
  │         └─ admin materials UI (Luna, 6/28)
  │              └─ student materials UI (Luna, 6/29)
  │                   └─ Mira E2E (7/3)
  │                        └─ Vera deploy (7/3)
  │                             └─ 노아 invite + 가동 (7/4)
  │
  └─ career_profile entity (Iris, 6/25~6/26)
       └─ profile actions (Iris, 6/26)
            └─ student profile UI (Luna, 6/30)
                 └─ admin profile view (Luna, 7/1)
                      └─ Mira E2E (7/3)

Sage 검토 (7/2) ── 모든 server action / bucket 가 input
                  └─ blocking gate: prod 배포 전 필수 (CLAUDE.md §7.4)
```

**병렬 가능 구간**:
- 6/26: Iris (career profile actions) ‖ Luna (shadcn primitives 점검)
- 6/29: Iris 는 backend done, 그 동안 Luna 가 student materials UI 집중
- 7/2 AM: Sage 검토 중에 Mira 는 모바일 다운로드 시나리오 준비

**병목**:
- Phase 1 끝 (6/27 evening) — backend 안 끝나면 Phase 2 시작 불가
- Sage critical 1건 (7/2) — fix 안 끝나면 prod 배포 불가

---

## 5. 노아 manual action 체크리스트

### 6/25 (목) — Phase 1 시작 전
- [ ] 학생 11명 이메일 list 추출 (`/admin/applicants` status=paid filter → email 컬럼) → `docs/private/cohort-1-students.csv` 박음 (gitignore 확인)
- [ ] 학생 11명 중 외국인 (visa D-2/D-4/D-10/E/F) 비율 확인 → 영문 카피 우선순위 가늠
- [ ] Storage 비용 예상 — 8회 × 200MB PPT + 보조 자료 ≈ 2GB 예상. Supabase free tier (1GB) 초과 → Pro plan ($25/mo) 사전 결재 결정

### 6/26 (금)
- [ ] 강사 8명 중 자료 업로드 위탁 받을 사람 결정 (1기 한정 노아 본인 업로드 default — 강사들에게 PPT 파일 카톡 받음)
- [ ] 카톡 안내 카피 (§8) 한/영 noah 검수

### 6/27 (토) — 1주차 강의 day
- [ ] 14:00~16:00 강의 진행 (LMS 작업 X)
- [ ] 16:30~18:00 Phase 1 final check + Phase 2 시작 준비

### 6/28 (일) ~ 7/1 (수)
- [ ] Day end 마다 Luna 의 UI preview 캡처 확인 (`pnpm preview` 자체 캡처 — CLAUDE.md §6)
- [ ] 6/30 (화) 시점에 career profile 폼 cut 여부 결정

### 7/2 (목)
- [ ] Sage 검토 결과 받기 (foreground, CLAUDE.md §7.4) — critical/high count 확인 후 fix 우선순위

### 7/3 (금)
- [ ] Mira E2E 결과 확인 + 모바일 다운로드 회귀 PASS 확인
- [ ] Vera 배포 후 본인 운영자 + 가짜 학생 계정으로 prod final check
- [ ] 학생 11명 temp PW 생성 — `nanoid(12)` 11개 + `cohort-1-students.csv` 에 매핑 박음 (로컬, gitignore)
- [ ] 카톡 / SMS / 이메일 발송 채널 결정 (이메일 + 카톡 1:1 권장 — 외국인 학생 SMS 안 들어갈 risk)

### 7/4 (토) — 가동 day
- [ ] 09:00 자료 업로드
- [ ] 10:00 invite + 안내 발송 (11명)
- [ ] 12:00 진입률 중간 체크 (5명 이상 첫 로그인 했는지 — 안 됐으면 카톡 1:1 follow-up)
- [ ] 13:00 smoke check
- [ ] 14:00 강의 시작 — 강의실에서 학생 11명 본인 휴대폰으로 LMS 진입 확인 + 자료 다운로드 시연
- [ ] 16:00 회고 + 미해결 이슈 기록

### 7/5 (일) ~ 7/11 (다음 강의 전)
- [ ] career profile 입력 % 확인 (목표 73%) — 미입력 학생 카톡 follow-up
- [ ] 7/11 3주차 강의 자료 사전 업로드

---

## 6. 위험 + 대응 (Risk Register)

| ID | 위험 | 발생 확률 | 영향 | Mitigation | Escape Plan |
|---|---|---|---|---|---|
| R1 | 9일 안 모든 surface 안 끝남 | High | 7/4 가동 실패 | Phase 1 마지막 (6/27) + Phase 2 중간 (6/30) 두 시점에 cut 결정 | career profile 폼 defer (7/11 후) + 자료 다운로드 + B0037 만 우선 |
| R2 | 학생 11명 중 invite 이메일 못 받음 | Med | 일부 학생 진입 실패 | 이메일 + 카톡 1:1 양 채널 발송 | 강의 시간에 노아가 학생 휴대폰으로 직접 도와줌 + temp PW manual 전달 |
| R3 | 모바일 다운로드 다시 깨짐 (Google Drive 재발) | Med | LMS 가치 lost | signed URL TTL 10분 + Content-Disposition: attachment + 진행률 hint 카피 + 7/3 모바일 실기기 회귀 | 비상용 Google Drive 링크 백업 (1주차 사고 학습) |
| R4 | Sage critical 1건 이상 | Med | 배포 지연 → 7/4 가동 실패 | B0037 패턴 (URL allowlist / private IP 거부 / path randomness) 사전 적용 | invite 학생 수 11 → 5 축소 + 나머지 7/11 후 |
| R5 | Storage 비용 초과 (free 1GB → 8회 자료) | High | $25/mo 추가 | 6/25 노아 결정 (Pro plan 사전 결재) | 이미지 압축 + 자료 ZIP 처리 + 회차 종료 후 압축 보관 |
| R6 | 학생들 Google Drive 익숙해서 LMS 안 들어옴 | Med | 진입률 < 50% | 카톡 안내 카피 강조 + 강의실에서 시연 + 1주차 자료도 LMS 에 backfill | 강의 중 LMS 사용 의무화 (PDF 자료 prefix 박힌 안내) |
| R7 | 외국인 학생 영문 UX 누락 | Low | 외국인 진입 실패 | KO + EN 동시 작성 룰 (CLAUDE.md §7.4 외국인 학생 영문 UX 필수) | 카톡 1:1 영문 안내 + 노아 직접 핸드오프 |
| R8 | Vercel quota / git push deploy 실패 | Low | 배포 지연 | git push default + `vercel --prod` hotfix 만 (CLAUDE.md §7) | Vercel dashboard manual deploy + 24h 안 GitHub integration 복구 |
| R9 | 강의 day (7/4) 에 LMS down | Low | 강의 사고 | smoke check 13:00 + sentry alert | Google Drive 비상 백업 즉시 공유 + 다음날 RCA |

---

## 7. 1기 vs 2기+ 분리

### 본 런칭 (1기 한정 — 7/4 ~ 7/25)
- 학생 11명, cohort 1개
- 강사 0명 invite (운영자 대신 업로드)
- 자료 다운로드 + career documents + career profile 3 기능
- 카톡 / 이메일 알림 manual
- 출결 admin manual mark (학생 self check-in X)

### 2기+ 확장 (8월 ~)
- 강사 invite + 본인 cohort surface 풀 가동 (B0032 Step 3)
- 출결 self check-in (B0040 자동화 A4)
- 알림톡 자동 (B0040 A1)
- assignments / consultations / certificates entity (B0033 Wave 2)
- events 캘린더 (B0033)
- RLS 정책 본격 (B0035 Wave 4)
- Realtime (B0036 Wave 5)

### 2기 모집 전 (7/26 ~ 8 월) 작업
1. 1기 후기 + 수료증 발급 (Dropdown 명의)
2. 강사 surface 출시 (B0032 Step 3)
3. assignments / consultations 풀 가동 (B0033)
4. LMS 안내 페이지 신설 (모집 페이지에 "이런 LMS 사용해요" 셀)
5. 학생 invite 자동화 (paid → invite 자동 trigger)

---

## 8. 카톡 학생 안내 카피 (한 / 영)

### 8.1 한국어 — 카톡 오픈채팅 공지용

```
안녕하세요 1기 여러분.

이번 주 토요일 (7/4) 2주차 강의부터는 강의 자료를 LMS 에서 받으실 수 있게 준비했어요. 1주차 때 구글 드라이브가 모바일에서 잘 안 받아졌던 문제를 해결한 자체 시스템입니다.

[LMS 가 뭔가요]
growthcareer.xyz 안에 여러분 본인 계정으로 들어가는 학습 공간이에요. 지금은 3가지를 쓸 수 있습니다.
1. 강의 자료 다운로드 (PC 모바일 둘 다 OK)
2. 이력서 자기소개서 포트폴리오 등록
3. 취업 정보 입력 (희망 직무 자격증 경력 학력 비자)

[첫 로그인 안내]
7/4 토요일 오전 10시쯤 11명 전원에게 이메일과 카톡 1:1 로 다음 정보를 보냅니다.
- LMS 주소
- 본인 이메일
- 임시 비밀번호

첫 로그인 시 비밀번호를 본인이 정한 것으로 바꾸도록 안내됩니다. 30초면 끝나요.

[지원]
어려우면 카톡 채널 (https://pf.kakao.com/_nxhDGX/chat) 로 바로 문의 주세요. 7/4 강의 시간에 강의실에서 함께 진입 확인도 할 예정입니다.

수고하셨고 이번 주말 뵐게요.
```

### 8.2 영문 — 외국인 학생 1:1 카톡 / 이메일용

```
Hi everyone,

Starting this Saturday (Jul 4), you can download lecture materials from our LMS. We built this to fix the Google Drive mobile download issue from week 1.

[What is the LMS]
A private learning space at growthcareer.xyz where you log in with your own account. Three things you can do now:
1. Download lecture materials (works on phone and desktop)
2. Upload your resume, cover letter, and portfolio
3. Fill in your career profile (target role, certifications, experience, education, visa)

[First login]
On Saturday Jul 4 around 10 AM, all 11 of you will get an email and a 1-to-1 KakaoTalk with:
- LMS URL
- Your email
- A temporary password

You will be asked to change the password on first login. Takes 30 seconds.

[Need help]
Reach us on the KakaoTalk channel (https://pf.kakao.com/_nxhDGX/chat). We will also do a live walkthrough at the start of Saturday's class.

See you Saturday.
```

### 8.3 1:1 발송 템플릿 (이메일 + 카톡 1:1)

```
Subject: [Fan to Pro] LMS 첫 로그인 안내 / Your LMS first login

[KO]
{학생 이름} 님,

LMS 로그인 정보입니다.
URL: https://growthcareer.xyz/auth/login
이메일: {email}
임시 PW: {temp_pw}

첫 로그인 후 본인 PW 로 바꿔주세요. 어려우면 카톡 채널로 문의 부탁드립니다.

[EN]
Hi {name},

Your LMS credentials:
URL: https://growthcareer.xyz/auth/login
Email: {email}
Temporary password: {temp_pw}

Please change the password after first login. Ping the KakaoTalk channel if you need help.

Growth Career / Fan to Pro
```

**카피 부호 점검 (CLAUDE.md §6.5)**:
- em dash (`—`) / en dash (`–`) / interpunct (`·`) / 곡선 따옴표 / 단일 ellipsis 모두 사용 X (확인 완료)
- 화살표 `→` 와 마침표 `.` / 콤마 `,` / 괄호 `()` 만 사용

---

## 9. 출시 후 모니터링 (7/4 ~ 7/11 1주일)

### Metric (학생 11명 기준)
- **진입률**: LMS 첫 로그인 학생 수 / 11 (목표 100% by 7/4 13:00)
- **자료 다운로드 성공률**: 학생당 최소 1회 다운로드 / 11 (목표 100% by 7/4 16:00)
- **career profile 입력률**: 최소 1 field 입력 학생 수 / 11 (목표 73% by 7/11)
- **career documents 입력률**: 최소 1 문서 등록 학생 수 / 11 (참고치, 강제 X)

### 측정 방법
- Supabase dashboard SQL — `user_profiles.last_sign_in_at` / `lecture_material_downloads` 테이블 (선택, 신규) / `student_career_profiles.updated_at`
- 단순 query 노아 직접 (7/5 + 7/11 2회)

### 운영 사고 채널
- Sentry (이미 있으면) / Vercel error log / Supabase log
- 학생 카톡 채널 직접 보고

### 회고
- 7/4 강의 후: `docs/sessions/SESSION-2026-07-04-lms-launch.md` 박제
- 7/11 1주 후: 학생 인터뷰 3명 (한국인 1 + 외국인 2) — 사용성 feedback

---

## 10. 12단계 워크플로우 mapping (CLAUDE.md §2)

| 단계 | 본 작업에서 | 누가 | 언제 |
|---|---|---|---|
| 1. Research | Echo `docs/research/lms-launch-research.md` (미작성) | Echo | 즉시 — 본 로드맵의 §A fallback 보강 |
| 2. Learn | Storage / signed URL / 모바일 다운로드 패턴 | Echo | 즉시 |
| 3. Understand | 본 §1 + §2 + §7 | Aria | done (본 문서) |
| 4. Design | Sophia `docs/decisions/0011-lms-launch-architecture.md` (미작성) | Sophia | 6/25 안 |
| 5. Plan | 본 문서 §3 + §4 + §5 + §6 | Aria | done |
| 6. Implement | Phase 1~2 | Iris + Luna | 6/25~7/1 |
| 7. Self-test | Phase 1 end + Phase 3 | Mira | 6/27 + 7/3 |
| 8. Review | Phase 3 의 Sage 검토 + Mira QA | Sage + Mira | 7/2~7/3 |
| 9. Deploy | Phase 3 의 Vera | Vera | 7/3 PM |
| 10. RCA | 사고 발생 시 | Sage + Mira | 7/4 강의 후 (필요 시) |
| 11. 유사 사례 | Google Drive 모바일 다운로드 1주차 사고 reference | Echo | 7/4 회고 |
| 12. Prevention | 본 로드맵 자체가 prevention (CLAUDE.md §6 자료 hosting 룰 박제 검토) | Aria | 7/5+ |

---

## A. Echo 산출물 미작성 시 fallback 가정 (Aria 박제)

본 시점에 Echo `docs/research/lms-launch-research.md` 가 없으므로 다음 가정으로 진행. Echo 가 나오면 본 §A 를 그 산출물로 대체 + Phase 1 Day 1 재검토.

1. **파일 호스팅**: Supabase Storage private bucket + signed URL (TTL 10분). Cloudflare R2 / S3 의 cost / latency 우위는 1기 11명 규모에서 marginal — 2기+ 100명 규모 시 재검토.
2. **모바일 다운로드 안전성**: `Content-Disposition: attachment` 헤더 + signed URL 새 탭 open. PWA / native app 안 사용.
3. **학생 onboarding 사례**: 운영자 invite + must_change_password 흐름 (이미 LMS Wave 1 에 박힘). 회원가입 페이지 없음 (CLAUDE.md §7.4).
4. **취업 정보 entity 필드**: 희망 직무 / 자격증 / 경력 / 학력 / 비자 5 field 로 시작. LinkedIn 수준 풀 필드는 2기+.

## B. Sophia 산출물 미작성 시 fallback 가정 (Aria 박제)

본 시점에 Sophia `docs/decisions/0011-lms-launch-architecture.md` 가 없으므로 다음 가정으로 진행.

1. **entity 2개 신규**:
   - `lecture_materials` (id / cohort_id / session_no / title / file_path / file_size / uploaded_by / created_at)
   - `student_career_profiles` (id / student_id / target_role / certifications text / experience text / education text / visa_type / updated_at)
2. **Storage**: 신규 bucket `lecture-materials` private + 4 policies (super_admin write all / cohort_memberships read same cohort / 그 외 deny)
3. **권한 가드**: 기존 `assertAdmin` / `assertCanAccessStudentCareer` (B0037) 재사용. server action 첫 줄에 가드 박음.
4. **강사 access**: 1기 한정 X. 2기 시작 전 (8월) `assertCohortInstructor` 헬퍼 + materials write 권한 확장.
5. **signed URL**: TTL 600s (10분) — 다운로드 중 끊김 방지. RLS read 권한 가진 사용자만 sign 가능.

---

## 11. cut down 결정 표

각 cut 결정의 명시적 trigger / 대안 / 영향.

| Cut 대상 | Trigger | 대안 | 1기 영향 |
|---|---|---|---|
| career profile 폼 | Day 6 (6/30) 시점에 Phase 2 not done | 7/11 2주차 강의 후 defer | low (취업 활동은 다음 주 시작) |
| admin career profile view | Day 7 (7/1) 시점에 student 폼 not done | 학생 본인만 access 가능, admin 은 supabase dashboard | low (운영자가 직접 dashboard 봄) |
| 영문 UX | Day 8 (7/2) 시점에 한국어 surface unstable | 외국인 학생 1:1 영문 카톡 핸드오프 | med (외국인 11명 중 ~3명 추정) |
| invite 학생 수 11 → 5 | Sage critical 1건 이상 | 5명 (한국인 우선) 만 7/4 invite + 6명 7/11 invite | med (학생 균등 불가, but 안전) |
| 전체 가동 7/4 → 7/11 | Phase 3 7/3 까지 Sage / Mira PASS 못 함 | Google Drive 비상 백업 1주 추가 사용 | high (LMS 가치 1주 지연) |

cut 결정은 노아가 6/30 + 7/2 + 7/3 3 시점에 검토.

---

## 12. Done When (재확인)

- [ ] 7/4 13:00 까지 학생 11/11 명 LMS 첫 로그인 + PW 변경
- [ ] 7/4 16:00 까지 학생 11/11 명 자료 다운로드 (모바일 포함)
- [ ] 7/11 까지 학생 8/11 명 career profile 최소 1 field 입력
- [ ] Sage critical = 0, high ≤ 1
- [ ] 7/4 강의 시간 LMS down 0분, 다운로드 에러 0건
- [ ] 2기+ 강사 invite 만 추가하면 강사 surface 가동 가능한 구조 (RLS 정책 + entity 분리 박힘)
- [ ] `docs/sessions/SESSION-2026-07-04-lms-launch.md` 회고 박제

---

## 부록: 관련 백로그

- B0044 LMS Launch Phase 1 — 인프라 + entity (Iris)
- B0045 LMS Launch Phase 2 — UI (Luna)
- B0046 LMS Launch Phase 3 — 보안 + QA (Sage + Mira)
- B0047 LMS Launch Phase 4 — 학생 invite + 가동 (Vera + 노아)

상세는 `docs/tasks/BACKLOG.md` 참조.
