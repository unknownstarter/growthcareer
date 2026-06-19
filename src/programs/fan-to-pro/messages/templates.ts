/**
 * 운영자 페이지 메시지 generate 템플릿 (B0007 T7).
 *
 * 8 + 12 = 20 string. 모두 plain text. 부호 규칙 (CLAUDE.md §6.5):
 *   em dash 0, en dash 0, 인터펑크 0, 곡선 따옴표 0, 단일 ellipsis 0.
 *
 * 플레이스홀더는 {name} 만. 운영자 페이지가 applicant.name 으로 단순 string replace.
 * mailto / sms body 는 호출부에서 encodeURIComponent 처리.
 *
 * 카톡/SMS 본문에 한해 이모지(💰🏦📅) 허용 — 사용자가 받을 메시지의 가독성.
 */

export type MessageLocale = "ko" | "en";
export type MessageKind =
  | "paymentGuide"
  | "paymentConfirmed"
  | "reminderT1"
  | "reminderD3"
  | "reminderD1"
  | "referralInvite";
export type MessageChannel = "sms" | "email";

/**
 * paymentGuide 만 비자 보유 여부에 따라 본문이 분기됨.
 * 다른 kind 는 hasVisa 무시.
 *
 * - hasVisa=true: 일반 입금 안내 + 비자/오프라인 출석 확인 reminder 1줄
 * - hasVisa=false: 입금 안내 전에 (1) 한국 오프라인 출석 가능 (2) 공연 프로젝트
 *   유급 참여 불가 두 가지 명시 확인 요청. "확인했습니다" 답장 받은 뒤 입금 진행.
 */
export type MessageOptions = {
  hasVisa?: boolean;
};

const KAKAO = "https://pf.kakao.com/_nxhDGX/chat";
const ACCOUNT = "토스뱅크 1002-4759-1521";
const ACCOUNT_EN = "Toss Bank 1002-4759-1521";
const HOLDER_KO = "드롭다운";
const HOLDER_EN = "Dropdown";
const TUITION_KO = "880,000원";
const TUITION_EN = "KRW 880,000";
const DEADLINE_KO = "6/21(일) 자정";
const DEADLINE_EN = "Sun Jun 21 midnight (KST)";

function fill(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

/* ---------------------------------------------------------------------------
 * 4.1 ~ 4.4 입금 안내 (paymentGuide)
 *
 * 노아 톤 가이드 (2026-06-12):
 *   - "1기" 표현 제거
 *   - 인사말 "안녕하세요, Fan to Pro 입니다 :)"
 *   - 선착순 + 비자 + 오프라인 강의 확인 reminder
 *   - 입금 후 첫 강의 안내 발송 + 카톡 채널 문의 유도
 *   - 마무리 "Fan to Pro 운영진 드림"
 *
 * 비자 없음 (visa = "기타/없음" 또는 null) 분기:
 *   - 공연 프로젝트 유급 참여 불가 명시
 *   - 한국 오프라인 강의만 제공 명시
 *   - "확인했습니다" 답장 받은 후 입금 진행
 * ------------------------------------------------------------------------- */

const paymentGuide_sms_ko = `[Fan to Pro] {name} 님 신청 감사드려요 :)
다음과 같이 입금 정보를 알려드리니
확인해주세요.

[입금 안내]
수강료 ${TUITION_KO}
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
입금자명 {name}
마감 ${DEADLINE_KO}

자리는 입금 확인 순으로 확정돼요 (선착순).
비자 보유 + 한국 오프라인 강의 참석 가능 여부 꼭 재확인 부탁드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const paymentGuide_sms_en = `[Fan to Pro] Hi {name}, thanks for applying.
Please review your payment details below.

[PAYMENT]
Tuition ${TUITION_EN}
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Depositor {name}
Deadline ${DEADLINE_EN}

Seats lock in payment order.
Please reconfirm your visa and ability to attend offline in Seoul.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const paymentGuide_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님의 수강 신청에 감사드려요.
다음과 같이 입금 정보를 알려드리니
확인해주세요.

(입금 완료가 되어야 수강신청이 완료되고, 선착순이니 참고 부탁드려요. 또한 비자 보유, 한국 오프라인 강의에 참석 가능하신지 꼭 다시 확인해주세요.)

[입금 정보]
- 수강료: ${TUITION_KO} (원가 1,100,000원에서 20% 할인)
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name} 으로 입금 부탁드려요
- 마감: 2026년 6월 21일(일) 자정

