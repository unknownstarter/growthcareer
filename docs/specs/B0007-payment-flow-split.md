# Spec - B0007 신청-입금 분리 플로우

**Backlog ID**: B0007
**Date**: 2026-06-04
**Lead**: Aria
**Status**: specced
**Related**: ADR 0003 (결제 채널 + 환불 정책 2층 분리), B0005(일정 확정), B0006(영문 디폴트), B0008(카톡 폴백)

---

## 1. Overview

### 목적

신청 폼 제출 = "결제 완료" 가 아니라 "결제 의사 표명" 임을 명확히 분리한다. 신청 직후 즉시 계좌번호를 노출하던 기존 플로우를 **별도 채널(SMS + 이메일) 자동 발송 + 운영자 후행 확인** 으로 교체한다.

### 컨텍스트

- 2026-06-04 Cowork 미팅 결과: 외국인 신청자에게 "신청 = 자리 확정" 신호와 "결제 = 자리 확정" 신호를 한 화면에 섞으면 trust 가 깨진다. 분리하는 편이 직관과 합법성 모두에 유리.
- 1기 정원 30석, 최소 20석. 마감 2026-06-21(일) 자정. 첫 강의 6/27(토).
- 결제 PG 미사용. Dropdown 명의 토스뱅크 1002-4759-1521 계좌이체만 받음.
- 입금 확인 주체 = 노아 본인 (Dropdown 명의 환불 실행자 동일).
- 외부 파트너(Cowork) 는 트래킹 시스템 없이 진행 (B0001 dropped). 즉 신청자 신원 = `applicants` 테이블이 단일 소스.

### 마감 일정 (이 spec 의 모든 일정은 이 기준)

| 이정표 | 날짜 | 의미 |
|---|---|---|
| 신청 마감 | 2026-06-21 (일) 자정 | 신규 신청 cutoff |
| 미입금 grace 만료 | 2026-06-22 (월) 23:59 | 24h grace. 이후 자동 cancelled |
| 인원 가드 | 2026-06-22 (월) | 결제 확정 < 20 이면 강좌 취소 + 전액 자동 환불 |
| 첫 강의 | 2026-06-27 (토) | enrolled 명단 fix |

---

## 2. 사용자 플로우 (현재 vs 변경 후)

### 현재 (As-Is)

```
Step 1 (이름/이메일/전화)
  -> Step 2 (생년월일/대학/비자/주소/동의)
  -> [신청 완료]
  -> 완료 화면에 토스뱅크 계좌번호 즉시 노출
```

문제: 계좌번호 노출 시점이 너무 빠르다. 신청자가 입금 의사가 굳기 전에 정보가 새고, 운영자가 "누가 진짜 결제할 사람인지" 와 "누가 단순 호기심인지" 구분 불가.

### 변경 후 (To-Be)

```
Step 1 (이름/이메일/전화)
  -> Step 2 (생년월일/대학/비자/주소/동의)
  -> [신청 완료] 버튼 클릭
  -> 컨펌 모달 (가격/마감/결제 수단 안내 + [신청 완료] 단일 클릭)
  -> applicants INSERT (status='pending')
  -> SMS (NaverCloud SENS) + 이메일 (Resend) 자동 이중 발송
     - 본문: 계좌번호 + 입금자명 가이드 + 마감일 + 카톡 채널 폴백 링크
  -> 완료 화면: "입금 안내를 보내드렸어요. 문자/메일 확인 부탁드려요" + 카톡 채널 링크
  -> 신청자가 토스뱅크에 직접 입금
  -> 운영자가 /admin/applicants 에서 status: pending -> paid 토글
  -> 자동 발송: "입금 확인 완료. 6/27 첫 강의 안내" (SMS + 이메일)
  -> 마감일 D-3 / D-1 미입금자에게 리마인드 자동 발송
  -> 마감 후 미입금자는 24h grace -> 자동 cancelled
```

핵심 변화 5개:

1. **컨펌 모달 신설** - 가격/마감/결제 수단/환불 단순화 메시지를 single screen 으로
2. **계좌번호 즉시 노출 X** - SMS + 이메일로만 전달
3. **자동 발송 인프라** - SENS (SMS) + Resend (이메일) 이중
4. **운영자 미니 페이지** - status 토글 + 입금자명 검색
5. **리마인드 cron** - T+1, D-3, D-1 자동

---

## 3. 컨펌 모달 명세

### 위치

신청 폼 step 2 마지막 "신청 완료" 버튼 클릭 직후. 폼 데이터 client-side validation 통과 시에만 띄움 (모달 닫으면 폼 데이터 보존).

