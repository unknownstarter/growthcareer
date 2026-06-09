"use server";

/**
 * Instructor actions - B0018 Wave 2 T5.
 *
 * /admin/instructors 운영자 페이지의 server actions.
 *
 * 책임:
 *   1) instructors CRUD (create/update/delete).
 *   2) 강사료 일괄 정산 기록 (recordInstructorPayouts) - 노아 결정 9 수동.
 *
 * 원칙:
 *   - 경계 검증 zod 1회 (instructor.ts 의 스키마).
 *   - throw 금지 - { status: 'ok' | 'stale' | 'error' } 반환.
 *   - service_role 클라이언트 직접 사용 (middleware Basic Auth 가 단일 게이트).
 */

import {
  CreateInstructorSchema,
  InstructorIdSchema,
  RecordInstructorPayoutsSchema,
  UpdateInstructorSchema,
  calculateInstructorFee,
  type RecordInstructorPayoutsResult,
} from "@/src/programs/fan-to-pro/domain/instructor";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import type { AdminActionResult } from "@/src/programs/fan-to-pro/domain/application";
import { assertAdmin } from "@/src/programs/fan-to-pro/admin/role";

const INSTRUCTORS_TABLE = "instructors";
const PAYOUTS_TABLE = "instructor_payouts";
const APPLICANTS_TABLE = "applicants";

const OPERATOR_ID = process.env.ADMIN_OPERATOR_ID ?? "noah";

async function requireSupabase() {
  await assertAdmin();
  const supabase = getSupabaseServer();
  return supabase ?? null;
}

/* ---------------------------------------------------------------------------
 * 1. createInstructor
 * ------------------------------------------------------------------------- */
export async function createInstructor(
  input: unknown,
): Promise<
  | { status: "ok"; id: string }
  | { status: "error"; error: string }