입금이 확인되면 첫 강의와 관련한 안내 문자와 메일이 발송됩니다.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const paymentGuide_email_en = `Hello, this is Fan to Pro.

Thank you for applying, {name}.
Please review your payment details below.

A quick note before you transfer: your seat is only locked in once we receive payment, and seats are filling on a first-come, first-served basis. Please also reconfirm that you (a) hold a valid Korean residence visa and (b) can attend in person in Seoul every Saturday and Sunday for the full 4-week program.

[PAYMENT]
- Tuition: ${TUITION_EN} (20% off from the regular KRW 1,100,000)
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: ${"{name}"}
- Deadline: Sunday, June 21, midnight (KST)

Once your payment is verified, we will send the first-class details by text and email.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

/* paymentGuide - 비자 없음 분기 (visa = "기타/없음" 또는 null) */

const paymentGuide_sms_ko_noVisa = `[Fan to Pro] {name} 님 신청 감사드려요 :)

신청서 비자가 "기타/없음" 으로 되어 있어 입금 전 두 가지 확인 부탁드려요.

(1) 강남역 오프라인 강의 4주 토/일 출석 가능 여부
(2) 수료 후 K팝 공연 유급 참여는 비자 보유자만 가능 (비자 없으면 강의는 OK 지만 공연 단계는 불가)

두 가지 확인하셨고 그래도 수강 원하시면 "확인" 답장 부탁드려요.
답장 후 입금 정보 안내드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const paymentGuide_sms_en_noVisa = `[Fan to Pro] Hi {name}, thanks for applying.

Your form lists "other/none" for visa, so please confirm two things before we send payment details.

(1) Can you attend offline in Seoul (Gangnam) every Sat/Sun for 4 weeks?
(2) The paid K-pop concert role after the program requires a Korean visa that allows paid work. Without one, you can attend class but not the concert role.

If both confirmed, reply "confirmed" and we will send the payment details.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const paymentGuide_email_ko_noVisa = `안녕하세요, Fan to Pro 입니다 :)

{name} 님의 수강 신청에 감사드려요. 신청서에 비자 상태가 "기타/없음" 으로 작성되어 있어, 입금 안내 전에 두 가지 꼭 확인 부탁드릴 게 있어요.

(1) Fan to Pro 는 한국 오프라인 강의만 제공하고 있어요. 4주 동안 강남역 부근 강의실에 매주 토/일 직접 오실 수 있는 상태인지 확인 부탁드려요.

(2) 수료 후 이어지는 K팝 공연 프로젝트 유급 참여 기회는 한국에서 합법적으로 영리 활동이 가능한 비자 보유자만 참여 가능해요. 비자가 없거나 관광/단기 비자라면 수강은 가능하지만, 공연 프로젝트 단계에는 참석이 어려운 점 미리 안내드려요.

위 두 가지 모두 확인하셨고 그래도 수강을 원하시면, 이 메일에 "확인했습니다" 라고 짧게 답장 부탁드려요. 답장이 확인되면 아래 입금 정보로 안내드려요.

[입금 정보 - 확인 답장 후 적용]
- 수강료: ${TUITION_KO}
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

비자 상태가 바뀌었거나 다른 비자를 보유하고 계셨다면 그것도 함께 알려주세요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const paymentGuide_email_en_noVisa = `Hello, this is Fan to Pro.

Thank you for applying, {name}. Before we send you the payment details, please confirm two things, because your application listed "other / none" for visa status.

(1) Fan to Pro is taught fully offline in Seoul (near Gangnam Station). Please confirm you can attend in person every Saturday and Sunday for the full 4-week program.

(2) The paid K-pop concert project after the program is only available to those who hold a Korean visa that allows paid side work. If you do not currently hold an eligible visa, you may still attend the class, but you will not be able to take part in the paid concert role.

If you have confirmed both points and still want to proceed, please reply to this email with "confirmed" and we will send the payment details. If your visa status has changed or was filled in incorrectly, please let us know in your reply.

[PAYMENT - sent after your confirmation reply]
- Tuition: ${TUITION_EN}
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: ${"{name}"}
- Deadline: Sunday, June 21, midnight (KST)

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const paymentGuide_email_subject_ko = "[Fan to Pro] 입금 안내 드려요";
const paymentGuide_email_subject_en = "[Fan to Pro] Payment Guide";
const paymentGuide_email_subject_ko_noVisa =
  "[Fan to Pro] 신청 확인 부탁드려요 (비자 / 오프라인 강의)";
const paymentGuide_email_subject_en_noVisa =
  "[Fan to Pro] Quick confirmation needed before payment details";

/* ---------------------------------------------------------------------------
 * 4.5 ~ 4.8 입금 확인 완료 (paymentConfirmed) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const paymentConfirmed_sms_ko = `[Fan to Pro] {name} 님 입금 확인 완료 :)

