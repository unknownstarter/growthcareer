# 05 Class Operations — 강의 운영

> 1기 강의 (2026-06-27 ~ 07-19) 운영 가이드 + 실제 진행 후 업데이트할 부분.
>
> **상태**: 6/22 기준 강의 시작 전. 강의 진행하면서 timeline + lesson 추가.

## 강의 정보 요약

- **기간**: 2026-06-27 (토) ~ 07-19 (일), 4주
- **회차**: 주말 8회 (토 + 일 각 4회), 회차당 2시간
- **시간**: 14:00 ~ 16:00 KST
- **장소**: 블루스프링하우스 (서울 마포구 월드컵북로 161)
- **수료식**: 2026-07-25 (토) — 별도 행사, 네트워킹 파티 포함
- **출석률 기준**: 75% 이상 시 수료증 발급

## 8회 일정 (강사 회차 매핑)

| 회차 | 날짜 | 요일 | 주제 | 강사 매핑 |
|---|---|---|---|---|
| 01 | 06.27 | 토 14:00 | Music Business 입문 | Music Business |
| 02 | 06.28 | 일 14:00 | 공연 제작 구조와 음악 디렉팅 | 음악 디렉터 |
| 03 | 07.04 | 토 14:00 | 플레이백과 타임코드 실무 | 음악 디렉터 |
| 04 | 07.05 | 일 14:00 | 음반 기획과 제작 전략 | Music Business |
| 05 | 07.11 | 토 14:00 | 현장 실무 / 스테이지 매니지먼트 | 음악 디렉터 |
| 06 | 07.12 | 일 14:00 | A&R 실무 케이스 | Music Business |
| 07 | 07.18 | 토 14:00 | 현장 종합 + Q&A | Visual Director |
| 08 | 07.19 | 일 14:00 | Visual Director / 브랜드 작업 | Visual Director |
| ★ | 07.25 | 토 | 수료식 + 네트워킹 파티 | 전원 + 노아 + Cowork |

> 커리큘럼은 강사님 협의 따라 일부 변경 가능 (원페이저 + 어드민 공지로 사전 안내).

## 사전 준비 체크리스트

### 강의 전 (~6/26)

- [ ] 강의장 (블루스프링하우스) 예약 확인 + 결제
- [ ] 음향 / 마이크 / 빔프로젝터 / 스크린 점검
- [ ] WiFi 사용 가능 확인
- [ ] 자료 PDF 강사 3인 사전 수령
- [ ] 출석부 (학생 10명 명단) 인쇄 / 디지털 양쪽
- [ ] 명찰 (선택) — 외국인 학생 이름 표기 헷갈림 방지
- [ ] 다과 / 음료 준비 (회차당 예산 결정)
- [ ] 카카오톡 오픈채팅 (https://open.kakao.com/o/gX12jFAi, 비번 fan06pro) 입장 안내
- [ ] cohortKickoff 메시지 10명 발송 완료 + 원페이저 PDF 링크 첨부 확인

### 회차마다

- [ ] 강사 도착 확인 (강의 30분 전)
- [ ] 자료 노트북 / 태블릿 setup
- [ ] 학생 출결 — `/fan-to-pro/admin/cohorts/[slug]` 에서 attendance dropdown 으로 mark
- [ ] 강의 사진 / 영상 (포트폴리오 / 차기 모집 콘텐츠 용)
- [ ] 강의 종료 후 Q&A 시간
- [ ] 카톡 오픈채팅에 자료 PDF 공유

## 출결 시스템

- `/fan-to-pro/admin/cohorts/[slug]` → sessions list
- 각 session 의 [출결] 클릭 → student 10명 status dropdown
- status: `present` / `late` / `absent` / `excused`
- [출결 저장] 클릭 → DB attendance 테이블에 INSERT

**자동화 X (1기)**: 학생 본인 체크인 X — 운영자 (노아) 가 수동 mark.

## 강사 운영

- **계약서**: `docs/contracts/instructor-agreement.md`
- **정산**: 강사별 회차 × 단가 (회사 부가세 발행 여부 따라 분기)
- **회사 단위 정산** (강사 1인 = 1 회사 가정): 회사 1 (음악 디렉터 + Music Business 같은 회사면) → 1 송금 / 회사 2 → 송금 (Visual Director 다른 회사면)
- 정산 메일에 강사 개인별 금액 노출 여부: **노아 보류 결정** (회사 합계만 vs 강사 breakdown)
- VAT 10% / 원천징수 3.3% 분기 (`companies.vat_issuer` 기준)

## 학생 운영

### 1기 10명 상태 (6/22 11명 → 6/23 환불 1명)

- DB: `students` 테이블 (`cohort_id` = 1기 + `applicant_id` lineage)
- `applicants` 의 `status='paid'` 인 10명 → `students` promote (수동 또는 [결제 완료자 일괄 등록] 버튼)
- 학생 LMS access 정책 (1기): **access 안 줌** — 카톡 오픈채팅으로 모든 커뮤니케이션

### 다음 기수부터 학생 access

- 운영자가 student 계정 invite (must_change_password 흐름)
- 학생 surface: `/[locale]/fan-to-pro/[cohortSlug]/student/career` 등
- 첫 surface = career documents (B0037 Wave A+)
- 점진 추가: 자료 다운로드 / 공지 확인 / 컨설팅 신청 / 출결 확인 / 수료증 확인

## 사고 발생 시 대응

### 결석 / 일정 변경 / 환불 요청

- 카카오톡 오픈채팅으로 사전 안내 (학생 → 노아)
- 노아: 어드민에서 출결 mark + 환불 분기 처리 (refund_policy 참조)

### 강의장 사고 (정전 / 음향 X / 강사 노쇼 등)

- 카톡 오픈채팅에 즉시 공지
- 대체 일정 별도 안내
- 환불 필요 시 회차별 부분 환불 (refund_policy 적용)

### 학생 부상 / 응급

- 119 우선
- 보호자 / 학교 연락
- 보험 적용 여부 확인 (별도 가입 X — 다음 기수 가입 검토 후보)

## 수료 처리 (강의 종료 후)

### 수료증 (7/25 전)

- 출석률 75% 이상 학생 자동 수료
- Dropdown 명의 수료증 PDF 생성
- 학생별 이메일 발송 (수료식 안내 + PDF 첨부)
- 시스템: `certificates` 테이블 (Wave 2 미적용 — 1기는 수동 처리 가능성)

### 공연 프로젝트 참여 (선택)

- 수료자 전원에게 별도 안내 (유니온 픽처스 공연 프로젝트)
- 신청자 한정 동행
- 실제 참여 시 유니온 픽처스 명의 참여 확인서 발급

### 후기 / Testimonials

- 수료식 + 1주일 후 후기 요청 (이메일)
- 다음 기수 마케팅 자산
- 사진 / 영상 사용 동의 (이미 신청 시 동의)

## 1기 진행 중 timeline 업데이트 위치

→ `07-timeline.md` 의 "강의 진행 (06-27 ~ 07-19)" 섹션

## 다음 기수 변경 후보

- 학생 본인 체크인 (LMS 출결 self-mark)
- 자료 PDF 학생 직접 다운로드 (Wave 2 materials)
- 공지 자동 카톡 broadcast (Wave 2 announcements)
- 컨설팅 신청 흐름 (Wave 2 consultations)
- 과제 + 피드백 (Wave 2 assignments / submissions / feedback)
- 수료증 자동 생성 + 이메일 (Wave 2 certificates)
