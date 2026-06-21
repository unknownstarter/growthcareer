# SESSION 2026-06-22 — 1기 모집 마감 + 자동 전환 + Playbook

> 기간: 2026-06-21 저녁 ~ 2026-06-22 새벽
> 결과: 1기 모집 마감 자동 전환 시스템 + Career documents Wave A+ + 1기 운영 playbook 박제

---

## 핵심 단락

### 1. LMS Wave 1 운영 후속 (저녁)

- `/fan-to-pro/admin/cohorts/[slug]` + `/admin/talent-pool` + `/admin/finance` 통합 dashboard hotfix
- applicants × cohort 연결 (인재풀 비즈니스 모델 정착)
- 강의장 위치 강남 → 마포구 정정 (paymentGuide_noVisa 4종)
- cohort_expenses + tax_filings 마이그레이션 적용

### 2. cohort 1 kickoff 메시지 + 원페이저 PDF (22:43)

- `cohortKickoff` MessageKind 신설 (paid 학생 전용)
- 강의장 + 시간 + 카톡 오픈채팅 + 비번 + 준비물 + 8회 일정 + 원페이저 PDF placeholder
- `tools/onepager-cohort-1.html` 3페이지 A4 leave-behind (토스 톤)
- Paged.js v2 + PDF 생성 도구 박제 (`tools/pdf-onepager*.mjs`)
- Echo 리서치: `docs/research/onepager-pdf-pagination.md`

### 3. Career documents Wave A+ (23:21)

- 사용자 요청 — "LMS 가자. 이력서랑 자기소개서랑 포트폴리오 관리"
- DB: `student_career_documents` + RLS 4종 + Storage `career-documents` bucket (private)
- Server actions 4종 + `assertCanAccessStudentCareer` 가드
- Admin + Student surface 동시 구현 (Instructor는 Wave B 연기)
- Sage 검토 pass — H-2 SSRF fix 적용 (URL scheme allowlist + private IP 거부)
- H-1 storage path randomness 백로그

### 4. 1기 모집 마감 자동 전환 사고 (00:00)

- 사용자 발견 — 자정 지나도 사이트 880,000원 / "지금 신청 →" 그대로
- 원인: `/fan-to-pro` 페이지 SSG → 빌드 시점 isEnrollmentClosed=false 박힘
- 해결: B0039 작업 — `isEnrollmentClosed()` + cutoffAt + 4 surface 자동 전환 + `force-dynamic` hotfix
- 마이그레이션 `20260622000006`: status enum + next_cohort_interest, cohort_id nullable, XOR check
- ApplyForm 내부: 헤드라인 / lead / chip / summary / PaymentNotice / SuccessBlock 모두 closed 변형
- 사고 박제: `docs/lessons/2026-06-22-ssg-cache-blocks-deadline-transition.md`
- 룰 박제: CLAUDE.md §7 "시간 기반 자동 전환 페이지는 SSG 금지"

### 5. 1기 운영 playbook 박제 (00:26 ~ 00:45)

- 사용자 요청 — 기획/빌드/마케팅/운영 전 과정 정리 + 자동화/기능 후보 추출
- `docs/playbook/` 10 파일 (README + 01 overview + 02-build-tracks/{website,admin,lms} + 03 recruitment + 04 marketing + 05 class-ops + 06 finance + 07 timeline ⭐ + 08 automation + 09 features + 10 checklist)
- 시계열 timeline (2026-05 ~ 06-22) — 핵심 이벤트 + 결정 + 인사이트 + 해결
- 자동화 후보 A1~A8 + 기능 후보 F1~F15 + 다음 기수 7 Phase 체크리스트

---

## commit 흐름

```
8b1c94d feat(B0032 cohort 1 kickoff): 첫 강의 안내 메시지 + 원페이저 PDF leave-behind
aa02a44 feat(B0034 career docs Wave A+): 이력서/자기소개서/포트폴리오 단일 최신본 관리
3690b01 docs: BACKLOG B0037/B0038 + WORKING-SESSION 6/21 밤 업데이트
1b1328e feat(B0039): 1기 모집 마감 자동 전환 + next_cohort_interest 신청 수용
9c9567e feat(B0039): Hero / Pricing / StickyCTA 도 마감 후 자동 전환
69cbd7b fix(B0039): /fan-to-pro 페이지 force-dynamic — SSG cache hotfix
cd0405a feat(B0039): apply form summary cells / lead / chip / PaymentNotice 마감 후 전환
b9fdf6e docs(B0040): 1기 운영 playbook 박제 (docs/playbook/ 10 파일)
```

---

## 노아 manual action (다음 세션 시작 시)

### 6/22 (일) 아침

- [ ] 어드민 [메시지] > "기수 첫 강의 안내" 선택 → 11명 발송
- [ ] 원페이저 PDF 구글 드라이브 업로드 + 공유 링크 받기 + 메시지 본문에 paste

### 강의 시작 전 (6/22 ~ 6/26)

- [ ] LMS career docs 테스트 (admin 페이지 + student 페이지 양쪽)
- [ ] 카톡 오픈채팅 11명 입장 확인
- [ ] 강의장 (블루스프링하우스) 최종 예약 확인
- [ ] 강사 자료 PDF 사전 수령

### 1기 운영 후 + 2기 준비

- [ ] `docs/playbook/05-class-operations.md` 강의 진행 timeline 채우기
- [ ] `docs/playbook/07-timeline.md` 강의 진행 섹션 채우기
- [ ] `docs/playbook/10-next-cohort-checklist.md` Phase A 시작

---

## 인사이트 / 패턴

### 잘 작동한 것

- **CLAUDE.md §7.4 Production 보호 룰** — Sage 검토 의무, 기존 영역 변경 금지 룰이 1기 운영 안정성에 기여
- **반자동 메시지 시스템** — 1명 운영자가 11명 처리 가능
- **외국인 유학생 타겟 명확화** — 비자 칩 + 영문 디폴트 + nationality 분기
- **playbook 박제** — 다음 기수 운영자 (노아 본인 또는 위임) 자산

### 사고 + 학습

- **SSG cache 함정** — 시간 기반 자동 전환 페이지 SSG 금지 룰 박제 (CLAUDE.md §7)
- **Sage 검토 누락** (6/9) → 룰 박제 후 본 세션에 잘 지킴 (career docs Sage foreground)
- **운영자 본인 dogfood 가치** — 모바일 반응형 / 메시지 톤 / nationality 매핑 등 빈틈 발견

---

## 다음 세션

`WORKING-SESSION.md` 가 새로 시작될 때:
1. 본 파일 읽고 컨텍스트 복원
2. `docs/playbook/README.md` 읽기
3. 노아 manual action 확인
4. 강의 운영 모드 진입 (6/27 첫 강의 ~ 7/19 종강 + 7/25 수료식)