### 표시 사항 (전체)

```
[제목]
신청 정보를 확인해 주세요

[가격 블록]
원가 1,100,000원 (취소선)
1기 할인가 880,000원
20% OFF

[일정 블록]
선착순 30석 마감
신청 마감 2026년 6월 21일(일) 자정

[결제 수단 블록]
결제 수단: 계좌이체 (토스뱅크)
* 계좌번호는 신청 완료 직후 입력하신 전화번호와 이메일로 보내드려요

[자리 확정 안내 - 강조]
수강 신청 완료 기준 = 결제 완료 시점
입금이 확인된 순서대로 자리가 확정돼요

[환불 안내 - 단순화]
마감 전 100% 환불 가능
마감 후 강좌가 취소되면 자동 환불
자세한 환불 규정 [약관 보기]

[버튼]
[취소]   [신청 완료]
```

### UX 디테일

- **체크박스 없음**. 추가 동의는 폼 step 2 에서 이미 받음. 모달은 confirm-only.
- **single-click 완료**. [신청 완료] 클릭 = applicants INSERT + 모달 close.
- **취소 시 폼 step 2 로 복귀**. 데이터 보존.
- **로딩 상태**: [신청 완료] 클릭 후 spinner + 버튼 disable. 응답 도착 전 중복 클릭 방지.
- **에러 처리**: 서버 액션 실패 시 모달 내 inline 에러 + retry. 폼 데이터 보존.
- **카피 톤**: 친근하면서 정보 정확성 우선. 짧고 단정한 문장.
- **locale 자동**: ko/en 토글 따라 카피 분기.
- **약관 보기 링크**: 새 탭. 약관 본문은 기존 그대로 (학원법 + 전자상거래법 §17 풀 표). 모달 내 단순화 메시지와 분리.

### 모바일 대응

- max-width: 32rem
- viewport 의 80% 미만 높이. 넘으면 modal 내 scroll
- 버튼은 sticky bottom

---

## 4. 자동 발송 카피 (8종 = 4 메시지 x 2 locale)

부호 규칙 (CLAUDE.md §6.5): em dash 없음, en dash 없음, 인터펑크 없음, 곡선 따옴표 없음, 단일 문자 ellipsis 없음. 사용자 노출 카피는 엄격 준수.

### 4.1 신청 직후 - 입금 안내 (SMS) - 한국어

```
[Growth Career] 신청해 주셔서 감사해요. Fan to Pro 1기 입금 안내드려요.

수강료 880,000원
입금 계좌 토스뱅크 1002-4759-1521 (예금주 드롭다운)
입금자명 (신청자 이름)
마감 6/21(일) 자정까지

입금 확인 후 6/27 첫 강의 안내 보내드려요. 문의는 카톡 채널 pf.kakao.com/_nxhDGX
```

길이: 약 160자 (SMS 단문 80자 초과 -> LMS 자동 변환). NaverCloud SENS LMS 사용 (2000자 한계 안전).

### 4.2 신청 직후 - 입금 안내 (SMS) - 영문

```
[Growth Career] Thanks for applying to Fan to Pro Cohort 1. Here is your payment guide.

Tuition KRW 880,000
Account Toss Bank 1002-4759-1521 (Holder: Dropdown)
Depositor name: (your full name)
Deadline Sun Jun 21 midnight

We will send the kickoff info for Jun 27 once payment is confirmed. Questions? KakaoTalk channel pf.kakao.com/_nxhDGX
```

### 4.3 신청 직후 - 입금 안내 (Email) - 한국어

```
Subject: [Growth Career] Fan to Pro 1기 입금 안내

(신청자 이름) 님, 안녕하세요.

Fan to Pro 1기에 신청해 주셔서 감사해요. 자리는 입금이 확인된 순서대로 확정돼요.

결제 정보
- 수강료: 880,000원 (원가 1,100,000원에서 20% 할인)
- 입금 계좌: 토스뱅크 1002-4759-1521
- 예금주: 드롭다운
- 입금자명: (신청자 이름) 으로 입금 부탁드려요
- 마감: 2026년 6월 21일(일) 자정까지

입금이 확인되면 별도 안내를 보내드려요. 첫 강의는 6월 27일(토) 입니다.

환불 안내
- 마감 전까지 100% 환불 가능합니다
- 마감 후 강좌가 취소되면 결제 금액 전액이 자동 환불됩니다
- 자세한 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

질문이 있으시면 카카오톡 채널로 편하게 말씀해 주세요.
https://pf.kakao.com/_nxhDGX/chat

Growth Career 운영팀 드림
```

