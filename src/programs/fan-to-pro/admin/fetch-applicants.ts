import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  APPLICANT_STATUSES,
  type ApplicantRow,
  type ApplicantStatus,
} from "./types";

/**
 * 운영자 페이지 server component 가 호출하는 단일 SELECT.
 *
 * - service_role 키로 RLS 우회 → middleware Basic Auth 가 단일 게이트.
 * - 캐시 회피 (`force-cache` 금지): Next.js 16 의 dynamic = 'force-dynamic' 로
 *   페이지 단위 처리 + Supabase JS 는 fetch 캐시 미사용이므로 추가 옵션 불필요.
 */
export async function fetchApplicants(): Promise<{
  rows: ApplicantRow[];
  error: string | null;
  supabaseAvailable: boolean;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return { rows: [], error: null, supabaseAvailable: false };
  }

  const { data, error } = await supabase
    .from("applicants")
    .select(
      [
        "id",
        "created_at",
        "name",
        "email",
        "phone",
        "birthdate",
        "university",
        "visa",
        "address",
        "status",
        "notes",
        "notified_at",
        "reminder_count",
        "last_reminder_at",
        "payment_due_at",
        "payment_confirmed_at",
        "paid_amount_krw",
        "depositor_name_observed",
        "paid_confirmed_by",
        "cancelled_at",
        "cancel_reason",
        "refunded_at",
        "refund_txn_id",
      ].join(","),
    )
    .order("created_at", { ascending: false });

  if (error) {
    return {
      rows: [],
      error: error.message,
      supabaseAvailable: true,
    };
  }

  const rows: ApplicantRow[] = (data ?? []).map((r) => {
    const raw = r as unknown as Record<string, unknown>;
    const status =
      typeof raw.status === "string" &&
      (APPLICANT_STATUSES as readonly string[]).includes(raw.status)
        ? (raw.status as ApplicantStatus)
        : "pending";
    return {
      id: String(raw.id ?? ""),
      createdAt: String(raw.created_at ?? ""),
      name: String(raw.name ?? ""),
      email: String(raw.email ?? ""),
      phone: String(raw.phone ?? ""),
      birthdate: raw.birthdate ? String(raw.birthdate) : null,
      university: raw.university ? String(raw.university) : null,
      visa: raw.visa ? String(raw.visa) : null,
      address: raw.address ? String(raw.address) : null,
      status,
      notes: raw.notes ? String(raw.notes) : null,
      notifiedAt: raw.notified_at ? String(raw.notified_at) : null,
      reminderCount:
        typeof raw.reminder_count === "number" ? raw.reminder_count : 0,
      lastReminderAt: raw.last_reminder_at ? String(raw.last_reminder_at) : null,
      paymentDueAt: raw.payment_due_at ? String(raw.payment_due_at) : null,
      paymentConfirmedAt: raw.payment_confirmed_at
        ? String(raw.payment_confirmed_at)
        : null,
      paidAmountKrw:
        typeof raw.paid_amount_krw === "number" ? raw.paid_amount_krw : null,
      depositorNameObserved: raw.depositor_name_observed
        ? String(raw.depositor_name_observed)
        : null,
      paidConfirmedBy: raw.paid_confirmed_by
        ? String(raw.paid_confirmed_by)
        : null,
      cancelledAt: raw.cancelled_at ? String(raw.cancelled_at) : null,
      cancelReason: raw.cancel_reason ? String(raw.cancel_reason) : null,
      refundedAt: raw.refunded_at ? String(raw.refunded_at) : null,
      refundTxnId: raw.refund_txn_id ? String(raw.refund_txn_id) : null,
    };
  });

  return { rows, error: null, supabaseAvailable: true };
}
