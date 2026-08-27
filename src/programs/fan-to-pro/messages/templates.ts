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
  | "confirmationNotice"
  | "nextCohortOpen"
  | "paymentGuide"
  | "paymentConfirmed"
  | "reminderT1"
  | "reminderD3"
  | "reminderD1"
  | "referralInvite"
  | "cohortKickoff"
  | "week1Materials"
  | "stageOpsGuide";
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
  /**
   * ADR 0019 — 신청 과정별 수강료. 이미 포맷된 문자열 (예 "990,000원" / "KRW 990,000").
   * 미지정 시 1기 기본값 (TUITION_KO / TUITION_EN) 으로 채움 (기존 메시지 불변).
   */
  tuition?: string;
};

const KAKAO = "https://pf.kakao.com/_nxhDGX/chat";
const ACCOUNT = "토스뱅크 1002-4759-1521";
const ACCOUNT_EN = "Toss Bank 1002-4759-1521";
const HOLDER_KO = "드롭다운";
const HOLDER_EN = "Dropdown";
/**
 * 1기 기본 수강료 (selection 개념 도입 전). options.tuition 미지정 시 fallback.
 * 2기부터는 호출부가 resolveTuitionForApplicant 로 계산한 금액을 tuition 으로 주입.
 */
const TUITION_KO = "880,000원";
const TUITION_EN = "KRW 880,000";
const DEADLINE_KO = "8/30(일) 자정";
const DEADLINE_EN = "Sun Aug 30 midnight (KST)";
// 2기 모집 페이지 (nextCohortOpen 안내용).
const NEXT_COHORT_URL = "https://growthcareer.xyz/fan-to-pro/2";

/**
 * {name} 은 항상, {tuition} 은 tuition 인자로 치환.
 * tuition 미지정 시 locale 기본값 (1기 880,000) 으로 채워 기존 메시지 불변 보장.
 */
function fill(
  template: string,
  name: string,
  locale: MessageLocale,
  tuition?: string,
): string {
  const tuitionValue = tuition ?? (locale === "ko" ? TUITION_KO : TUITION_EN);
  return template
    .replaceAll("{name}", name)
    .replaceAll("{tuition}", tuitionValue);
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
수강료 {tuition}
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
Tuition {tuition}
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
- 수강료: {tuition}
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name} 으로 입금 부탁드려요
- 마감: 2026년 8월 30일(일) 자정

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
- Tuition: {tuition}
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: ${"{name}"}
- Deadline: Sunday, August 30, midnight (KST)

Once your payment is verified, we will send the first-class details by text and email.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

/* paymentGuide - 비자 없음 분기 (visa = "기타/없음" 또는 null) */

const paymentGuide_sms_ko_noVisa = `[Fan to Pro] {name} 님 신청 감사드려요 :)

신청서 비자가 "기타/없음" 으로 되어 있어 입금 전 두 가지 확인 부탁드려요.

(1) 마포구 오프라인 강의 4주 토/일 출석 가능 여부
(2) 수료 후 K팝 공연 유급 참여는 비자 보유자만 가능 (비자 없으면 강의는 OK 지만 공연 단계는 불가)

두 가지 확인하셨고 그래도 수강 원하시면 "확인" 답장 부탁드려요.
답장 후 입금 정보 안내드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const paymentGuide_sms_en_noVisa = `[Fan to Pro] Hi {name}, thanks for applying.

Your form lists "other/none" for visa, so please confirm two things before we send payment details.

(1) Can you attend offline in Mapo-gu, Seoul every Sat/Sun for 4 weeks?
(2) The paid K-pop concert role after the program requires a Korean visa that allows paid work. Without one, you can attend class but not the concert role.

If both confirmed, reply "confirmed" and we will send the payment details.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const paymentGuide_email_ko_noVisa = `안녕하세요, Fan to Pro 입니다 :)

{name} 님의 수강 신청에 감사드려요. 신청서에 비자 상태가 "기타/없음" 으로 작성되어 있어, 입금 안내 전에 두 가지 꼭 확인 부탁드릴 게 있어요.

(1) Fan to Pro 는 한국 오프라인 강의만 제공하고 있어요. 4주 동안 마포구 강의실에 매주 토/일 직접 오실 수 있는 상태인지 확인 부탁드려요.

(2) 수료 후 이어지는 K팝 공연 프로젝트 유급 참여 기회는 한국에서 합법적으로 영리 활동이 가능한 비자 보유자만 참여 가능해요. 비자가 없거나 관광/단기 비자라면 수강은 가능하지만, 공연 프로젝트 단계에는 참석이 어려운 점 미리 안내드려요.

위 두 가지 모두 확인하셨고 그래도 수강을 원하시면, 이 메일에 "확인했습니다" 라고 짧게 답장 부탁드려요. 답장이 확인되면 아래 입금 정보로 안내드려요.

[입금 정보 - 확인 답장 후 적용]
- 수강료: {tuition}
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name}
- 마감: 2026년 8월 30일(일) 자정

비자 상태가 바뀌었거나 다른 비자를 보유하고 계셨다면 그것도 함께 알려주세요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const paymentGuide_email_en_noVisa = `Hello, this is Fan to Pro.

