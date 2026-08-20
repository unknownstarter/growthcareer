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
 *   pending     -> confirmation_notice (markAsConfirmationNotice)
 *   pending     -> notified     (markAsNotified)
 *   confirmation_notice -> notified (markAsNotified)
 *   notified    -> notified     (sendReminder, count++)
 *   notified    -> paid         (markAsPaid)
 *   notified    -> overdue      (markAsOverdue)
 *   * any *     -> cancelled    (markAsCancelled)
 *   paid|cancel -> refunded     (markAsRefunded)
 *   paid (N개)  -> enrolled|cancelled (markAsEnrolledBatch, per-course 정원 가드)
 */

import { z } from "zod";
import { APPLICANT_STATUSES } from "@/src/programs/fan-to-pro/application/dto/applicant-row";
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
import {
  MIN_PER_COURSE,
  resolveBatchOutcome,
  type CourseDef,
} from "@/src/programs/fan-to-pro/domain/services/batch-enroll";
import { MIN_HEADCOUNT_DEFAULT } from "@/src/programs/fan-to-pro/domain/entities/course";
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
// 2기: 2026-08-30 23:59:59 KST = 2026-08-30 14:59:59 UTC (8/30 자정 마감).
// TODO: cohort.enrollment_closes_at 로 디커플 (지금은 활성 기수 전역값).
const ENROLLMENT_DEADLINE_ISO = "2026-08-30T14:59:59Z";

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
 *   pending | confirmation_notice -> notified
 *   notified_at = now()
 *   payment_due_at = least(now() + 3d, enrollment_deadline)
 *
 *   confirmation_notice 신청자 (비자/외국번호 사전 확인 대상) 가 "확인" 회신하면
 *   운영자가 여기로 전진시킨다. 기존 pending -> notified 경로는 그대로.
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
    .in("status", ["pending", "confirmation_notice"]);

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 1.5 markAsConfirmationNotice
 *   pending -> confirmation_notice
 *   비자 미보유 / 외국 전화번호 신청자에게 payment guide 전 "사전 확인 안내"
 *   (오프라인 출석 가능 + 공연 프로젝트 유급참여 불가 확인) 를 먼저 보낼 때 사용.
 *   추가 컬럼 변경 없음 (안내 발송 audit 은 별도 messages_log 로 기록).
 * ------------------------------------------------------------------------- */
export async function markAsConfirmationNotice(
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
    .update({ status: "confirmation_notice" }, { count: "exact" })
    .eq("id", parsed.data.id)
    .eq("status", "pending");

  return toResult(count ?? 0, error);
}

/* ---------------------------------------------------------------------------
 * 1.6 setApplicantStatus - 운영자 수동 상태 오버라이드 (any -> any)
 *   funnel 버튼(markAsNotified 등) 이 커버 못 하는 케이스를 운영자가 직접 클릭으로
 *   교정. from-status 가드 없음 (수동 override 의도). status enum 만 검증.
 *   주의: paid/enrolled 를 여기로 set 하면 payment_confirmed_at / enrollment_courses
 *   같은 부수 데이터는 안 생김 (그건 markAsPaid / 일괄 강좌 확정 이 담당). 이 액션은
 *   상태 라벨만 바꾼다. assertAdmin (requireSupabase) 로 viewer 차단.
 * ------------------------------------------------------------------------- */
const SetApplicantStatusSchema = z.object({
  id: z.string().uuid("invalidApplicantId"),
  status: z.enum(APPLICANT_STATUSES),
});

