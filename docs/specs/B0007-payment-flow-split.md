# Spec - B0007 신청-입금 분리 플로우

**Backlog ID**: B0007
**Date**: 2026-06-04 (rev 2 — 반자동 발송으로 전환)
**Lead**: Aria
**Status**: specced
**Related**: ADR 0003 (결제 채널 + 환불 정책 2층 분리), B0005(일정 확정), B0006(영문 디폴트), B0008(카톡 폴백)

---

## 1. Overview

### 목적

신청 폼 제출 = "결제 완료" 가 아니라 "결제 의사 표명" 임을 명확히 분리한다. 신청 직후 즉시 계좌번호를 노출하던 기존 플로우를 **반자동 발송 (운영자 dashboard 의 메시지 generate + 1-click 복사 + mailto 링크 + 노아 본인의 카톡/SMS/이메일 수동 발송)** 으로 교체한다.

### 컨텍스트

- 2026-06-04 Cowork 미팅 결과: 외국인 신청자에게 "신청 = 자리 확정" 신호와 "결제 = 자리 확정" 신호를 한 화면에 섞으면 trust 가 깨진다. 분리하는 편이 직관과 합법성 모두에 유리.
- 1기 정원 30석, 최소 20석. 마감 2026-06-21(일) 자정. 첫 강의 6/27(토).
- 결제 PG 미사용. Dropdown 명의 토스뱅크 1002-4759-1521 계좌이체만 받음.
- 입금 확인 주체 = 노아 본인 (Dropdown 명의 환불 실행자 동일).
- 외부 파트너(Cowork) 는 트래킹 시스템 없이 진행 (B0001 dropped). 즉 신청자 신원 = `applicants` 테이블이 단일 소스.

### 결정 변경 (rev 2, 2026-06-04)

본 spec 의 이전 버전은 NaverCloud SENS (SMS) + Resend (이메일) 자동 발송 + Vercel Cron 리마인드를 가정했다. 노아의 결정으로 다음과 같이 바꾼다.

- **자동 발송 인프라 도입 안 함**. NaverCloud SENS, Resend, INSERT 직후 fire-and-forget trigger, 리마인드 cron 모두 제거.
- **반자동으로 전환**. 운영자 페이지에 메시지 generate + 1-click 복사 + mailto/sms 링크 기능을 박고, 노아가 직접 카톡/SMS/이메일을 보낸다.
- **이유**: (a) 유료 인프라 비용 0, (b) NaverCloud 발신번호 심사 critical path 제거 (3 영업일 대기 사라짐), (c) 빌드 시간 5~6일 -> 2~3일 단축, (d) 1기 30명 규모는 수동 발송으로 충분히 처리 가능.

### 마감 일정 (이 spec 의 모든 일정은 이 기준)

| 이정표 | 날짜 | 의미 |
|---|---|---|
| 신청 마감 | 2026-06-21 (일) 자정 | 신규 신청 cutoff |
| 미입금 grace 만료 | 2026-06-22 (월) 23:59 | 24h grace. 이후 운영자가 dashboard 에서 일괄 cancelled |
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

### 변경 후 (To-Be, 반자동)

```
Step 1 (이름/이메일/전화)
  -> Step 2 (생년월일/대학/비자/주소/동의)
  -> [신청 완료] 버튼 클릭
  -> 컨펌 모달 (가격/마감/결제 수단 안내 + [신청 완료] 단일 클릭)
  -> applicants INSERT (status='pending')
  -> 완료 화면: "안내 메시지를 곧 보내드려요. 카톡/SMS/이메일로 입금 안내가 도착합니다" + 카톡 채널 링크

[비동기, 노아 수동]
  -> 노아가 /admin/applicants 에서 신규 pending 신청자 확인
  -> row 의 "안내 메시지 복사" 클릭 -> 클립보드에 한·영 SMS/카톡 본문 채워짐
  -> 노아가 카톡 채널 1:1 또는 SMS 앱으로 붙여넣어 발송
  -> 또는 row 의 "이메일 보내기" 클릭 -> mailto: 링크로 기본 메일 앱 자동 열림 (to + subject + body 미리 채워짐)
  -> 노아가 발송 완료 후 row 의 "발송 완료" 토글 클릭 -> status='notified', notified_at 자동 기록
  -> 신청자가 토스뱅크에 입금
  -> 노아가 토스뱅크 알림 확인 후 row 에서 paid 토글
  -> paid 처리 후 "입금 확인 완료" 메시지도 동일 패턴 (generate -> 복사 -> 수동 발송 -> 토글)
  -> 마감 D-3 / D-1 됐는데 status='notified' 인 신청자는 dashboard 에서 빨갛게 강조 표시
  -> 노아가 강조된 row 마다 리마인드 메시지 generate -> 복사 -> 수동 발송 -> 발송 카운트 +1
  -> 마감 후 24h grace 경과 시 일괄 cancelled 버튼 클릭 (운영자 페이지 안)
```