> {
  const parsed = CreateInstructorSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const v = parsed.data;
  const { data, error } = await supabase
    .from(INSTRUCTORS_TABLE)
    .insert({
      name: v.name,
      day: v.day,
      phone: v.phone ?? null,
      email: v.email ?? null,
      bank_name: v.bankName ?? null,
      bank_account: v.bankAccount ?? null,
      bank_holder: v.bankHolder ?? null,
      tax_mode: v.taxMode,
      business_no: v.businessNo ?? null,
      resident_no: v.residentNo ?? null,
      base_fee_krw: v.baseFeeKrw,
      bonus_thirty_krw: v.bonusThirtyKrw ?? null,
      notes: v.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { status: "error", error: error.message };
  const id = (data as { id?: string } | null)?.id ?? "";
  if (!id) return { status: "error", error: "noIdReturned" };
  return { status: "ok", id };
}

/* ---------------------------------------------------------------------------
 * 2. updateInstructor
 *
 * partial - undefined 필드는 미변경. id 만 필수.
 * 경합 조건: UPDATE WHERE id 만 → 운영자 1인 가정.
 * ------------------------------------------------------------------------- */
export async function updateInstructor(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = UpdateInstructorSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const v = parsed.data;
  const update: Record<string, unknown> = {};
  if (v.name !== undefined) update.name = v.name;
  if (v.day !== undefined) update.day = v.day;
  if (v.phone !== undefined) update.phone = v.phone ?? null;
  if (v.email !== undefined) update.email = v.email ?? null;
  if (v.bankName !== undefined) update.bank_name = v.bankName ?? null;
  if (v.bankAccount !== undefined) update.bank_account = v.bankAccount ?? null;
  if (v.bankHolder !== undefined) update.bank_holder = v.bankHolder ?? null;
  if (v.taxMode !== undefined) update.tax_mode = v.taxMode;
  if (v.businessNo !== undefined) update.business_no = v.businessNo ?? null;
  if (v.residentNo !== undefined) update.resident_no = v.residentNo ?? null;
  if (v.baseFeeKrw !== undefined) update.base_fee_krw = v.baseFeeKrw;
  if (v.bonusThirtyKrw !== undefined) {
    update.bonus_thirty_krw = v.bonusThirtyKrw ?? null;
  }
  if (v.notes !== undefined) update.notes = v.notes ?? null;

  if (Object.keys(update).length === 0) {
    return { status: "ok" };
  }

  const { error, count } = await supabase
    .from(INSTRUCTORS_TABLE)
    .update(update, { count: "exact" })
    .eq("id", v.id);

  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

/* ---------------------------------------------------------------------------
 * 3. deleteInstructor
 *
 * sessions.instructor_id FK ON DELETE RESTRICT, instructor_payouts.instructor_id
 * FK ON DELETE RESTRICT → 참조 존재 시 Postgres 23503 에러.
 * UI 에 'instructorReferenced' 키 노출.
 * ------------------------------------------------------------------------- */
export async function deleteInstructor(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = InstructorIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(INSTRUCTORS_TABLE)
    .delete({ count: "exact" })
    .eq("id", parsed.data.id);

  if (error) {
    // Postgres FK violation code = 23503.
    const isFkViolation =
      error.message.includes("foreign key") ||
      error.message.includes("23503");
    return {
      status: "error",
      error: isFkViolation ? "instructorReferenced" : error.message,
    };
  }
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}

/* ---------------------------------------------------------------------------
 * 4. recordInstructorPayouts
 *
 * 노아 결정 9: 운영자 수동 트리거 (자동 cron X). UI [정산 기록] 버튼이 호출.
 *
 * 동작:
 *   1) status=enrolled 인 applicants 의 카운트 SELECT.
 *   2) instructor row 전체 (또는 지정된 ids) 조회.
 *   3) 각 강사별 calculateInstructorFee(taxMode, enrolledCount) 계산.
 *      shouldPay=false 면 skip (skipReason='below_minimum').
 *   4) UNIQUE(instructor_id, cohort_label) 충돌 시 skip (skipReason='already_recorded').
 *   5) instructor_payouts 일괄 INSERT (paid_at=null, paid_by=OPERATOR_ID).
 *
 * 동시성:
 *   - SELECT count + UNIQUE 가드 → 운영자 1인 가정에서 race 윈도우 무시 가능.
 *   - 중복 클릭 시 UNIQUE 위반으로 자연스럽게 멱등 (already_recorded).
 *
 * 멱등성:
 *   동일 cohort_label 의 row 가 이미 있으면 새로 만들지 않음. 재정산 필요시
 *   UI 가 cohort_label suffix (예 '1기-재정산') 로 호출.
 * ------------------------------------------------------------------------- */
export async function recordInstructorPayouts(
  input: unknown,
): Promise<RecordInstructorPayoutsResult> {
  const parsed = RecordInstructorPayoutsSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { cohortLabel, instructorIds } = parsed.data;

  // 1) enrolled 인원 count.
  const { count: enrolledCountRaw, error: countErr } = await supabase
    .from(APPLICANTS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "enrolled");

  if (countErr) return { status: "error", error: countErr.message };
  const enrolledCount = enrolledCountRaw ?? 0;

  // 2) 강사 조회.
  let instructorQuery = supabase
    .from(INSTRUCTORS_TABLE)
    .select("id, name, tax_mode");

  if (instructorIds && instructorIds.length > 0) {
    instructorQuery = instructorQuery.in("id", instructorIds);
  }

  const { data: instructorsData, error: instructorsErr } =
    await instructorQuery;

  if (instructorsErr) return { status: "error", error: instructorsErr.message };
  const instructors = (instructorsData ?? []) as Array<{
    id: string;
    name: string;
    tax_mode: string;
  }>;

  if (instructors.length === 0) {
    return { status: "ok", records: [], enrolledCount };
  }

  // 3) 이미 정산 기록된 강사 (멱등성) 조회.
  const instructorIdList = instructors.map((i) => i.id);
  const { data: existingPayouts, error: existingErr } = await supabase
    .from(PAYOUTS_TABLE)
    .select("instructor_id")
    .eq("cohort_label", cohortLabel)
    .in("instructor_id", instructorIdList);

  if (existingErr) return { status: "error", error: existingErr.message };
  const alreadyRecordedIds = new Set(
    (existingPayouts ?? []).map(
      (r) => String((r as Record<string, unknown>).instructor_id ?? ""),
    ),
  );

  // 4) 정산 계산 + INSERT row 빌드.
  type RecordEntry = Extract<
    RecordInstructorPayoutsResult,
    { status: "ok" }
  >["records"][number];
  const records: RecordEntry[] = [];
  const insertRows: Array<{
    instructor_id: string;
    cohort_label: string;
    base_fee_krw: number;
    tax_krw: number;
    net_krw: number;
    enrolled_count_snapshot: number;
    tax_mode_snapshot: string;
    paid_at: string | null;
    paid_by: string;
  }> = [];

  for (const inst of instructors) {
    const taxMode =
      inst.tax_mode === "tax_invoice" ? "tax_invoice" : "withholding_3_3";
    const breakdown = calculateInstructorFee(taxMode, enrolledCount);

    if (!breakdown.shouldPay) {
      records.push({
        instructorId: inst.id,
        instructorName: inst.name,
        baseFeeKrw: 0,
        taxKrw: 0,
        netKrw: 0,
        skipped: true,
        skipReason: "below_minimum",
      });
      continue;
    }

    if (alreadyRecordedIds.has(inst.id)) {
      records.push({
        instructorId: inst.id,
        instructorName: inst.name,
        baseFeeKrw: breakdown.baseFeeKrw,
        taxKrw: breakdown.taxKrw,
        netKrw: breakdown.netKrw,
        skipped: true,
        skipReason: "already_recorded",
      });
      continue;
    }

    insertRows.push({
      instructor_id: inst.id,
      cohort_label: cohortLabel,
      base_fee_krw: breakdown.baseFeeKrw,
      tax_krw: breakdown.taxKrw,
      net_krw: breakdown.netKrw,
      enrolled_count_snapshot: enrolledCount,
      tax_mode_snapshot: taxMode,
      paid_at: null,
      paid_by: OPERATOR_ID,
    });

    records.push({
      instructorId: inst.id,
      instructorName: inst.name,
      baseFeeKrw: breakdown.baseFeeKrw,
      taxKrw: breakdown.taxKrw,
      netKrw: breakdown.netKrw,
      skipped: false,
    });
  }

  // 5) 일괄 INSERT (없으면 skip).
  if (insertRows.length > 0) {
    const { error: insertErr } = await supabase
      .from(PAYOUTS_TABLE)
      .insert(insertRows);
    if (insertErr) return { status: "error", error: insertErr.message };
  }

  return { status: "ok", records, enrolledCount };
}

/* ---------------------------------------------------------------------------
 * 5. markInstructorPayoutPaid
 *
 * 운영자가 송금 완료 후 paid_at 토글. instructor_payouts.id 단위.
 * ------------------------------------------------------------------------- */
export async function markInstructorPayoutPaid(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = InstructorIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(PAYOUTS_TABLE)
    .update(
      {
        paid_at: new Date().toISOString(),
        paid_by: OPERATOR_ID,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .is("paid_at", null);

  if (error) return { status: "error", error: error.message };
  if ((count ?? 0) === 0) return { status: "stale", error: "staleStatus" };
  return { status: "ok" };
}
