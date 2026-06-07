/**
 * Instructor - 강사 도메인 모델 + 강사료 정산 룰.
 *
 * 계약서 (docs/contracts/instructor-agreement.md) §4, §5 의 강사료 정책을
 * 코드로 박제한다. UI/server action 양쪽이 동일 함수를 import 하여 결과
 * 불일치 0.
 *
 * 정책 (계약서 §4):
 *   - 20명 미만 (< 20)   → 강좌 취소, 강사료 지급 안 함 (제6조 차기 기수 이연).
 *   - 20명 이상          → base 2,500,000원.
 *   - 30명 만석 (= 30)   → base 3,000,000원.
 *   - 사이 (21~29명)     → base 2,500,000원 (2단계만, 사이 세분 차등 없음).
 *
 * 세금 처리 (계약서 §5-1):
 *   - withholding_3_3 (사업소득 원천징수 3.3%)
 *       tax = base * 0.033 (소득세 3% + 지방소득세 0.3%)
 *       net = base - tax
 *   - tax_invoice (세금계산서 발행, 부가세 10% 가산)
 *       tax = base * 0.10
 *       net = base + tax
 *
 * 본 모듈은 server-safe (순수 함수 only, side effect 0).
 */
import { z } from "zod";

/* --------------------------------------------------------------------------
 * 1. 정책 상수
 * ------------------------------------------------------------------------ */

/** 강사료 base tier (계약서 §4-1). */
export const INSTRUCTOR_FEE_TIERS = {
  twentyPlus: 2_500_000,
  thirtyFull: 3_000_000,
} as const;

/** 강좌 개강 최소 인원 (계약서 §6). 미달 시 강사료 미지급. */
export const INSTRUCTOR_FEE_MIN_ENROLLED = 20;

/** 30명 만석 기준 (계약서 §4-1). */
export const INSTRUCTOR_FEE_FULL_ENROLLED = 30;

/** 세율 (계약서 §5-1). */
export const TAX_RATES = {
  /** 사업소득 원천징수: 소득세 3% + 지방소득세 0.3% = 3.3%. */
  withholding_3_3: 0.033,
  /** 세금계산서 발행: 부가가치세 10% (base 에 가산). */
  tax_invoice: 0.1,
} as const;

export type InstructorTaxMode = "withholding_3_3" | "tax_invoice";

export type InstructorDay = "saturday" | "sunday";

/* --------------------------------------------------------------------------
 * 2. 강사료 정산 계산
 * ------------------------------------------------------------------------ */

export type InstructorFeeBreakdown = {
  /** 정산 대상 여부. enrolledCount < 20 이면 false. */
  shouldPay: boolean;
  /** 1기 계약서 §4 의 base (250만 또는 300만). 미정산 시 0. */
  baseFeeKrw: number;
  /** 세금. withholding_3_3 = 차감, tax_invoice = 가산. 미정산 시 0. */
  taxKrw: number;
  /** 실지급액. withholding_3_3 = base-tax, tax_invoice = base+tax. 미정산 시 0. */
  netKrw: number;
  /** UI 표시용 부가 정보. */
  meta: {
    taxMode: InstructorTaxMode;
    enrolledCount: number;
    /** 'below_minimum' | 'twenty_plus' | 'thirty_full' */
    tier: "below_minimum" | "twenty_plus" | "thirty_full";
    /** 세금 라벨 (UI 직접 사용). */
    taxLabel: string;
  };
};

/**
 * 강사료 정산 계산.
 *
 * - 입력 검증은 호출부 (server action) 가 zod 로 1회. 본 함수는 enrolledCount
 *   ≥ 0, taxMode ∈ enum 을 신뢰.
 * - 30명 초과 (이론상 35명 등) 는 만석 (300만) 으로 처리. 정원 30명 cap 은
 *   ENROLLMENT_CAP 에서 막혀 도달 불가하지만 방어적 처리.
 *
 * @example
 *   calculateInstructorFee('withholding_3_3', 25)
 *     → { shouldPay: true, baseFeeKrw: 2500000, taxKrw: 82500, netKrw: 2417500, ... }
 *   calculateInstructorFee('tax_invoice', 30)
 *     → { shouldPay: true, baseFeeKrw: 3000000, taxKrw: 300000, netKrw: 3300000, ... }
 *   calculateInstructorFee('withholding_3_3', 19)
 *     → { shouldPay: false, baseFeeKrw: 0, taxKrw: 0, netKrw: 0, ... }
 */
export function calculateInstructorFee(
  taxMode: InstructorTaxMode,
  enrolledCount: number,
): InstructorFeeBreakdown {
  // 20명 미만 → 정산 안 함.
  if (enrolledCount < INSTRUCTOR_FEE_MIN_ENROLLED) {
    return {
      shouldPay: false,
      baseFeeKrw: 0,
      taxKrw: 0,
      netKrw: 0,
      meta: {
        taxMode,
        enrolledCount,
        tier: "below_minimum",
        taxLabel: taxMode === "withholding_3_3" ? "원천징수 3.3%" : "부가세 10%",
      },
    };
  }

  const isFull = enrolledCount >= INSTRUCTOR_FEE_FULL_ENROLLED;
  const baseFeeKrw = isFull
    ? INSTRUCTOR_FEE_TIERS.thirtyFull
    : INSTRUCTOR_FEE_TIERS.twentyPlus;
  const tier = isFull ? "thirty_full" : "twenty_plus";

  // 세금 계산. Math.round 로 원 단위 반올림 (실무 송금 단위).
  const rate = TAX_RATES[taxMode];
  const taxKrw = Math.round(baseFeeKrw * rate);
  const netKrw =
    taxMode === "withholding_3_3"
      ? baseFeeKrw - taxKrw
      : baseFeeKrw + taxKrw;

  return {
    shouldPay: true,
    baseFeeKrw,
    taxKrw,
    netKrw,
    meta: {
      taxMode,
      enrolledCount,
      tier,
      taxLabel:
        taxMode === "withholding_3_3" ? "원천징수 3.3%" : "부가세 10%",
    },
  };
}