핵심 변화 5개:

1. **컨펌 모달 신설** - 가격/마감/결제 수단/환불 단순화 메시지를 single screen 으로
2. **계좌번호 즉시 노출 X** - 노아가 메시지로 직접 안내
3. **운영자 dashboard 메시지 generate** - 각 신청자 row 별로 카톡/SMS/이메일 본문 미리 채워짐
4. **1-click 복사 + mailto + sms 링크** - 노아 발송 부담 최소화
5. **dashboard side 리마인드 알림** - cron 없이 빨간 강조 + 노아가 수동으로 보냄

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
* 계좌번호는 신청 완료 직후 카톡/SMS/이메일로 안내해 드려요

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

## 4. 메시지 템플릿 (8종 = 4 메시지 x 2 locale)

운영자 페이지에서 generate 되는 본문 템플릿. 한국어와 영문 모두 SMS 단문/카톡과 이메일 본문 2 형식.

부호 규칙 (CLAUDE.md §6.5): em dash 없음, en dash 없음, 인터펑크 없음, 곡선 따옴표 없음, 단일 문자 ellipsis 없음. 사용자 노출 카피는 엄격 준수.

플레이스홀더는 `{name}`, `{email}`, `{phone}` 으로 표기. 운영자 페이지가 신청자 row 데이터로 자동 치환.

### 4.1 신청 직후 - 입금 안내 (카톡/SMS 단문) - 한국어

```
[Growth Career] {name} 님, Fan to Pro 1기 신청 감사해요. 입금 안내드려요.

수강료 880,000원
계좌 토스뱅크 1002-4759-1521 (예금주 드롭다운)
입금자명 {name}
마감 6/21(일) 자정까지

입금 확인 후 6/27 첫 강의 안내 드려요. 문의는 카톡 채널로 편하게요. https://pf.kakao.com/_nxhDGX/chat
```

### 4.2 신청 직후 - 입금 안내 (카톡/SMS 단문) - 영문

```
[Growth Career] Hi {name}, thanks for applying to Fan to Pro Cohort 1. Here is your payment guide.

Tuition KRW 880,000
Account Toss Bank 1002-4759-1521 (Holder: Dropdown)
Depositor name: {name}
Deadline Sun Jun 21 midnight (KST)

We will send the kickoff info for Jun 27 once payment is confirmed. KakaoTalk channel: https://pf.kakao.com/_nxhDGX/chat
```

### 4.3 신청 직후 - 입금 안내 (이메일) - 한국어

```
Subject: [Growth Career] Fan to Pro 1기 입금 안내

{name} 님, 안녕하세요.

Fan to Pro 1기에 신청해 주셔서 감사해요. 자리는 입금이 확인된 순서대로 확정돼요.

결제 정보
- 수강료: 880,000원 (원가 1,100,000원에서 20% 할인)
- 입금 계좌: 토스뱅크 1002-4759-1521
- 예금주: 드롭다운
- 입금자명: {name} 으로 입금 부탁드려요
- 마감: 2026년 6월 21일(일) 자정

입금이 확인되면 별도 안내를 보내드려요. 첫 강의는 6월 27일(토) 입니다.

환불 안내
- 마감 전까지 100% 환불 가능합니다
- 마감 후 강좌가 취소되면 결제 금액 전액이 자동 환불됩니다
- 자세한 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

질문이 있으시면 카카오톡 채널로 편하게 말씀해 주세요.
https://pf.kakao.com/_nxhDGX/chat

Growth Career 운영팀 드림
```

### 4.4 신청 직후 - 입금 안내 (이메일) - 영문

```
Subject: [Growth Career] Fan to Pro Cohort 1 - Payment Guide

Hi {name},

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

#### 카톡/SMS 한국어

```
[Growth Career] {name} 님, 입금 확인 완료. Fan to Pro 1기 자리가 확정됐어요. 첫 강의 6/27(토) 안내 메일을 곧 보내드려요. 문의는 카톡 채널 https://pf.kakao.com/_nxhDGX/chat
```

#### 카톡/SMS 영문

```
[Growth Career] Hi {name}, payment confirmed. Your seat for Fan to Pro Cohort 1 is locked in. We will send kickoff details for Sat Jun 27 shortly. KakaoTalk: https://pf.kakao.com/_nxhDGX/chat
```

#### 이메일 한국어

```
Subject: [Growth Career] 입금 확인 완료 - Fan to Pro 1기 자리 확정

