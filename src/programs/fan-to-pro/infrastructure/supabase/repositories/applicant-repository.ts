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

/**
 * 이름 마스킹 (ADR 0017 Decision A / D1).
 * 첫 글자만 노출하고 나머지는 별표. 한글 "김민수" → "김**", 영문 "Martina
 * Rampoldi" → "M******" (공백 제거 후 첫 글자 + 나머지 길이만큼 별표).
 * 입금자명(depositor_name_observed) = 신청자 실명이므로 동일 규칙 적용.
 */
function maskName(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return "*";
  const first = trimmed.slice(0, 1);
  return `${first}${"*".repeat(trimmed.length - 1)}`;
}

/**
 * 대학 마스킹 (ADR 0017 Decision A 정밀화 — 재식별 방지).
 * university + nationality + visa 조합이 소규모 기수에서 유일 식별자가 되므로
 * 국내/해외 카테고리로만 축약. "한국"/"korea"/한글 포함 = 국내, 그 외 = 해외.
 * 빈 값은 그대로 null 처리 (호출부에서 null fallback).
 */
function maskUniversity(raw: string): string {
  const lower = raw.toLowerCase();
  const domestic =
    /[가-힣]/.test(raw) ||
    lower.includes("korea") ||
    lower.includes("한국") ||
    lower.includes("대학");
  return domestic ? "국내 대학" : "해외 대학";
}