[자리 확정]
첫 강의: 6/27(토)

[다음 안내]
6/21(일) 모집 마감 이후, 강의장 주소 / 준비물 / 카톡 오픈채팅 초대 등 자세한 안내 메일을 별도로 보내드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const paymentConfirmed_sms_en = `[Fan to Pro] Hi {name}, payment confirmed.

[SEAT LOCKED]
First class: Sat Jun 27

[NEXT GUIDE]
After the application deadline (Sun Jun 21), we will send a separate guide email with the venue, what to bring, KakaoTalk open chat invitation, and more.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const paymentConfirmed_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 입금 확인이 완료됐어요. 자리가 확정됐습니다.

[첫 강의 안내]
- 일시: 2026년 6월 27일(토)

[다음 안내]
6월 21일(일) 모집 마감 이후, 강의장 주소 / 준비물 / 수강생 카카오톡 오픈채팅 초대 링크 등 자세한 안내 메일을 별도로 보내드려요.

환불이 필요하면 마감 전(6/21 자정) 까지는 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해주세요.
https://growthcareer.xyz/terms

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const paymentConfirmed_email_en = `Hello, this is Fan to Pro.

Hi {name}, your payment has been confirmed. Your seat is locked in.

[FIRST CLASS]
- Date: Saturday, June 27, 2026

[NEXT GUIDE]
After the application deadline (Sunday, June 21), we will send a separate guide email with the venue, what to bring, the student KakaoTalk open chat invitation, and more.

If you need a refund, 100% refund is available any time before the deadline (Sun Jun 21 midnight KST). Refund policy after that: https://growthcareer.xyz/terms

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const paymentConfirmed_email_subject_ko =
  "[Fan to Pro] 입금 확인 완료 / 자리 확정";
const paymentConfirmed_email_subject_en =
  "[Fan to Pro] Payment Confirmed / Seat Locked";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - T+1 (reminderT1) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderT1_sms_ko = `[Fan to Pro] {name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요 :)

자리는 입금 확인 순으로 확정돼요 (선착순).

[입금 정보]
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}
마감 ${DEADLINE_KO}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderT1_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

Seats are locked in payment order.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}
Deadline ${DEADLINE_EN}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderT1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

자리는 입금 확인 순으로 확정되니, 아직 입금 전이시라면 아래 정보로 부탁드려요.

[입금 정보]
- 수강료: ${TUITION_KO}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderT1_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

Seats are locked in payment order. If you have not paid yet, here is the info again.

[PAYMENT]
- Tuition: ${TUITION_EN}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name from the form
- Deadline: Sunday, June 21, midnight (KST)

If you have already paid, please disregard this message.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const reminderT1_email_subject_ko = "[Fan to Pro] 혹시 입금을 잊으신 건 아닐까요?";
const reminderT1_email_subject_en = "[Fan to Pro] Friendly payment reminder";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-3 (reminderD3) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderD3_sms_ko = `[Fan to Pro] {name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요 :)

신청 마감일이 다가오고 있어요. 입금이 확인되면 자리가 확정돼요.

[입금 정보]
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}
마감 ${DEADLINE_KO}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderD3_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

The application deadline is approaching. Your seat is locked in once payment is confirmed.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}
Deadline ${DEADLINE_EN}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderD3_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

신청 마감일이 다가오고 있어요. 입금이 확인되면 자리가 확정되니, 아직 입금 전이시라면 아래 정보로 부탁드려요.

[입금 정보]
- 수강료: ${TUITION_KO}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

결제 후 24시간 안에 확인 안내 보내드려요. 이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD3_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