{name} 님,

입금 확인이 완료됐어요. Fan to Pro 1기 자리가 확정됐습니다.

첫 강의 안내
- 일시: 2026년 6월 27일(토)
- 장소: 별도 안내 (수강 확정자에게만 개별 공지)
- 준비물: 별도 안내 메일에서 확인 부탁드려요

수강생 카카오톡 오픈채팅 초대 링크는 강의 시작 전 별도로 보내드려요.

환불이 필요하면 마감 전(6/21 자정) 까지는 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

Growth Career 운영팀 드림
```

#### 이메일 영문

```
Subject: [Growth Career] Payment Confirmed - Fan to Pro Cohort 1 Seat Locked

Hi {name},

Your payment has been confirmed. Your seat for Fan to Pro Cohort 1 is locked in.

First class
- Date: Saturday, June 27, 2026
- Venue: Sent separately to confirmed students only
- What to bring: Details in the kickoff email

Student KakaoTalk open chat invitation will arrive before the first class.

If you need a refund, 100% refund is available any time before the deadline (Sun Jun 21 midnight KST). Refund policy after that: https://growthcareer.xyz/terms

Growth Career team
```

---

## 5. 리마인드 카피 (12종 = 3 시점 x SMS+이메일 x ko+en)

운영자가 dashboard 에서 강조된 row 를 보고 수동 발송. 발송 시점은 노아 재량이지만 권장 시점은 아래.

### 권장 발송 시점

| 시점 | 트리거 | 대상 | dashboard 표시 |
|---|---|---|---|
| T+1 (신청 다음날) | created_at + 24h 경과 + status='notified' + reminder_count=0 | 황색 강조 |
| D-3 (6/18 토) | 마감 D-3 시점 + status='notified' + reminder_count<2 | 주황 강조 |
| D-1 (6/20 토) | 마감 D-1 시점 + status='notified' + reminder_count<3 | 적색 강조 + dashboard 상단 카운트 표시 |

dashboard 가 시점·상태 기준으로 자동 색상·정렬·카운트 갱신. 노아는 색상 보고 발송 결정.

### T+1 SMS 한국어

```
[Growth Career] {name} 님, Fan to Pro 1기 신청 다음날이에요. 입금이 아직이라면 토스뱅크 1002-4759-1521 (드롭다운) 으로 880,000원 부탁드려요. 마감 6/21(일) 자정. 카톡 https://pf.kakao.com/_nxhDGX/chat
```

### T+1 SMS 영문

```
[Growth Career] Hi {name}, one day after your application. If you have not paid yet, send KRW 880,000 to Toss Bank 1002-4759-1521 (Dropdown). Deadline Sun Jun 21 midnight (KST). KakaoTalk https://pf.kakao.com/_nxhDGX/chat
```

### T+1 Email 한국어

```
Subject: [Growth Career] 입금 안내 다시 보내드려요

{name} 님, 안녕하세요.

Fan to Pro 1기 신청하신지 하루가 지났어요. 입금 아직이시라면 아래 정보로 부탁드려요.

- 수강료 880,000원
- 토스뱅크 1002-4759-1521 (예금주 드롭다운)
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

자리는 입금 확인된 순서대로 확정돼요. 카톡 채널이 편하시면 https://pf.kakao.com/_nxhDGX/chat 로 말씀해 주세요.

Growth Career 운영팀 드림
```

### T+1 Email 영문

```
Subject: [Growth Career] Quick payment reminder

Hi {name},

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
[Growth Career] 마감 3일 전이에요. {name} 님 자리 아직 못 잡았어요. 토스뱅크 1002-4759-1521 (드롭다운) 880,000원 입금 부탁드려요. 마감 6/21 자정. 카톡 https://pf.kakao.com/_nxhDGX/chat
```

### D-3 SMS 영문

```
[Growth Career] 3 days to deadline. Hi {name}, your seat is not locked yet. Toss Bank 1002-4759-1521 (Dropdown), KRW 880,000. Deadline Sun Jun 21 midnight. KakaoTalk https://pf.kakao.com/_nxhDGX/chat
```

### D-3 Email 한국어

```
Subject: [Growth Career] 마감 3일 전 - Fan to Pro 1기

{name} 님,

신청 마감까지 3일 남았어요. 입금이 확인되지 않은 분은 아직 자리가 확정되지 않았어요.