Thank you for applying, {name}. Before we send you the payment details, please confirm two things, because your application listed "other / none" for visa status.

(1) Fan to Pro is taught fully offline in Mapo-gu, Seoul. Please confirm you can attend in person every Saturday and Sunday for the full 4-week program.

(2) The paid K-pop concert project after the program is only available to those who hold a Korean visa that allows paid side work. If you do not currently hold an eligible visa, you may still attend the class, but you will not be able to take part in the paid concert role.

If you have confirmed both points and still want to proceed, please reply to this email with "confirmed" and we will send the payment details. If your visa status has changed or was filled in incorrectly, please let us know in your reply.

[PAYMENT - sent after your confirmation reply]
- Tuition: {tuition}
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: ${"{name}"}
- Deadline: Sunday, August 30, midnight (KST)

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
8/30(일) 모집 마감 이후, 강의장 주소 / 준비물 / 카톡 오픈채팅 초대 등 자세한 안내 메일을 별도로 보내드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const paymentConfirmed_sms_en = `[Fan to Pro] Hi {name}, payment confirmed.

[SEAT LOCKED]
First class: Sat Jun 27

[NEXT GUIDE]
After the application deadline (Sun Aug 30), we will send a separate guide email with the venue, what to bring, KakaoTalk open chat invitation, and more.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const paymentConfirmed_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 입금 확인이 완료됐어요. 자리가 확정됐습니다.

[첫 강의 안내]
- 일시: 2026년 6월 27일(토)

[다음 안내]
8월 30일(일) 모집 마감 이후, 강의장 주소 / 준비물 / 수강생 카카오톡 오픈채팅 초대 링크 등 자세한 안내 메일을 별도로 보내드려요.

환불이 필요하면 결제 후 7일 이내 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해주세요.
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
After the application deadline (Sunday, August 30), we will send a separate guide email with the venue, what to bring, the student KakaoTalk open chat invitation, and more.

If you need a refund, 100% refund is available within 7 days of payment. Refund policy after that: https://growthcareer.xyz/terms

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
금액 {tuition}
마감 ${DEADLINE_KO}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderT1_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

Seats are locked in payment order.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount {tuition}
Deadline ${DEADLINE_EN}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderT1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

자리는 입금 확인 순으로 확정되니, 아직 입금 전이시라면 아래 정보로 부탁드려요.

[입금 정보]
- 수강료: {tuition}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 8월 30일(일) 자정

이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderT1_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

Seats are locked in payment order. If you have not paid yet, here is the info again.

[PAYMENT]
- Tuition: {tuition}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name from the form
- Deadline: Sunday, August 30, midnight (KST)

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
금액 {tuition}
마감 ${DEADLINE_KO}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderD3_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

The application deadline is approaching. Your seat is locked in once payment is confirmed.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount {tuition}
Deadline ${DEADLINE_EN}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderD3_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

신청 마감일이 다가오고 있어요. 입금이 확인되면 자리가 확정되니, 아직 입금 전이시라면 아래 정보로 부탁드려요.

[입금 정보]
- 수강료: {tuition}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 8월 30일(일) 자정

결제 후 24시간 안에 확인 안내 보내드려요. 이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD3_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

The application deadline is approaching. Your seat is locked in once payment is confirmed.

[PAYMENT]
- Tuition: {tuition}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name
- Deadline: Sunday, August 30, midnight (KST)

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

신청 마감이 내일(8/30 일) 자정이에요. 자리 확정을 원하시면 마감 전에 입금 부탁드려요.

[입금 정보]
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 {tuition}

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const reminderD1_sms_en = `[Fan to Pro] Hi {name}, just a friendly reminder in case you might have forgotten about your payment :)

The application deadline is tomorrow (Sun Aug 30) at midnight (KST). If you would like to lock in your seat, please send payment before then.

[PAYMENT]
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount {tuition}

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const reminderD1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 혹시 신청 후 입금을 잊으신 건 아닌지 리마인드 차원에서 안내드려요.

신청 마감이 내일(8/30 일) 자정이에요. 자리 확정을 원하시면 마감 전에 입금 부탁드려요.

[입금 정보]
- 수강료: {tuition}
- 계좌: ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 8월 30일(일) 자정

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 이미 입금하셨다면 본 안내는 무시하셔도 좋아요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD1_email_en = `Hello, this is Fan to Pro.

Hi {name}, just a friendly reminder in case you might have forgotten about your payment.

The application deadline is tomorrow (Sun Aug 30) at midnight (KST). If you would like to lock in your seat, please send payment before then.

[PAYMENT]
- Tuition: {tuition}
- Account: ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name
- Deadline: Sun Aug 30 midnight (KST)

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

[친구 추천 보상]
- {name} 님: 추천한 친구가 결제 완료 시 50,000원 보상 (계좌 송금)
- 친구: 수강료 50,000원 할인 (실 부담 830,000원)

[매칭 방법]
친구분이 결제를 완료하신 후, 처음 받으셨던 결제 안내 문자 또는 이메일에 답장으로 추천인({name} 님)의 정확한 성과 이름을 적어 보내주시면 추천 완료예요.

* 정확한 한글 또는 영문 성명 (신청서 또는 결제자명과 일치)
* 추천 1인당 최대 5명까지 가능

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const referralInvite_sms_en = `[Fan to Pro] Friend referral event!