The application deadline is approaching. Your seat is locked in once payment is confirmed.

[PAYMENT]
- Tuition: ${TUITION_EN}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name
- Deadline: Sunday, June 21, midnight (KST)

We send a confirmation within 24 hours of payment. If you have already paid, please disregard this message.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const reminderD3_email_subject_ko = "[Fan to Pro] 혹시 입금을 잊으신 건 아닐까요?";
const reminderD3_email_subject_en = "[Fan to Pro] Friendly payment reminder";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-1 (reminderD1) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderD1_sms_ko = `[Fan to Pro] {name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요 :)

신청 마감이 내일(6/21 일) 자정이에요. 자리 확정을 원하시면 마감 전에 입금 부탁드려요.

[입금 정보]
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderD1_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

The application deadline is tomorrow (Sun Jun 21) at midnight (KST). If you would like to lock in your seat, please send payment before then.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderD1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

신청 마감이 내일(6/21 일) 자정이에요. 자리 확정을 원하시면 마감 전에 입금 부탁드려요.

[입금 정보]
- 수강료: ${TUITION_KO}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD1_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

The application deadline is tomorrow (Sun Jun 21) at midnight (KST). If you would like to lock in your seat, please send payment before then.

[PAYMENT]
- Tuition: ${TUITION_EN}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name
- Deadline: Sun Jun 21 midnight (KST)

After the deadline, we will process any late payments within 24 hours if seats remain, and auto-refund if no seat is available. If you have already paid, please disregard this message.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const reminderD1_email_subject_ko = "[Fan to Pro] 혹시 입금을 잊으신 건 아닐까요?";
const reminderD1_email_subject_en = "[Fan to Pro] Friendly payment reminder";

/* ---------------------------------------------------------------------------
 * 6. 친구초대 이벤트 (referralInvite) — paid 수강생 전용
 *
 * 약관 §15 (추천 보상 정책) 기반. 추천인 50,000원 보상 + 피추천인 50,000원
 * 할인. 1인당 1회. 친구 결제 + 청약철회 7일 경과 후 송금.
 * ------------------------------------------------------------------------- */

const referralInvite_sms_ko = `[Fan to Pro] 친구 초대 이벤트!

{name} 님, 함께 K엔터 직무를 배우고 싶은 친구가 있다면 추천하고 혜택 받아요~ :)

[추천 혜택]
- {name} 님: 추천한 친구가 결제 완료 시 50,000원 보상 (계좌 송금)
- 친구: 수강료 50,000원 할인 (실 결제 830,000원)

[매칭 방법]
친구분이 수강 신청 후 받게 되는 결제 안내 문자 또는 이메일에 답장으로 추천인({name} 님)의 정확한 성과 이름을 적어서 보내주시면 추천 완료예요.

* 정확한 한글 또는 영문 성명 (신청서 또는 결제자명과 일치)
* 추천 1인당 최대 5명까지 가능

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const referralInvite_sms_en = `[Fan to Pro] Friend referral event!

Hi {name}, if you know any friends who want to learn K-entertainment work with you, invite them and earn a reward :)

[REFERRAL REWARDS]
- You: KRW 50,000 reward when your friend completes payment (transferred to your bank account)
- Your friend: KRW 50,000 tuition discount (final payment KRW 830,000)

[HOW TO MATCH]
Once your friend applies, they will receive a payment guide (SMS or email). When they reply to that message with your full name (first and last), the referral is complete.

* The name must match the application or payment record exactly (Korean or English).
* Each referrer can invite up to 5 friends.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const referralInvite_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 친구 초대 이벤트 안내드려요.

함께 K엔터 직무를 배우고 싶은 친구가 있다면 추천하고 혜택을 받아요~

[추천 혜택]
- {name} 님: 추천하신 친구가 결제 완료하시면 추천 보상 50,000원을 {name} 님이 지정하신 계좌로 송금해드려요.
- 추천받은 친구: 수강료 50,000원 할인 (실 결제 830,000원) 적용해드려요.

[매칭 방법]
친구분이 수강 신청을 완료하시면 결제 안내 문자 또는 이메일을 받으시게 돼요. 친구분이 그 메시지에 답장으로 추천인({name} 님)의 정확한 성과 이름을 적어 보내주시면 추천이 완료됩니다.

[유의 사항]
- 추천인 성명은 친구분의 신청서 또는 결제자명과 정확히 일치하는 한글 또는 영문 성명이어야 합니다.
- 추천 보상은 추천인 1인당 최대 5명까지 가능합니다.
- 본 이벤트의 자세한 정책은 약관 §15 (추천 보상 정책) 을 참고해주세요.
https://growthcareer.xyz/terms

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const referralInvite_email_en = `Hello, this is Fan to Pro.