수강료 880,000원
토스뱅크 1002-4759-1521 (드롭다운)
입금자명 {name}
마감 2026년 6월 21일(일) 자정

카톡 채널이 편하시면 https://pf.kakao.com/_nxhDGX/chat 로 말씀해 주세요. 결제 후 24시간 안에 확인 안내 보내드려요.

Growth Career 운영팀 드림
```

### D-3 Email 영문

```
Subject: [Growth Career] 3 days left - Fan to Pro Cohort 1

Hi {name},

3 days left until the application deadline. If we have not received your payment, your seat is not yet locked in.

Tuition KRW 880,000
Toss Bank 1002-4759-1521 (Dropdown)
Depositor name: your full name
Deadline Sun Jun 21 midnight (KST)

KakaoTalk works too: https://pf.kakao.com/_nxhDGX/chat. We send a confirmation within 24 hours of payment.

Growth Career team
```

### D-1 SMS 한국어

```
[Growth Career] 내일 자정 마감이에요. {name} 님 입금 미확인. 토스뱅크 1002-4759-1521 (드롭다운) 880,000원. 마감 후엔 자리 보장 어려워요. 카톡 https://pf.kakao.com/_nxhDGX/chat
```

### D-1 SMS 영문

```
[Growth Career] Deadline tomorrow midnight. Hi {name}, payment not received yet. Toss Bank 1002-4759-1521 (Dropdown), KRW 880,000. After deadline we cannot guarantee your seat. KakaoTalk https://pf.kakao.com/_nxhDGX/chat
```

### D-1 Email 한국어

```
Subject: [Growth Career] 내일 마감 - 마지막 안내

{name} 님,

Fan to Pro 1기 신청 마감이 내일(6/21 일) 자정이에요. 아직 입금이 확인되지 않은 분께 마지막으로 안내드려요.

- 수강료 880,000원
- 토스뱅크 1002-4759-1521 (드롭다운)
- 입금자명 {name}

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 가능하면 마감 전 입금 부탁드려요.

카톡 채널: https://pf.kakao.com/_nxhDGX/chat

Growth Career 운영팀 드림
```

### D-1 Email 영문

```
Subject: [Growth Career] Last day - deadline tomorrow

Hi {name},

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

변경 후: `pending | notified | paid | enrolled | cancelled | refunded`

| status | 의미 | 진입 트리거 |
|---|---|---|
| `pending` | 신청만 들어옴. 운영자 안내 발송 전 | applicants INSERT 직후 |
| `notified` | 노아가 카톡/SMS/이메일 발송 완료 후 dashboard 에서 토글 | 운영자 액션 |
| `paid` | 노아가 입금 확인 후 운영자 페이지에서 토글 | 운영자 액션 |
| `enrolled` | 첫 강의 시작 시점에 paid 전원 일괄 전환 | 운영자 액션 (일괄 버튼) |
| `cancelled` | 마감 후 미입금 또는 신청자 본인 취소 | 운영자 액션 (일괄 또는 row 단위) |
| `refunded` | cancelled 중 환불 완료 처리분 | 운영자 액션 (환불 실행 후) |

### 6.2 신규 컬럼 (단순화)

```sql
-- supabase/migrations/20260605000000_payment_flow_split.sql

-- 1) status 제약 확장
alter table public.applicants
  drop constraint if exists applicants_status_check;

alter table public.applicants
  add constraint applicants_status_check
    check (status in ('pending','notified','paid','enrolled','cancelled','refunded'));

-- 2) 발송 추적 (반자동 - 운영자 토글 시각)
alter table public.applicants
  add column if not exists notified_at         timestamptz,
  add column if not exists reminder_count      integer not null default 0,
  add column if not exists last_reminder_at    timestamptz;

-- 3) 입금 확인
alter table public.applicants
  add column if not exists paid_at                 timestamptz,
  add column if not exists paid_amount_krw         integer,
  add column if not exists depositor_name_observed text,
  add column if not exists paid_confirmed_by       text;

-- 4) cancel / refund
alter table public.applicants
  add column if not exists cancelled_at  timestamptz,
  add column if not exists cancel_reason text,
  add column if not exists refunded_at   timestamptz,
  add column if not exists refund_txn_id text;

-- 5) 인덱스 - dashboard 가시성 보조
create index if not exists applicants_pending_idx
  on public.applicants (created_at)
  where status = 'pending';

create index if not exists applicants_notified_idx
  on public.applicants (notified_at)
  where status = 'notified';
```

### 6.3 호환성

