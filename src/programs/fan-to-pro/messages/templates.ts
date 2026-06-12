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
  | "reminderD1";
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

[입금 안내]
수강료 ${TUITION_KO}
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
입금자명 {name}
마감 ${DEADLINE_KO}

자리는 입금 확인 순으로 확정돼요 (선착순).
비자 보유 + 한국 오프라인 강의 참석 가능 여부 꼭 재확인 부탁드려요.

카톡 문의
${KAKAO}`;

const paymentGuide_sms_en = `[Fan to Pro] Hi {name}, thanks for applying.

[PAYMENT]
Tuition ${TUITION_EN}
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Depositor {name}
Deadline ${DEADLINE_EN}

Seats lock in payment order.
Please reconfirm your visa and ability to attend offline in Seoul.

Questions via KakaoTalk
${KAKAO}`;

const paymentGuide_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님의 수강 신청에 감사드리며, 다음과 같이 입금하실 내용을 안내드려요.

(입금 완료가 되어야 수강신청이 완료되고, 선착순이니 참고 부탁드려요. 또한 비자 보유, 한국 오프라인 강의에 참석 가능하신지 꼭 다시 확인해주세요.)

[입금 정보]
- 수강료: ${TUITION_KO} (원가 1,100,000원에서 20% 할인)
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name} 으로 입금 부탁드려요
- 마감: 2026년 6월 21일(일) 자정

입금이 확인되면 첫 강의와 관련한 안내 문자와 메일이 발송됩니다. 이외의 문의는 카카오톡 채널로 부탁드려요.
${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const paymentGuide_email_en = `Hello, this is Fan to Pro.

Thank you for applying, {name}. Here is your payment guide.

A quick note before you transfer: your seat is only locked in once we receive payment, and seats are filling on a first-come, first-served basis. Please also reconfirm that you (a) hold a valid Korean residence visa and (b) can attend in person in Seoul every Saturday and Sunday for the full 4-week program.

[PAYMENT]
- Tuition: ${TUITION_EN} (20% off from the regular KRW 1,100,000)
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: ${"{name}"}
- Deadline: Sunday, June 21, midnight (KST)

Once your payment is verified, we will send the first-class details by text and email. For any other questions, KakaoTalk is the fastest channel.
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

카톡 문의
${KAKAO}`;

const paymentGuide_sms_en_noVisa = `[Fan to Pro] Hi {name}, thanks for applying.

Your form lists "other/none" for visa, so please confirm two things before we send payment details.

(1) Can you attend offline in Seoul (Gangnam) every Sat/Sun for 4 weeks?
(2) The paid K-pop concert role after the program requires a Korean visa that allows paid work. Without one, you can attend class but not the concert role.

If both confirmed, reply "confirmed" and we will send the payment details.

Questions via KakaoTalk
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

비자 상태가 바뀌었거나 다른 비자를 보유하고 계셨다면 그것도 함께 알려주세요. 문의는 카카오톡 채널이 빨라요.
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

KakaoTalk is the fastest channel for questions.
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

자리가 확정됐어요.
첫 강의 6/27(토) 안내 메일을 곧 보내드려요.

카톡 문의
${KAKAO}`;

const paymentConfirmed_sms_en = `[Fan to Pro] Hi {name}, payment confirmed.

Your seat is locked in.
Kickoff details for Sat Jun 27 will arrive shortly.

Questions via KakaoTalk
${KAKAO}`;

const paymentConfirmed_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 입금 확인이 완료됐어요. 자리가 확정됐습니다.

[첫 강의 안내]
- 일시: 2026년 6월 27일(토)
- 장소: 별도 안내 (수강 확정자에게만 개별 공지)
- 준비물: 별도 안내 메일에서 확인 부탁드려요

수강생 카카오톡 오픈채팅 초대 링크는 강의 시작 전 별도로 보내드려요.

환불이 필요하면 마감 전(6/21 자정) 까지는 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해주세요.
https://growthcareer.xyz/terms

감사합니다.
Fan to Pro 운영진 드림`;

const paymentConfirmed_email_en = `Hello, this is Fan to Pro.

Hi {name}, your payment has been confirmed. Your seat is locked in.

[FIRST CLASS]
- Date: Saturday, June 27, 2026
- Venue: Sent separately to confirmed students only
- What to bring: Details in the kickoff email

Student KakaoTalk open chat invitation will arrive before the first class.

If you need a refund, 100% refund is available any time before the deadline (Sun Jun 21 midnight KST). Refund policy after that: https://growthcareer.xyz/terms

Thank you,
Fan to Pro Team`;

const paymentConfirmed_email_subject_ko =
  "[Fan to Pro] 입금 확인 완료 / 자리 확정";
const paymentConfirmed_email_subject_en =
  "[Fan to Pro] Payment Confirmed / Seat Locked";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - T+1 (reminderT1) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderT1_sms_ko = `[Fan to Pro] {name} 님, 신청 다음날이에요.

입금이 아직이라면 부탁드려요.
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}
마감 ${DEADLINE_KO}

카톡 문의
${KAKAO}`;

const reminderT1_sms_en = `[Fan to Pro] Hi {name}, one day after your application.

If you have not paid yet:
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}
Deadline ${DEADLINE_EN}

Questions via KakaoTalk
${KAKAO}`;