Hi {name}, here is our friend referral event.

If you know any friends who want to learn K-entertainment work with you, invite them and earn a reward.

[REFERRAL REWARDS]
- You: a KRW 50,000 reward, transferred to a bank account you designate, after your friend completes payment.
- Your friend: a KRW 50,000 tuition discount (final payment KRW 830,000).

[HOW TO MATCH]
Once your friend completes the application, they will receive a payment guide (SMS or email). When they reply to that message with your full name (first and last), the referral is complete.

[NOTES]
- The referrer's name must match the friend's application or payment record exactly (Korean or English).
- Each referrer can invite up to 5 friends.
- Full policy details are in our Terms of Service §15 (Referral reward policy).
https://growthcareer.xyz/terms

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const referralInvite_email_subject_ko = "[Fan to Pro] 친구초대 이벤트 안내";
const referralInvite_email_subject_en = "[Fan to Pro] Friend referral event";

/* ---------------------------------------------------------------------------
 * 통합 매핑
 * ------------------------------------------------------------------------- */

type Template = {
  sms: { ko: string; en: string };
  email: {
    subject: { ko: string; en: string };
    body: { ko: string; en: string };
  };
};

const TEMPLATES: Record<MessageKind, Template> = {
  paymentGuide: {
    sms: { ko: paymentGuide_sms_ko, en: paymentGuide_sms_en },
    email: {
      subject: {
        ko: paymentGuide_email_subject_ko,
        en: paymentGuide_email_subject_en,
      },
      body: { ko: paymentGuide_email_ko, en: paymentGuide_email_en },
    },
  },
  paymentConfirmed: {
    sms: { ko: paymentConfirmed_sms_ko, en: paymentConfirmed_sms_en },
    email: {
      subject: {
        ko: paymentConfirmed_email_subject_ko,
        en: paymentConfirmed_email_subject_en,
      },
      body: { ko: paymentConfirmed_email_ko, en: paymentConfirmed_email_en },
    },
  },
  reminderT1: {
    sms: { ko: reminderT1_sms_ko, en: reminderT1_sms_en },
    email: {
      subject: {
        ko: reminderT1_email_subject_ko,
        en: reminderT1_email_subject_en,
      },
      body: { ko: reminderT1_email_ko, en: reminderT1_email_en },
    },
  },
  reminderD3: {
    sms: { ko: reminderD3_sms_ko, en: reminderD3_sms_en },
    email: {
      subject: {
        ko: reminderD3_email_subject_ko,
        en: reminderD3_email_subject_en,
      },
      body: { ko: reminderD3_email_ko, en: reminderD3_email_en },
    },
  },
  reminderD1: {
    sms: { ko: reminderD1_sms_ko, en: reminderD1_sms_en },
    email: {
      subject: {
        ko: reminderD1_email_subject_ko,
        en: reminderD1_email_subject_en,
      },
      body: { ko: reminderD1_email_ko, en: reminderD1_email_en },
    },
  },
  referralInvite: {
    sms: { ko: referralInvite_sms_ko, en: referralInvite_sms_en },
    email: {
      subject: {
        ko: referralInvite_email_subject_ko,
        en: referralInvite_email_subject_en,
      },
      body: { ko: referralInvite_email_ko, en: referralInvite_email_en },
    },
  },
};

/* paymentGuide 의 비자 없음 분기 lookup. paymentGuide 만 적용. */
const PAYMENT_GUIDE_NO_VISA = {
  sms: { ko: paymentGuide_sms_ko_noVisa, en: paymentGuide_sms_en_noVisa },
  email: {
    subject: {
      ko: paymentGuide_email_subject_ko_noVisa,
      en: paymentGuide_email_subject_en_noVisa,
    },
    body: { ko: paymentGuide_email_ko_noVisa, en: paymentGuide_email_en_noVisa },
  },
} as const;

