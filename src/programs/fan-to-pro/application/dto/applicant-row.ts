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

import { hasEligibleVisa } from "@/src/programs/fan-to-pro/messages/templates";

export const APPLICANT_STATUSES = [
  "pending",
  "confirmation_notice",
  "notified",
  "paid",
  "overdue",
  "cancelled",
  "enrolled",
  "refunded",
  "next_cohort_interest",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

/**
 * 상태 라벨 단일 소스 (canonical).
 *
 * 1기 모집 어드민에서 검증된 표기를 표준으로, 모든 운영자 surface (모집 어드민 +
 * LMS 어드민) 가 이 맵을 import 한다. 과거엔 status-chip / applicant-detail /
 * talent-pool-view 가 각자 라벨 맵을 두어 같은 status 가 화면마다 다르게 보였다
 * (신청만 vs 대기, 입금 확인 vs 입금 …). drift 재발 방지를 위해 여기 한 곳에서만 정의.
 *
 * `_EN` = 다크 모집 어드민 chip 의 대문자 뱃지 face. `_KO` = 한글 라벨 (LMS 뱃지
 * face + 모집 어드민 tooltip). 색/variant 는 surface 별 시각 언어라 각자 유지.
 */
export const STATUS_LABEL_KO: Record<ApplicantStatus, string> = {
  pending: "신청만",
  confirmation_notice: "확인 안내",
  notified: "안내 발송",
  paid: "입금 확인",
  overdue: "마감 초과",
  cancelled: "취소",
  enrolled: "수강 확정",
  refunded: "환불 완료",
  next_cohort_interest: "다음 기수 대기",
};

/**
 * 진행 funnel (전진 경로) - 상태값 ↔ 진행 단계 시각화의 단일 소스.
 * 신청 → 안내 → 입금 → 확정. 이 4개가 정상 진행 노드. 나머지 상태
 * (마감 초과 / 취소 / 환불 / 다음 기수 대기) 는 funnel 이탈 (off-funnel).
 *
 * per-row "다음 단계" 액션은 이 순서의 다음 노드로 전진시키는 것. 단
 * paid → enrolled 는 과정별 최소 정원 판정이 필요해 일괄(batch)로만 처리
 * (markAsEnrolledBatch). per-row 로 못 뗌.
 */
export const FUNNEL_STEPS = [
  { status: "pending", short: "신청" },
  { status: "notified", short: "안내" },
  { status: "paid", short: "입금" },
  { status: "enrolled", short: "확정" },
] as const satisfies readonly { status: ApplicantStatus; short: string }[];

/** 상태의 funnel 진행 인덱스 (0~3). off-funnel = -1. */
export function funnelStepIndex(status: ApplicantStatus): number {
  return FUNNEL_STEPS.findIndex((s) => s.status === status);
}

export const STATUS_LABEL_EN: Record<ApplicantStatus, string> = {
  pending: "PENDING",
  confirmation_notice: "CONFIRM",
  notified: "NOTIFIED",
  paid: "PAID",
  overdue: "OVERDUE",
  cancelled: "CANCELLED",
  enrolled: "ENROLLED",
  refunded: "REFUNDED",
  next_cohort_interest: "NEXT COHORT",
};

/**
 * 전화번호가 한국 번호인지 판정 (도메인 순수 헬퍼).
 *
 * guessLocaleFromPhone / normalizePhone 과 동일한 정규화 (공백·하이픈·괄호 제거)
 * 후 +82 / 82 / 010 prefix 면 한국 번호로 본다. null / 빈 문자열은 판정 불가라
 * false (= 확인 안내 대상으로 안전하게 분류).
 */
export function isKoreanPhone(phone: string | null): boolean {
  if (!phone) return false;
  const normalized = phone.replace(/[\s\-()]/g, "");
  return (
    normalized.startsWith("+82") ||
    normalized.startsWith("82") ||
    normalized.startsWith("010")
  );
}

/**
 * 사전 확인 안내 대상 판정 (도메인 순수 헬퍼).
 *
 * 비자 미보유 (기타/없음) 또는 외국 전화번호면 payment guide 전에 "사전 확인 안내"
 * (오프라인 출석 가능 + 공연 프로젝트 유급참여 불가 확인) 를 먼저 보내야 한다.
 * 둘 중 하나라도 해당하면 true.
 *
 * hasEligibleVisa 는 messages 모듈의 canonical 판정을 재사용 (여기서 재정의 X).
 */
export function needsConfirmation(applicant: {
  visa: string | null;
  phone: string | null;
}): boolean {
  return (
    !hasEligibleVisa(applicant.visa) || !isKoreanPhone(applicant.phone)
  );
}

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

  // B0068 신청 시점 과정 선택 — 단과 (course) 또는 올인원 (bundle).
  //   courseId 만 = 단과 신청 (Slice 2c-A applicants.course_id 컬럼).
  //   bundleId 만 = 올인원 신청 (applicants.bundle_id).
  //   둘 다 null = 1기 legacy (course/bundle 개념 도입 전).
  // 어드민 리스트 "과정" 컬럼 + CSV export 에서 사용.
  courseId: string | null;
  bundleId: string | null;
  courseTitleKo: string | null;
  bundleTitleKo: string | null;
  // ADR 0019 2기 멀티 단과 (간이 정책 B). course_id/bundle_id 미해결, raw 선택 저장.
  //   selectionMode: 'all_in_one' | 'single' | null(1기).
  //   selectedCourseSlugs: 선택 과정 slug 배열 (예 ["a-r","sound"]) | null.
  selectionMode: string | null;
  selectedCourseSlugs: string[] | null;

  // B0069 1기 재지원 이력.
  //   previousApplicantId: 이전 신청 row 링크 (submit-application 이 이메일 매칭 시 채움).
  //   previousStatus: 이전 신청의 최종 status (JOIN 결과). "1기 수료생" / "1기 신청" 뱃지 소스.
  //     null = 재지원 X (신규 지원자).
  previousApplicantId: string | null;
  previousStatus: ApplicantStatus | null;

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

  // 레퍼럴 — 신청 시 입력한 추천인의 본인 코드. 없으면 null. 추천인 실명은
  // 이 payload 에 담지 않음 (준-PII). admin 전용 server action 으로 별도 조회.
  referredByCode: string | null;

  // B0041 - kind 별 마지막 발송 시각 (messages_log audit 요약).
  // 운영자 row 에 "가이드 보냄" 같은 chip 노출용. 발송 안 됐으면 null.
  messageLastSentByKind: {
    paymentGuide: string | null;
    paymentConfirmed: string | null;
    reminderT1: string | null;
    reminderD3: string | null;
    reminderD1: string | null;
    referralInvite: string | null;
    cohortKickoff: string | null;
  };

  // B0042 - 운영 milestone 토글. row 별 marked_at (없으면 null = 미체크).
  // 운영자 click 으로 set/unset 가능. status enum 외 추가 단계.
  milestones: {
    guideSentAt: string | null;
    feedbackDoneAt: string | null;
  };
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
  /**
   * 코워크(홍보 파트너) 커미션 정산 (ADR 0017 Decision B / D5).
   * base = SUM(paidAmountKrw where status ∈ {paid, enrolled}) — 환불/취소 제외.
   * commission = base × COMMISSION_RATE. cohort-revenue.ts 의 매출 정의와 동일
   * 필터 (paid + enrolled). 1기 = 8,800,000원 × 12% = 1,056,000원.
   */
  commissionBaseKrw: number;
  commissionKrw: number;
  /** 결제 확정 인원 수 (paid + enrolled). 1명당 커미션 안내용. */
  commissionCount: number;
};