### 4.4 신청 직후 - 입금 안내 (Email) - 영문

```
Subject: [Growth Career] Fan to Pro Cohort 1 - Payment Guide

Hi (Applicant name),

Thanks for applying to Fan to Pro Cohort 1. Your seat is confirmed once we receive your payment, in the order payments arrive.

Payment details
- Tuition: KRW 880,000 (20% off from the regular KRW 1,100,000)
- Account: Toss Bank 1002-4759-1521
- Holder: Dropdown
- Depositor name: please use your full name as written on the form
- Deadline: Sunday, June 21, midnight (KST)

We will send a confirmation as soon as your payment is verified. The first class is Saturday, June 27.

Refund policy
- 100% refund any time before the deadline
- Full automatic refund if the cohort is cancelled after the deadline
- Detailed refund schedule: https://growthcareer.xyz/terms

Any questions? Reach us on KakaoTalk anytime.
https://pf.kakao.com/_nxhDGX/chat

Growth Career team
```

### 4.5 ~ 4.8 입금 확인 완료 (SMS + 이메일 x ko + en)

#### SMS 한국어

```
[Growth Career] 입금 확인 완료 안내드려요. (신청자 이름) 님, Fan to Pro 1기 자리가 확정됐어요. 첫 강의 6/27(토) 안내 메일을 보내드렸어요. 카톡 채널 pf.kakao.com/_nxhDGX
```

#### SMS 영문

```
[Growth Career] Payment confirmed. (Applicant name), your seat for Fan to Pro Cohort 1 is locked in. We just emailed the kickoff details for Sat Jun 27. KakaoTalk pf.kakao.com/_nxhDGX
```

#### Email 한국어

```
Subject: [Growth Career] 입금 확인 완료 - Fan to Pro 1기 자리 확정

(신청자 이름) 님,

입금 확인이 완료됐어요. Fan to Pro 1기 자리가 확정됐습니다.

첫 강의 안내
- 일시: 2026년 6월 27일(토)
- 장소: 별도 안내 (수강 확정자에게만 개별 공지)
- 준비물: 별도 안내 메일에서 확인 부탁드려요

수강생 카카오톡 오픈채팅 초대 링크는 강의 시작 전 별도로 보내드려요.

환불이 필요하면 마감 전(6/21 자정) 까지는 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

Growth Career 운영팀 드림
```

#### Email 영문 - 동일 구조 (별도 작성 시 4.4 패턴 따름)

---

## 5. 리마인드 카피 (12종 = 3 시점 x SMS+이메일 x ko+en)

### 발송 시점

| 시점 | 트리거 | 대상 |
|---|---|---|
| T+1 (신청 다음날 같은 시각) | applicants.created_at + 24h | status='pending' 인 신청자 |
| D-3 (6/18 토 23:00) | cron | status='pending' 인 신청자 |
| D-1 (6/20 토 23:00) | cron | status='pending' 인 신청자 |

23:00 으로 잡은 이유: 외국인 신청자의 한국 거주 timezone 동일. 23:00 은 잠들기 전 모바일 확인 시간대.

### T+1 SMS 한국어

```
[Growth Career] (신청자 이름) 님, Fan to Pro 1기 신청 다음날이에요. 입금이 아직이라면 토스뱅크 1002-4759-1521 (드롭다운) 으로 880,000원 보내주세요. 마감 6/21(일) 자정. 카톡 pf.kakao.com/_nxhDGX
```

### T+1 SMS 영문

```
[Growth Career] (Applicant name), one day after your application. If you have not paid yet, send KRW 880,000 to Toss Bank 1002-4759-1521 (Dropdown). Deadline Sun Jun 21 midnight. KakaoTalk pf.kakao.com/_nxhDGX
```

### T+1 Email 한국어

```
Subject: [Growth Career] 입금 안내 다시 보내드려요

(신청자 이름) 님, 안녕하세요.

Fan to Pro 1기 신청하신지 하루가 지났어요. 입금 아직이시라면 아래 정보로 부탁드려요.

- 수강료 880,000원
- 토스뱅크 1002-4759-1521 (예금주 드롭다운)
- 입금자명: (신청자 이름)
- 마감: 2026년 6월 21일(일) 자정

자리는 입금 확인된 순서대로 확정돼요. 카톡 채널이 편하시면 https://pf.kakao.com/_nxhDGX/chat 로 말씀해 주세요.

Growth Career 운영팀 드림
```

### T+1 Email 영문

