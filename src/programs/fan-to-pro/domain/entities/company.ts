/**
 * Company entity (강사 회사) — ADR 0005 §6.
 *
 * Wave 0 마이그레이션에 companies 테이블 박힘. 본 entity 는 Wave 2 의 LMS
 * 어드민 surface 에서 사용. domain layer 룰 = 외부 의존성 0 (zod 만).
 *
 * Invariant:
 * - vat_issuer=true → 정산 시 부가세 10% 가산 (Wave 3 정산 계산기에서 사용)
 *
 * State machine:
 *   active → inactive
 */
import { z } from "zod";

export const COMPANY_STATUSES = ["active", "inactive"] as const;
export const CompanyStatusSchema = z.enum(COMPANY_STATUSES);
export type CompanyStatus = z.infer<typeof CompanyStatusSchema>;

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  biz_no: z.string().nullable(),
  address: z.string().nullable(),
  contact_name: z.string().nullable(),
  contact_email: z.string().nullable(),
  bank_name: z.string().nullable(),
  bank_account: z.string().nullable(),
  bank_holder: z.string().nullable(),
  vat_issuer: z.boolean(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export type Company = z.infer<typeof CompanySchema>;
