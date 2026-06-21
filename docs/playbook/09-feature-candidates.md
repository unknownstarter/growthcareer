# 09 Feature Candidates — 기능 개발 후보

> 1기 운영 중 손으로 메웠던 빈틈 → 기능 개발 후보. Wave 분류 + 우선순위.
>
> 자동화 (`08-automation-candidates.md`) 와 분리. 자동화 = 기존 작업 자동화. 기능 = 새 작업 흐름 / 사용자에게 노출.

---

## 우선순위 매트릭스

| 순위 | 후보 | 사용자 | 1기 빈틈 | 구현 비용 | Wave |
|---|---|---|---|---|---|
| **High** | F1. 학생 surface 풀 구축 (수업 / 자료 / 공지 / 컨설팅) | 학생 | 카톡 채널로만 운영 | 4~6일 | LMS Wave 2 |
| **High** | F2. 강사 surface 풀 구축 (출결 / 자료 업로드 / 컨설팅) | 강사 | 강사 access X | 3~4일 | LMS Wave 1 Step 3 |
| **High** | F3. 수료증 자동 생성 + 발급 (PDF + 학생 이메일) | 학생 + 운영자 | 수동 처리 (1기) | 2일 | Wave 2 (B0033) |
| **High** | F4. 다음 기수 모집 시작 시 UI 자동 재활성화 | 모두 | 마감 cutoff 수동 갱신 | 1일 | B0039 follow-up |
| Med | F5. instructor career documents viewer | 강사 | Wave A 에선 X | 2일 | B0038 Wave B |
| Med | F6. 자기소개서 구조화 폼 (Q&A 필드) | 학생 + 강사 | 단일 파일/링크만 | 3일 | B0038 Wave B |
| Med | F7. 포트폴리오 작품 collection (이미지 + 영상 + 설명) | 학생 + 외부 | 단일 링크/파일만 | 5일 | B0038 Wave B |
| Med | F8. 카카오톡 알림톡 통합 (8원/건) | 운영자 + 학생 | 카톡 채널 수동 | 3~4일 | new |
| Med | F9. 동문 추천 보상 (수료생 → 다음 기수 추천) | 학생 + 운영자 | 1기 referralInvite 만 | 3일 | Wave 4 follow-up |
| Med | F10. 영문 UX magic link (이메일 로그인) | 학생 | PW 부담 | 2일 | Wave 4 |
| Med | F11. 강사 평가 시스템 (수강생 → 강사 점수 + 후기) | 학생 + 운영자 | 카톡 채널로만 | 3일 | new |
| Low | F12. Realtime 알림 (제출 / 피드백) | 학생 + 강사 | 폴링도 X | 5~7일 | Wave 5 |
| Low | F13. 대량 invite onboarding 자동화 (CSV upload) | 운영자 | 1기 11명 = 수동 | 3일 | Wave 5 (100명+) |
| Low | F14. 모바일 fluid typography 카드 전체 적용 | 모두 | PaymentNotice 등 빡빡함 | 5일 | B0030 |
| Low | F15. 강사 `resident_no` 암호화 + UI 마스킹 | 운영자 + 강사 | 평문 저장 (법적 risk) | 2~3일 | B0026 |

---

## F1. 학생 surface 풀 구축 ⭐ Wave 2 핵심

### 현재 (1기)

학생 surface = `/fan-to-pro/[cohortSlug]/student/career` 만 존재. 나머지는 카카오톡 오픈채팅으로 모든 커뮤니케이션. 학생 LMS access 안 줌.

### 필요 페이지

| 페이지 | 무엇 |
|---|---|
| `/student/dashboard` | 다음 회차 / 출결 / 공지 / 자료 / 컨설팅 한눈에 |
| `/student/sessions` | 8회 일정 + 회차별 자료 + 출결 본인 기록 |
| `/student/materials` | 자료 다운로드 (Storage signed URL) |
| `/student/announcements` | 공지 (운영자 발신) |
| `/student/consultations` | 1:1 컨설팅 신청 + 이력 |
| `/student/career` | (B0037 완료) 이력서/자기소개서/포트폴리오 |
| `/student/certificate` | 수료증 다운로드 (출석률 75%+) |
| `/student/community` | 동기 학생 명단 + 카톡 오픈채팅 link |

### 구현 비용

- 페이지 7개 + 컴포넌트 + Wave 2 entities 마이그레이션 = 4~6일

### Wave 2 의존 entities

- `materials` / `announcements` / `consultations` / `consultation_reviews` / `certificates` / `events`

---

## F2. 강사 surface 풀 구축 ⭐ Wave 1 Step 3

### 현재 (1기)

