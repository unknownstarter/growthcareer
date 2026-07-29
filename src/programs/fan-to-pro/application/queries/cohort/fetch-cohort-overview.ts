/**
 * Cohort Overview query (B0049) — cohort detail 헤더 6 KPI 카드용 통합 aggregate.
 *
 * 단일 cohort 의 모든 단면 (학생 invite 진척, 강사 배정, 회차/출결, 자료, 재무)
 * 을 한번에 모음. cohort-detail page.tsx 가 호출.
 *
 * 6 카드 데이터:
 *   1) 신청 현황       — 이미 page.tsx 에서 fetchApplicants 호출 (본 query 미포함)
 *   2) 학생 invite     — paid+enrolled count / students count / user_id 연결된 student count
 *   3) 강사 배정       — sessions 의 distinct instructor_id + company count
 *   4) 회차 / 출결     — sessions 8회 중 ended count / 평균 출석률
 *   5) 강의 자료       — lecture_materials count + 회차별 cover 수
 *   6) 재무            — fetchCohortRevenue + cohort_expenses sum
 *
 * ADR 0005 §2 — queries/ = CQRS read 전용. 호출자 (server component) 가 가드.
 *
 * Cache 정책: cohort 운영 중 실시간 변동 — cache 없음 (page.tsx force-dynamic).
 */
