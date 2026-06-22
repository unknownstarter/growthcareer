/**
 * Application - 신청 폼 도메인 모델 + zod 스키마.
 * 2-step 폼: Step1(연락처) -> Step2(상세).
 *
 * i18n: 에러 메시지는 키만 발행한다 (`applyForm.errors.<key>` 형식). UI
 * 레이어에서 `useTranslations('applyForm.errors')` 로 해석하면 양 locale
 * 동시 대응이 가능하다. 서버 액션은 키를 그대로 반환하고, 클라이언트가
 * 표시 직전에 t() 처리한다.
 */
import { z } from "zod";

const phoneRegex = /^[+0-9\s\-()]{8,20}$/;
const digitCount = (s: string) => (s.match(/\d/g) ?? []).length;

// 한국 휴대폰/일반전화 패턴이면 표준 하이픈 포맷으로 정규화. 외국 번호는
// 원본 trim 만. 운영자가 DB 에서 phone 으로 조회·정렬할 때 일관성 유지.
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("82")) local = "0" + local.slice(2);
  // 010/011/016-019 휴대폰 11자리
  if (local.length === 11 && /^01[016789]/.test(local)) {
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }
  // 011-19 옛 휴대폰 10자리
  if (local.length === 10 && /^01[16789]/.test(local)) {
    return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`;
  }
  // 서울 02 일반전화 10자리
  if (local.length === 10 && local.startsWith("02")) {
    return `${local.slice(0, 2)}-${local.slice(2, 6)}-${local.slice(6)}`;
  }
  // 서울 02 일반전화 9자리
  if (local.length === 9 && local.startsWith("02")) {
    return `${local.slice(0, 2)}-${local.slice(2, 5)}-${local.slice(5)}`;
  }
  return trimmed;
}

// 메시지 키 상수 - 잘못된 키를 흘리지 않도록 단일 진실 소스로 묶는다.
export const ERROR_KEYS = {
  nameMin: "nameMin",
  nameMax: "nameMax",
  emailInvalid: "emailInvalid",
  phoneInvalid: "phoneInvalid",
  phoneDigits: "phoneDigits",
  nationalityRequired: "nationalityRequired",
  birthdateFormat: "birthdateFormat",
  universityMin: "universityMin",
  visaRequired: "visaRequired",
  addressMin: "addressMin",
  consentRequired: "consentRequired",
  consentOperationsRequired: "consentOperationsRequired",
} as const;

export const Step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, ERROR_KEYS.nameMin)
    .max(60, ERROR_KEYS.nameMax),
  email: z.string().trim().email(ERROR_KEYS.emailInvalid),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, ERROR_KEYS.phoneInvalid)
    .refine((v) => digitCount(v) >= 8, ERROR_KEYS.phoneDigits)
    .transform(normalizePhone),
  nationality: z
    .string()
    .trim()
    .min(2, ERROR_KEYS.nationalityRequired)
    .max(60),
});

export const VISA_OPTIONS = [
  "D-2",
  "D-4",
  "D-10",
  "E-7",
  "F-2",
  "F-4",
  "F-6",
  "기타/없음",
] as const;

const checkboxBool = z
  .union([z.literal("on"), z.literal("true"), z.boolean(), z.literal("")])
  .transform((v) => v === "on" || v === "true" || v === true);

const optionalCheckboxBool = z
  .union([z.literal("on"), z.literal("true"), z.boolean(), z.literal(""), z.undefined()])
  .transform((v) => v === "on" || v === "true" || v === true);

export const Step2Schema = z.object({
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_KEYS.birthdateFormat),
  university: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  visa: z.enum(VISA_OPTIONS, { message: ERROR_KEYS.visaRequired }),
  address: z
    .string()
    .trim()
    .min(2, ERROR_KEYS.addressMin)
    .max(200),
  consent: checkboxBool.refine(
    (v) => v === true,
    ERROR_KEYS.consentRequired,
  ),
  consent_operations: checkboxBool.refine(
    (v) => v === true,
    ERROR_KEYS.consentOperationsRequired,
  ),
  consent_marketing: optionalCheckboxBool.optional().default(false),
});

export const ApplicationSchema = Step1Schema.extend(Step2Schema.shape);

export type Step1 = z.infer<typeof Step1Schema>;
export type Step2 = z.infer<typeof Step2Schema>;
export type Application = z.infer<typeof ApplicationSchema>;

export type ApplicationActionState =
  | { status: "idle" }
  | {
      status: "error";
      errors: Partial<Record<keyof Application | "_form", string[]>>;
    }
  | { status: "ok"; id: string }
  | { status: "ok_local"; id: string };

/* ---------------------------------------------------------------------------
 * Admin action contracts (B0007 T8)
 *
 * 운영자 페이지 /admin/applicants 의 server actions 가 사용하는 입력 스키마.
 * 경계 검증 한 번 - 액션 내부에서는 zod 결과를 그대로 신뢰한다.
 * 모든 액션은 uuid id 를 기본 요구하고, 액션별 추가 파라미터를 별도 스키마로 합친다.
 * ------------------------------------------------------------------------- */

export const ApplicantIdSchema = z.object({
  id: z.string().uuid("invalidApplicantId"),
});

export const MarkAsPaidSchema = ApplicantIdSchema.extend({
  amountKrw: z
    .number({ invalid_type_error: "amountInvalid" })
    .int("amountInteger")
    .positive("amountPositive")
    .max(10_000_000, "amountMax"),
  depositorName: z
    .string()
    .trim()
    .min(1, "depositorRequired")
    .max(120, "depositorMax"),
});

export const MarkAsCancelledSchema = ApplicantIdSchema.extend({
  reason: z
    .string()
    .trim()
    .min(1, "reasonRequired")
    .max(500, "reasonMax"),
});

export const MarkAsRefundedSchema = ApplicantIdSchema.extend({
  txnId: z
    .string()
    .trim()
    .min(1, "txnIdRequired")
    .max(120, "txnIdMax"),
});

/**
 * B0018 Wave 1 T2 - 현금영수증 발급 audit.
 *
 * - amountKrw: 발급 금액. 수강료 880,000 기본. 분할 발급도 허용 (positive).
 * - hometaxReceiptNo: 홈택스 발급 번호. 1기는 수동 입력. 형식 자유 (홈택스 포맷이
 *   숫자/하이픈 혼용이라 strict regex 미적용). 길이만 가드.
 * - issuedAt: 발급일 (YYYY-MM-DD). 운영자가 백데이트 가능. 미지정 시 server 가 today.
 * - notes: 메모 자유 (분할/오발급 사유).
 */
export const RecordCashReceiptSchema = ApplicantIdSchema.extend({
  amountKrw: z
    .number({ invalid_type_error: "amountInvalid" })
    .int("amountInteger")
    .positive("amountPositive")
    .max(10_000_000, "amountMax"),
  hometaxReceiptNo: z
    .string()
    .trim()
    .max(60, "hometaxReceiptNoMax")
    .nullish()
    .transform((v) => v?.trim() || null),
  issuedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "issuedAtFormat")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  notes: z
    .string()
    .trim()
    .max(500, "notesMax")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type ApplicantId = z.infer<typeof ApplicantIdSchema>;
export type MarkAsPaidInput = z.infer<typeof MarkAsPaidSchema>;
export type MarkAsCancelledInput = z.infer<typeof MarkAsCancelledSchema>;
export type MarkAsRefundedInput = z.infer<typeof MarkAsRefundedSchema>;
export type RecordCashReceiptInput = z.infer<typeof RecordCashReceiptSchema>;

/**
 * Admin action 결과 - 클라이언트(운영자 페이지) UI 가 그대로 사용.
 * throw 하지 않고 객체로 반환 - UI 가 분기 처리.
 *   ok        : DB UPDATE 성공
 *   stale     : optimistic concurrency 실패 (status 가 예상과 다름).
 *               UI 는 row 를 refetch 하고 토글 상태 갱신.
 *   error     : 입력 검증 실패 또는 DB 오류. error 문자열은 키 (i18n 용).
 */
export type AdminActionResult =
  | { status: "ok" }
  | { status: "stale"; error: "staleStatus" }
  | { status: "error"; error: string };

/**
 * markAsEnrolled_batch 전용 결과 - 단일 row 가 아니라 일괄 결과.
 *   ok       : Postgres 트랜잭션 성공
 *   outcome  : enrolled = 정원 충족 -> paid 전원 enrolled
 *              cancelled = 정원 미달 -> paid 전원 cancelled (환불 대상)
 *   counts   : 영향받은 row 수
 */
export type BatchEnrollResult =
  | {
      status: "ok";
      outcome: "enrolled" | "cancelled";
      counts: { affected: number; threshold: number };
    }
  | { status: "error"; error: string };

/**
 * B0018 Wave 1 T3 - PII 일괄 anonymize 결과.
 *   ok       : Postgres 함수 실행 성공.
 *              anonymizedCount = 이번 호출에서 [redacted] 처리된 row 수.
 *   error    : DB 오류 또는 권한 오류.
 */
export type AnonymizeBatchResult =
  | { status: "ok"; anonymizedCount: number }
  | { status: "error"; error: string };

/**
 * B0018 Wave 1 T4 - 다중 발송 (broadcast) 입력 스키마.
 *
 * 1기 채널 = email BCC only (노아 결정 6). UI 에서 TO/CC 선택지 자체 미노출
 * (Sage 인계: TO 노출 시 수강생 이메일 상호 노출 = 정보통신망법 위반 risk).
 *
 * applicantIds:
 *   - min 1, max 100. mailto: 길이 한계 (대부분 OS 2KB) 때문에 50명 초과 시
 *     UI 가 경고. server 는 100명까지는 INSERT 허용.
 *   - 모든 id 는 redacted_at IS NULL 이어야 함 (server action 에서 추가 가드).
 *
 * subject / body:
 *   - subject max 200자. body max 5000자. UI 가 char count 표시.
 *   - 둘 다 CRLF 인젝션 차단을 위해 \r\n -> \n normalize (mailto 헤더 변조 방지).
 *
 * templateId:
 *   - 운영자가 in-app 에서 자유 작성하므로 옵션. 추후 정형 템플릿 도입 시 활용.
 */
export const BroadcastSendSchema = z.object({
  applicantIds: z
    .array(z.string().uuid("invalidApplicantId"))
    .min(1, "applicantIdsRequired")
    .max(100, "applicantIdsMax"),
  channel: z.literal("email"),
  subject: z
    .string()
    .trim()
    .min(1, "subjectRequired")
    .max(200, "subjectMax"),
  body: z
    .string()
    .min(1, "bodyRequired")
    .max(5000, "bodyMax"),
  templateId: z
    .string()
    .trim()
    .max(60, "templateIdMax")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type BroadcastSendInput = z.infer<typeof BroadcastSendSchema>;

/**
 * 개별 메시지 발송 audit (B0041) — 운영자가 신청자 단일 대상 message-drawer
 * 에서 [메일 앱 열기] / [SMS 앱 열기] / [본문 복사] 클릭 시 호출.
 *
 * 채널: email | sms (kakao 채널 / 알림톡 미적용).
 * direction: 'individual' 고정. recipient_count = 1 고정.
 * templateId: paymentGuide / paymentConfirmed / reminderT1/D3/D1 / referralInvite / cohortKickoff
 * subject / body 는 audit 차원에서 X — drawer 가 templates.ts 의 표준 문구만 사용.
 */
export const IndividualSendLogSchema = z.object({
  applicantId: z.string().uuid("invalidApplicantId"),
  channel: z.enum(["email", "sms"]),
  templateId: z
    .string()
    .trim()
    .min(1, "templateIdRequired")
    .max(60, "templateIdMax"),
});

export type IndividualSendLogInput = z.infer<typeof IndividualSendLogSchema>;

export type IndividualSendLogResult =
  | { status: "ok" }
  | { status: "error"; error: string };

/**
 * B0042 — applicant_milestones 토글.
 *
 * milestone_type 은 운영 단계 식별자 (guide_sent / feedback_done 등). 자유 텍스트지만
 * client/server 가 같이 알아야 하니 enum 으로 제한 (서버 신뢰 X — 추가 시 enum 갱신).
 *
 * action='mark' → upsert (이미 있으면 marked_at 갱신)
 * action='unmark' → DELETE row (history 보존 안 함 — 단순 운영자 toggle 패턴)
 */
export const APPLICANT_MILESTONE_TYPES = [
  "guide_sent",
  "feedback_done",
] as const;
export type ApplicantMilestoneType = (typeof APPLICANT_MILESTONE_TYPES)[number];

export const MilestoneToggleSchema = z.object({
  applicantId: z.string().uuid("invalidApplicantId"),
  milestoneType: z.enum(APPLICANT_MILESTONE_TYPES),
  action: z.enum(["mark", "unmark"]),
  notes: z.string().trim().max(500).optional(),
});

export type MilestoneToggleInput = z.infer<typeof MilestoneToggleSchema>;

export type MilestoneToggleResult =
  | { status: "ok"; markedAt: string | null }
  | { status: "error"; error: string };

/**
 * B0018 Wave 1 T4 - broadcast 발송 결과.
 *   ok            : messages_log INSERT 완료. insertedCount = 기록된 row 수.
 *                    개별 row N 개 (applicant_id 별) 패턴 채택. broadcast row 0.
 *                    (신청자별 발송 이력 검색 우선.)
 *   skippedCount  : redacted_at IS NOT NULL 로 차단된 id 수. UI 가 경고 표시.
 *   error         : 입력 검증 / DB 오류. error 는 키 문자열.
 */
export type BroadcastSendResult =
  | {
      status: "ok";
      insertedCount: number;
      skippedCount: number;
    }
  | { status: "error"; error: string };