Hi {name}, if you know any friends who want to learn K-entertainment work with you, invite them and earn a reward :)

[FRIEND REFERRAL REWARDS]
- You: KRW 50,000 reward when your friend completes payment (transferred to your bank account)
- Your friend: KRW 50,000 tuition discount (final payment KRW 830,000)

[HOW TO MATCH]
After your friend completes their payment, they reply to the payment guide (SMS or email) they received with your exact full name (first and last). The referral is then complete.

* The name must match the application or payment record exactly (Korean or English).
* Each referrer can invite up to 5 friends.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const referralInvite_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 친구 초대 이벤트 안내드려요.

함께 K엔터 직무를 배우고 싶은 친구가 있다면 추천하고 혜택을 받아요~

[친구 추천 보상]
- {name} 님: 추천하신 친구가 결제 완료하시면 추천 보상 50,000원을 {name} 님이 지정하신 계좌로 송금해드려요.
- 추천받은 친구: 수강료 50,000원 할인 (실 부담 830,000원) 적용해드려요.

[매칭 방법]
친구분이 결제를 완료하신 후, 처음 받으셨던 결제 안내 문자 또는 이메일에 답장으로 추천인({name} 님)의 정확한 성과 이름을 적어 보내주시면 추천이 완료됩니다.

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

[FRIEND REFERRAL REWARDS]
- You: a KRW 50,000 reward, transferred to a bank account you designate, after your friend completes payment.
- Your friend: a KRW 50,000 tuition discount (final payment KRW 830,000).

[HOW TO MATCH]
After your friend completes their payment, they reply to the payment guide (SMS or email) they originally received with your exact full name (first and last). The referral is then complete.

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
 * 7. cohort 첫 강의 안내 (cohortKickoff) — paid 수강생 전용
 *
 * 모집 마감 이후 + 강의 시작 전 보내는 "다음 안내". 강의장 / 일시 / 카톡
 * 오픈채팅 / 준비물 / 원페이저 안내 통합. paymentConfirmed 가 약속한 후속 메일.
 * ------------------------------------------------------------------------- */

const KAKAO_OPEN_CHAT_URL = "https://open.kakao.com/o/gX12jFAi";
const KAKAO_OPEN_CHAT_PASSWORD = "fan06pro";
const VENUE_NAME = "블루스프링하우스";
const VENUE_ADDRESS_KO = "서울 마포구 월드컵북로 161";
const VENUE_NAME_EN = "Blue Spring House";
const VENUE_ADDRESS_EN = "161 Worldcup-buk-ro, Mapo-gu, Seoul";

const cohortKickoff_sms_ko = `[Fan to Pro] 1기 강좌 확정! 첫 강의 안내드려요 :)

{name} 님 입금 감사드려요. 첫 강의 전 아래 안내 꼭 확인 부탁드려요.

[첫 강의]
일시: 6/27(토) 14:00~16:00
강의장: ${VENUE_NAME}
주소: ${VENUE_ADDRESS_KO}
준비물: 노트북 또는 태블릿 PC (수업 자료는 강사님이 PDF 로 전달)

[카카오톡 오픈채팅 입장 필수]
링크: ${KAKAO_OPEN_CHAT_URL}
비밀번호: ${KAKAO_OPEN_CHAT_PASSWORD}
* 닉네임은 '한국어 발음 이름 또는 한국 이름 (영문 본명)' 형식으로 설정 부탁드려요. 예: 선민 (Sungmin Park) / 마리아 (Maria Rodriguez). 영문 본명은 본인 식별용입니다. 오픈프로필 또는 본인 프로필 어느 쪽으로 입장해도 OK.

[프로그램 원페이저]
오픈채팅방 입장하시면 운영자가 원페이저 PDF 를 공유드릴게요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const cohortKickoff_sms_en = `[Fan to Pro] Cohort 1 confirmed! First class details inside :)

Hi {name}, thank you for completing payment. Please review the following before our first class.

[FIRST CLASS]
Date/Time: Sat, June 27, 14:00 to 16:00 KST
Venue: ${VENUE_NAME_EN}
Address: ${VENUE_ADDRESS_EN}
Bring: Laptop or tablet (instructors will share materials in PDF)

[KAKAOTALK OPEN CHAT / please join]
Link: ${KAKAO_OPEN_CHAT_URL}
Password: ${KAKAO_OPEN_CHAT_PASSWORD}
* Please set your nickname as 'Korean name or pronounceable Korean name (English real name)'. Example: 선민 (Sungmin Park) / 마리아 (Maria Rodriguez). The English real name is for identification. You may join with either an open profile or your own KakaoTalk profile.

