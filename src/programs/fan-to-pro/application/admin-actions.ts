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
  BroadcastSendSchema,
  IndividualSendLogSchema,
  MarkAsPaidSchema,
  MarkAsCancelledSchema,
  MarkAsRefundedSchema,
  MilestoneToggleSchema,
  RecordCashReceiptSchema,
  type AdminActionResult,
  type AnonymizeBatchResult,
  type BatchEnrollResult,
  type BroadcastSendResult,
  type IndividualSendLogResult,
  type MilestoneToggleResult,
} from "@/src/programs/fan-to-pro/domain/application";
import { ENROLLMENT_CAP } from "@/src/programs/fan-to-pro/domain/marketing/program-config";
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { assertAdmin } from "@/src/programs/fan-to-pro/admin/role";
import {
  fetchCashReceipts as fetchCashReceiptsImpl,
  fetchMessagesForApplicant as fetchMessagesForApplicantImpl,
} from "@/src/programs/fan-to-pro/admin/fetch-applicants";
import type {
  CashReceiptRow,
  MessageLogRow,
} from "@/src/programs/fan-to-pro/admin/types";

const TABLE = "applicants";

// 1기 단일 운영자. 향후 multi-operator 도입 시 환경 변수 / Supabase Auth 로 교체.
const OPERATOR_ID = process.env.ADMIN_OPERATOR_ID ?? "noah";

// 신청 마감 - Asia/Seoul KST. payment_due_at 의 상한 cap.
// 2026-06-21 23:59:59 KST = 2026-06-21 14:59:59 UTC
const ENROLLMENT_DEADLINE_ISO = "2026-06-21T14:59:59Z";

// markAsNotified 시 자동 부여하는 payment_due_at 의 기본 grace.
const PAYMENT_GRACE_DAYS = 3;

/**
 * 공통 헬퍼: admin role 검증 + supabase 클라이언트 반환. viewer 자격으로
 * 도달한 호출은 즉시 throw → middleware UI hide 와 함께 2중 방어.
 * supabase 가 없으면 (로컬 모의 모드) null. 호출부는 결과 객체를 그대로
 * UI 에 전달.
 */