강사 access 안 줌. 노아가 본인 강사 계정으로 점진 테스트.

### 필요 페이지

| 페이지 | 무엇 |
|---|---|
| `/instructor/dashboard` | 본인 담당 회차 / 자료 / 컨설팅 신청 한눈에 |
| `/instructor/sessions` | 본인 담당 회차 + 출결 mark |
| `/instructor/materials` | 자료 업로드 |
| `/instructor/students` | 본인 cohort 학생 명단 + career documents viewer (B0038) |
| `/instructor/consultations` | 컨설팅 신청 → 본인 schedule → review |
| `/instructor/announcements` | 본인 cohort 공지 발신 (운영자 권한 분리) |

### 구현 비용

- 페이지 6개 + Wave 2 entities + assignments review = 3~4일

---

## F3. 수료증 자동 생성 + 발급 ⭐

### 현재

수료증 PDF 수동 생성 (Dropdown 명의). 1기는 11명 = 수동 가능. 다음 기수 30명+ = 자동화 필요.

### 자동 발급 흐름

1. 강의 종료 (7/19) + 출석률 계산
2. 출석률 75% 이상 → certificate 발급 자동 trigger
3. PDF 생성 (운영자 confirm 후) → student 이메일 발송
4. student dashboard 의 `/certificate` 페이지에 다운로드 link

### 구현 비용

- PDF template (Pretendard + Dropdown logo) + 자동 생성 (1일)
- certificates 테이블 + 발급 trigger + 이메일 (1일)
- 총 2일

---

## F4. 다음 기수 모집 시작 시 UI 자동 재활성화

### 현재

`ENROLLMENT_CAP.cutoffAt` 하드코딩. 다음 기수 모집 시 수동 갱신.

### 자동화 안

- `cohorts` 테이블의 `accepts_signup_now` + `signup_opens_at` + `signup_closes_at` 기반
- `isEnrollmentClosed()` 가 DB query 로 변경 (server-side 만)
- 어드민에서 토글 → 즉시 사이트 활성화

### 함정

- DB query 가 매 request → 성능 cost. cache (revalidate 60s) 필요
- 활성 cohort 다중 가능 (1기 + 2기 같이 모집?) — 우선순위 결정 필요

### 구현 비용

- 1일

---

## F5. instructor career documents viewer (B0038)

### 현재

학생 career documents 는 student 본인 + admin 만 본다 (B0037 Wave A+). 강사는 못 봄.

### 추가

- 강사 surface 의 `/instructor/students/[id]/career` (read-only)
- `assertCanAccessStudentCareer` 의 instructor 분기 (cohort_memberships role='instructor' + 본인 cohort)

### 구현 비용

- 2일 (권한 가드 + viewer UI)

---

## F6. 자기소개서 구조화 폼 (B0038)

### 현재

자기소개서 = 단일 파일 / 단일 외부 링크. 구조화 필드 X.

### 추가

- `cover_letter_responses` 테이블: `student_id` × `question_id` × `answer`
- 질문 templates (예: "본인의 강점 5가지" / "K-pop 업계에 들어오고 싶은 이유" 등 10개)
- 답변 max 1000자 / 필수 / 선택 분기

### 구현 비용

- 3일 (질문 시스템 + 답변 입력 UI + admin viewer)

---

## F7. 포트폴리오 작품 collection (B0038)

### 현재

포트폴리오 = 단일 파일 / 단일 외부 링크.

### 추가

- `portfolio_items` 테이블: `student_id` × `item_id` × `title` × `description` × `year` × `image_path` OR `external_url`
- 작품 N개 (최대 10개) 등록 가능
- 학생 surface 에서 grid 뷰

### 구현 비용

- 5일 (entity + Storage 추가 + UI)

---

## F8. 카카오톡 알림톡 통합

### 현재

카카오톡 채널 1:1 상담만. 알림톡 (브로드캐스트) X.

### 추가

- 카카오 비즈니스 가입 + 알림톡 template 등록 (정형 메시지만)
- 운영자가 paymentConfirmed / cohortKickoff 등 발송 시 알림톡 자동 발송
- 8원/건 → 11명 × 5종 메시지 × 2 cohort = 약 100~200원 / cohort (저렴)

### 함정

- 알림톡 template 사전 카카오 승인 필요 (~3일 소요)
- 자유 텍스트 X — 정형 메시지만

### 구현 비용

- 카카오 비즈니스 가입 + template 승인 (1주)
- API 통합 + 발송 trigger (2일)
- 총 1~2주

---

## F9. 동문 추천 보상

### 현재

1기 referralInvite 만 (paid 학생 → 친구 추천). 수료생 → 다음 기수 추천 X.