[ONE-PAGER]
The operator will share the program one-pager PDF in the KakaoTalk open chat after you join.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const cohortKickoff_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 1기 강좌가 확정됐어요. 첫 강의 안내드려요.

[첫 강의 정보]
- 일시: 2026년 6월 27일(토) 14:00 ~ 16:00 (매 회차 2시간)
- 강의장: ${VENUE_NAME}
- 주소: ${VENUE_ADDRESS_KO}
- 준비물: 노트북 또는 태블릿 PC (수업 자료는 강사님이 PDF 로 전달해주세요)

[전체 강의 일정 / 4주 8회]
1회: 2026-06-27 (토) 14:00 ~ 16:00
2회: 2026-06-28 (일) 14:00 ~ 16:00
3회: 2026-07-04 (토) 14:00 ~ 16:00
4회: 2026-07-05 (일) 14:00 ~ 16:00
5회: 2026-07-11 (토) 14:00 ~ 16:00
6회: 2026-07-12 (일) 14:00 ~ 16:00
7회: 2026-07-18 (토) 14:00 ~ 16:00
8회: 2026-07-19 (일) 14:00 ~ 16:00
수료식 + 네트워킹 파티: 2026-07-25 (토)

[카카오톡 오픈채팅 입장]
입장 링크: ${KAKAO_OPEN_CHAT_URL}
비밀번호: ${KAKAO_OPEN_CHAT_PASSWORD}

* 닉네임은 '한국어 발음 이름 또는 한국 이름 (영문 본명)' 형식으로 설정 부탁드려요. 예: 선민 (Sungmin Park) / 마리아 (Maria Rodriguez). 영문 본명은 본인 식별용입니다.
* 오픈프로필 또는 본인 카카오 프로필 어느 쪽으로 입장해도 OK
* 동기와 강사님과의 그룹챗이에요. 강의 외 잡담 + Q&A + 자료 공유 모두 환영
* 첫 강의 전까지 꼭 입장해주세요

[프로그램 가이드 PDF 첨부]
교육 프로그램 가이드를 PDF 로 본 메일에 첨부드려요.

첫 강의 전에 한 번 훑어보시면 프로그램 흐름 파악에 도움이 될 거예요.
4주 동안 배우게 될 내용, 강사 소개, 회차별 주제가 정리되어 있어요.

[이력서 / 자기소개서 / 포트폴리오 첨삭]
한국에서 취업을 준비하고 계시거나 K-pop 업계 인턴십 / 정규직을 염두에 두고 계시면,
본인의 이력서 / 자기소개서 / 포트폴리오를 hello@dropdown.xyz 로 보내주세요.

운영진이 검토 후 피드백을 드릴 수 있어요. 강의와 별개로 진행되는 서비스이고,
첨삭 횟수는 강의 기간 중 1~2회 권장 (강의 시작 전 / 종강 무렵).

곧 강의장에서 뵐게요!

Fan to Pro 운영진 드림`;

const cohortKickoff_email_en = `Hello, this is Fan to Pro.

Hi {name}, Cohort 1 is confirmed. Here are the details for our first class.

[FIRST CLASS]
- Date/Time: Saturday, June 27, 2026, 14:00 to 16:00 KST (2 hours per session)
- Venue: ${VENUE_NAME_EN}
- Address: ${VENUE_ADDRESS_EN}
- Bring: Laptop or tablet (instructors will share materials in PDF)

[FULL SCHEDULE / 4 weeks, 8 sessions]
Session 1: Sat, June 27, 14:00 to 16:00
Session 2: Sun, June 28, 14:00 to 16:00
Session 3: Sat, July 4, 14:00 to 16:00
Session 4: Sun, July 5, 14:00 to 16:00
Session 5: Sat, July 11, 14:00 to 16:00
Session 6: Sun, July 12, 14:00 to 16:00
Session 7: Sat, July 18, 14:00 to 16:00
Session 8: Sun, July 19, 14:00 to 16:00
Graduation + networking party: Sat, July 25

[KAKAOTALK OPEN CHAT]
Link: ${KAKAO_OPEN_CHAT_URL}
Password: ${KAKAO_OPEN_CHAT_PASSWORD}

* Please set your nickname as 'Korean name or pronounceable Korean name (English real name)'. Example: 선민 (Sungmin Park) / 마리아 (Maria Rodriguez). The English real name is for identification.
* You may join with either an open profile or your own KakaoTalk profile.
* Group chat with fellow students and instructors for outside-class talk + Q&A + sharing materials
* Please join before the first class

[PROGRAM GUIDE PDF / ATTACHED]
The program guide PDF is attached to this email.

Please take a look before the first class to get familiar with the program flow.
The guide covers the curriculum, instructor profiles, and session-by-session topics.