/** SMS / 카톡 본문 — 채널 단일. */
export function getSmsBody(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
  options?: MessageOptions,
): string {
  if (kind === "paymentGuide" && options?.hasVisa === false) {
    return fill(PAYMENT_GUIDE_NO_VISA.sms[locale], name);
  }
  return fill(TEMPLATES[kind].sms[locale], name);
}

/** 이메일 제목. */
export function getEmailSubject(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
  options?: MessageOptions,
): string {
  if (kind === "paymentGuide" && options?.hasVisa === false) {
    return fill(PAYMENT_GUIDE_NO_VISA.email.subject[locale], name);
  }
  return fill(TEMPLATES[kind].email.subject[locale], name);
}

/** 이메일 본문. */
export function getEmailBody(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
  options?: MessageOptions,
): string {
  if (kind === "paymentGuide" && options?.hasVisa === false) {
    return fill(PAYMENT_GUIDE_NO_VISA.email.body[locale], name);
  }
  return fill(TEMPLATES[kind].email.body[locale], name);
}

/**
 * applicant 의 locale 을 추정. DB 에 `locale` 컬럼이 추가되면 그걸 신뢰하고,
 * 아직 없으면 전화번호 prefix (+82 시작) 기준 어림. 운영자 페이지의 자동 토글용.
 */
export function guessLocaleFromPhone(phone: string | null): MessageLocale {
  if (!phone) return "ko";
  const normalized = phone.replace(/[\s\-()]/g, "");
  if (normalized.startsWith("+82") || normalized.startsWith("010")) return "ko";
  if (normalized.startsWith("+")) return "en";
  return "ko";
}

/**
 * applicant.visa 값 기준으로 "비자 보유자" 여부 판단.
 *
 * - D-2 / D-4 / D-10 / E-7 / F-2 / F-4 / F-6: 비자 있음 (true)
 * - "기타/없음" 또는 null: 비자 없음 (false)
 *
 * paymentGuide 메시지 분기에 사용. 다른 kind 는 영향 없음.
 */
export function hasEligibleVisa(visa: string | null): boolean {
  if (!visa) return false;
  if (visa === "기타/없음") return false;
  return true;
}

/**
 * mailto: / sms: URI builder.
 * RFC 6068 / 5724 호환. Subject + body 는 반드시 encodeURIComponent.
 */
export function buildMailtoUrl(
  email: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);
  // URLSearchParams 는 공백을 + 로 인코딩하므로 mailto 안전성을 위해 %20 으로 교체.
  const query = params.toString().replaceAll("+", "%20");
  return `mailto:${encodeURIComponent(email)}?${query}`;
}

/**
 * nationality 텍스트 (자유 입력) → ITU country calling code 매핑.
 *
 * 사용자가 한글/영문 어느 쪽으로 입력하더라도 처리 가능하도록 양쪽 키 보유.
 * partial match (lowercase contains) 까지 지원해서 "South Korea", "Republic of
 * India" 같은 변형도 잡힘.
 *
 * 매핑 못 한 경우 null 반환. 호출부는 그대로 raw 번호 사용하거나 운영자가 직접
 * +XX 붙여서 발송.
 *
 * 2026-06-12 사고: 인도 신청자의 10자리 폰 (7010448262) 을 macOS Messages 가
 * 북미 NANP (+1) 로 자동 해석. nationality 기반 country code 자동 prefix 로 회피.
 */