export async function setApplicantStatus(
  input: unknown,
): Promise<AdminActionResult> {
  const parsed = SetApplicantStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", error: "invalidInput" };
  }
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  const { id, status } = parsed.data;

  // XOR 제약(applicants_status_cohort_xor): next_cohort_interest ↔ cohort_id NULL,
  // 그 외 ↔ cohort_id NOT NULL. 상태를 바꿀 때 cohort_id 도 함께 맞춰야 위반 안 됨.
  const patch: { status: string; cohort_id?: string | null } = { status };
  if (status === "next_cohort_interest") {
    // 사전신청(대기)으로 되돌림 → cohort 귀속 해제.
    patch.cohort_id = null;
  } else {
    // cohort 귀속 상태로 전환 → cohort_id 필요. 현재 없으면(사전신청자) 현재
    // 모집 중인 cohort(status=open, 최신) 로 편입. 이미 있으면 그대로 둠.
    const { data: appl } = await supabase
      .from(TABLE)
      .select("cohort_id")
      .eq("id", id)
      .single();
    if (!appl?.cohort_id) {
      const { data: openCohort } = await supabase
        .from("cohorts")
        .select("id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!openCohort?.id) {
        return { status: "error", error: "noOpenCohortToAssign" };
      }
      patch.cohort_id = openCohort.id;
    }
  }

  const { error, count } = await supabase
    .from(TABLE)
    .update(patch, { count: "exact" })
    .eq("id", id);

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
 * 7. markAsEnrolledBatch  (per-course 정원 모델 — 노아 확정 2026-08, model A)
 *
 *   마감 +24h grace 후 운영자가 호출. 2기 단과반 2개 (a-r, sound) 각각 독립 진행.
 *   과정별 paid 카운트가 MIN_PER_COURSE(10) 이상이면 그 과정만 열린다.
 *
 *   신청자별 결과 (resolveBatchOutcome 순수 함수가 판정):
 *     - 고른 과정 전부 열림 → enrolled (full).
 *     - 일부만 열림 (올인원 부분개강) → enrolled + selected_course_slugs=kept 로 갱신
 *       + 안 열린 과정분은 partialRefundDue 로 수집 (운영자 수동 부분환불).
 *     - 고른 과정 하나도 안 열림 → cancelled (전액 환불 대상, cancel_reason).
 *
 * 기수 스코프:
 *   - paid 의 cohort_id 가 단일이어야 한다. 여러 기수 섞이면 'multipleCohorts' error
 *     (기존 가드 유지 — 기수별 개별 처리 필요).
 *
 * DB 계층은 얇게: paid 조회 + 판정 위임 + 그룹 UPDATE 만 담당. 판정 로직 전체는
 *   domain/services/batch-enroll.ts 의 순수 함수에서 검증.
 *
 * 동시성:
 *   - 운영자가 의도적으로 1회만 호출하는 batch. dashboard confirm 다이얼로그로
 *     동시 호출 차단. UPDATE 는 status='paid' 가드로 이미 처리된 row 재전환 방지.
 *
 * 입력 없음. 결과는 BatchEnrollResult.
 * ------------------------------------------------------------------------- */
