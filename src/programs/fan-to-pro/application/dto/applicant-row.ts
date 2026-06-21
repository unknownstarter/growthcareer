/**
 * 운영자 페이지 (/admin/applicants) 가 공유하는 데이터 타입 (DTO)
 * (ADR 0005 §4 Step 1 — 이전, 기존 위치 admin/types.ts 는 shim).
 *
 * Supabase row 가 그대로 흘러들어가는 게 아니라, server component 가 SELECT
 * 결과를 가공해서 클라이언트로 넘긴다. nullable 컬럼은 명시적 `| null` 표기.
 *
 * 클린 아키텍처 위치 = `application/dto/` — wire format. Repository 가
 * 반환하는 모양 + UI 가 소비하는 모양. domain entity (behavior + invariant)
 * 와 구분.
 */

export const APPLICANT_STATUSES = [
  "pending",
  "notified",
  "paid",
  "overdue",
  "cancelled",
  "enrolled",
  "refunded",
  "next_cohort_interest",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export type ApplicantRow = {
  id: string;
  createdAt: string; // ISO
  name: string;
  email: string;
  phone: string;
  nationality: string | null;
  birthdate: string | null;
  university: string | null;
  visa: string | null;
  address: string | null;
  status: ApplicantStatus;
  notes: string | null;

  // B0032 cohort 귀속 — 어느 기수에 신청했는지. null = legacy (마이그레이션 전 row).
  cohortId: string | null;

  // 발송 추적
  notifiedAt: string | null;
  reminderCount: number;
  lastReminderAt: string | null;

  // 입금
  paymentDueAt: string | null;
  paymentConfirmedAt: string | null;
  paidAmountKrw: number | null;
  depositorNameObserved: string | null;
  paidConfirmedBy: string | null;

  // 취소 / 환불
  cancelledAt: string | null;
  cancelReason: string | null;
  refundedAt: string | null;
  refundTxnId: string | null;

  // B0018 Wave 1 T2 / T3
  redactedAt: string | null;
  cashReceiptCount: number;

  // B0018 Wave 1 T4 - 발송 카운트 chip / 발송 이력 drawer 트리거.
  messageCount: number;
};

/** B0018 Wave 1 T2 - 발급 이력 list 표시용. */
export type CashReceiptRow = {
  id: string;
  amountKrw: number;
  issuedAt: string; // ISO
  hometaxReceiptNo: string | null;
  notes: string | null;
};

/** B0018 Wave 1 T3 - 6개월 경과 + status 종료 + 미파기 row 의 현재 카운트. */
export type AnonymizeEligibility = {
  /** 종강 +6개월 경과 + redacted_at IS NULL 인 row 수. UI [N명] 표시용. */
  eligibleCount: number;
};

/**
 * B0018 Wave 1 T4 - 신청자별 발송 이력 1건.
 *
 * messages_log row 의 client 친화 매핑. body 본문 자체는 저장 안 하고
 * body_excerpt (앞 200자) 만 보관 (PII 최소화).
 */
export type MessageLogRow = {
  id: string;
  channel: "email" | "sms" | "kakao_channel" | "kakao_alimtalk";
  direction: "individual" | "broadcast";
  templateId: string | null;
  subject: string | null;
  bodyExcerpt: string | null;
  sentAt: string; // ISO
  sentBy: string | null;
  recipientCount: number;
};

export type ApplicantStats = {
  total: number;
  byStatus: Record<ApplicantStatus, number>;
  /** 마감 D-3 도달 + status=notified + reminder_count<2 */
  reminderD3: number;
  /** 마감 D-1 도달 + status=notified + reminder_count<3 */
  reminderD1: number;
  /** 신청 24h 경과 + status=notified + reminder_count=0 */
  reminderT1: number;
};

/**
 * 마감 + 리마인드 임계점. KST 자정 = UTC 15:00.
 *
 * 2026-06-21 24:00 KST = 2026-06-21 15:00 UTC
 *  D-1 표기 기준: 2026-06-20 15:00 UTC 부터
 *  D-3 표기 기준: 2026-06-18 15:00 UTC 부터
 */
export const DEADLINE_UTC = "2026-06-21T15:00:00.000Z";
export const D_MINUS_3_UTC = "2026-06-18T15:00:00.000Z";
export const D_MINUS_1_UTC = "2026-06-20T15:00:00.000Z";

/** row 의 시각 강조 우선순위. 높은 숫자 = 더 시급. */
export function getReminderUrgency(
  row: ApplicantRow,
  now: Date = new Date(),
): {
  level: "none" | "t1" | "d3" | "d1";
  rank: number;
} {
  if (row.status !== "notified") return { level: "none", rank: 0 };

  const nowMs = now.getTime();
  const d3 = new Date(D_MINUS_3_UTC).getTime();
  const d1 = new Date(D_MINUS_1_UTC).getTime();

  if (nowMs >= d1 && row.reminderCount < 3) {
    return { level: "d1", rank: 3 };
  }
  if (nowMs >= d3 && row.reminderCount < 2) {
    return { level: "d3", rank: 2 };
  }

  if (row.notifiedAt) {
    const notifiedMs = new Date(row.notifiedAt).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (nowMs - notifiedMs >= dayMs && row.reminderCount === 0) {
      return { level: "t1", rank: 1 };
    }
  }
  return { level: "none", rank: 0 };
}

export function computeStats(rows: ApplicantRow[]): ApplicantStats {
  const byStatus = Object.fromEntries(
    APPLICANT_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicantStatus, number>;

  let reminderT1 = 0;
  let reminderD3 = 0;
  let reminderD1 = 0;
  const now = new Date();

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const u = getReminderUrgency(row, now);
    if (u.level === "t1") reminderT1 += 1;
    if (u.level === "d3") reminderD3 += 1;
    if (u.level === "d1") reminderD1 += 1;
  }

  return {
    total: rows.length,
    byStatus,
    reminderT1,
    reminderD3,
    reminderD1,
  };
}
