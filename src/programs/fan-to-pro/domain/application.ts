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

// 메시지 키 상수 - 잘못된 키를 흘리지 않도록 단일 진실 소스로 묶는다.
export const ERROR_KEYS = {
  nameMin: "nameMin",
  nameMax: "nameMax",
  emailInvalid: "emailInvalid",
  phoneInvalid: "phoneInvalid",
  phoneDigits: "phoneDigits",
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
    .refine((v) => digitCount(v) >= 8, ERROR_KEYS.phoneDigits),
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
    .min(2, ERROR_KEYS.universityMin)
    .max(120),
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

export type ApplicantId = z.infer<typeof ApplicantIdSchema>;
export type MarkAsPaidInput = z.infer<typeof MarkAsPaidSchema>;
export type MarkAsCancelledInput = z.infer<typeof MarkAsCancelledSchema>;
export type MarkAsRefundedInput = z.infer<typeof MarkAsRefundedSchema>;

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