const COUNTRY_CALLING_CODE: Record<string, string> = {
  // 한국
  "한국": "82",
  "대한민국": "82",
  korea: "82",
  "south korea": "82",
  "republic of korea": "82",
  // 인도
  "인도": "91",
  india: "91",
  // 베트남
  "베트남": "84",
  vietnam: "84",
  // 인도네시아
  "인도네시아": "62",
  indonesia: "62",
  // 중국
  "중국": "86",
  china: "86",
  // 일본
  "일본": "81",
  japan: "81",
  // 필리핀
  "필리핀": "63",
  philippines: "63",
  // 태국
  "태국": "66",
  thailand: "66",
  // 말레이시아
  "말레이시아": "60",
  malaysia: "60",
  // 대만
  "대만": "886",
  taiwan: "886",
  // 미국 / 캐나다 (NANP)
  "미국": "1",
  usa: "1",
  "united states": "1",
  "캐나다": "1",
  canada: "1",
  // 영국
  "영국": "44",
  uk: "44",
  "united kingdom": "44",
  // 러시아
  "러시아": "7",
  russia: "7",
  // 우즈베키스탄
  "우즈베키스탄": "998",
  uzbekistan: "998",
  // 카자흐스탄
  "카자흐스탄": "7",
  kazakhstan: "7",
  // 몽골
  "몽골": "976",
  mongolia: "976",
  // 스페인
  "스페인": "34",
  spain: "34",
  // 프랑스
  "프랑스": "33",
  france: "33",
  // 독일
  "독일": "49",
  germany: "49",
  // 호주
  "호주": "61",
  australia: "61",
  // 브라질
  "브라질": "55",
  brazil: "55",
  // 멕시코
  "멕시코": "52",
  mexico: "52",
  // 남아공
  "남아공": "27",
  "남아프리카": "27",
  "south africa": "27",
  // 사우디아라비아
  "사우디": "966",
  "사우디아라비아": "966",
  "saudi arabia": "966",
  // UAE
  uae: "971",
  "아랍에미리트": "971",
  // 이집트
  "이집트": "20",
  egypt: "20",
  // 케냐
  "케냐": "254",
  kenya: "254",
  // 나이지리아
  "나이지리아": "234",
  nigeria: "234",
  // 홍콩
  "홍콩": "852",
  "hong kong": "852",
  // 마카오
  "마카오": "853",
  macau: "853",
  // 싱가포르
  "싱가포르": "65",
  singapore: "65",
  // 캄보디아
  "캄보디아": "855",
  cambodia: "855",
  // 라오스
  "라오스": "856",
  laos: "856",
  // 미얀마
  "미얀마": "95",
  myanmar: "95",
  // 네팔
  "네팔": "977",
  nepal: "977",
  // 방글라데시
  "방글라데시": "880",
  bangladesh: "880",
  // 스리랑카
  "스리랑카": "94",
  "sri lanka": "94",
  // 파키스탄
  "파키스탄": "92",
  pakistan: "92",
  // 이란
  "이란": "98",
  iran: "98",
  // 터키
  "터키": "90",
  turkey: "90",
};

function resolveCountryCode(nationality: string | null): string | null {
  if (!nationality) return null;
  const normalized = nationality.trim().toLowerCase();
  if (COUNTRY_CALLING_CODE[normalized]) {
    return COUNTRY_CALLING_CODE[normalized];
  }
  for (const [key, code] of Object.entries(COUNTRY_CALLING_CODE)) {
    if (normalized.includes(key)) return code;
  }
  return null;
}

/**
 * SMS 발송용 phone 정규화. nationality 기반으로 +CC 자동 prefix.
 *
 * 우선순위:
 *   1. 이미 + 시작 → 그대로
 *   2. 00 prefix (한국 국제전화 식별) → + 변환
 *   3. 010 / 011~019 (한국 모바일) → +82 + (앞 0 제거)
 *   4. nationality resolve 가능 → +CC + (mobile prefix 0 제거)
 *   5. 그 외 → 그대로 (운영자가 직접 처리)
 */
export function normalizePhoneForSms(
  phone: string,
  nationality?: string | null,
): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (/^01[0-9]/.test(cleaned)) return `+82${cleaned.slice(1)}`;
  const cc = resolveCountryCode(nationality ?? null);
  if (cc) {
    // phone 이 이미 cc 로 시작하는 경우 (예: 사우디 96659574xxxx) → + 만 추가.
    // cc 길이 + 모바일 최소 7자리 보장으로 우연 매치 회피.
    if (cleaned.length >= cc.length + 7 && cleaned.startsWith(cc)) {
      return `+${cleaned}`;
    }
    const stripped = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    return `+${cc}${stripped}`;
  }
  return cleaned;
}

/**
 * 어드민 display 용 phone 정규화. macOS Messages 발신 인식과 별개로 운영자가
 * 어드민에서 phone 을 깔끔하게 읽도록 표시 형식 정리.
 *
 * - 한국 010xxxxxxxx (11자리) → 010-xxxx-xxxx
 * - 한국 +82-10-xxxx-xxxx → 010-xxxx-xxxx (한국 운영자 가독성)
 * - 외국 + 시작 → 그대로
 * - 외국 raw + nationality 매칭 → +CC-XXXX-XXXX
 * - 매칭 안 되면 raw
 */
