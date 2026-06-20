import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  APPLICANT_STATUSES,
  type AnonymizeEligibility,
  type ApplicantRow,
  type ApplicantStatus,
  type CashReceiptRow,
  type MessageLogRow,
} from "@/src/programs/fan-to-pro/application/dto/applicant-row";

/**
 * Applicant repository (ADR 0005 §4 Step 1 — 이전).
 * 기존 위치 (`src/programs/fan-to-pro/admin/fetch-applicants.ts`) 는 shim.
 *
 * Repository 책임: Supabase row 를 DTO 로 가공해 application/use-case 와
 * interface (server component) 에 전달. 비즈니스 규칙 없음 (entity / service
 * 가 담당).
 *
 * - service_role 키로 RLS 우회 → middleware Basic Auth 가 단일 게이트.
 * - mask=true: viewer 자격 (코워크 공유) 호출 시 email / phone 마스킹.
 */
function maskEmail(raw: string): string {
  const at = raw.indexOf("@");
  if (at <= 0) return "****";
  const local = raw.slice(0, at);
  const domain = raw.slice(at);
  const first = local.slice(0, 1);
  return `${first}****${domain}`;
}

function maskPhone(raw: string): string {
  const parts = raw.split("-");
  if (parts.length === 3 && parts[2].length >= 4) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 4) {
    return `****${digits.slice(-4)}`;
  }
  return "****";
}

export async function fetchApplicants(options?: { mask?: boolean }): Promise<{
  rows: ApplicantRow[];
  eligibility: AnonymizeEligibility;
  error: string | null;
  supabaseAvailable: boolean;
}> {
  const mask = options?.mask ?? false;
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      rows: [],
      eligibility: { eligibleCount: 0 },
      error: null,
      supabaseAvailable: false,
    };
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
        "nationality",
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
        "redacted_at",
        "cash_receipts(count)",
        "messages_log(count)",
      ].join(","),
    )
    .order("created_at", { ascending: false });

  if (error) {
    return {
      rows: [],
      eligibility: { eligibleCount: 0 },
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
      email: mask ? maskEmail(String(raw.email ?? "")) : String(raw.email ?? ""),
      phone: mask ? maskPhone(String(raw.phone ?? "")) : String(raw.phone ?? ""),
      nationality: raw.nationality ? String(raw.nationality) : null,
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
      redactedAt: raw.redacted_at ? String(raw.redacted_at) : null,
      cashReceiptCount: extractAggregateCount(raw.cash_receipts),
      messageCount: extractAggregateCount(raw.messages_log),
    };
  });

  const sixMonthsAgoMs = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
  const eligibleCount = rows.filter((row) => {
    if (row.redactedAt) return false;
    if (!["enrolled", "cancelled", "refunded"].includes(row.status)) return false;
    const candidates = [
      row.paymentConfirmedAt,
      row.cancelledAt,
      row.refundedAt,
    ].filter((iso): iso is string => Boolean(iso));
    return candidates.some((iso) => new Date(iso).getTime() < sixMonthsAgoMs);
  }).length;

  return {
    rows,
    eligibility: { eligibleCount },
    error: null,
    supabaseAvailable: true,
  };
}

function extractAggregateCount(value: unknown): number {
  if (!value) return 0;
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0] as Record<string, unknown> | undefined;
    if (first && typeof first.count === "number") return first.count;
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.count === "number") return obj.count;
  }
  return 0;
}

/** 단일 applicant 의 현금영수증 발급 이력 fetch. */
export async function fetchCashReceipts(applicantId: string): Promise<{
  rows: CashReceiptRow[];
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) return { rows: [], error: "supabaseUnavailable" };

  const { data, error } = await supabase
    .from("cash_receipts")
    .select("id, amount_krw, issued_at, hometax_receipt_no, notes")
    .eq("applicant_id", applicantId)
    .order("issued_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows: CashReceiptRow[] = (data ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    return {
      id: String(raw.id ?? ""),
      amountKrw:
        typeof raw.amount_krw === "number" ? raw.amount_krw : 0,
      issuedAt: String(raw.issued_at ?? ""),
      hometaxReceiptNo: raw.hometax_receipt_no
        ? String(raw.hometax_receipt_no)
        : null,
      notes: raw.notes ? String(raw.notes) : null,
    };
  });

  return { rows, error: null };
}

/** 단일 applicant 의 발송 이력 fetch. sent_at DESC. */
export async function fetchMessagesForApplicant(applicantId: string): Promise<{
  rows: MessageLogRow[];
  error: string | null;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) return { rows: [], error: "supabaseUnavailable" };

  const { data, error } = await supabase
    .from("messages_log")
    .select(
      "id, channel, direction, template_id, subject, body_excerpt, sent_at, sent_by, recipient_count",
    )
    .eq("applicant_id", applicantId)
    .order("sent_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const allowedChannels: MessageLogRow["channel"][] = [
    "email",
    "sms",
    "kakao_channel",
    "kakao_alimtalk",
  ];
  const rows: MessageLogRow[] = (data ?? []).map((r) => {
    const raw = r as Record<string, unknown>;
    const channelRaw = String(raw.channel ?? "");
    const channel = (allowedChannels as readonly string[]).includes(channelRaw)
      ? (channelRaw as MessageLogRow["channel"])
      : "email";
    const directionRaw = String(raw.direction ?? "individual");
    const direction: MessageLogRow["direction"] =
      directionRaw === "broadcast" ? "broadcast" : "individual";
    return {
      id: String(raw.id ?? ""),
      channel,
      direction,
      templateId: raw.template_id ? String(raw.template_id) : null,
      subject: raw.subject ? String(raw.subject) : null,
      bodyExcerpt: raw.body_excerpt ? String(raw.body_excerpt) : null,
      sentAt: String(raw.sent_at ?? ""),
      sentBy: raw.sent_by ? String(raw.sent_by) : null,
      recipientCount:
        typeof raw.recipient_count === "number" ? raw.recipient_count : 1,
    };
  });

  return { rows, error: null };
}