[RESUME / COVER LETTER / PORTFOLIO REVIEW]
If you are preparing for a career in Korea or aiming for a K-pop industry internship or full-time role,
please send your resume, cover letter, or portfolio to hello@dropdown.xyz.

Our team will review and provide feedback. This is a complimentary service offered separately
from the classes. We recommend 1~2 rounds during the program (before the first class / near graduation).

See you at the venue soon!

Fan to Pro Team`;

const cohortKickoff_email_subject_ko = "[Fan to Pro] 1기 강좌 확정 / 첫 강의 안내";
const cohortKickoff_email_subject_en = "[Fan to Pro] Cohort 1 confirmed / first class details";

/* ---------------------------------------------------------------------------
 * 8. week1Materials — 1주차 강의 자료 안내 (paid 수강생 전용)
 *
 * 강사가 준비한 강의 자료를 Google Drive 링크로 공유. 자료 보안 룰 (외부 유출 /
 * 공유 / 재사용 금지) 명시 의무. paid / enrolled 학생만 발송.
 * ------------------------------------------------------------------------- */

const WEEK1_MATERIALS_URL =
  "https://docs.google.com/presentation/d/1-tsy8vdgq57EMGdePFWbHNY7xJUCzMR7/edit?usp=sharing&ouid=112552924148016723858&rtpof=true&sd=true";

const week1Materials_sms_ko = `[Fan to Pro] 1주차 일요일 강의 (6/28) 자료 안내

{name} 님, 1주차 일요일 강의 자료 공유드려요.

본 자료는 실제 현업에서 진행한 공연 현장 사진 위주로 구성되어 있어요. 상세한 설명과 실무 노하우는 강사님께서 강의에서 직접 진행해주세요. 강의 시간에 사진과 함께 들으시는 것을 권장드려요.

[Google Drive 링크]
${WEEK1_MATERIALS_URL}

⚠️ 본 자료는 강사님의 지적 재산물입니다. 외부 유출 / 공유 / 재사용 금지. 본인 학습 용도로만 활용 부탁드려요.

문의는 카톡 채널로 :)
${KAKAO}`;

const week1Materials_sms_en = `[Fan to Pro] Week 1 Sunday class materials (Jun 28)

Hi {name}, here are the Week 1 Sunday class materials.

These materials are mostly photos from actual K-pop concert sites the instructor worked on. The detailed explanation and behind-the-scenes context will be delivered live by the instructor in class, so we recommend reviewing alongside the live lecture.

[Google Drive link]
${WEEK1_MATERIALS_URL}

⚠️ These materials are the instructor's intellectual property. External sharing, reuse, or redistribution is strictly prohibited. For your personal study only.

Questions? Use the KakaoTalk channel.
${KAKAO}`;

const week1Materials_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 1주차 일요일 강의 (6/28, 공연 제작 구조와 음악 디렉팅) 자료 공유드려요.

[자료 구성 안내]

본 자료는 실제 현업에서 진행한 공연 현장의 사진 위주로 구성되어 있어요.
강의 흐름의 시각 자료 역할이에요.

상세한 설명과 비하인드 / 의사결정 / 실무 노하우는 강사님께서 강의에서 직접 진행해주세요.
강의 시간에 사진과 함께 들으시는 것을 권장드려요.

[1주차 일요일 강의 자료 / Google Drive]
링크: ${WEEK1_MATERIALS_URL}

[자료 사용 규칙 / 매우 중요]

본 자료는 강사님께서 직접 준비하신 지적 재산물입니다.
다음 행위는 절대 금지이며 위반 시 법적 책임이 따를 수 있어요.

❌ 외부 유출 (제 3자에게 링크 / 파일 공유)
❌ 다른 강의나 발표에서 재사용
❌ SNS / 블로그 / 커뮤니티 게시
❌ 다운로드 후 가공 / 편집해서 배포
❌ 회사 / 동료 / 친구에게 공유

✅ 본인 학습 용도로만 활용
✅ 강의 진행 중 본인 노트 메모
✅ 강의 종료 후 복습

[자료 활용 권장]

* 강의 전: 한 번 훑어보시면 흐름 파악 도움 (사진 위주라 빠르게 가능)
* 강의 중: 강사님 설명과 사진 매칭 + 본인 노트 메모
* 강의 후: 복습 + 동기들과 카카오톡 오픈채팅에서 질문 / 토론

강의장에서 뵐게요!

Fan to Pro 운영진 드림`;