const reminderT1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 신청하신지 하루가 지났어요. 입금 아직이시라면 아래 정보로 부탁드려요.

- 수강료 ${TUITION_KO}
- ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

자리는 입금 확인된 순서대로 확정돼요. 카톡 채널이 편하시면 ${KAKAO} 로 말씀해주세요.

감사합니다.
Fan to Pro 운영진 드림`;

const reminderT1_email_en = `Hello, this is Fan to Pro.

Hi {name}, it has been a day since your application. If you have not paid yet, here is the info again.

- Tuition ${TUITION_EN}
- ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name from the form
- Deadline: Sunday, June 21, midnight (KST)

Seats are locked in the order payments arrive. KakaoTalk is the fastest way to reach us: ${KAKAO}

Thank you,
Fan to Pro Team`;

const reminderT1_email_subject_ko = "[Fan to Pro] 입금 안내 다시 보내드려요";
const reminderT1_email_subject_en = "[Fan to Pro] Quick payment reminder";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-3 (reminderD3) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderD3_sms_ko = `[Fan to Pro] 마감 3일 전이에요.

{name} 님 자리 아직 못 잡았어요.
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}
마감 ${DEADLINE_KO}

카톡 문의
${KAKAO}`;

const reminderD3_sms_en = `[Fan to Pro] 3 days to deadline.

Hi {name}, your seat is not locked yet.
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}
Deadline ${DEADLINE_EN}

Questions via KakaoTalk
${KAKAO}`;

const reminderD3_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 신청 마감까지 3일 남았어요. 입금이 확인되지 않은 분은 아직 자리가 확정되지 않았어요.

- 수강료 ${TUITION_KO}
- ${ACCOUNT} (${HOLDER_KO})
- 입금자명 {name}
- 마감 2026년 6월 21일(일) 자정

카톡 채널이 편하시면 ${KAKAO} 로 말씀해주세요. 결제 후 24시간 안에 확인 안내 보내드려요.

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD3_email_en = `Hello, this is Fan to Pro.

Hi {name}, 3 days left until the application deadline. If we have not received your payment, your seat is not yet locked in.

- Tuition ${TUITION_EN}
- ${ACCOUNT_EN} (${HOLDER_EN})
- Depositor name: your full name
- Deadline Sun Jun 21 midnight (KST)

KakaoTalk works too: ${KAKAO}. We send a confirmation within 24 hours of payment.

Thank you,
Fan to Pro Team`;

const reminderD3_email_subject_ko = "[Fan to Pro] 마감 3일 전";
const reminderD3_email_subject_en = "[Fan to Pro] 3 days left";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-1 (reminderD1) — "1기" 표현만 제거
 * ------------------------------------------------------------------------- */

const reminderD1_sms_ko = `[Fan to Pro] 내일 자정 마감이에요.

{name} 님 입금 아직 미확인이에요.
계좌 ${ACCOUNT}
예금주 ${HOLDER_KO}
금액 ${TUITION_KO}

마감 후엔 자리 보장이 어려워요.

카톡 문의
${KAKAO}`;

const reminderD1_sms_en = `[Fan to Pro] Deadline tomorrow midnight.

Hi {name}, payment not received yet.
Account ${ACCOUNT_EN}
Holder ${HOLDER_EN}
Amount ${TUITION_EN}

After deadline we cannot guarantee your seat.

Questions via KakaoTalk
${KAKAO}`;

const reminderD1_email_ko = `안녕하세요, Fan to Pro 입니다 :)

{name} 님, 신청 마감이 내일(6/21 일) 자정이에요. 아직 입금이 확인되지 않은 분께 마지막으로 안내드려요.

- 수강료 ${TUITION_KO}
- ${ACCOUNT} (${HOLDER_KO})
- 입금자명 {name}

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 가능하면 마감 전 입금 부탁드려요.

카톡 채널: ${KAKAO}

감사합니다.
Fan to Pro 운영진 드림`;

const reminderD1_email_en = `Hello, this is Fan to Pro.

Hi {name}, the application deadline is tomorrow (Sun Jun 21) at midnight (KST). One last reminder if you have not paid yet.

- Tuition ${TUITION_EN}
- ${ACCOUNT_EN} (${HOLDER_EN})
- Depositor name: your full name
- Deadline: Sun Jun 21 midnight (KST)

After the deadline, we will process any late payments within 24 hours if seats remain, and auto-refund if no seat is available. Please send payment before the deadline if you can.

KakaoTalk: ${KAKAO}

Thank you,
Fan to Pro Team`;

const reminderD1_email_subject_ko = "[Fan to Pro] 내일 마감 / 마지막 안내";
const reminderD1_email_subject_en = "[Fan to Pro] Last day / deadline tomorrow";

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

export function buildSmsUrl(phone: string, body: string): string {
  // iOS / Android 가 받아들이는 phone 은 + 와 숫자만. 공백/하이픈 제거.
  const cleanedPhone = phone.replace(/[\s\-()]/g, "");
  // sms: URI 의 body 파라미터는 vendor 별 차이가 있어 일관성을 위해 둘 다 시도하는
  // 게 맞으나, iOS Safari + Android Chrome 모두 ?body= 형식을 인식한다.
  return `sms:${cleanedPhone}?body=${encodeURIComponent(body)}`;
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
};
