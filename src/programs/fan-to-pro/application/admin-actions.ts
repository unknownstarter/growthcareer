"use server";

/**
 * Admin actions - B0007 T8.
 *
 * /admin/applicants 운영자 페이지에서 호출되는 server actions 7종.
 * 모든 액션은:
 *   - zod 로 입력을 경계 검증 한 번. 내부에서는 검증 결과를 신뢰.
 *   - Supabase service_role 클라이언트로 직접 UPDATE.
 *   - optimistic concurrency 사용 (UPDATE ... WHERE id=? AND status IN (?))
 *     -> status mismatch 면 'stale' 반환. UI 가 refetch 처리.
 *   - throw 하지 않고 { status: 'ok' | 'stale' | 'error' } 반환.
 *
 * 상태 전이 표 (가드):
 *   pending     -> notified     (markAsNotified)
 *   notified    -> notified     (sendReminder, count++)
 *   notified    -> paid         (markAsPaid)
 *   notified    -> overdue      (markAsOverdue)
 *   * any *     -> cancelled    (markAsCancelled)
 *   paid|cancel -> refunded     (markAsRefunded)
 *   paid (N개)  -> enrolled|cancelled (markAsEnrolledBatch, threshold 가드)
 */

import {
  ApplicantIdSchema,
  MarkAsPaidSchema,
  MarkAsCancelledSchema,
  MarkAsRefundedSchema,
  type AdminActionResult,
  type BatchEnrollResult,
} from "@/src/programs/fan-to-pro/domain/application";
import { ENROLLMENT_CAP } from "@/src/programs/fan-to-pro/domain/program";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

const TABLE = "applicants";

// 1기 단일 운영자. 향후 multi-operator 도입 시 환경 변수 / Supabase Auth 로 교체.
const OPERATOR_ID = process.env.ADMIN_OPERATOR_ID ?? "noah";

// 신청 마감 - Asia/Seoul KST. payment_due_at 의 상한 cap.
// 2026-06-21 23:59:59 KST = 2026-06-21 14:59:59 UTC
const ENROLLMENT_DEADLINE_ISO = "2026-06-21T14:59:59Z";

// markAsNotified 시 자동 부여하는 payment_due_at 의 기본 grace.
const PAYMENT_GRACE_DAYS = 3;

/**
 * 공통 헬퍼: supabase 클라이언트가 없으면 (로컬 모의 모드) 'error' 반환.
 * 호출부는 결과 객체를 그대로 UI 에 전달.
 */
function requireSupabase() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return null;
  }
  return supabase;
}

/**
 * 공통 헬퍼: Supabase update 결과를 AdminActionResult 로 변환.
 * WHERE 절의 status 가드 때문에 0 row 면 stale 로 본다.
 */
function toResult(
  affectedRows: number,
  error: { message: string } | null,
): AdminActionResult {
  if (error) {
    return { status: "error", error: error.message };
  }
  if (affectedRows === 0) {
    return { status: "stale", error: "staleStatus" };
  }
  return { status: "ok" };
}

/* ---------------------------------------------------------------------------
 * 1. markAsNotified
 *   pending -> notified
 *   notified_at = now()
 *   payment_due_at = least(now() + 3d, enrollment_deadline)
 * ------------------------------------------------------------------------- */
export async function markAsNotified(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = ApplicantIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const now = new Date();
  const graceMs = PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const graceCandidate = new Date(now.getTime() + graceMs);
  const deadline = new Date(ENROLLMENT_DEADLINE_ISO);
  const dueAt =
    graceCandidate < deadline ? graceCandidate.toISOString() : deadline.toISOString();

  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        status: "notified",
        notified_at: now.toISOString(),
        payment_due_at: dueAt,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("status", "pending");

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 2. sendReminder
 *   notified -> notified (no status change)
 *   reminder_count += 1
 *   last_reminder_at = now()
 *
 * Supabase JS 는 UPDATE 컬럼 self-reference 를 직접 지원하지 않으므로
 *   1) SELECT current reminder_count + status
 *   2) UPDATE WHERE id AND status='notified' AND reminder_count=expected
 *      -> 동시성 충돌 시 자연스럽게 stale.
 * ------------------------------------------------------------------------- */
export async function sendReminder(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = ApplicantIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data: current, error: readErr } = await supabase
    .from(TABLE)
    .select("status, reminder_count")
    .eq("id", parsed.data.id)
    .single();

  if (readErr) return { status: "error", error: readErr.message };
  if (!current) return { status: "stale", error: "staleStatus" };
  if (current.status !== "notified") {
    return { status: "stale", error: "staleStatus" };
  }

  const expected = current.reminder_count ?? 0;
  const next = expected + 1;

  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        reminder_count: next,
        last_reminder_at: new Date().toISOString(),
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("status", "notified")
    .eq("reminder_count", expected);

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 3. markAsPaid
 *   notified -> paid
 *   payment_confirmed_at = now()
 *   paid_amount_krw, depositor_name_observed = params
 *   paid_confirmed_by = OPERATOR_ID
 * ------------------------------------------------------------------------- */