- 기존 `contacted` 사용 row 없음 (확인 필요. 있으면 backfill `notified` 로 변환).
- 기존 `paid`, `enrolled`, `cancelled` row 는 그대로 호환.
- 이전 spec rev 1 의 `payment_guided` 상태 / `payment_guide_*` 컬럼 / `reminder_t1_sent_at` 등은 본 rev 에서 미사용 (애초에 적용 안 했으므로 마이그레이션 불필요).

---

## 7. 운영자 미니 페이지 명세 (확장)

본 spec rev 2 의 가장 큰 작업. 메시지 generate + 1-click 복사 + mailto/sms 링크 + 발송 토글 + 리마인드 강조까지 한 페이지에 박는다.

### 7.1 위치 + 인증

- 라우트: `/admin/applicants`
- 인증: HTTP Basic Auth (middleware/proxy 단). 사용자 = `admin`, 비밀번호 = `ADMIN_BASIC_PASSWORD` env. 1기 한정 충분.
- 향후 (B0002 어드민) 에서 Supabase Auth + role 로 교체 예정.

### 7.2 화면 구성

```
헤더 (sticky)
  총 신청 N건 / pending M / notified P / paid Q / enrolled R / cancelled S
  + 리마인드 필요 카운트 (D-3 미도달 + D-1 미도달 별도 표시)

검색 + 필터
  - 입금자명 / 이름 / 이메일 부분 검색
  - status 필터 (multi-select)
  - 정렬: created_at desc / notified_at desc / paid_at desc

테이블 (콤팩트, 데스크탑 우선)
  Col: created_at | name | email | phone | locale | status | paid_amount | actions

행 단위 시각 강조 (리마인드 알림)
  - status='notified' AND notified_at + 24h < now AND reminder_count = 0  -> 황색
  - status='notified' AND 오늘 >= 6/18 AND reminder_count < 2             -> 주황
  - status='notified' AND 오늘 >= 6/20 AND reminder_count < 3             -> 적색
  - 색상은 row 좌측 4px 보더 + 배경 tint

각 row 액션 (drawer)
  [메시지 생성] 섹션 - 본 페이지의 핵심
    - 채널 선택 토글: 카톡/SMS | 이메일
    - locale 토글: 자동(신청자 locale) | ko | en
    - 메시지 종류 토글: 입금 안내 | 입금 확인 완료 | 리마인드 T+1 | 리마인드 D-3 | 리마인드 D-1
    - 미리보기 textarea (편집 가능, 발송 직전 톤 조정 가능)
    - [클립보드에 복사] 버튼 -> navigator.clipboard.writeText
    - [카톡 채널 열기] 버튼 -> https://pf.kakao.com/_nxhDGX/chat 새 탭
    - [SMS 앱 열기] 버튼 -> sms:{phone}?body={encoded message} (iOS Safari + Android Chrome)
    - [메일 앱 열기] 버튼 -> mailto:{email}?subject={subject}&body={encoded body}

  [상태 변경] 섹션
    - [발송 완료] 토글: 클릭 시 status='notified', notified_at=now() (이미 notified 면 reminder_count + 1, last_reminder_at=now())
    - [입금 완료] 토글: status='paid', paid_amount_krw, depositor_name_observed, paid_at 입력
    - [취소] 버튼: status='cancelled', cancel_reason 입력
    - [환불 완료] 버튼: status='refunded', refund_txn_id 입력
    - notes 인라인 수정

푸터
  - CSV export 버튼 (필터 적용된 결과만)
  - [일괄 전환] dropdown
    - "마감 후 24h grace 만료 - 미입금자 일괄 cancelled"
    - "첫 강의 시작 - paid 전원 enrolled 전환"
```

### 7.3 서버 액션

```typescript
// /admin/applicants 의 인라인 액션은 모두 server actions:
// - markAsNotified(id)  // status pending -> notified, notified_at = now()
// - sendReminder(id)    // status notified 유지, reminder_count += 1, last_reminder_at = now()
// - markAsPaid(id, { amount, depositor, paidAt })
// - markAsCancelled(id, { reason })
// - markAsRefunded(id, { txnId })
// - updateNotes(id, notes)
// - exportCsv(filters)
// - bulkExpireGrace()   // status notified -> cancelled WHERE 마감 + 24h 경과
// - bulkLockEnrolled()  // status paid -> enrolled
```

### 7.4 메시지 generate 구현 노트