const week1Materials_email_en = `Hello, this is Fan to Pro.

Hi {name}, here are the Week 1 Sunday class materials (Jun 28, Concert Production & Music Direction).

[ABOUT THE MATERIALS]

These materials are mostly photos from actual K-pop concert sites the instructor has worked on.
They serve as visual reference for the lecture flow.

The detailed explanation, behind-the-scenes context, decision-making, and on-the-ground know-how
will be delivered live by the instructor in class. We recommend reviewing alongside the live lecture.

[WEEK 1 SUNDAY MATERIALS / Google Drive]
Link: ${WEEK1_MATERIALS_URL}

[USE POLICY / IMPORTANT]

These materials are the instructor's intellectual property, prepared specifically for this program.
The following actions are strictly prohibited and may carry legal consequences.

❌ External sharing (link or file to third parties)
❌ Reuse in other lectures or presentations
❌ Posting on SNS, blogs, or online communities
❌ Downloading, modifying, or redistributing
❌ Sharing with employers, colleagues, or friends

✅ Personal study only
✅ Note-taking during class
✅ Personal review after class

[RECOMMENDED USE]

* Before class: A quick browse to get familiar with the flow (photo-heavy, quick to skim)
* During class: Match instructor's explanation with the photos + take your own notes
* After class: Review + discuss with peers in the KakaoTalk open chat

See you at the venue!

Fan to Pro Team`;

const week1Materials_email_subject_ko = "[Fan to Pro] 1주차 일요일 강의 (6/28) 자료 안내";
const week1Materials_email_subject_en = "[Fan to Pro] Week 1 Sunday class materials (Jun 28)";

/* ---------------------------------------------------------------------------
 * 9. stageOpsGuide. 공연 현장 실무 가이드 PDF 전달 (paid/enrolled 전용).
 *
 * 종강 후 실제 유니온픽처스 협력 공연 투입 전, 사전 학습용 PDF 안내.
 * 첨부 파일은 mailto 표준상 안 붙음. 노아가 이메일 앱에서 수동 첨부 후 발송.
 * ------------------------------------------------------------------------- */

const stageOpsGuide_sms_ko = `[Fan to Pro] 공연 현장 실무 가이드 안내

{name} 님, K-pop 공연 스태프 실무 핸드북 (A4 9p PDF) 을 이메일로 함께 전달드려요. 한 번 정독해두시고 현장에서는 필요한 섹션만 빠르게 펼쳐 확인하세요.

문의는 카톡 채널로 :)
${KAKAO}`;

const stageOpsGuide_sms_en = `[Fan to Pro] K-pop concert field operations guide

Hi {name}, we are sending the K-pop concert staff handbook (A4 9p PDF) by email. Read through once, then pull up the relevant section on-site when needed.

Questions? Use the KakaoTalk channel.
${KAKAO}`;

const stageOpsGuide_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 교육 자료로 "공연 현장 실무 가이드" 를 전달드려요.

K-pop 공연 스태프라면 알아두어야 하는 공연장 안전, 아티스트 응대, 관객 운영, 현장 커뮤니케이션 등 실무 전반을 담은 핸드북입니다.

[가이드 구성 안내]

A4 9페이지 PDF 로 구성되어 있고, 6개 챕터 (공연장 안전 / 아티스트 응대 / 관객 운영 / 리허설 / 현장 커뮤 / 돌발 대응) 와 부록 (영어 핵심 용어 사전 / Venue 규모별 운영 차이) 을 담고 있어요.

한국 공연장 안전 기준법과 K-pop 콘서트 실무 표준을 기반으로 작성했으며, 외국인 학생분들을 위해 핵심 용어는 한국어와 영어를 함께 표기했습니다.

[활용 권장]

* 사전: 한 번 정독하시면 전체 흐름 파악에 도움이 됩니다.
* 현장: 필요한 섹션만 빠르게 펼쳐 확인하세요.
* 원칙: 모르는 것을 모른다고 말하는 것이 가장 안전합니다. 의심되면 무전으로 선임자에게 즉시 확인하세요.

첨부 파일로 PDF 를 함께 보내드리니 다운로드 후 휴대폰이나 태블릿에 저장해두시면 현장에서 유용하게 사용하실 수 있어요.

궁금한 점은 카톡 채널로 편하게 연락 부탁드려요.

Fan to Pro 운영진 드림`;

const stageOpsGuide_email_en = `Hello, this is Fan to Pro.

Hi {name}, we are sending the "K-pop Concert Field Operations Guide" as educational material.

It is a general handbook covering what any K-pop concert staff should know: venue safety, artist handling, audience operations, on-site communication, and more.

[ABOUT THE GUIDE]

An A4 9-page PDF covering 6 chapters (venue safety, artist handling, audience operations, rehearsal, on-site communication, emergency response) plus an appendix (English glossary, venue-size operations comparison).

The content is based on Korean concert venue safety standards and K-pop concert field practices. Core terms are labeled in both Korean and English for international students.

[RECOMMENDED USE]

* Before working a show: Read through once to get familiar with the overall flow.
* On-site: Pull up the relevant section quickly when needed.
* Rule of thumb: Saying you do not know is the safest thing you can do. When in doubt, radio your senior right away.

The PDF is attached to this email. Download it and save it on your phone or tablet so you can access it easily on-site.

Any questions, use the KakaoTalk channel.