/**
 * 코워크 커미션 요율 (ADR 0017 Decision D5 — 1기 근거 12%).
 * D6(기수별 확정성)는 open. 2기 다중 가격 도입 시 cohort 설정값 검토.
 */
export const COMMISSION_RATE = 0.12;

/** 결제 확정으로 커미션 base 에 포함되는 status (환불/취소 자동 제외). */
const COMMISSION_ELIGIBLE_STATUSES: readonly ApplicantStatus[] = [
  "paid",
  "enrolled",
];

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

export function computeStats(
  rows: ApplicantRow[],
  now: Date = new Date(),
): ApplicantStats {
  const byStatus = Object.fromEntries(
    APPLICANT_STATUSES.map((s) => [s, 0]),
  ) as Record<ApplicantStatus, number>;

  let reminderT1 = 0;
  let reminderD3 = 0;
  let reminderD1 = 0;
  let commissionBaseKrw = 0;
  let commissionCount = 0;

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    const u = getReminderUrgency(row, now);
    if (u.level === "t1") reminderT1 += 1;
    if (u.level === "d3") reminderD3 += 1;
    if (u.level === "d1") reminderD1 += 1;
    // 커미션 base = 결제 확정(paid/enrolled) 인원의 paid_amount_krw 합.
    // 환불/취소 status 는 미포함 = 자동 제외 (ADR 0017 D5).
    if (COMMISSION_ELIGIBLE_STATUSES.includes(row.status)) {
      commissionBaseKrw += row.paidAmountKrw ?? 0;
      commissionCount += 1;
    }
  }

  return {
    total: rows.length,
    byStatus,
    reminderT1,
    reminderD3,
    reminderD1,
    commissionBaseKrw,
    commissionKrw: Math.round(commissionBaseKrw * COMMISSION_RATE),
    commissionCount,
  };
}