- 템플릿은 `src/programs/fan-to-pro/messages/templates.ts` 하나에 한·영 8 + 12 = 20개 string export.
- 플레이스홀더는 `{name}`, `{email}`, `{phone}` 만. 운영자 페이지에서 `applicant` row 로 단순 string replace.
- `mailto:` 와 `sms:` body 는 `encodeURIComponent` 필수.
- mailto body 의 줄바꿈은 `%0A` 로 인코딩. 일부 메일 클라이언트 본문 한계 (약 2000자) 고려하여 이메일 본문은 가급적 짧게.
- locale 자동 감지: `applicant.locale` 컬럼 사용 (B0006 영문 디폴트화에서 추가됨). 없으면 한국어 fallback.
- 복사 버튼은 `try/catch` 로 fallback (구식 브라우저에서 textarea select 방식).

### 7.5 운영 워크플로우 (노아 기준)

1. dashboard 접속 -> pending 신청자 보임 -> drawer 열기
2. 메시지 generate 섹션에서 "입금 안내" + 카톡/SMS 선택 -> 본문 자동 채워짐
3. [클립보드 복사] -> 카톡 채널 열기 또는 SMS 앱 열기로 붙여넣고 발송
4. 이메일도 같은 본문 -> mailto 클릭 -> 기본 메일 앱 열림 -> send
5. dashboard 로 돌아와서 [발송 완료] 토글 -> status='notified', notified_at 자동 기록
6. (1~2일 후) 토스뱅크 입금 확인 시 [입금 완료] 토글 -> "입금 확인 완료" 메시지 같은 방식으로 발송
7. dashboard 헤더에서 "리마인드 필요" 카운트 보이면 적색 row 별로 리마인드 메시지 generate 후 발송 -> [발송 완료] 다시 클릭하면 reminder_count + 1
8. 마감 + 24h 지나면 푸터 [일괄 cancelled] 버튼 클릭
9. 6/27 새벽에 [일괄 enrolled] 버튼 클릭

### 7.6 빌드 비용 추정

약 8시간. shadcn `<Table>` `<Sheet>` (drawer) `<Tabs>` `<Textarea>` `<Button>` `<Badge>` 활용. 별도 디자인 X.

---

## 8. (이전 §8 인프라 통합 - 삭제됨)

본 rev 2 에서 NaverCloud SENS, Resend, Vercel Cron 모두 제거. 추가 환경 변수는 다음 하나뿐.

```
ADMIN_BASIC_PASSWORD=
```

`CRON_SECRET`, `NAVER_SENS_*`, `RESEND_*` 환경 변수는 본 spec 범위에서 필요 없음 (다른 작업에서 도입할 가능성은 별개).

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

- 본 spec 의 모든 메시지 = **거래 메시지** (입금 안내 + 입금 확인 + 강의 안내 + 리마인드). 정보통신망법 §50 적용 X.
- 신청자가 `consent_marketing=true` 인 경우만 별도 마케팅 발송 가능 (본 spec 범위 밖).
- 노아가 본인 카톡/SMS/이메일로 보내므로 발신번호 등록·표기 의무 적용 X (개인 → 개인 발송). 다만 카톡 채널 1:1 발송은 비즈채널 정책에 따름 (현재 채널 운영 상태 그대로).

### 9.4 약관 본문 영향

영향 0. `REFUND_POLICY` 와 `/terms` 페이지는 건드리지 않는다.

마케팅/컨펌 모달의 "마감 전 100% 환불, 마감 후 강좌 취소 시 환불" 단순화 메시지는 약관 본문의 상세 표를 대체하지 않고 **요약 + 약관 링크** 로 처리. 분쟁 시 약관 본문이 우선.

### 9.5 영수증 발급

수강료 880,000원에 대한 현금영수증 발급 의무 (10만원 초과). 노아가 토스뱅크 입금 확인 후 별도 발급. 본 spec 의 자동화 범위 밖. 추후 운영자 페이지 v0.2 에 통합 검토 (B0002 에 포함).

---

## 10. 작업 분해 (Tasks)

