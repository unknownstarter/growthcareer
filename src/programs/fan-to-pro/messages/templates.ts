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
 * 4.1 ~ 4.4 입금 안내
 * ------------------------------------------------------------------------- */

const paymentGuide_sms_ko = `[Growth Career] {name} 님, Fan to Pro 1기 신청 감사해요. 입금 안내드려요.

수강료 ${TUITION_KO}
계좌 ${ACCOUNT} (예금주 ${HOLDER_KO})
입금자명 {name}
마감 ${DEADLINE_KO}까지

입금 확인 후 6/27 첫 강의 안내 드려요. 문의는 카톡 채널로 편하게요. ${KAKAO}`;

const paymentGuide_sms_en = `[Growth Career] Hi {name}, thanks for applying to Fan to Pro Cohort 1. Here is your payment guide.

Tuition ${TUITION_EN}
Account ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
Depositor name: {name}
Deadline ${DEADLINE_EN}

We will send the kickoff info for Jun 27 once payment is confirmed. KakaoTalk channel: ${KAKAO}`;

const paymentGuide_email_ko = `{name} 님, 안녕하세요.

Fan to Pro 1기에 신청해 주셔서 감사해요. 자리는 입금이 확인된 순서대로 확정돼요.

결제 정보
- 수강료: ${TUITION_KO} (원가 1,100,000원에서 20% 할인)
- 입금 계좌: ${ACCOUNT}
- 예금주: ${HOLDER_KO}
- 입금자명: {name} 으로 입금 부탁드려요
- 마감: 2026년 6월 21일(일) 자정

입금이 확인되면 별도 안내를 보내드려요. 첫 강의는 6월 27일(토) 입니다.

환불 안내
- 마감 전까지 100% 환불 가능합니다
- 마감 후 강좌가 취소되면 결제 금액 전액이 자동 환불됩니다
- 자세한 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

질문이 있으시면 카카오톡 채널로 편하게 말씀해 주세요.
${KAKAO}

Growth Career 운영팀 드림`;

const paymentGuide_email_en = `Hi {name},

Thanks for applying to Fan to Pro Cohort 1. Your seat is confirmed once we receive your payment, in the order payments arrive.

Payment details
- Tuition: ${TUITION_EN} (20% off from the regular KRW 1,100,000)
- Account: ${ACCOUNT_EN}
- Holder: ${HOLDER_EN}
- Depositor name: please use your full name as written on the form
- Deadline: Sunday, June 21, midnight (KST)

We will send a confirmation as soon as your payment is verified. The first class is Saturday, June 27.

Refund policy
- 100% refund any time before the deadline
- Full automatic refund if the cohort is cancelled after the deadline
- Detailed refund schedule: https://growthcareer.xyz/terms

Any questions? Reach us on KakaoTalk anytime.
${KAKAO}

Growth Career team`;

const paymentGuide_email_subject_ko = "[Growth Career] Fan to Pro 1기 입금 안내";
const paymentGuide_email_subject_en =
  "[Growth Career] Fan to Pro Cohort 1 - Payment Guide";

/* ---------------------------------------------------------------------------
 * 4.5 ~ 4.8 입금 확인 완료
 * ------------------------------------------------------------------------- */

const paymentConfirmed_sms_ko = `[Growth Career] {name} 님, 입금 확인 완료. Fan to Pro 1기 자리가 확정됐어요. 첫 강의 6/27(토) 안내 메일을 곧 보내드려요. 문의는 카톡 채널 ${KAKAO}`;

const paymentConfirmed_sms_en = `[Growth Career] Hi {name}, payment confirmed. Your seat for Fan to Pro Cohort 1 is locked in. We will send kickoff details for Sat Jun 27 shortly. KakaoTalk: ${KAKAO}`;

const paymentConfirmed_email_ko = `{name} 님,

입금 확인이 완료됐어요. Fan to Pro 1기 자리가 확정됐습니다.

첫 강의 안내
- 일시: 2026년 6월 27일(토)
- 장소: 별도 안내 (수강 확정자에게만 개별 공지)
- 준비물: 별도 안내 메일에서 확인 부탁드려요

수강생 카카오톡 오픈채팅 초대 링크는 강의 시작 전 별도로 보내드려요.

환불이 필요하면 마감 전(6/21 자정) 까지는 100% 환불 가능합니다. 그 이후 환불 규정은 약관을 참고해 주세요: https://growthcareer.xyz/terms

Growth Career 운영팀 드림`;

const paymentConfirmed_email_en = `Hi {name},

Your payment has been confirmed. Your seat for Fan to Pro Cohort 1 is locked in.

First class
- Date: Saturday, June 27, 2026
- Venue: Sent separately to confirmed students only
- What to bring: Details in the kickoff email

Student KakaoTalk open chat invitation will arrive before the first class.

If you need a refund, 100% refund is available any time before the deadline (Sun Jun 21 midnight KST). Refund policy after that: https://growthcareer.xyz/terms

Growth Career team`;

const paymentConfirmed_email_subject_ko =
  "[Growth Career] 입금 확인 완료 - Fan to Pro 1기 자리 확정";
const paymentConfirmed_email_subject_en =
  "[Growth Career] Payment Confirmed - Fan to Pro Cohort 1 Seat Locked";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - T+1
 * ------------------------------------------------------------------------- */

const reminderT1_sms_ko = `[Growth Career] {name} 님, Fan to Pro 1기 신청 다음날이에요. 입금이 아직이라면 ${ACCOUNT} (${HOLDER_KO}) 으로 ${TUITION_KO} 부탁드려요. 마감 ${DEADLINE_KO}. 카톡 ${KAKAO}`;