export async function markAsPaid(input: unknown): Promise<AdminActionResult> {
  const parsed = MarkAsPaidSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        status: "paid",
        payment_confirmed_at: new Date().toISOString(),
        paid_amount_krw: parsed.data.amountKrw,
        depositor_name_observed: parsed.data.depositorName,
        paid_confirmed_by: OPERATOR_ID,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .eq("status", "notified");

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 4. markAsOverdue
 *   notified -> overdue (마감 후 운영자 검토 필요한 row 표식)
 *   추가 컬럼 변경 없음. 운영자가 후속으로 cancelled / paid 결정.
 * ------------------------------------------------------------------------- */
export async function markAsOverdue(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = ApplicantIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(TABLE)
    .update({ status: "overdue" }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("status", "notified");

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 5. markAsCancelled
 *   any-non-final -> cancelled
 *   cancelled_at = now()
 *   cancel_reason = reason
 *
 * 가드: 이미 enrolled / refunded 인 row 는 변경 불가. (회계 무결성)
 *   -> WHERE status IN ('pending','notified','paid','overdue') 로 제한.
 * ------------------------------------------------------------------------- */
export async function markAsCancelled(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = MarkAsCancelledSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: parsed.data.reason,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .in("status", ["pending", "notified", "paid", "overdue"]);

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 6. markAsRefunded
 *   paid | cancelled -> refunded
 *   refunded_at = now()
 *   refund_txn_id = txnId
 * ------------------------------------------------------------------------- */
export async function markAsRefunded(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = MarkAsRefundedSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        status: "refunded",
        refunded_at: new Date().toISOString(),
        refund_txn_id: parsed.data.txnId,
      },
      { count: "exact" },
    )
    .eq("id", parsed.data.id)
    .in("status", ["paid", "cancelled"]);

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 7. markAsEnrolledBatch
 *   마감 +24h grace 후 운영자가 호출.
 *   paid 상태 ≥ ENROLLMENT_CAP.minToProceed (20) 이면 모두 enrolled.
 *   미만이면 모두 cancelled (자동 환불 대상).
 *
 * 동시성:
 *   - Supabase JS 에서 트랜잭션을 한 번에 묶기 위해 Postgres RPC 가 이상적이나,
 *     현 단계에서 RPC 함수 별도 마이그레이션 없이 처리하기 위해
 *     "두 단계 + count 가드" 패턴 사용.
 *   - 단계 1: paid count SELECT (FOR UPDATE 가 아닌 일반 read - race risk 인정).
 *   - 단계 2: UPDATE WHERE status='paid' (단일 SQL -> 원자적).
 *   - 본 액션은 운영자가 의도적으로 1회만 호출하는 batch 이므로 race 윈도우 무시 가능.
 *     동시 호출 위험은 dashboard 의 confirm 다이얼로그로 차단 (T7 Luna 책임).
 *
 * 입력 없음. 결과는 BatchEnrollResult.
 * ------------------------------------------------------------------------- */
export async function markAsEnrolledBatch(): Promise<BatchEnrollResult> {
  const supabase = requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { count: paidCount, error: countErr } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "paid");

  if (countErr) return { status: "error", error: countErr.message };

  const total = paidCount ?? 0;
  const threshold = ENROLLMENT_CAP.minToProceed;
  const meets = total >= threshold;

  const nowIso = new Date().toISOString();

  if (meets) {
    const { error, count } = await supabase
      .from(TABLE)
      .update({ status: "enrolled" }, { count: "exact" })
      .eq("status", "paid");
    if (error) return { status: "error", error: error.message };
    return {
      status: "ok",
      outcome: "enrolled",
      counts: { affected: count ?? 0, threshold },
    };
  }

  // 정원 미달 - paid 전원 cancelled (환불은 markAsRefunded 로 별도 처리).
  const { error, count } = await supabase
    .from(TABLE)
    .update(
      {
        status: "cancelled",
        cancelled_at: nowIso,
        cancel_reason: "cohort_min_not_met",
      },
      { count: "exact" },
    )
    .eq("status", "paid");

  if (error) return { status: "error", error: error.message };
  return {
    status: "ok",
    outcome: "cancelled",
    counts: { affected: count ?? 0, threshold },
  };
}