### 추가

- 수료 후 30일 내 동문 추천 보상 (예: 5만원 상품권 또는 이용권)
- `alumni_referrals` 테이블: 추천인 student × 피추천인 applicant
- 매칭 시점: 피추천인 paid 토글 시 자동 인식

### 구현 비용

- 3일

---

## F10. 영문 UX magic link

### 현재

학생 / 강사 로그인 = PW. 외국인 학생 PW 관리 부담.

### 추가

- 이메일에 magic link → 클릭 시 자동 로그인
- Supabase Auth `signInWithOtp` 활용
- 옵션: PW + magic link 둘 다 활성화

### 구현 비용

- 2일 (Supabase 설정 + UI 분기)

---

## F11. 강사 평가 시스템

### 현재

강사 평가 X. 카톡 채널 응대로만 피드백.

### 추가

- 수료 후 강사별 평가 (5점 척도 + 자유 텍스트)
- 차기 강사 섭외 시 데이터 근거
- 어드민 dashboard 에 강사별 평균 점수

### 함정

- 강사 자존심 관리 — 익명 / 운영자만 노출 / 강사 본인 노출 선택
- 표본 작음 (11명 × 3 강사 = 33 평가) — 통계적 신뢰도 제한

### 구현 비용

- 3일

---

## F12. Realtime 알림 (Wave 5)

### 현재

폴링도 X. 학생 / 강사 자료 업로드 / 제출 / 피드백 시 알림 X.

### 추가

- Supabase Realtime 구독
- 학생: 본인 cohort 의 announcements / materials INSERT 시 toast / push
- 강사: 본인 담당 학생의 submissions INSERT 시 toast / push

### 구현 비용

- 5~7일

---

## F13. 대량 invite onboarding (Wave 5)

### 현재

학생 invite = 수동 (admin → 학생별 이메일 / PW 발급).

### 추가

- CSV upload (학생 명단) → 일괄 user_profiles + must_change_password=true 생성
- 학생별 invite 이메일 자동 발송 (Resend)

### 구현 비용

- 3일 (100명+ 규모 트리거)

---

## F14. 모바일 fluid typography 전체 (B0030)

### 현재

display 헤드라인만 fluid (clamp). 카드/박스 본문은 Tailwind breakpoint step change.

### 추가

- `--text-card-headline` / `--text-card-body` 등 fluid 토큰 신설
- 카드 컴포넌트 일괄 적용 (PaymentNotice / SuccessBlock / value-cards / pricing / mentor / faq 등)

### 함정

- 1기 운영 중 디자인 시스템 변경 = risk. 1기 종료 후 (2026-07-22+).

### 구현 비용

- 5일

---

## F15. 강사 resident_no 암호화 + UI 마스킹 (B0026)

### 현재

`instructors.resident_no` (주민번호) 평문 저장. 개인정보보호법 §24 고유식별정보 암호화 의무.

### 추가

- pgcrypto AES 암호화 (서버 사이드 키 관리)
- UI 마스킹: 마지막 4자리만 표시 (예: ******-****-1234)
- 변경 시에만 full input

### 구현 비용

- 2~3일

---

## 결정 필요 사항 (사용자 보류)

| 항목 | 옵션 | 누가 결정 |
|---|---|---|
| Consultation review 권한 | 모든 강사 풀 / 배정 강사만 / 학생이 강사 지정 | 노아 |
| 정산 메일 강사 breakdown | 회사 합계만 / 강사 개인별 금액 노출 | 노아 |
| 알림 채널 | 이메일 only / 알림톡 옵트인 추가 | 노아 + 비용 검토 |
| 다음 기수 가격 | 동일 / 인상 / 인하 | 노아 + 1기 운영 데이터 |
| 강사 보장금 (사례비) | 추가 / 현재 정산만 | 노아 + 강사 협의 |

---

## 다음 기수 (2기) 시작 전 권장 개발 (우선순위)

1. **F4 (UI 자동 재활성화)** — 2기 모집 시작 시 즉시 필요. 1일.
2. **F1 부분 (학생 surface 핵심 페이지: announcements / materials / sessions)** — 4일.
3. **F2 부분 (강사 surface 핵심 페이지: sessions / materials / students viewer)** — 3일.
4. **F3 (수료증 자동 발급)** — 1기 7/25 수료식 전 가능하면 적용. 2일.
5. **F8 (알림톡 통합)** — 1주 + 알림톡 template 승인 3일. 2기 모집 D-2주 시점 시작.

**총 12 ~ 15일 (1.5 ~ 2주). 2기 모집 시작 D-3주 시점 (2026-07 말 ~ 8 초) 가능.**