```
Subject: [Growth Career] Quick payment reminder

Hi (Applicant name),

It has been a day since your application. If you have not paid yet, here is the info again.

- Tuition KRW 880,000
- Toss Bank 1002-4759-1521 (Holder: Dropdown)
- Depositor name: your full name from the form
- Deadline: Sunday, June 21, midnight (KST)

Seats are locked in the order payments arrive. KakaoTalk is the fastest way to reach us: https://pf.kakao.com/_nxhDGX/chat

Growth Career team
```

### D-3 SMS 한국어

```
[Growth Career] 마감 3일 전이에요. (신청자 이름) 님 자리 아직 못 잡았어요. 토스뱅크 1002-4759-1521 (드롭다운) 880,000원 입금 부탁드려요. 마감 6/21 자정. 카톡 pf.kakao.com/_nxhDGX
```

### D-3 SMS 영문

```
[Growth Career] 3 days to deadline. (Applicant name), your seat is not locked yet. Toss Bank 1002-4759-1521 (Dropdown), KRW 880,000. Deadline Sun Jun 21 midnight. KakaoTalk pf.kakao.com/_nxhDGX
```

### D-3 Email 한국어 (요지: 톤 더 긴급, 본문 짧게)

```
Subject: [Growth Career] 마감 3일 전 - Fan to Pro 1기

(신청자 이름) 님,

신청 마감까지 3일 남았어요. 입금이 확인되지 않은 분은 아직 자리가 확정되지 않았어요.

수강료 880,000원
토스뱅크 1002-4759-1521 (드롭다운)
입금자명 (신청자 이름)
마감 2026년 6월 21일(일) 자정

카톡 채널이 편하시면 https://pf.kakao.com/_nxhDGX/chat 로 말씀해 주세요. 결제 후 24시간 안에 확인 안내 보내드려요.

Growth Career 운영팀 드림
```

### D-3 Email 영문

```
Subject: [Growth Career] 3 days left - Fan to Pro Cohort 1

Hi (Applicant name),

3 days left until the application deadline. If we have not received your payment, your seat is not yet locked in.

Tuition KRW 880,000
Toss Bank 1002-4759-1521 (Dropdown)
Depositor name: your full name
Deadline Sun Jun 21 midnight (KST)

KakaoTalk works too: https://pf.kakao.com/_nxhDGX/chat. We send a confirmation within 24 hours of payment.

Growth Career team
```

### D-1 SMS 한국어 (마지막 시도, 톤 가장 직접적)

```
[Growth Career] 내일 자정 마감이에요. (신청자 이름) 님 입금 미확인. 토스뱅크 1002-4759-1521 (드롭다운) 880,000원. 마감 후엔 자리 보장 어려워요. 카톡 pf.kakao.com/_nxhDGX
```

### D-1 SMS 영문

```
[Growth Career] Deadline tomorrow midnight. (Applicant name), payment not received yet. Toss Bank 1002-4759-1521 (Dropdown), KRW 880,000. After deadline we cannot guarantee your seat. KakaoTalk pf.kakao.com/_nxhDGX
```

### D-1 Email 한국어

```
Subject: [Growth Career] 내일 마감 - 마지막 안내

(신청자 이름) 님,

Fan to Pro 1기 신청 마감이 내일(6/21 일) 자정이에요. 아직 입금이 확인되지 않은 분께 마지막으로 안내드려요.

- 수강료 880,000원
- 토스뱅크 1002-4759-1521 (드롭다운)
- 입금자명 (신청자 이름)

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 가능하면 마감 전 입금 부탁드려요.

카톡 채널: https://pf.kakao.com/_nxhDGX/chat

Growth Career 운영팀 드림
```

### D-1 Email 영문

```
Subject: [Growth Career] Last day - deadline tomorrow

Hi (Applicant name),

The application deadline for Fan to Pro Cohort 1 is tomorrow (Sun Jun 21) at midnight (KST). One last reminder if you have not paid yet.

- Tuition KRW 880,000
- Toss Bank 1002-4759-1521 (Dropdown)
- Depositor name: your full name

After the deadline, we will process any late payments within 24 hours if seats remain, and auto-refund if no seat is available. Please send payment before the deadline if you can.

KakaoTalk: https://pf.kakao.com/_nxhDGX/chat

Growth Career team
```

---

## 6. 데이터 모델 변경

### 6.1 status enum 확장

기존: `pending | contacted | paid | enrolled | cancelled`

변경 후: `pending | payment_guided | paid | enrolled | cancelled | refunded`