| ID | 작업 | 담당 | 의존 | 소요 | 검증 기준 |
|---|---|---|---|---|---|
| T2 | DB 마이그레이션 (status 확장 + 신규 컬럼 단순화) | Iris | - | 1h | supabase-verify.mjs 통과, status=notified 사용 가능 |
| T3 | 컨펌 모달 UI 컴포넌트 (ko/en) | Luna | - | 4h | preview 캡처 모바일 + 데스크탑 ko/en 4종 |
| T4 | submitApplication 액션 수정 (status='pending' INSERT) | Iris | T2 | 1h | unit test - status='pending' 값 확인 |
| T7 | 운영자 미니 페이지 `/admin/applicants` 확장 (메시지 generate + 복사 + mailto + sms 링크 + 상태 토글 + 리마인드 강조) | Luna | T2 | 8h | basic auth 통과 + 메시지 generate 8종 동작 + 복사 동작 + mailto/sms 링크 OS 별 동작 + 토글 -> DB 반영 + 리마인드 색상 강조 |
| T8 | 운영자 server actions (markAsNotified, sendReminder, markAsPaid, markAsCancelled, markAsRefunded, updateNotes, exportCsv) | Iris | T7 | 2h | 각 액션 호출 시 DB 컬럼 정확히 반영 |
| T10 | 일괄 액션 (bulkExpireGrace, bulkLockEnrolled) + CSV export | Iris | T8 | 1h | dry-run 통과 + CSV 다운로드 결과가 dashboard 필터와 일치 |
| T11 | Mira QA 시나리오 5종 (신청 -> 컨펌 모달 -> pending -> 메시지 generate -> 복사 -> 발송 토글 -> notified -> paid -> enrolled, 리마인드 발송 카운트, grace 만료 일괄 cancelled, mailto/sms 실제 OS 검증, 빈 신청자 dashboard) | Mira | T2 ~ T10 all | 4h | 모든 시나리오 통과 + 캡처 |
| T12 | Sage 보안 검토 (Basic Auth 강도, admin 경로 노출, mailto/sms 링크의 XSS, CSV PII 마스킹) | Sage | T7 T10 | 1h | 통과 의견 + 발견사항 spec 에 반영 |

이전 spec rev 1 에서 제거된 작업:
- ~~T0 NaverCloud SENS 발신번호 등록~~ 인프라 미사용
- ~~T1 Resend 도메인 인증~~ 인프라 미사용
- ~~T5 자동 발송 워커~~ 발송 자체 수동
- ~~T6 INSERT 직후 fire-and-forget trigger~~ 발송 자체 수동
- ~~T9 리마인드 cron~~ dashboard 강조 + 운영자 수동

총 소요: 약 21h. critical path 1.5 일 wallclock (T2 -> T4 -> T7 -> T8 -> T10 -> T11 -> T12).

### 일정 가드 (단축됨)

| 마일스톤 | 날짜 | 도달 조건 |
|---|---|---|
| M2 코어 (컨펌 모달 + DB + submit 액션) | 2026-06-06 (금) | T2 T3 T4 완료 |
| M3 운영자 페이지 확장 (메시지 generate + 액션 + 일괄) | 2026-06-07 (토) | T7 T8 T10 완료 |
| M4 QA + 보안 + 배포 | 2026-06-08 (일) | T11 T12 통과 -> Vera 배포 |
| M5 첫 발송 (운영자가 첫 신청자에게 메시지 보냄) | 2026-06-09 (월) | M4 배포 + 실 신청자 1명 이상 |

이전 M1 (인프라 준비) 삭제. SENS 심사 critical path 사라짐.

### Plan B 게이트

없음. 반자동 발송으로 전환했으므로 외부 의존성 critical path 자체가 없음.

---

## 11. Done When

다음 9개 모두 충족 시 spec 완료.

1. supabase migration 적용 -> `status` enum 6종 (pending/notified/paid/enrolled/cancelled/refunded) 모두 사용 가능
2. 컨펌 모달이 폼 step 2 후 정상 표시 (ko/en 양 locale, 모바일 + 데스크탑)
3. 신청 INSERT 직후 status='pending' 확인 + 완료 화면에 계좌번호 미노출 + 안내 도착 예고 표시
4. `/admin/applicants` 진입 시 basic auth 프롬프트 -> 통과 시 신청자 리스트 로드
5. drawer 의 메시지 generate 섹션에서 채널·locale·종류 토글에 따라 본문 8종 (입금안내 + 입금확인 + 3개 리마인드) 정확히 생성
6. [클립보드 복사] -> 실제 클립보드에 본문 들어감 (Mira 가 paste 로 확인)
7. [SMS 앱 열기] -> 모바일에서 sms 앱이 미리 채워진 본문으로 열림 (iOS + Android 둘 다)
8. [메일 앱 열기] -> mailto 링크가 기본 메일 클라이언트 열고 to/subject/body 자동 채워짐
9. 운영자 토글 5종 (markAsNotified, sendReminder, markAsPaid, markAsCancelled, markAsRefunded) + 일괄 액션 2종 (bulkExpireGrace, bulkLockEnrolled) DB 반영 정확
10. 리마인드 강조 색상 4종 (정상, 황색 T+1, 주황 D-3, 적색 D-1) dashboard 표시 + 헤더 카운트 정확
11. Mira 5종 시나리오 + Sage 보안 검토 PASS

---

## 12. Risks + Mitigation

