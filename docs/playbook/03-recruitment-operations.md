# 03 Recruitment Operations — 1기 모집 운영

> 신청부터 인원 확정까지의 운영 흐름. 1기 (5월 ~ 6/22) 의 실제 운영 패턴 박제.

## 전체 흐름 (1기)

```
[방문]                        랜딩 페이지 진입 (`/fan-to-pro`)
   ↓
[신청]                        Step 1 (4 필드) → Step 2 (4 필드) → 동의 → 제출
   ↓                          DB: applicants INSERT (status='pending')
[운영자 확인]                 30초 polling → "신규 신청" chip 알림
   ↓
[입금 안내 발송]              메시지 모달 → "PaymentGuide" 선택 → ko/en + SMS/email
   ↓                          1-click 복사 + mailto:// 또는 sms:// 클릭 → 운영자 본인 클라이언트로 발송
                              status: pending → notified, notified_at timestamp 기록
[입금 대기]                   T+1일 (황색 chip) / D-3 (주황) / D-1 (적색) 시각 강조 → 운영자가 reminderT1/D3/D1 발송
   ↓
[입금 확인]                   토스뱅크 알림 / 운영자 수동 확인
   ↓                          paid 토글 → status='paid' + paid_amount_krw + depositor_name_observed
[입금 확인 메일]              paymentConfirmed 자동 발송 X — 운영자가 paid 토글 후 메시지 모달에서 수동
   ↓
[인원 확정 (마감 후)]         11명 paid → 강의 확정 (폐강 기준 8 초과)
   ↓
[첫 강의 안내]                cohortKickoff 메시지 (강의장 / 시간 / 카톡 오픈채팅 / 준비물 / 8회 일정 / 원페이저 PDF)
                              운영자 수동 발송 (paid 11명 한정)
```

## 신청 폼 (apply form)

### 2-step 구조

**Step 1 (4 필드)**
- 이름 (한글 / 영문)
- 이메일
- 연락처 (nationality 기반 country code 자동 prefix)
- 국적 (placeholder: "예) 미국 / 스페인 / 중국")

**Step 2 (4 필드 + 동의)**
- 생년월일
- 재학 / 졸업 대학 (선택)
- 비자 상태 (D-2 / D-4 / D-10 / E-시리즈 / F-시리즈 / 없음)
- 현재 거주지 (시/구)
- 동의 3종: 개인정보 수집 (필수) / 운영·환불 정책 (필수) / 마케팅 (선택)
- 출석 commitment + content use notice

### 검증 / 정규화 / 처리

- zod schema (`domain/application.ts`)
- 연락처: nationality 기반 자동 prefix (40개국 매핑) + 누락 국가 18개 추가
- 비자 = "없음" 선택 시 paymentGuide_noVisa 분기 (거절 안내)
- INSERT 시: status='pending', cohort_id = 활성 cohort 자동 매칭 (accepts_signup_now → 가장 가까운 시작 cohort)
- 마감 후 (B0039): status='next_cohort_interest' + cohort_id=NULL

### 폼 운영 사고 (1기)

- **silent fail** (6/8) — Supabase 에러 + UI 메시지 없음. hotfix: error message 명시
- **한글 IME 깨짐** (6/12) — modal useEffect dependency 정리
- **인도 신청자 +1 자동 인식** (6/12) — phone 자동 prefix 가 nationality "Korea" 만 +82, 나머지 영문 fallback. 40개국 매핑 추가
- **Application ID 노출 + PaymentNotice 모바일 빡빡함** (6/18) — SuccessBlock에서 ID 제거 + PaymentNotice 핀포인트 spacing

## 메시지 종류 (templates.ts)

| Kind | 단계 | 채널 | 비고 |
|---|---|---|---|
| `paymentGuide` | 신청 직후 → 운영자 발송 | SMS + email | 비자 없음 분기 (paymentGuide_noVisa) |
| `paymentConfirmed` | 입금 확인 후 → 운영자 발송 | SMS + email | 강의장 정보 제거 (다음 메일로 일원화) |
| `reminderT1` | T+1일 미입금 → 운영자 발송 | SMS + email | 톤: "혹시 입금을 잊으신 건 아닌지 리마인드 차원" |
| `reminderD3` | 마감 D-3 → 운영자 발송 | SMS + email | |
| `reminderD1` | 마감 D-1 → 운영자 발송 | SMS + email | |
| `referralInvite` | paid 학생만 → 운영자 발송 | SMS + email | 친구 추천 보상 ($50,000 할인) |
| `cohortKickoff` | 마감 후 paid 학생 → 운영자 발송 | SMS + email | 강의장 / 시간 / 카톡 오픈채팅 / 준비물 / 8회 일정 / 원페이저 PDF |