| status | 의미 | 진입 트리거 |
|---|---|---|
| `pending` | 신청만 들어옴. 자동 발송 아직 시도 X | applicants INSERT 직후 (트랜잭션 안) |
| `payment_guided` | SMS + 이메일 발송 완료 (둘 중 하나라도 성공) | 발송 job 성공 |
| `paid` | 노아가 입금 확인 후 운영자 페이지에서 토글 | 운영자 액션 |
| `enrolled` | 첫 강의 시작 시점에 paid 전원 일괄 전환 | cron (6/27 06:00) |
| `cancelled` | 마감 후 미입금 또는 신청자 본인 취소 | cron 또는 운영자 액션 |
| `refunded` | cancelled 중 환불 완료 처리분 | 운영자 액션 (환불 실행 후) |

### 6.2 신규 컬럼

```sql
-- supabase/migrations/20260605000000_payment_flow_split.sql

-- 1) status 제약 확장
alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in ('pending','payment_guided','paid','enrolled','cancelled','refunded'));

-- 2) 자동 발송 추적
alter table public.applicants
  add column if not exists payment_guide_sms_sent_at  timestamptz,
  add column if not exists payment_guide_email_sent_at timestamptz,
  add column if not exists payment_guide_send_error    text;

-- 3) 입금 확인
alter table public.applicants
  add column if not exists paid_at                 timestamptz,
  add column if not exists paid_amount_krw         integer,
  add column if not exists depositor_name_observed text,
  add column if not exists paid_confirmed_by       text;

-- 4) 리마인드 추적
alter table public.applicants
  add column if not exists reminder_t1_sent_at  timestamptz,
  add column if not exists reminder_d3_sent_at  timestamptz,
  add column if not exists reminder_d1_sent_at  timestamptz;

-- 5) cancel / refund
alter table public.applicants
  add column if not exists cancelled_at  timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists refunded_at   timestamptz,
  add column if not exists refund_txn_id text;

-- 6) 인덱스
create index if not exists applicants_payment_guide_pending_idx
  on public.applicants (created_at)
  where status = 'pending' and payment_guide_sms_sent_at is null;

create index if not exists applicants_reminder_pending_idx
  on public.applicants (created_at)
  where status = 'payment_guided';
```

### 6.3 호환성

- 기존 `contacted` 사용 row 없음 (확인 필요. 있으면 backfill `payment_guided` 로 변환).
- 기존 `paid`, `enrolled`, `cancelled` row 는 그대로 호환.

---

## 7. 운영자 미니 페이지 명세

### 7.1 위치 + 인증

- 라우트: `/admin/applicants`
- 인증: HTTP Basic Auth (middleware 단). 사용자 = `admin`, 비밀번호 = `ADMIN_BASIC_PASSWORD` env. 1기 한정 충분.
- 향후 (B0002 어드민) 에서 Supabase Auth + role 로 교체 예정.

### 7.2 화면 구성

```
헤더: 총 신청 N건 / pending M / payment_guided P / paid Q / enrolled R / cancelled S

검색 + 필터
  - 입금자명 / 이름 / 이메일 부분 검색
  - status 필터 (multi-select)
  - 정렬: created_at desc / paid_at desc

테이블 (콤팩트)
  Col: created_at | name | email | phone | status | paid_amount | actions

각 row 액션 (drawer 또는 inline edit)
  - status 토글 (pending -> payment_guided 는 자동, 그 외 수동)
  - paid 처리: paid_amount_krw, depositor_name_observed, paid_at 입력
  - cancelled 처리: cancel_reason 입력
  - refunded 처리: refund_txn_id 입력
  - 노트 (notes 컬럼) inline 수정

푸터
  - CSV export 버튼 (필터 적용된 결과만)
```

### 7.3 서버 액션

```typescript
// /admin/applicants 의 인라인 액션은 모두 server actions:
// - markAsPaid(id, { amount, depositor, paidAt })
// - markAsCancelled(id, { reason })
// - markAsRefunded(id, { txnId })
// - updateNotes(id, notes)
// - exportCsv(filters)
```

### 7.4 입금 확인 워크플로우 (노아 기준)

1. 토스뱅크 앱에서 입금 알림 확인 (예금주 드롭다운)
2. `/admin/applicants` 접속 -> 입금자명으로 검색
3. row 클릭 -> paid 처리 -> 금액/날짜 입력 -> 저장
4. 시스템이 자동으로 "입금 확인 완료" SMS + 이메일 발송
5. 도착하지 않은 입금자명은 1~2일 대기 후 카톡 채널로 폴백 문의

