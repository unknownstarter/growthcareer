import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import {
  APPLICANT_STATUSES,
  type AnonymizeEligibility,
  type ApplicantRow,
  type ApplicantStatus,
  type CashReceiptRow,
  type MessageLogRow,
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
  eligibility: AnonymizeEligibility;
  error: string | null;
  supabaseAvailable: boolean;
}> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      rows: [],
      eligibility: { eligibleCount: 0 },
      error: null,
      supabaseAvailable: false,
    };
  }

  // applicants + 현금영수증 카운트 LEFT JOIN.
  // Supabase 의 nested select syntax 로 cash_receipts(count) 가져옴.
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
      redactedAt: raw.redacted_at ? String(raw.redacted_at) : null,
      cashReceiptCount: extractAggregateCount(raw.cash_receipts),
      messageCount: extractAggregateCount(raw.messages_log),
    };
  });

  // B0018 Wave 1 T3 - 6개월 경과 + 종료 status + 미파기 row 카운트.
  // RPC dry-run 대신 client side 에서 계산 (anonymize 함수의 동일 조건을 미러).
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

/** Supabase nested aggregate (예: cash_receipts(count)) 의 count 값 추출. */
function extractAggregateCount(value: unknown): number {
  if (!value) return 0;
  // Supabase 는 [{ count: N }] 형태 반환.
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

/* ---------------------------------------------------------------------------
 * B0018 Wave 1 T2 - 단일 applicant 의 현금영수증 발급 이력 fetch.
 * drawer 의 "발급 N건" 클릭 시 호출.
 * service_role 만 접근 → server component / server action 에서만 사용.
 * ------------------------------------------------------------------------- */
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

/* ---------------------------------------------------------------------------
 * B0018 Wave 1 T4 - 단일 applicant 의 발송 이력 fetch.
 * 발송 카운트 chip 클릭 시 drawer 가 호출. sent_at DESC.
 *
 * 참고: broadcast 발송 시에도 신청자별 row 1개씩 생성 (direction='broadcast',
 * applicant_id=각 신청자) → 신청자별 검색이 자연스럽게 동작.
 * ------------------------------------------------------------------------- */
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