Fan to Pro Team`;

const stageOpsGuide_email_subject_ko = "[Fan to Pro] 공연 현장 실무 가이드 안내";
const stageOpsGuide_email_subject_en = "[Fan to Pro] K-pop concert field operations guide";

/* ---------------------------------------------------------------------------
 * 10. confirmationNotice — 사전 확인 안내 (비자 미보유 / 외국 전화번호 신청자)
 *
 * payment guide 전에 오프라인 출석 가능 + 공연 프로젝트 유급참여 불가 두 가지를
 * 확인 요청. 결제/금액 정보는 넣지 않음 (입금 안내는 확인 회신 후 다음 단계).
 * paymentGuide_noVisa 문구 참고하되 결제 블록 제외.
 * ------------------------------------------------------------------------- */

const confirmationNotice_sms_ko = `[Fan to Pro] {name} 님 신청 감사드려요 :)

입금 안내 전에 두 가지만 먼저 확인 부탁드려요.

(1) 서울에서 오프라인 강의 4주 토/일 출석 가능 여부
(2) 수료 후 K팝 공연 유급 참여는 비자 보유자만 가능 (비자 없어도 강의는 OK 지만 공연 단계는 불가)
*취업이 보장된 상품이 아닙니다.

두 가지 확인하셨고 그래도 수강 원하시면 "확인" 답장 부탁드려요.
답장 후 입금 정보 안내드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const confirmationNotice_sms_en = `[Fan to Pro] Hi {name}, thanks for applying.

Before we send payment details, please confirm two things.

(1) Can you attend the offline classes in Seoul every Sat/Sun for 4 weeks?
(2) The paid K-pop concert role after the program is for visa holders only (without a visa you can still take the classes, but not the concert stage).
*This is not a guaranteed-employment product.

If both confirmed, reply "confirmed" and we will send the payment details.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const confirmationNotice_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님의 수강 신청에 감사드려요. 입금 안내 전에 두 가지 꼭 확인 부탁드릴 게 있어요.

(1) Fan to Pro 는 서울에서 진행하는 오프라인 강의예요. 4주 동안 매주 토/일 서울 강의실에 직접 오실 수 있는 상태인지 확인 부탁드려요.

(2) 수료 후 이어지는 K팝 공연 프로젝트 유급 참여 기회는 한국에서 합법적으로 영리 활동이 가능한 비자 보유자만 참여 가능해요. 비자가 없어도 수강은 가능하지만, 공연 프로젝트 단계에는 참석이 어려운 점 미리 안내드려요.

* Fan to Pro 는 취업이 보장된 상품이 아닙니다.

위 두 가지 모두 확인하셨고 그래도 수강을 원하시면, 이 메일에 "확인했습니다" 라고 짧게 답장 부탁드려요. 답장이 확인되면 입금 정보를 안내드려요.

비자 상태가 바뀌었거나 다른 비자를 보유하고 계셨다면 그것도 함께 알려주세요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const confirmationNotice_email_en = `Hello, this is Fan to Pro.

Thank you for applying, {name}. Before we send you the payment details, please confirm two things.

(1) Fan to Pro is taught offline in Seoul. Please confirm you can attend in person every Saturday and Sunday for the full 4-week program.

(2) The paid K-pop concert project after the program is only available to those who hold a Korean visa that allows paid side work. Even without an eligible visa you may still attend the class, but you will not be able to take part in the paid concert role.

* Fan to Pro is not a guaranteed-employment product.

If you have confirmed both points and still want to proceed, please reply to this email with "confirmed" and we will send the payment details. If your visa status has changed or was filled in incorrectly, please let us know in your reply.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const confirmationNotice_email_subject_ko =
  "[Fan to Pro] 신청 확인 부탁드려요 (오프라인 강의 / 공연 참여)";
const confirmationNotice_email_subject_en =
  "[Fan to Pro] Quick confirmation needed before payment details";

/* ---------------------------------------------------------------------------
 * 11. nextCohortOpen — 2기 오픈 안내 (사전 신청자 = next_cohort_interest 전용)
 *
 * 1기 마감 후 사전 신청한 분께 "2기 오픈했어요" + 모집 페이지 링크. 결제/금액은
 * 신청 페이지에서 확인하므로 링크 + 마감일 + 카톡 문의만.
 * ------------------------------------------------------------------------- */

const nextCohortOpen_sms_ko = `[Fan to Pro] {name} 님, 기다려주셔서 감사해요 :)

사전 신청해주셨던 2기 모집이 오픈됐어요. 아래 링크에서 커리큘럼과 일정 확인하시고 신청 부탁드려요.

[2기 모집]
${NEXT_COHORT_URL}
마감 ${DEADLINE_KO}

자리는 입금 확인 순으로 확정돼요 (선착순).

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}`;

const nextCohortOpen_sms_en = `[Fan to Pro] Hi {name}, thank you for waiting.

The Cohort 2 you pre-registered for is now open. Please check the curriculum and schedule at the link below and apply.

[COHORT 2]
${NEXT_COHORT_URL}
Deadline ${DEADLINE_EN}

Seats lock in payment order.

For any questions, please use the KakaoTalk channel below.
${KAKAO}`;