### 7.5 빌드 비용 추정

약 4시간. shadcn `<Table>` `<Dialog>` `<Input>` 활용. 별도 디자인 X.

---

## 8. 인프라 통합

### 8.1 NaverCloud SENS (SMS)

| 항목 | 값 |
|---|---|
| 서비스 | Cloud Outbound Mailer 가 아니라 SENS SMS |
| 발신번호 | 사전 등록 필요. Dropdown 명의 사업자번호 154-28-02110 으로 신고 |
| 문자 종류 | LMS (장문, 2000자) |
| 단가 | LMS 기준 약 30원/건. 1기 30명 x 4회(입금안내+T1+D3+D1) = 120건 약 3,600원 |
| API | `POST /sms/v2/services/{serviceId}/messages` HMAC-SHA256 |
| 발송 실패 시 | `payment_guide_send_error` 컬럼에 기록, 이메일만으로 성공 처리 |

**Critical path**: 발신번호 사전 등록 심사 2~3 영업일 소요. 6/6 (금) 전 신청 필수. -> Vera 가 6/5 (목) 안에 신청.

### 8.2 Resend (이메일)

| 항목 | 값 |
|---|---|
| 도메인 | growthcareer.xyz 에 SPF + DKIM + DMARC 추가 (Resend 콘솔 가이드 따름) |
| 발신 주소 | `noreply@growthcareer.xyz` 또는 `team@growthcareer.xyz` |
| 단가 | 월 3000건 무료. 1기 충분 |
| API | `POST /emails` (REST) |
| 발송 실패 시 | retry 3회 (지수 backoff). 최종 실패 시 `payment_guide_send_error` 기록 |
| 템플릿 | React Email (`@react-email/components`) 또는 단순 HTML 문자열 |

### 8.3 Vercel Cron (리마인드)

```typescript
// vercel.ts
crons: [
  // T+1 리마인드: 매시간 체크. created_at + 24h <= now AND status='payment_guided'
  { path: "/api/cron/reminder-t1", schedule: "0 * * * *" },
  // D-3 리마인드: 6/18 (토) 23:00 KST = 6/18 14:00 UTC
  { path: "/api/cron/reminder-d3", schedule: "0 14 18 6 *" },
  // D-1 리마인드: 6/20 (토) 23:00 KST = 6/20 14:00 UTC
  { path: "/api/cron/reminder-d1", schedule: "0 14 20 6 *" },
  // 마감 후 24h grace 만료 처리: 6/22 (월) 23:59 KST = 6/22 14:59 UTC
  { path: "/api/cron/expire-grace", schedule: "59 14 22 6 *" },
  // 첫 강의 시작 시점 paid -> enrolled 일괄 전환: 6/27 (토) 06:00 KST = 6/26 21:00 UTC
  { path: "/api/cron/lock-enrolled", schedule: "0 21 26 6 *" },
]
```

Cron 인증: `CRON_SECRET` 헤더 검증. Vercel 자동 주입.

### 8.4 환경 변수 (.env.example 업데이트 필요)

```
NAVER_SENS_ACCESS_KEY=
NAVER_SENS_SECRET_KEY=
NAVER_SENS_SERVICE_ID=
NAVER_SENS_FROM_NUMBER=
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@growthcareer.xyz
ADMIN_BASIC_PASSWORD=
CRON_SECRET=
```

---

## 9. 법적 가드레일

### 9.1 학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준

기존 `REFUND_POLICY` (program.ts) 유지. 약관 페이지 `/terms` 본문 그대로. 변경 없음.

| 시점 | 환불 비율 |
|---|---|
| 결제 후 7일 이내 또는 수강 시작 전 | 100% |
| 수강 시작 후 1/3 경과 전 | 2/3 |
| 수강 시작 후 1/2 경과 전 | 1/2 |
| 1/2 경과 후 | 환불 없음 |

### 9.2 전자상거래법 §17

청약철회권 (결제 후 7일) 명시. `REFUND_POLICY.fullRefundDays = 7` 으로 코드에 반영 완료.

### 9.3 거래 메시지 vs 마케팅 메시지

- 본 spec 의 모든 SMS + 이메일 = **거래 메시지** (입금 안내 + 입금 확인 + 강의 안내). 정보통신망법 §50 적용 X.
- 신청자가 `consent_marketing=true` 인 경우만 별도 마케팅 발송 가능 (본 spec 범위 밖).
- 발송 본문에 "광고" 표기 불필요. 단 야간(21:00~08:00) 발송은 거래 메시지라도 회피 권장 -> D-3/D-1 23:00 발송은 거래성 + 사용자 편의 시간대로 정당화 가능 (Sage 검토 권장).