export async function markAsEnrolledBatch(): Promise<BatchEnrollResult> {
  const supabase = await requireSupabase();
  if (!supabase) return { status: "error", error: "supabaseUnavailable" };

  // paid 신청자 + 과정 정보 조회. 기수는 단일이어야 안전 (여러 기수 섞이면 중단).
  const { data: paidRows, error: paidErr } = await supabase
    .from(TABLE)
    .select("id, selected_course_slugs, selection_mode, cohort_id")
    .eq("status", "paid");
  if (paidErr) return { status: "error", error: paidErr.message };

  const rows = paidRows ?? [];
  const cohortIds = [
    ...new Set(rows.map((r) => r.cohort_id).filter(Boolean)),
  ] as string[];
  if (cohortIds.length > 1) {
    // 여러 기수의 paid 가 섞임 → 기수별 개별 처리 필요. 자동 batch 중단.
    return { status: "error", error: "multipleCohorts" };
  }
  const cohortId = cohortIds[0] ?? null;

  // 이 기수의 program 에 속한 course 목록 로드 (제네릭 정원 판정 + slug→course_id 변환).
  //   cohort → program_id → courses. cohort 없으면 (paid 0 또는 legacy) 빈 목록.
  //   status draft/open 만 (archived 는 과거 기수 과정 — 2기 개강 판정 대상 아님).
  const courseDefs: CourseDef[] = [];
  const slugToCourseId = new Map<string, string>();
  const slugToTitle = new Map<string, string>();
  if (cohortId) {
    const { data: cohort, error: cohortErr } = await supabase
      .from("cohorts")
      .select("program_id")
      .eq("id", cohortId)
      .single();
    if (cohortErr) return { status: "error", error: cohortErr.message };
    const programId = cohort?.program_id as string | undefined;
    if (programId) {
      const { data: courseRows, error: courseErr } = await supabase
        .from("courses")
        .select("id, slug, title_ko, min_headcount, status")
        .eq("program_id", programId)
        .in("status", ["draft", "open"]);
      if (courseErr) return { status: "error", error: courseErr.message };
      for (const c of courseRows ?? []) {
        const slug = String(c.slug);
        const min =
          typeof c.min_headcount === "number" && c.min_headcount > 0
            ? c.min_headcount
            : MIN_HEADCOUNT_DEFAULT;
        courseDefs.push({ slug, minHeadcount: min });
        slugToCourseId.set(slug, String(c.id));
        slugToTitle.set(slug, String(c.title_ko ?? slug));
      }
    }
  }

  // 순수 판정 (DB 무관). courses 목록을 주입 (하드코딩 slug 없음).
  const outcome = resolveBatchOutcome(
    rows.map((r) => ({
      id: String(r.id),
      selectedCourseSlugs: Array.isArray(r.selected_course_slugs)
        ? (r.selected_course_slugs as string[]).map(String)
        : null,
      selectionMode: r.selection_mode ? String(r.selection_mode) : null,
    })),
    courseDefs,
  );

  const nowIso = new Date().toISOString();

  // enrolled (full) 일괄 — 고른 과정 전부 열린 신청자.
  if (outcome.enrolledFullIds.length > 0) {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: "enrolled" })
      .eq("status", "paid")
      .in("id", outcome.enrolledFullIds);
    if (error) return { status: "error", error: error.message };
  }

  // enrolled (partial) — 올인원 부분개강. status=enrolled + slug=kept 로 갱신.
  //   kept 값이 신청자마다 다를 수 있어 id 별 UPDATE. paid ≤ 60 규모라 성능 무관.
  for (const p of outcome.enrolledPartial) {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: "enrolled", selected_course_slugs: p.kept })
      .eq("status", "paid")
      .eq("id", p.id);
    if (error) return { status: "error", error: error.message };
  }

  // cancelled — 고른 과정 하나도 안 열림. 전액 환불 대상.
  if (outcome.cancelledIds.length > 0) {
    const { error } = await supabase
      .from(TABLE)
      .update({
        status: "cancelled",
        cancelled_at: nowIso,
        cancel_reason: "course_min_not_met",
      })
      .eq("status", "paid")
      .in("id", outcome.cancelledIds);
    if (error) return { status: "error", error: error.message };
  }

  // enrollment 실 SoT 생성 (Phase 2b + fix2/3/5) — enrolled 각 applicant 에 대해
  //   enrollments 1 row + enrollment_courses (kept course 별 1 row).
  //   Recruitment BC(applicants.selected_course_slugs=신청 의도) → LMS BC(실 수강)
  //   변환 시점 = 여기. slug → course_id 는 위에서 로드한 courseDefs 기준.
  //
  //   kept slug = resolver 결과를 단일 SoT 로 사용 (fix5). full/partial 모두 resolver 가
  //   정규화한 kept 를 그대로 씀 — 원본 selected_course_slugs 재필터링 안 함 (divergence 예방).
  //
  //   멱등 (fix2/3): enrollment 은 (applicant_id, cohort_id) upsert. 재실행/동시 이중호출 시
  //   기존 row id 반환 (M2.5 partial unique index 가 onConflict 타겟). enrollment_courses 도
  //   (enrollment_id, course_id) upsert (ignoreDuplicates). pre-check 없이 항상 upsert 하므로
  //   부분실패 후 재호출 시 header 만 있고 course row 0 인 orphan 도 자기치유.
  //   (Supabase JS 는 다중 문 트랜잭션 미지원 — 멱등 upsert 로 대체.)
  const enrolledMap = new Map<string, string[]>(); // applicantId → kept slugs (resolver SoT).
  for (const e of outcome.enrolledFull) enrolledMap.set(e.id, e.kept);
  for (const p of outcome.enrolledPartial) enrolledMap.set(p.id, p.kept);

  const enrolledIds = [...enrolledMap.keys()];
  if (enrolledIds.length > 0 && cohortId) {
    for (const applicantId of enrolledIds) {
      const keptSlugs = enrolledMap.get(applicantId) ?? [];
      if (keptSlugs.length === 0) continue; // 매핑 가능한 course 없음 → enrollment 없음.

      // enrollment header — 없을 때만 insert (ignoreDuplicates). 재실행/이중호출 시
      //   기존 row 를 건드리지 않아 최초 purchased_at / status 를 보존한다
      //   (upsert update 로 하면 재호출마다 purchased_at 이 nowIso 로 덮어써짐).
      //   onConflict = (applicant_id, cohort_id) — M2.5 partial unique index.
      const { error: insErr } = await supabase.from("enrollments").upsert(
        {
          applicant_id: applicantId,
          student_id: null, // 승격 시 attachStudentToEnrollment 로 채움.
          cohort_id: cohortId,
          bundle_id: null, // bundle 매핑은 후속 (지금은 course-level 만).
          status: "paid", // 이미 입금 확인된 applicant → paid enrollment.
          purchased_at: nowIso,
        },
        { onConflict: "applicant_id,cohort_id", ignoreDuplicates: true },
      );
      if (insErr) return { status: "error", error: insErr.message };

      // id 확보 (신규/기존 모두). ignoreDuplicates 라 upsert 가 기존 row 를 안 돌려주므로 조회.
      const { data: enrollment, error: selErr } = await supabase
        .from("enrollments")
        .select("id")
        .eq("applicant_id", applicantId)
        .eq("cohort_id", cohortId)
        .single();
      if (selErr || !enrollment) {
        return { status: "error", error: selErr?.message ?? "enrollmentLookupFailed" };
      }

      // enrollment_courses upsert (ignoreDuplicates) — 항상 실행해 orphan(course row 0) 봉합.
      const ecRows = keptSlugs
        .map((slug) => slugToCourseId.get(slug))
        .filter((cid): cid is string => Boolean(cid))
        .map((courseId) => ({
          enrollment_id: String(enrollment.id),
          course_id: courseId,
          completed_at: null,
        }));
      if (ecRows.length > 0) {
        const { error: ecErr } = await supabase
          .from("enrollment_courses")
          .upsert(ecRows, {
            onConflict: "enrollment_id,course_id",
            ignoreDuplicates: true,
          });
        if (ecErr) return { status: "error", error: ecErr.message };
      }
    }
  }

  const enrolledCount =
    outcome.enrolledFullIds.length + outcome.enrolledPartial.length;
  const cancelledCount = outcome.cancelledIds.length;
  const anyRuns = Object.values(outcome.runs).some(Boolean);

  return {
    status: "ok",
    // 하위호환 필드.
    outcome: anyRuns ? "enrolled" : "cancelled",
    counts: { affected: enrolledCount + cancelledCount, threshold: MIN_PER_COURSE },
    // per-course 필드 (제네릭 slug 맵).
    runs: outcome.runs,
    courseCounts: outcome.counts,
    courseTitles: Object.fromEntries(slugToTitle),
    enrolledCount,
    cancelledCount,
    partialRefundDue: outcome.partialRefundDue,
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