/* --------------------------------------------------------------------------
 * 3. zod 스키마 (server action 경계 검증용)
 * ------------------------------------------------------------------------ */

const TaxModeSchema = z.enum(["withholding_3_3", "tax_invoice"], {
  message: "taxModeInvalid",
});

const DaySchema = z.enum(["saturday", "sunday"], { message: "dayInvalid" });

/**
 * 강사 생성 입력. PII (phone/email/계좌/주민번호/사업자번호) 는 nullable.
 * seed row 가 비어있고 운영자가 in-app 으로 추후 채움.
 */
export const CreateInstructorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "nameRequired")
    .max(60, "nameMax"),
  day: DaySchema,
  phone: z.string().trim().max(40, "phoneMax").optional()
    .or(z.literal("").transform(() => undefined)),
  email: z.string().trim().email("emailInvalid").max(120, "emailMax").optional()
    .or(z.literal("").transform(() => undefined)),
  bankName: z.string().trim().max(60, "bankNameMax").optional()
    .or(z.literal("").transform(() => undefined)),
  bankAccount: z.string().trim().max(60, "bankAccountMax").optional()
    .or(z.literal("").transform(() => undefined)),
  bankHolder: z.string().trim().max(60, "bankHolderMax").optional()
    .or(z.literal("").transform(() => undefined)),
  taxMode: TaxModeSchema,
  businessNo: z.string().trim().max(40, "businessNoMax").optional()
    .or(z.literal("").transform(() => undefined)),
  residentNo: z.string().trim().max(40, "residentNoMax").optional()
    .or(z.literal("").transform(() => undefined)),
  baseFeeKrw: z
    .number({ invalid_type_error: "baseFeeInvalid" })
    .int("baseFeeInteger")
    .min(0, "baseFeeMin")
    .max(50_000_000, "baseFeeMax"),
  bonusThirtyKrw: z
    .number({ invalid_type_error: "bonusInvalid" })
    .int("bonusInteger")
    .min(0, "bonusMin")
    .max(50_000_000, "bonusMax")
    .optional()
    .nullable(),
  notes: z.string().trim().max(2000, "notesMax").optional()
    .or(z.literal("").transform(() => undefined)),
});

/** 강사 수정 입력. id 필수 + 나머지는 partial (undefined 면 미변경). */
export const UpdateInstructorSchema = z.object({
  id: z.string().uuid("invalidInstructorId"),
  name: CreateInstructorSchema.shape.name.optional(),
  day: DaySchema.optional(),
  phone: CreateInstructorSchema.shape.phone,
  email: CreateInstructorSchema.shape.email,
  bankName: CreateInstructorSchema.shape.bankName,
  bankAccount: CreateInstructorSchema.shape.bankAccount,
  bankHolder: CreateInstructorSchema.shape.bankHolder,
  taxMode: TaxModeSchema.optional(),
  businessNo: CreateInstructorSchema.shape.businessNo,
  residentNo: CreateInstructorSchema.shape.residentNo,
  baseFeeKrw: CreateInstructorSchema.shape.baseFeeKrw.optional(),
  bonusThirtyKrw: CreateInstructorSchema.shape.bonusThirtyKrw,
  notes: CreateInstructorSchema.shape.notes,
});

export const InstructorIdSchema = z.object({
  id: z.string().uuid("invalidInstructorId"),
});

export const RecordInstructorPayoutsSchema = z.object({
  cohortLabel: z
    .string()
    .trim()
    .min(1, "cohortLabelRequired")
    .max(60, "cohortLabelMax")
    .default("1기"),
  /**
   * 정산 대상 강사 ID (지정 시 그 강사들만). 빈 배열/미지정 시 전체 강사
   * 대상으로 계산 (단, shouldPay=false 인 강사는 자동 skip).
   */
  instructorIds: z.array(z.string().uuid("invalidInstructorId")).optional(),
});

export type CreateInstructorInput = z.infer<typeof CreateInstructorSchema>;
export type UpdateInstructorInput = z.infer<typeof UpdateInstructorSchema>;
export type RecordInstructorPayoutsInput = z.infer<
  typeof RecordInstructorPayoutsSchema
>;

/* --------------------------------------------------------------------------
 * 4. server action 결과 타입
 * ------------------------------------------------------------------------ */

export type InstructorRow = {
  id: string;
  name: string;
  day: InstructorDay;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  taxMode: InstructorTaxMode;
  businessNo: string | null;
  residentNo: string | null;
  baseFeeKrw: number;
  bonusThirtyKrw: number | null;
  notes: string | null;
  createdAt: string;
};

export type InstructorPayoutRow = {
  id: string;
  instructorId: string;
  cohortLabel: string;
  baseFeeKrw: number;
  taxKrw: number;
  netKrw: number;
  enrolledCountSnapshot: number;
  taxModeSnapshot: InstructorTaxMode;
  paidAt: string | null;
  paidBy: string | null;
  notes: string | null;
  createdAt: string;
};

export type RecordInstructorPayoutsResult =
  | {
      status: "ok";
      records: Array<{
        instructorId: string;
        instructorName: string;
        baseFeeKrw: number;
        taxKrw: number;
        netKrw: number;
        skipped: boolean;
        skipReason?: "below_minimum" | "already_recorded";
      }>;
      enrolledCount: number;
    }
  | { status: "error"; error: string };