### 9.4 약관 본문 영향

영향 0. `REFUND_POLICY` 와 `/terms` 페이지는 건드리지 않는다.

마케팅/컨펌 모달의 "마감 전 100% 환불, 마감 후 강좌 취소 시 환불" 단순화 메시지는 약관 본문의 상세 표를 대체하지 않고 **요약 + 약관 링크** 로 처리. 분쟁 시 약관 본문이 우선.

### 9.5 영수증 발급

수강료 880,000원에 대한 현금영수증 발급 의무 (10만원 초과). 노아가 토스뱅크 입금 확인 후 별도 발급. 본 spec 의 자동화 범위 밖. 추후 운영자 페이지 v0.2 에 통합 검토 (B0002 에 포함).

---

## 10. 작업 분해 (Tasks)

| ID | 작업 | 담당 | 의존 | 소요 | 검증 기준 |
|---|---|---|---|---|---|
| T0 | NaverCloud SENS 발신번호 등록 신청 | Vera | - | 0.5d 신청 + 2~3 영업일 대기 | 발신번호 활성화 콘솔 확인 |
| T1 | Resend 도메인 인증 (SPF/DKIM/DMARC) | Vera | - | 1h | Resend 콘솔 verified 상태 |
| T2 | DB 마이그레이션 (status 확장 + 신규 컬럼) | Iris | - | 1h | supabase-verify.mjs 통과 |
| T3 | 컨펌 모달 UI 컴포넌트 (ko/en) | Luna | - | 4h | preview 캡처 모바일 + 데스크탑 ko/en 4종 |
| T4 | submitApplication 액션 수정 (status='pending' INSERT) | Iris | T2 | 1h | unit test - status 값 확인 |
| T5 | 자동 발송 워커 (SENS + Resend 클라이언트 + retry) | Iris | T0 T1 T2 | 6h | 실제 발송 테스트 - 노아 본인 번호/이메일 |
| T6 | 발송 트리거 통합 (T4 INSERT 직후 fire-and-forget) | Iris | T4 T5 | 1h | INSERT -> status='payment_guided' 전환 확인 |
| T7 | 운영자 미니 페이지 /admin/applicants | Luna | T2 | 4h | basic auth 통과 + status 토글 동작 |
| T8 | 운영자 액션 (markAsPaid 등) + 확인 SMS 발송 | Iris | T5 T7 | 2h | paid 처리 시 신청자에게 SMS+이메일 도착 |
| T9 | 리마인드 cron 4종 (T+1, D-3, D-1, grace 만료) | Iris | T5 | 4h | cron preview deployment 에서 trigger 동작 |
| T10 | enrolled 일괄 전환 cron + CSV export | Iris | T9 | 2h | 6/27 dry-run 통과 |
| T11 | Mira QA 시나리오 5종 (신청 -> 발송 -> paid -> enrolled, grace 만료, cancel, 실패 fallback, 리마인드 cron) | Mira | T0~T10 all | 4h | 모든 시나리오 통과 + 캡처 |
| T12 | Sage 보안 + 야간 발송 검토 | Sage | T9 | 1h | 정보통신망법 §50 통과 확인 + admin route 노출 확인 |

총 소요: T0 critical path 약 3 영업일 + 구현 약 30시간. 1.5 일 wallclock 가능 (T0 대기 시간이 critical path).

### 일정 가드

| 마일스톤 | 날짜 | 도달 조건 |
|---|---|---|
| M1 인프라 준비 완료 | 2026-06-08 (월) | T0 T1 완료 |
| M2 코어 구현 완료 | 2026-06-10 (수) | T2~T8 완료 |
| M3 리마인드 + QA 완료 | 2026-06-12 (금) | T9~T12 완료 |
| M4 프로덕션 배포 | 2026-06-12 (금) | Mira + Sage 통과 후 Vera 배포 |
| M5 첫 입금 안내 발송 시작 | 2026-06-13 (토) 부터 | 새 신청자에게 자동 발송 시작 |

### Plan B 게이트

없음. 풀 자동화 가정으로 진행 (노아 결정).

---

## 11. Done When

다음 11개 모두 충족 시 spec 완료.