async function requireSupabase() {
  await assertAdmin();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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
  const supabase = await requireSupabase();
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

/* ---------------------------------------------------------------------------
 * 8. recordCashReceipt - B0018 Wave 1 T2
 *   현금영수증 자진발급 audit row 1건 INSERT.
 *   대상: applicants.status in ('paid','enrolled','refunded') 만 허용
 *         (notified / pending / overdue / cancelled 는 입금 사실 자체가 없거나 미정).
 *   note: 발급은 운영자가 홈택스에서 수동 처리 → 본 액션은 사후 audit row 작성.
 * ------------------------------------------------------------------------- */
export async function recordCashReceipt(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = RecordCashReceiptSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // 대상 applicant 의 status 검증 (UI 가드 우회 방지).
  const { data: target, error: readErr } = await supabase
    .from(TABLE)
    .select("status, redacted_at")
    .eq("id", parsed.data.id)
    .single();

  if (readErr) return { status: "error", error: readErr.message };
  if (!target) return { status: "stale", error: "staleStatus" };
  if (target.redacted_at !== null && target.redacted_at !== undefined) {
    return { status: "error", error: "applicantRedacted" };
  }
  if (!["paid", "enrolled", "refunded"].includes(String(target.status))) {
    return { status: "stale", error: "staleStatus" };
  }

  const issuedAt = parsed.data.issuedAt
    ? `${parsed.data.issuedAt}T00:00:00Z` // 날짜만 입력 시 UTC 자정 - 표시는 KST 로 변환.
    : new Date().toISOString();

  const { error } = await supabase.from("cash_receipts").insert({
    applicant_id: parsed.data.id,
    amount_krw: parsed.data.amountKrw,
    hometax_receipt_no: parsed.data.hometaxReceiptNo ?? null,
    issued_at: issuedAt,
    issued_by: OPERATOR_ID,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { status: "error", error: error.message };
  return { status: "ok" };
}

/* ---------------------------------------------------------------------------
 * 9. markPiiAnonymizeBatch - B0018 Wave 1 T3
 *   public.anonymize_applicants_past_retention() Postgres 함수 호출.
 *   조건: status in ('enrolled','cancelled','refunded')
 *         + (payment_confirmed_at | cancelled_at | refunded_at) > 6 months ago
 *         + redacted_at IS NULL
 *   동작: name/email/phone/address = '[redacted]', birthdate = null, redacted_at = now()
 *   반환: anonymizedCount = 이번 호출에서 처리된 row 수.
 *
 * 호출 패턴: 운영자가 [종강 +6개월 경과 PII 파기] 버튼 클릭 + 2단계 confirm 후 1회.
 * 동시성: 함수가 멱등 (redacted_at IS NULL 조건) → 중복 클릭 안전.
 * ------------------------------------------------------------------------- */
export async function markPiiAnonymizeBatch(): Promise<AnonymizeBatchResult> {
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { data, error } = await supabase.rpc(
    "anonymize_applicants_past_retention",
  );

  if (error) return { status: "error", error: error.message };

  // RPC 의 returns table (anonymized_count integer) → row 배열로 들어옴.
  const first = Array.isArray(data) ? data[0] : data;
  const raw = first as Record<string, unknown> | null;
  const count = raw && typeof raw.anonymized_count === "number"
    ? raw.anonymized_count
    : 0;

  return { status: "ok", anonymizedCount: count };
}

/* ---------------------------------------------------------------------------
 * 10. listCashReceipts - B0018 Wave 1 T2
 *   drawer 의 "발급 N건" 클릭 시 client 가 호출. fetch-applicants.ts 의
 *   helper 를 server action 으로 thin wrap.
 * ------------------------------------------------------------------------- */
export async function listCashReceipts(
  input: unknown,
): Promise<
  | { status: "ok"; rows: CashReceiptRow[] }
  | { status: "error"; error: string }
> {
  // viewer (코워크 공유) 는 명단만 read. drawer 의 영수증 내역은 admin 전용.
  await assertAdmin();
  const parsed = ApplicantIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const { rows, error } = await fetchCashReceiptsImpl(parsed.data.id);
  if (error) return { status: "error", error };
  return { status: "ok", rows };
}

/* ---------------------------------------------------------------------------
 * 11. logBroadcastSend - B0018 Wave 1 T4
 *
 *   다중 발송 모달이 [메일 앱 열기] 클릭 후 동시에 호출. messages_log 일괄
 *   INSERT 만 담당 (실제 발송은 클라이언트에서 mailto: 로 OS 기본 메일 앱을
 *   띄움).
 *
 *   채택 패턴 (spec §4 권장):
 *     - applicantId 별 row N개 INSERT (direction='broadcast', recipient_count=1)
 *     - 별도 aggregate row 0 (신청자별 발송 이력 검색 우선)
 *
 *   redacted_at IS NOT NULL row 는 건너뜀 (UI 에서 체크박스 비활성으로 1차
 *   차단. server 가 2차 가드 - id 위변조 방지). skippedCount 로 반환.
 *
 *   body_excerpt = body 앞 200자. PII 최소화 (mailto body 가 실제 발송 본문,
 *   여기는 audit 용 요약만).
 *
 *   subject / body 의 CRLF 인젝션은 zod 검증 후 server 에서도 normalize.
 * ------------------------------------------------------------------------- */
export async function logBroadcastSend(
  input: unknown,
): Promise<BroadcastSendResult> {
  const parsed = BroadcastSendSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // 중복 id 제거 + CRLF normalize.
  const uniqueIds = Array.from(new Set(parsed.data.applicantIds));
  const normalizedSubject = parsed.data.subject.replace(/[\r\n]+/g, " ").trim();
  const normalizedBody = parsed.data.body.replace(/\r\n/g, "\n");
  const bodyExcerpt = normalizedBody.slice(0, 200);

  // redacted_at NOT NULL 인 id 차단 (id 위변조 / 경쟁 조건 가드).
  const { data: targets, error: readErr } = await supabase
    .from(TABLE)
    .select("id, redacted_at")
    .in("id", uniqueIds);

  if (readErr) return { status: "error", error: readErr.message };

  const validIds: string[] = [];
  let skippedCount = 0;
  for (const id of uniqueIds) {
    const target = targets?.find(
      (t) => String((t as Record<string, unknown>).id ?? "") === id,
    );
    if (!target) {
      skippedCount += 1;
      continue;
    }
    const redactedAt = (target as Record<string, unknown>).redacted_at;
    if (redactedAt) {
      skippedCount += 1;
      continue;
    }
    validIds.push(id);
  }

  if (validIds.length === 0) {
    return { status: "ok", insertedCount: 0, skippedCount };
  }

  const sentAt = new Date().toISOString();
  const rows = validIds.map((applicantId) => ({
    applicant_id: applicantId,
    channel: parsed.data.channel,
    direction: "broadcast" as const,
    template_id: parsed.data.templateId ?? null,
    subject: normalizedSubject,
    body_excerpt: bodyExcerpt,
    sent_at: sentAt,
    sent_by: OPERATOR_ID,
    recipient_count: 1,
  }));

  const { error: insertErr } = await supabase.from("messages_log").insert(rows);
  if (insertErr) return { status: "error", error: insertErr.message };

  return {
    status: "ok",
    insertedCount: validIds.length,
    skippedCount,
  };
}

/* ---------------------------------------------------------------------------
 * 11.5 logIndividualSend - B0041
 *
 *   message-drawer 의 [메일 앱 열기] / [SMS 앱 열기] / [본문 복사] 클릭 시
 *   호출. messages_log 에 individual row INSERT — 발송 audit trail.
 *   logBroadcastSend 와 동일 패턴 (direction='individual' 차이만).
 *
 *   subject / body_excerpt 는 templates.ts 의 표준 문구라 audit 차원에서 생략.
 *   (필요 시 향후 client 에서 함께 전달하도록 확장 가능.)
 *
 *   중복 호출 시 messages_log row N개 누적 (의도) — 같은 신청자에게 같은 kind
 *   여러 번 보낼 수 있고 모두 audit 가치 있음 (예: reminder 3회).
 * ------------------------------------------------------------------------- */
export async function logIndividualSend(
  input: unknown,
): Promise<IndividualSendLogResult> {
  const parsed = IndividualSendLogSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // redacted_at NOT NULL 차단 (PII 파기 row 에 메시지 발송 audit 금지).
  const { data: target, error: readErr } = await supabase
    .from(TABLE)
    .select("id, redacted_at")
    .eq("id", parsed.data.applicantId)
    .single();
  if (readErr) return { status: "error", error: readErr.message };
  if (!target) return { status: "error", error: "notFound" };
  if ((target as Record<string, unknown>).redacted_at) {
    return { status: "error", error: "applicantRedacted" };
  }

  const { error: insertErr } = await supabase.from("messages_log").insert({
    applicant_id: parsed.data.applicantId,
    channel: parsed.data.channel,
    direction: "individual" as const,
    template_id: parsed.data.templateId,
    sent_at: new Date().toISOString(),
    sent_by: OPERATOR_ID,
    recipient_count: 1,
  });
  if (insertErr) return { status: "error", error: insertErr.message };

  return { status: "ok" };
}

/* ---------------------------------------------------------------------------
 * 11.6 toggleApplicantMilestone - B0042
 *
 *   운영자 click 토글 — applicant_milestones row INSERT (mark) / DELETE (unmark).
 *   milestone_type: guide_sent / feedback_done / ... (도메인 enum 으로 제한).
 *
 *   mark 시 marked_at = now(). 이미 있으면 갱신 (upsert).
 *   unmark 시 row 삭제 (history 보존 안 함 — 운영자 실수 토글 즉시 되돌리기 가능).
 * ------------------------------------------------------------------------- */
export async function toggleApplicantMilestone(
  input: unknown,
): Promise<MilestoneToggleResult> {
  const parsed = MilestoneToggleSchema.safeParse(input);
  if (!parsed.success) return { status: "error", error: "invalidInput" };

  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  if (parsed.data.action === "mark") {
    const markedAt = new Date().toISOString();
    const { error } = await supabase
      .from("applicant_milestones")
      .upsert(
        {
          applicant_id: parsed.data.applicantId,
          milestone_type: parsed.data.milestoneType,
          marked_at: markedAt,
          marked_by: OPERATOR_ID,
          notes: parsed.data.notes ?? null,
        },
        { onConflict: "applicant_id,milestone_type" },
      );
    if (error) return { status: "error", error: error.message };
    return { status: "ok", markedAt };
  }

  // unmark
  const { error } = await supabase
    .from("applicant_milestones")
    .delete()
    .eq("applicant_id", parsed.data.applicantId)
    .eq("milestone_type", parsed.data.milestoneType);
  if (error) return { status: "error", error: error.message };
  return { status: "ok", markedAt: null };
}

/* ---------------------------------------------------------------------------
 * 12. listMessagesForApplicant - B0018 Wave 1 T4
 *   발송 카운트 chip 클릭 시 history drawer 가 호출. 신청자별 sent_at DESC.
 * ------------------------------------------------------------------------- */
export async function listMessagesForApplicant(
  input: unknown,
): Promise<
  | { status: "ok"; rows: MessageLogRow[] }
  | { status: "error"; error: string }
> {
  // viewer (코워크 공유) 는 명단만 read. 메시지 이력은 admin 전용.
  await assertAdmin();
  const parsed = ApplicantIdSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const { rows, error } = await fetchMessagesForApplicantImpl(parsed.data.id);
  if (error) return { status: "error", error };
  return { status: "ok", rows };
}
