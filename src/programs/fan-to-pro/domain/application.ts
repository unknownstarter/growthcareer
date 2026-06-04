/**
 * Application — 신청 폼 도메인 모델 + zod 스키마.
 * 2-step 폼: Step1(연락처) → Step2(상세).
 *
 * i18n: 에러 메시지는 키만 발행한다 (`applyForm.errors.<key>` 형식). UI
 * 레이어에서 `useTranslations('applyForm.errors')` 로 해석하면 양 locale
 * 동시 대응이 가능하다. 서버 액션은 키를 그대로 반환하고, 클라이언트가
 * 표시 직전에 t() 처리한다.
 */
import { z } from "zod";

const phoneRegex = /^[+0-9\s\-()]{8,20}$/;
const digitCount = (s: string) => (s.match(/\d/g) ?? []).length;

// 메시지 키 상수 — 잘못된 키를 흘리지 않도록 단일 진실 소스로 묶는다.
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