const nextCohortOpen_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 사전 신청해주셔서 감사해요. 기다려주셨던 2기 모집이 오픈됐어요.

아래 모집 페이지에서 커리큘럼 / 강사 / 회차별 일정을 확인하시고, 마음에 드시면 그대로 신청까지 진행하실 수 있어요.

[2기 모집 페이지]
${NEXT_COHORT_URL}

[모집 마감]
2026년 8월 30일(일) 자정

자리는 입금 확인 순으로 확정되니 (선착순), 관심 있으시면 마감 전에 서둘러 신청 부탁드려요.

문의사항은 하단의 카카오톡 채널을 이용해주세요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const nextCohortOpen_email_en = `Hello, this is Fan to Pro.

Hi {name}, thank you for pre-registering. The Cohort 2 you have been waiting for is now open.

At the page below you can review the curriculum, instructors, and session schedule, and apply directly if it looks like a fit.

[COHORT 2 PAGE]
${NEXT_COHORT_URL}

[DEADLINE]
Sunday, August 30, 2026, midnight (KST)

Seats lock in payment order, so if you are interested, please apply before the deadline.

For any questions, please use the KakaoTalk channel below.
${KAKAO}

Thank you,
Fan to Pro Team`;

const nextCohortOpen_email_subject_ko = "[Fan to Pro] 2기 모집이 오픈됐어요";
const nextCohortOpen_email_subject_en = "[Fan to Pro] Cohort 2 is now open";

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
  confirmationNotice: {
    sms: { ko: confirmationNotice_sms_ko, en: confirmationNotice_sms_en },
    email: {
      subject: {
        ko: confirmationNotice_email_subject_ko,
        en: confirmationNotice_email_subject_en,
      },
      body: {
        ko: confirmationNotice_email_ko,
        en: confirmationNotice_email_en,
      },
    },
  },
  nextCohortOpen: {
    sms: { ko: nextCohortOpen_sms_ko, en: nextCohortOpen_sms_en },
    email: {
      subject: {
        ko: nextCohortOpen_email_subject_ko,
        en: nextCohortOpen_email_subject_en,
      },
      body: { ko: nextCohortOpen_email_ko, en: nextCohortOpen_email_en },
    },
  },
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
  cohortKickoff: {
    sms: { ko: cohortKickoff_sms_ko, en: cohortKickoff_sms_en },
    email: {
      subject: {
        ko: cohortKickoff_email_subject_ko,
        en: cohortKickoff_email_subject_en,
      },
      body: { ko: cohortKickoff_email_ko, en: cohortKickoff_email_en },
    },
  },
  week1Materials: {
    sms: { ko: week1Materials_sms_ko, en: week1Materials_sms_en },
    email: {
      subject: {
        ko: week1Materials_email_subject_ko,
        en: week1Materials_email_subject_en,
      },
      body: { ko: week1Materials_email_ko, en: week1Materials_email_en },
    },
  },
  stageOpsGuide: {
    sms: { ko: stageOpsGuide_sms_ko, en: stageOpsGuide_sms_en },
    email: {
      subject: {
        ko: stageOpsGuide_email_subject_ko,
        en: stageOpsGuide_email_subject_en,
      },
      body: { ko: stageOpsGuide_email_ko, en: stageOpsGuide_email_en },
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
    return fill(PAYMENT_GUIDE_NO_VISA.sms[locale], name, locale, options?.tuition);
  }
  return fill(TEMPLATES[kind].sms[locale], name, locale, options?.tuition);
}

/** 이메일 제목. */
export function getEmailSubject(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
  options?: MessageOptions,
): string {
  if (kind === "paymentGuide" && options?.hasVisa === false) {
    return fill(
      PAYMENT_GUIDE_NO_VISA.email.subject[locale],
      name,
      locale,
      options?.tuition,
    );
  }
  return fill(
    TEMPLATES[kind].email.subject[locale],
    name,
    locale,
    options?.tuition,
  );
}

/** 이메일 본문. */
export function getEmailBody(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
  options?: MessageOptions,
): string {
  if (kind === "paymentGuide" && options?.hasVisa === false) {
    return fill(
      PAYMENT_GUIDE_NO_VISA.email.body[locale],
      name,
      locale,
      options?.tuition,
    );
  }
  return fill(TEMPLATES[kind].email.body[locale], name, locale, options?.tuition);
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
  confirmationNotice: "사전 확인 안내",
  nextCohortOpen: "2기 오픈 안내",
  paymentGuide: "입금 안내",
  paymentConfirmed: "입금 확인 완료",
  reminderT1: "리마인드 T+1",
  reminderD3: "리마인드 D-3",
  reminderD1: "리마인드 D-1",
  referralInvite: "친구초대 이벤트",
  cohortKickoff: "기수 첫 강의 안내",
  week1Materials: "1주차 일요일 자료 (6/28)",
  stageOpsGuide: "공연 현장 실무 가이드",
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
  "cohortKickoff",
  "week1Materials",
  "stageOpsGuide",
]);