const reminderT1_sms_en = `[Growth Career] Hi {name}, one day after your application. If you have not paid yet, send ${TUITION_EN} to ${ACCOUNT_EN} (${HOLDER_EN}). Deadline ${DEADLINE_EN}. KakaoTalk ${KAKAO}`;

const reminderT1_email_ko = `{name} 님, 안녕하세요.

Fan to Pro 1기 신청하신지 하루가 지났어요. 입금 아직이시라면 아래 정보로 부탁드려요.

- 수강료 ${TUITION_KO}
- ${ACCOUNT} (예금주 ${HOLDER_KO})
- 입금자명: {name}
- 마감: 2026년 6월 21일(일) 자정

자리는 입금 확인된 순서대로 확정돼요. 카톡 채널이 편하시면 ${KAKAO} 로 말씀해 주세요.

Growth Career 운영팀 드림`;

const reminderT1_email_en = `Hi {name},

It has been a day since your application. If you have not paid yet, here is the info again.

- Tuition ${TUITION_EN}
- ${ACCOUNT_EN} (Holder: ${HOLDER_EN})
- Depositor name: your full name from the form
- Deadline: Sunday, June 21, midnight (KST)

Seats are locked in the order payments arrive. KakaoTalk is the fastest way to reach us: ${KAKAO}

Growth Career team`;

const reminderT1_email_subject_ko = "[Growth Career] 입금 안내 다시 보내드려요";
const reminderT1_email_subject_en = "[Growth Career] Quick payment reminder";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-3
 * ------------------------------------------------------------------------- */

const reminderD3_sms_ko = `[Growth Career] 마감 3일 전이에요. {name} 님 자리 아직 못 잡았어요. ${ACCOUNT} (${HOLDER_KO}) ${TUITION_KO} 입금 부탁드려요. 마감 6/21 자정. 카톡 ${KAKAO}`;

const reminderD3_sms_en = `[Growth Career] 3 days to deadline. Hi {name}, your seat is not locked yet. ${ACCOUNT_EN} (${HOLDER_EN}), ${TUITION_EN}. Deadline Sun Jun 21 midnight. KakaoTalk ${KAKAO}`;

const reminderD3_email_ko = `{name} 님,

신청 마감까지 3일 남았어요. 입금이 확인되지 않은 분은 아직 자리가 확정되지 않았어요.

수강료 ${TUITION_KO}
${ACCOUNT} (${HOLDER_KO})
입금자명 {name}
마감 2026년 6월 21일(일) 자정

카톡 채널이 편하시면 ${KAKAO} 로 말씀해 주세요. 결제 후 24시간 안에 확인 안내 보내드려요.

Growth Career 운영팀 드림`;

const reminderD3_email_en = `Hi {name},

3 days left until the application deadline. If we have not received your payment, your seat is not yet locked in.

Tuition ${TUITION_EN}
${ACCOUNT_EN} (${HOLDER_EN})
Depositor name: your full name
Deadline Sun Jun 21 midnight (KST)

KakaoTalk works too: ${KAKAO}. We send a confirmation within 24 hours of payment.

Growth Career team`;

const reminderD3_email_subject_ko =
  "[Growth Career] 마감 3일 전 - Fan to Pro 1기";
const reminderD3_email_subject_en =
  "[Growth Career] 3 days left - Fan to Pro Cohort 1";

/* ---------------------------------------------------------------------------
 * 5. 리마인드 - D-1
 * ------------------------------------------------------------------------- */

const reminderD1_sms_ko = `[Growth Career] 내일 자정 마감이에요. {name} 님 입금 미확인. ${ACCOUNT} (${HOLDER_KO}) ${TUITION_KO}. 마감 후엔 자리 보장 어려워요. 카톡 ${KAKAO}`;

const reminderD1_sms_en = `[Growth Career] Deadline tomorrow midnight. Hi {name}, payment not received yet. ${ACCOUNT_EN} (${HOLDER_EN}), ${TUITION_EN}. After deadline we cannot guarantee your seat. KakaoTalk ${KAKAO}`;

const reminderD1_email_ko = `{name} 님,

Fan to Pro 1기 신청 마감이 내일(6/21 일) 자정이에요. 아직 입금이 확인되지 않은 분께 마지막으로 안내드려요.

- 수강료 ${TUITION_KO}
- ${ACCOUNT} (${HOLDER_KO})
- 입금자명 {name}

마감 이후 입금된 건은 자리가 남은 경우에만 24시간 안에 확인 후 안내드리고, 자리가 없으면 자동 환불됩니다. 가능하면 마감 전 입금 부탁드려요.

카톡 채널: ${KAKAO}

Growth Career 운영팀 드림`;

const reminderD1_email_en = `Hi {name},

The application deadline for Fan to Pro Cohort 1 is tomorrow (Sun Jun 21) at midnight (KST). One last reminder if you have not paid yet.

- Tuition ${TUITION_EN}
- ${ACCOUNT_EN} (${HOLDER_EN})
- Depositor name: your full name

After the deadline, we will process any late payments within 24 hours if seats remain, and auto-refund if no seat is available. Please send payment before the deadline if you can.

KakaoTalk: ${KAKAO}

Growth Career team`;

const reminderD1_email_subject_ko = "[Growth Career] 내일 마감 - 마지막 안내";
const reminderD1_email_subject_en =
  "[Growth Career] Last day - deadline tomorrow";

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

/** SMS / 카톡 본문 — 채널 단일. */
export function getSmsBody(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
): string {
  return fill(TEMPLATES[kind].sms[locale], name);
}

/** 이메일 제목. */
export function getEmailSubject(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
): string {
  return fill(TEMPLATES[kind].email.subject[locale], name);
}

/** 이메일 본문. */
export function getEmailBody(
  kind: MessageKind,
  locale: MessageLocale,
  name: string,
): string {
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
