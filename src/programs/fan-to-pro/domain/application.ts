/**
 * Application — 신청 폼 도메인 모델 + zod 스키마.
 * 2-step 폼: Step1(연락처) → Step2(상세).
 */
import { z } from "zod";

const phoneRegex = /^[+0-9\s\-()]{8,20}$/;

export const Step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "이름을 2자 이상 입력해주세요.")
    .max(60, "이름이 너무 깁니다."),
  email: z.string().trim().email("유효한 이메일 주소를 입력해주세요."),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, "유효한 연락처를 입력해주세요. (숫자, +, -, 공백)"),
});

export const VISA_OPTIONS = [
  "D-2",
  "D-4",
  "F-2",
  "F-4",
  "F-6",
  "기타/없음",
] as const;

const checkboxBool = z
  .union([z.literal("on"), z.literal("true"), z.boolean(), z.literal("")])
  .transform((v) => v === "on" || v === "true" || v === true);

export const Step2Schema = z.object({
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "생년월일은 YYYY-MM-DD 형식이어야 합니다."),
  university: z.string().trim().min(2, "재학/졸업 대학을 입력해주세요.").max(120),
  visa: z.enum(VISA_OPTIONS, { message: "비자 상태를 선택해주세요." }),
  address: z.string().trim().min(2, "거주지를 입력해주세요.").max(200),
  consent: checkboxBool.refine(
    (v) => v === true,
    "개인정보 수집·이용에 동의해야 신청할 수 있습니다.",
  ),
  consent_attendance: checkboxBool.refine(
    (v) => v === true,
    "출석 약속 · 환불 정책에 동의해야 신청할 수 있습니다.",
  ),
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