import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";
import { fetchCohortRevenue, type CohortRevenue } from "./cohort-revenue";
import { fetchExpensesByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/cohort-expense-repository";
import { fetchSessionsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/session-repository";
import { fetchAttendanceByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/attendance-repository";
import { fetchStudentsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/student-repository";
import { fetchLectureMaterialsByCohort } from "@/src/programs/fan-to-pro/infrastructure/supabase/repositories/lecture-material-repository";
import { isCountedAsExpense } from "@/src/programs/fan-to-pro/domain/entities/cohort-expense";
import { getElapsedSessionIds } from "@/src/programs/fan-to-pro/domain/entities/session";

export type CohortOverview = {
  /** 학생 invite 진척. */
  students: {
    /** applicants 중 paid+enrolled (invite 대상 모수). */
    paidApplicantCount: number;
    /** students 테이블 등록 수 (promote 완료). */
    studentCount: number;
    /** Supabase Auth user 연결된 student 수 (cohort_memberships.user_id 존재). */
    invitedCount: number;
  };
  /** 강사 배정. */
  instructors: {
    /** sessions 에 배정된 distinct instructor 수. */
    assignedCount: number;
    /** 배정된 강사들이 속한 distinct company 수. */
    companyCount: number;
    /** 8회 중 instructor 미배정 session 수. */
    unassignedSessionCount: number;
  };
  /** 회차 / 출결. */
  attendance: {
    /** 총 회차 (sessions row count). */
    totalSessions: number;
    /** ended 회차 수. */
    endedSessions: number;
    /** 평균 출석률 (0-1). present + late / (학생수 × ended 회차). */
    averageRate: number;
  };
  /** 강의 자료. */
  materials: {
    /** 자료 총 수. */
    totalCount: number;
    /** 회차별 자료 cover 수 (8회 중 자료 있는 회차). */
    coveredWeekCount: number;
    /** 회차 총수 (보통 8). */
    totalWeekCount: number;
  };
  /** 재무 — 카드 6 표시용 압축. */
  finance: {
    revenue: CohortRevenue;
    /** committed + paid 비용 합 (VAT 포함). */
    expenseTotalKrw: number;
    /** Cowork (DEEPI) 수수료 합 — marketing category 중 description ilike Cowork. */
    coworkCommissionKrw: number;
    /** instructor_fee 카테고리 합. */
    instructorFeeKrw: number;
    /** 순익 = revenue.revenue_exclusive_krw - expenseTotalKrw. */
    netKrw: number;
  };
};

export async function fetchCohortOverview(
  cohortId: string,
): Promise<CohortOverview> {
  // 병렬 호출 — 동일 cohort 의 서로 다른 단면.
  const [
    revenue,
    expenses,
    sessions,
    attendances,
    students,
    materials,
    paidApplicantCount,
    invitedCount,
    instructorAgg,
  ] = await Promise.all([
    fetchCohortRevenue(cohortId),
    fetchExpensesByCohort(cohortId).catch(() => []),
    fetchSessionsByCohort(cohortId).catch(() => []),
    fetchAttendanceByCohort(cohortId).catch(() => []),
    fetchStudentsByCohort(cohortId).catch(() => []),
    fetchLectureMaterialsByCohort(cohortId).catch(() => []),
    countPaidApplicants(cohortId),
    countInvitedStudents(cohortId),
    countAssignedInstructors(cohortId),
  ]);

  // 학생 invite ────────────────────────────────────────────────
  const studentCount = students.length;

  // 강사 배정 (sessions 기반) ──────────────────────────────────
  const unassignedSessionCount = sessions.filter(
    (s) => !s.instructor_id,
  ).length;

  // 회차 / 출결 ────────────────────────────────────────────────
  const totalSessions = sessions.length;
  // 진행된 회차 = hasSessionElapsed (status=ended 또는 ends_at<now, cancelled 제외).
  // status="ended" 수동 전환에 의존하면 종강 후에도 endedSessions=0 → 0% 오표시
  // (2026-07-23 사고). endedSessions 필드명은 유지(반환 계약), 값만 elapsed 기준.
  const elapsedSessionIds = getElapsedSessionIds(sessions);
  const endedSessions = elapsedSessionIds.size;

  // 평균 출석률: present + late / (active student × 진행된 회차)
  let averageRate = 0;
  if (endedSessions > 0 && studentCount > 0) {
    const relevant = attendances.filter((a) =>
      elapsedSessionIds.has(a.session_id),
    );
    const presentCount = relevant.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;
    const denominator = endedSessions * studentCount;
    averageRate = denominator > 0 ? presentCount / denominator : 0;
  }

  // 강의 자료 ──────────────────────────────────────────────────
  const totalCount = materials.length;
  const coveredWeeks = new Set<number>();
  for (const m of materials) {
    if (m.week_number != null) coveredWeeks.add(m.week_number);
  }
  const totalWeekCount = totalSessions > 0 ? totalSessions : 8;

  // 재무 ───────────────────────────────────────────────────────
  let expenseTotalKrw = 0;
  let coworkCommissionKrw = 0;
  let instructorFeeKrw = 0;
  for (const e of expenses) {
    if (!isCountedAsExpense(e.status)) continue;
    expenseTotalKrw += e.total_krw;
    if (e.category === "instructor_fee") {
      instructorFeeKrw += e.total_krw;
    }
    if (
      e.category === "marketing" &&
      e.description.toLowerCase().includes("cowork")
    ) {
      coworkCommissionKrw += e.total_krw;
    }
  }
  const netKrw = revenue.revenue_exclusive_krw - expenseTotalKrw;

  return {
    students: {
      paidApplicantCount,
      studentCount,
      invitedCount,
    },
    instructors: {
      assignedCount: instructorAgg.instructorCount,
      companyCount: instructorAgg.companyCount,
      unassignedSessionCount,
    },
    attendance: {
      totalSessions,
      endedSessions,
      averageRate,
    },
    materials: {
      totalCount,
      coveredWeekCount: coveredWeeks.size,
      totalWeekCount,
    },
    finance: {
      revenue,
      expenseTotalKrw,
      coworkCommissionKrw,
      instructorFeeKrw,
      netKrw,
    },
  };
}

/* ──────────────────── helpers ──────────────────── */

async function countPaidApplicants(cohortId: string): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("applicants")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .in("status", ["paid", "enrolled"]);
  if (error) return 0;
  return count ?? 0;
}

/**
 * cohort_memberships role=student 의 user_id 가 연결된 student 수.
 * student 본인이 Supabase Auth 계정 받았는지 = invite 완료 여부.
 */
async function countInvitedStudents(cohortId: string): Promise<number> {
  const supabase = getSupabaseServer();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("cohort_memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .eq("role", "student");
  if (error) return 0;
  return count ?? 0;
}

/**
 * sessions 에 배정된 distinct instructor + 그들의 distinct company 수.
 */
async function countAssignedInstructors(
  cohortId: string,
): Promise<{ instructorCount: number; companyCount: number }> {
  const supabase = getSupabaseServer();
  if (!supabase) return { instructorCount: 0, companyCount: 0 };

  const { data: sessionRows, error: sErr } = await supabase
    .from("sessions")
    .select("instructor_id")
    .eq("cohort_id", cohortId)
    .not("instructor_id", "is", null);
  if (sErr || !sessionRows) return { instructorCount: 0, companyCount: 0 };

  const instructorIds = new Set<string>();
  for (const r of sessionRows as Array<{ instructor_id: string | null }>) {
    if (r.instructor_id) instructorIds.add(r.instructor_id);
  }
  if (instructorIds.size === 0) {
    return { instructorCount: 0, companyCount: 0 };
  }

  const { data: instructors, error: iErr } = await supabase
    .from("instructors")
    .select("id, company_id")
    .in("id", Array.from(instructorIds));
  if (iErr || !instructors) {
    return { instructorCount: instructorIds.size, companyCount: 0 };
  }

  const companyIds = new Set<string>();
  for (const r of instructors as Array<{ company_id: string | null }>) {
    if (r.company_id) companyIds.add(r.company_id);
  }

  return {
    instructorCount: instructorIds.size,
    companyCount: companyIds.size,
  };
}