export async function fetchApplicants(options?: {
  mask?: boolean;
  cohortId?: string | null;
}): Promise<{
  rows: ApplicantRow[];
  eligibility: AnonymizeEligibility;
  error: string | null;
  supabaseAvailable: boolean;
}> {
  const mask = options?.mask ?? false;
  const cohortId = options?.cohortId ?? null;
  const supabase = getSupabaseServer();
  if (!supabase) {
    return {
      rows: [],
      eligibility: { eligibleCount: 0 },
      error: null,
      supabaseAvailable: false,
    };
  }

  let q = supabase
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
        "cohort_id",
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
        // B0068 과정 표시 — course (단과) / bundle (올인원).
        // Slice 2c-A: applicants.course_id 컬럼 신설 예정. 마이그레이션 apply 전에는
        // course:courses(...) join 이 null 로 나옴 (course_id 자체가 NULL).
        "course_id",
        "bundle_id",
        "course:courses(id,title_ko,slug)",
        "bundle:bundles(id,title_ko,slug)",
        // B0069 1기 재지원 링크. previous_applicant_id → previous:applicants row.
        // PostgREST FK 명시 필요 (self join) — !previous_applicant_id 로 FK 지정.
        "previous_applicant_id",
        "previous:applicants!previous_applicant_id(id,status)",
        "cash_receipts(count)",
        "messages_log(count)",
      ].join(","),
    )
    .order("created_at", { ascending: false });

  if (cohortId) q = q.eq("cohort_id", cohortId);

  const { data, error } = await q;

  if (error) {
    return {
      rows: [],
      eligibility: { eligibleCount: 0 },
      error: error.message,
      supabaseAvailable: true,
    };
  }

  // B0041 — applicant 별 kind 별 마지막 발송 시각. messages_log 전체 fetch 후 메모리에서 reduce.
  // applicant 100명 + kind 7종 + 평균 5회 발송 가정 시 ~3500 row. 충분 가벼움.
  const applicantIds = (data ?? []).map(
    (r) => String((r as unknown as Record<string, unknown>).id ?? ""),
  );
  const lastSentMap = new Map<string, Record<string, string>>();
  const milestonesMap = new Map<string, Record<string, string>>();
  if (applicantIds.length > 0) {
    const [logsResult, msResult] = await Promise.all([
      supabase
        .from("messages_log")
        .select("applicant_id, template_id, sent_at")
        .in("applicant_id", applicantIds)
        .order("sent_at", { ascending: false }),
      supabase
        .from("applicant_milestones")
        .select("applicant_id, milestone_type, marked_at")
        .in("applicant_id", applicantIds),
    ]);
    for (const row of logsResult.data ?? []) {
      const r = row as Record<string, unknown>;
      const aid = String(r.applicant_id ?? "");
      const kind = String(r.template_id ?? "");
      const sentAt = String(r.sent_at ?? "");
      if (!aid || !kind || !sentAt) continue;
      const bucket = lastSentMap.get(aid) ?? {};
      if (!bucket[kind]) {
        bucket[kind] = sentAt;
        lastSentMap.set(aid, bucket);
      }
    }
    for (const row of msResult.data ?? []) {
      const r = row as Record<string, unknown>;
      const aid = String(r.applicant_id ?? "");
      const mtype = String(r.milestone_type ?? "");
      const markedAt = String(r.marked_at ?? "");
      if (!aid || !mtype || !markedAt) continue;
      const bucket = milestonesMap.get(aid) ?? {};
      bucket[mtype] = markedAt;
      milestonesMap.set(aid, bucket);
    }
  }

  const rows: ApplicantRow[] = (data ?? []).map((r) => {
    const raw = r as unknown as Record<string, unknown>;
    const status =
      typeof raw.status === "string" &&
      (APPLICANT_STATUSES as readonly string[]).includes(raw.status)
        ? (raw.status as ApplicantStatus)
        : "pending";
    const aid = String(raw.id ?? "");
    const bucket = lastSentMap.get(aid) ?? {};
    const msBucket = milestonesMap.get(aid) ?? {};
    return {
      id: aid,
      createdAt: String(raw.created_at ?? ""),
      // ADR 0017 Decision A / D1: viewer(코워크)만 PII 마스킹. admin/super 는
      // mask:false 로 원문 불변. 마스킹은 반드시 이 repository 단(page 진입 전)
      // 에서 — display-time 마스킹 금지 (정렬/검색이 원문 기준으로 누출).
      name: mask ? maskName(String(raw.name ?? "")) : String(raw.name ?? ""),
      email: mask ? maskEmail(String(raw.email ?? "")) : String(raw.email ?? ""),
      phone: mask ? maskPhone(String(raw.phone ?? "")) : String(raw.phone ?? ""),
      nationality: raw.nationality ? String(raw.nationality) : null,
      // mask 시 client payload 에서 제거 (화면 미표시여도 RSC 직렬화로 누출,
      // Sage 배포게이트 HIGH). viewer 에게 불필요한 순수 PII.
      birthdate: mask ? null : raw.birthdate ? String(raw.birthdate) : null,
      university: raw.university
        ? mask
          ? maskUniversity(String(raw.university))
          : String(raw.university)
        : null,
      visa: raw.visa ? String(raw.visa) : null,
      address: mask ? null : raw.address ? String(raw.address) : null,
      status,
      notes: mask ? null : raw.notes ? String(raw.notes) : null,
      cohortId: raw.cohort_id ? String(raw.cohort_id) : null,
      courseId: raw.course_id ? String(raw.course_id) : null,
      bundleId: raw.bundle_id ? String(raw.bundle_id) : null,
      courseTitleKo: extractNestedTitleKo(raw.course),
      bundleTitleKo: extractNestedTitleKo(raw.bundle),
      previousApplicantId: raw.previous_applicant_id
        ? String(raw.previous_applicant_id)
        : null,
      previousStatus: extractNestedStatus(raw.previous),
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
      // 입금자명 = 신청자 실명 (name 가려도 여기 남으면 마스킹 무력화, ADR 0017).
      depositorNameObserved: raw.depositor_name_observed
        ? mask
          ? maskName(String(raw.depositor_name_observed))
          : String(raw.depositor_name_observed)
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
      messageLastSentByKind: {
        paymentGuide: bucket.paymentGuide ?? null,
        paymentConfirmed: bucket.paymentConfirmed ?? null,
        reminderT1: bucket.reminderT1 ?? null,
        reminderD3: bucket.reminderD3 ?? null,
        reminderD1: bucket.reminderD1 ?? null,
        referralInvite: bucket.referralInvite ?? null,
        cohortKickoff: bucket.cohortKickoff ?? null,
      },
      milestones: {
        guideSentAt: msBucket.guide_sent ?? null,
        feedbackDoneAt: msBucket.feedback_done ?? null,
      },
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

/**
 * B0068 nested FK object 에서 title_ko 추출.
 * PostgREST 는 FK single-row join 을 object 또는 array (0/1 요소) 로 반환하므로 둘 다 대응.
 * 값 없으면 null.
 */
function extractNestedTitleKo(value: unknown): string | null {
  if (!value) return null;
  const obj = Array.isArray(value)
    ? (value[0] as Record<string, unknown> | undefined)
    : (value as Record<string, unknown>);
  if (!obj) return null;
  const t = obj.title_ko;
  return typeof t === "string" && t.length > 0 ? t : null;
}

/**
 * B0069 nested previous applicant join 에서 status 추출.
 * ApplicantStatus enum 밖의 값은 null 로 fallback (오염된 legacy row 방어).
 */
function extractNestedStatus(value: unknown): ApplicantStatus | null {
  if (!value) return null;
  const obj = Array.isArray(value)
    ? (value[0] as Record<string, unknown> | undefined)
    : (value as Record<string, unknown>);
  if (!obj) return null;
  const s = obj.status;
  if (
    typeof s === "string" &&
    (APPLICANT_STATUSES as readonly string[]).includes(s)
  ) {
    return s as ApplicantStatus;
  }
  return null;
}

/**
 * 단일 applicant 조회 (B0051 LMS detail 페이지용).
 *
 * fetchApplicants 의 SELECT 와 같은 컬럼 + messages_log/milestones 보강을 적용해
 * 동일한 ApplicantRow 모양으로 반환. cohort filter 없이 단일 id.
 *
 * 없으면 null. 호출처가 notFound() 호출.
 */
export async function fetchApplicantById(
  id: string,
): Promise<ApplicantRow | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

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
        "cohort_id",
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
        // B0068 과정 표시 — course (단과) / bundle (올인원).
        // Slice 2c-A: applicants.course_id 컬럼 신설 예정. 마이그레이션 apply 전에는
        // course:courses(...) join 이 null 로 나옴 (course_id 자체가 NULL).
        "course_id",
        "bundle_id",
        "course:courses(id,title_ko,slug)",
        "bundle:bundles(id,title_ko,slug)",
        // B0069 1기 재지원 링크. previous_applicant_id → previous:applicants row.
        // PostgREST FK 명시 필요 (self join) — !previous_applicant_id 로 FK 지정.
        "previous_applicant_id",
        "previous:applicants!previous_applicant_id(id,status)",
        "cash_receipts(count)",
        "messages_log(count)",
      ].join(","),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const raw = data as unknown as Record<string, unknown>;
  const status =
    typeof raw.status === "string" &&
    (APPLICANT_STATUSES as readonly string[]).includes(raw.status)
      ? (raw.status as ApplicantStatus)
      : "pending";

  // kind 별 마지막 발송 시각.
  const lastSent: Record<string, string> = {};
  const { data: logs } = await supabase
    .from("messages_log")
    .select("template_id, sent_at")
    .eq("applicant_id", id)
    .order("sent_at", { ascending: false });
  for (const row of logs ?? []) {
    const r = row as Record<string, unknown>;
    const kind = String(r.template_id ?? "");
    const sentAt = String(r.sent_at ?? "");
    if (!kind || !sentAt) continue;
    if (!lastSent[kind]) lastSent[kind] = sentAt;
  }

  // milestones.
  const msBucket: Record<string, string> = {};
  const { data: ms } = await supabase
    .from("applicant_milestones")
    .select("milestone_type, marked_at")
    .eq("applicant_id", id);
  for (const row of ms ?? []) {
    const r = row as Record<string, unknown>;
    const mtype = String(r.milestone_type ?? "");
    const markedAt = String(r.marked_at ?? "");
    if (!mtype || !markedAt) continue;
    msBucket[mtype] = markedAt;
  }

  return {
    id: String(raw.id ?? ""),
    createdAt: String(raw.created_at ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    nationality: raw.nationality ? String(raw.nationality) : null,
    birthdate: raw.birthdate ? String(raw.birthdate) : null,
    university: raw.university ? String(raw.university) : null,
    visa: raw.visa ? String(raw.visa) : null,
    address: raw.address ? String(raw.address) : null,
    status,
    notes: raw.notes ? String(raw.notes) : null,
    cohortId: raw.cohort_id ? String(raw.cohort_id) : null,
    courseId: raw.course_id ? String(raw.course_id) : null,
    bundleId: raw.bundle_id ? String(raw.bundle_id) : null,
    courseTitleKo: extractNestedTitleKo(raw.course),
    bundleTitleKo: extractNestedTitleKo(raw.bundle),
    previousApplicantId: raw.previous_applicant_id
      ? String(raw.previous_applicant_id)
      : null,
    previousStatus: extractNestedStatus(raw.previous),
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
    messageLastSentByKind: {
      paymentGuide: lastSent.paymentGuide ?? null,
      paymentConfirmed: lastSent.paymentConfirmed ?? null,
      reminderT1: lastSent.reminderT1 ?? null,
      reminderD3: lastSent.reminderD3 ?? null,
      reminderD1: lastSent.reminderD1 ?? null,
      referralInvite: lastSent.referralInvite ?? null,
      cohortKickoff: lastSent.cohortKickoff ?? null,
    },
    milestones: {
      guideSentAt: msBucket.guide_sent ?? null,
      feedbackDoneAt: msBucket.feedback_done ?? null,
    },
  };
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