| 리스크 | 영향 | 확률 | 완화책 |
|---|---|---|---|
| **노아 1인 수동 발송 부담** (30명 x 평균 3회 = 약 90회 over 18일) | 발송 지연 -> 신청자 컨펌 지연 -> conversion 손실 | 중 | dashboard 의 [복사] + mailto/sms 링크로 발송 1건당 1분 미만. 색상 강조로 우선순위 가시화. 헤더 카운트로 "오늘 처리할 양" 즉시 인지. 1건당 평균 30초 ~ 1분 가정 시 90회 = 약 45 ~ 90분 누적 |
| **단일 발송 실패 시 누락** (노아가 [발송 완료] 토글만 누르고 실제 발송 안 함) | 신청자가 안내 못 받고 cancelled 됨 | 중 | dashboard 측 안전장치: notified_at 후 N 시간 내 paid 안 되면 자동 강조 (T+1 황색). 노아가 한 번 더 점검 가능. + 카톡 채널로 신청자가 자발적으로 문의해도 폴백 가능 (B0008 도입됨) |
| **mailto/sms 링크가 OS 별로 다르게 동작** | 일부 환경에서 메일 앱 안 열림 | 낮음 | Mira QA 시나리오에 iOS Safari + Android Chrome + macOS Mail + Gmail 웹 4종 검증. 실패 시 [복사] 폴백 안내 |
| **운영자 페이지 basic auth 우회** | 신청자 PII 노출 | 낮음 | proxy 단 basic auth + admin 경로 robots.txt disallow + Sage 검토. 비밀번호는 16자 이상 random |
| **카톡 채널 1:1 발송 한도** (카카오 채널 정책상 1:1 채팅 발송 본인 메시지 수 제한 가능) | 일부 발송 막힘 | 낮음 | 1기 30명 규모로는 무관. 2기 확장 시 별도 검토 |
| **신청자가 한 번에 폭주** (마감 직전 spike) | 노아 발송 지연 누적 | 중 | dashboard 헤더 카운트로 즉시 인지 + D-3/D-1 시점 미리 작업 분산 + 카톡 채널로 신청자 self-service 폴백 |
| **CSV export 에 비자 정보 등 PII 포함** | 운영자 디바이스에 PII 유출 | 중 | 다운로드 시 confirm + 파일명에 timestamp + 7일 retention 권장 (운영 매뉴얼). Sage 가 마스킹 정책 검토 |
| **노아 1인 운영 부담 (전체)** | 입금 확인 지연 + 발송 지연 | 중 | 운영자 페이지 단순화 UI + 색상 강조 + 일괄 액션으로 작업 1건당 시간 최소화 |

이전 rev 1 에서 제거된 리스크:
- ~~NaverCloud SENS 발신번호 심사 지연~~ 인프라 미사용
- ~~Resend 도메인 인증 실패~~ 인프라 미사용
- ~~SMS LMS spam filter~~ 인프라 미사용
- ~~자동 발송 워커 실패가 신청을 실패시킴~~ 발송 자체 수동
- ~~cron timezone 오류~~ cron 미사용
- ~~23:00 야간 발송 정보통신망법 §50~~ 운영자 본인 카톡/SMS 로 발송

---

## 13. Sources

- 2026-06-04 Cowork 미팅 §13 (docs/research/cowork-partnership-tracking.md)
- 2026-06-04 노아 결정 변경 (rev 2 반자동 발송 전환)
- B0005 1기 일정 + ENROLLMENT_CAP (src/programs/fan-to-pro/domain/program.ts)
- 기존 REFUND_POLICY (학원법 시행령 별표 4 + 공정위 소비자분쟁해결기준)
- 정보통신망법 §50 (영리목적 광고성 정보 전송)
- 전자상거래법 §17 (청약철회권 7일)
- ADR 0003 rev 2 (반자동 발송 결정 사유)
- MDN mailto: + sms: URI scheme + navigator.clipboard.writeText

---

## 14. Open Questions

본 spec 시점에 노아 결정 다 확정. 구현 단계에서 다음만 후속 결정:

- 운영자 페이지 URL: `/admin/applicants` 확정 vs 추측 어려운 path (`/ops/x9k2/applicants` 등) 검토 (Sage)
- CSV export 의 PII 컬럼 마스킹 정책 (Sage 코멘트 받아 결정)
- 이메일 발송 시 노아 본인 발신 계정 확정 (개인 Gmail vs Dropdown 도메인 메일). 본 spec 의 mailto: 는 기본 메일 클라이언트에 위임하므로 코드 영향 없음. 운영 매뉴얼에 권장 발신 계정만 기록