### 메시지 발송 UX (현재 = 반자동)

1. 운영자가 `/admin/applicants` 에서 신청자 선택
2. [메시지] 버튼 → 모달 열림
3. Kind 선택 (paid 전용 종류는 paid 상태에서만 노출)
4. 채널 (SMS / email) 선택
5. 언어 (ko / en) 선택 (또는 신청자 locale 자동)
6. 본문 preview + [복사] 버튼
7. [SMS 보내기] (sms:// scheme) / [메일 보내기] (mailto:// scheme) 클릭
8. 운영자 본인 SMS / 메일 클라이언트 열림 → 본문 paste → 발송

**자동화 X (의도)** — 1기 검증 안 됨 + 매번 톤 점검 + 비자 분기 등 운영자 판단 필요.

### 다중 발송 (broadcast)

여러 신청자 동시 같은 메시지 → 일괄 mailto:// 링크 (BCC 필드). cohort 첫 강의 안내 등에 활용.

## 운영자 일일 루틴 (1기 기준)

1. **아침 (08:00 ~ 10:00)** — `/admin/applicants` 접속. 신규 신청 chip 확인. 신규 → paymentGuide 발송.
2. **오후 (14:00 ~ 18:00)** — 토스뱅크 알림 모니터. 입금 확인 시 paid 토글 → paymentConfirmed 발송.
3. **저녁 (20:00 ~ 22:00)** — reminder 필요 신청자 확인 (T+1 황색 chip / D-3 주황 / D-1 적색) → 발송.
4. **야간 (22:00 ~ 24:00)** — 외국인 학생 카톡 채널 응대 (시차 응대).

### 카톡 채널 응대

- 카카오톡 채널 `@nxhDGX` (1:1 상담)
- 채널 URL: `https://pf.kakao.com/_nxhDGX/chat`
- 사이트 우측 하단 고정 노란 버튼 (B0008) — SDK 없이 단순 anchor

## 1기 모집 결과 (2026-06-22 자정 기준)

| status | 인원 |
|---|---|
| pending | (마감 직전 추가 신청 catch-up 완료) |
| notified | (모두 paid 또는 cancelled 처리) |
| **paid** | **11명** |
| overdue | 0 |
| cancelled | (실수 신청 / 사후 취소) |
| refunded | 0 |
| enrolled | (강의 첫날 6/27 등록 토글) |
| next_cohort_interest | (6/22 자정 이후 카운팅 시작) |

**총 신청자**: 26명 (cohort 1 backfill 기준)
**paid 전환율**: 11 / 26 ≈ 42%
**폐강 기준 (8명)**: 초과 → 강의 확정

## 환불 정책 (REFUND_POLICY)

근거: 학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준 + 전자상거래법 §17

| 단계 | 환불 |
|---|---|
| 결제 후 7일 이내 (전자상거래법 청약철회) | 100% |
| 수강 시작 전 | 100% |
| 수강 시작 후 1/3 경과 전 | 2/3 환불 |
| 수강 시작 후 1/2 경과 전 | 1/2 환불 |
| 1/2 경과 후 | 환불 없음 |

**자동 환불**: 마감일까지 20명 (1기는 8명으로 완화) 미달 시 강좌 취소 + 전액 자동 환불 + 차기 기수 재모집.

## 친구 추천 보상 (referralInvite)

- 약관 §15 박제 (소득세법 §84 4호 비과세 한도 5만원)
- 1인당 최대 5명 추천
- 매칭 시점: 친구 결제 완료 후
- 매칭 방법: 친구가 결제 안내 메일에 답장으로 추천인 이름 기재 (카카오 채널 X — 인증 어려움)
- 보상: 추천인에게 5만원 할인 또는 현금 (둘 중 선택)

## 비자 처리

- D-2 (학생) / D-4 (어학연수) / D-10 (구직) / E-시리즈 (취업) / F-시리즈 (영주/배우자) 허용
- "없음" 신청자: paymentGuide_noVisa 4종 (한/영 × SMS/email) 발송 — 정중 거절 + 비자 안내

## 외부 채널 (응대)

| 채널 | 용도 | 응답 시간 목표 |
|---|---|---|
| 카카오톡 채널 | 1:1 상담, 외국인 응대 | 12시간 내 |
| hello@dropdown.xyz | 공식 메일 | 24시간 내 |
| 신청 폼 | 신청 폼 입력 | (수동 운영자 발송) |

## 다음 기수 운영 시 변경 후보

→ `08-automation-candidates.md` + `09-feature-candidates.md`