1. supabase migration 적용 -> `status` enum 6종 모두 사용 가능
2. 컨펌 모달이 폼 step 2 후 정상 표시 (ko/en 양 locale)
3. 신청 INSERT 직후 SMS + 이메일 자동 발송 -> 둘 다 도착 확인 (실 발송 테스트)
4. `/admin/applicants` 진입 시 basic auth 프롬프트 -> 통과 시 신청자 리스트 로드
5. 운영자 paid 토글 -> 신청자에게 확인 SMS + 이메일 자동 도착
6. T+1 리마인드 cron 트리거 -> 24h 경과한 `payment_guided` 신청자에게 발송
7. D-3 (6/18 23:00) D-1 (6/20 23:00) 리마인드 cron 정상 트리거 (preview deployment 에서 시뮬레이션)
8. 마감 후 24h grace 만료 cron -> 미입금자 자동 cancelled 전환
9. 6/27 06:00 enrolled 일괄 전환 cron -> paid 전원 enrolled 로 변환
10. CSV export 결과가 `/admin/applicants` 필터와 일치
11. Mira 5종 시나리오 + Sage 보안 검토 PASS

---

## 12. Risks + Mitigation

| 리스크 | 영향 | 확률 | 완화책 |
|---|---|---|---|
| **NaverCloud SENS 발신번호 심사 지연** (3일 이상) | 자동 SMS 발송 불가 -> 이메일 only + 운영자 카톡 폴백 | 중 | 6/5 (목) 안에 신청. 지연 시 이메일 단독 진행 + 카톡 채널 안내 강화 |
| **Resend 도메인 인증 실패** | 메일 스팸함 직행 | 중 | SPF + DKIM + DMARC 셋업 후 mail-tester.com 으로 10점 확인 |
| **SMS LMS 본문이 캐리어 spam filter 에 잡힘** | 발송은 되나 사용자 미수신 | 중 | "[Growth Career]" prefix 통일. 광고성 단어 회피 (할인%, 무료, 이벤트) |
| **운영자 페이지 basic auth 우회** | 신청자 PII 노출 | 낮음 | middleware 단 basic auth + admin 경로 robots.txt disallow + Sage 검토 |
| **자동 발송 워커 실패가 신청 자체를 실패시킴** | 신청자가 다시 시도 -> 중복 row | 높음 | INSERT 와 발송을 트랜잭션 분리. INSERT 성공 시 즉시 200 응답, 발송은 fire-and-forget. 실패는 `payment_guide_send_error` 컬럼 기록 후 운영자가 후행 처리 |
| **cron timezone 오류** (UTC vs KST) | 리마인드 발송 시각이 어긋남 | 중 | cron schedule 은 UTC 기준 + 코멘트에 KST 환산 명시 + Mira 가 6/15 dry-run |
| **23:00 야간 발송이 정보통신망법 §50 위반 의심받음** | 행정 지도 가능성 | 낮음 | 거래 메시지 = 야간 발송 허용. Sage 가 본문에 "광고" 표기 없음 + 거래성 본문임을 확인 |
| **마감 후 grace 24h 동안 PG 처리 누락** | 미입금자 cancelled 안 됨 -> 다음 cron 까지 지체 | 낮음 | grace 만료 cron 이 idempotent. 재실행해도 안전 |
| **CSV export 에 비자 정보 등 PII 포함** | 운영자 디바이스에 PII 유출 | 중 | 다운로드 시 confirm + 파일명에 timestamp + 7일 retention 권장 (운영 매뉴얼) |
| **노아 1인 운영 부담** | 입금 확인 지연 -> 신청자 컨펌 지연 | 중 | 운영자 페이지 검색 + 토글 UI 단순화 + 입금 1건당 평균 30초 목표 |

---

## 13. Sources

- 2026-06-04 Cowork 미팅 §13 (docs/research/cowork-partnership-tracking.md)
- B0005 1기 일정 + ENROLLMENT_CAP (src/programs/fan-to-pro/domain/program.ts)
- 기존 REFUND_POLICY (학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준)
- 정보통신망법 §50 (영리목적 광고성 정보 전송)
- 전자상거래법 §17 (청약철회권 7일)
- NaverCloud SENS 공식 문서 (sens.apigw.ntruss.com)
- Resend Next.js integration 가이드

---

## 14. Open Questions

본 spec 시점에 노아 결정 다 확정. 구현 단계에서 다음만 후속 결정:

- T0 SENS 발신번호 등록 시 표기 발신자명 ("Growth Career" 8자 or "그로스커리어")
- 운영자 페이지 URL: `/admin/applicants` 확정 vs 추측 어려운 path (`/ops/x9k2/applicants` 등) 검토 (Sage)
- CSV export 의 PII 컬럼 마스킹 정책 (Sage 코멘트 받아 결정)