export function formatPhoneForDisplay(
  phone: string | null,
  nationality?: string | null,
): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/[\s\-()]/g, "");
  // 한국 +82 prefix → 010 표기
  if (cleaned.startsWith("+82")) {
    const local = "0" + cleaned.slice(3);
    if (/^01[0-9]\d{8}$/.test(local)) {
      return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
    }
    return cleaned;
  }
  // 다른 + 국제 prefix → 그대로
  if (cleaned.startsWith("+")) return cleaned;
  // 한국 모바일 11자리 (010xxxxxxxxx)
  if (/^01[016789]\d{8}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  // 한국 모바일 10자리 (구 011)
  if (/^01[16789]\d{7}$/.test(cleaned) && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  // 한국 서울 02 일반
  if (cleaned.length === 10 && cleaned.startsWith("02")) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  // 외국 raw + nationality 매칭 → +CC prefix 표시
  const cc = resolveCountryCode(nationality ?? null);
  if (cc) {
    if (cleaned.length >= cc.length + 7 && cleaned.startsWith(cc)) {
      return `+${cleaned}`;
    }
    const stripped = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    return `+${cc} ${stripped}`;
  }
  return trimmed;
}

export function buildSmsUrl(
  phone: string,
  body: string,
  nationality?: string | null,
): string {
  const normalized = normalizePhoneForSms(phone, nationality);
  // sms: URI 의 body 파라미터는 vendor 별 차이가 있어 일관성을 위해 둘 다 시도하는
  // 게 맞으나, iOS Safari + Android Chrome 모두 ?body= 형식을 인식한다.
  return `sms:${normalized}?body=${encodeURIComponent(body)}`;
}

/**
 * B0018 Wave 1 T4 - broadcast mailto: URL.
 *
 * 강제 BCC. TO 비어 있음 (수강생 이메일 상호 노출 방지 - Sage 인계).
 *
 * 길이 제한:
 *   - 대부분 OS 의 mailto URI 길이 한계 약 2KB.
 *   - 한국인 이메일 평균 25자 + URL encoding (콤마 = %2C) 감안 시 50명까지 안전.
 *   - 50명 초과 시 UI 가 사전 경고하고 청크 발송 권장.
 *
 * 보안:
 *   - subject / body 의 CRLF (%0D%0A) 인코딩 결과는 RFC 6068 에 따라 OS 가 헤더로
 *     해석하지 않음. 그래도 mailto 구현체 버그 회피 위해 normalize 후 호출.
 *   - emails 배열은 호출부에서 redacted 차단 + 중복 제거 가정.
 */
export function buildBroadcastMailtoUrl(
  emails: string[],
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams();
  // BCC 콤마 구분. URL encoding 은 URLSearchParams 가 처리.
  params.set("bcc", emails.join(","));
  params.set("subject", subject);
  params.set("body", body);
  const query = params.toString().replaceAll("+", "%20");
  // TO 비움 (mailto:?bcc=... 형태). RFC 6068 § 6 명시 허용.
  return `mailto:?${query}`;
}

/**
 * B0018 Wave 1 T4 - mailto URI 길이 사전 검사.
 * 50 = 안전 / 100 = 경고 임계. 100 초과는 reject.
 */
export const BROADCAST_LIMITS = {
  safe: 50,
  warn: 100,
} as const;

export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  paymentGuide: "입금 안내",
  paymentConfirmed: "입금 확인 완료",
  reminderT1: "리마인드 T+1",
  reminderD3: "리마인드 D-3",
  reminderD1: "리마인드 D-1",
  referralInvite: "친구초대 이벤트",
};

/**
 * MessageKind 중 신청자 status 별 노출 가능 목록.
 *
 * - paymentGuide / reminder* — 입금 전 단계 (pending / notified / overdue)
 *   에 주로 사용. status 분기 X (자유 선택).
 * - paymentConfirmed — paid 이상에만 의미. 운영자 자율 판단.
 * - **referralInvite — paid 수강생 전용**. 이미 결제 완료한 사람에게만 친구
 *   초대 권한 부여. pending / notified 등에 노출 시 약관 §15 매칭 어려워짐.
 */
export const MESSAGE_KIND_PAID_ONLY: ReadonlySet<MessageKind> = new Set([
  "referralInvite",
]);
