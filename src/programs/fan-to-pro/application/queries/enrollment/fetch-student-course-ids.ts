/**
 * Student → course_id 집합 로더 (태스크 #23, Course 정규화 SoT 배선 Phase 3).
 *
 * 출석률/수료증 집계를 course 단위로 스코핑하기 위해, "이 학생이 실제 수강하는
 * course 집합" 을 실 SoT (enrollment_courses) 에서 로드한다.
 *
 * 경로 (ADR 0013): student → enrollments(student_id) → enrollment_courses(course_id).
 *   - refunded / cancelled enrollment 은 제외 (수강 자격 없음 = 집계 대상 아님).
 *   - 단과 결제면 course 1개, 번들(올인원)이면 여러 course.
 *   - 1기 = fan-to-pro-1 단일 course (소급 backfill 완료).
 *
 * ADR 0005 §2 — queries/ = CQRS read 전용. 호출자 (query/use-case) 가 이미 가드.
 *   이 로더는 집계 헬퍼에 주입할 course 집합만 반환 (PII 없음).
 *
 * Cache 정책: enrollment 은 결제 시점에만 변동 (수강 중 불변) — 그래도 호출 지점이
 *   force-dynamic 이므로 별도 cache 없음.
 *
 * 안전 fallback: 조회 실패 / supabase 없음 → 빈 Set. 호출측 헬퍼
 *   (getElapsedSessionIdsForCourses) 가 빈 Set 을 "필터 생략(cohort-level)" 으로
 *   해석 → 회차를 통째로 떨어뜨려 0% 오표시하는 회귀 방지.
 */
import "server-only";

import { getSupabaseServer } from "@/src/programs/fan-to-pro/infrastructure/supabase/server";

/** enrollment 이 집계 대상인지 (환불/취소 제외). */
const COUNTED_ENROLLMENT_STATUSES = ["pending", "paid"] as const;

/**
 * 단일 학생의 수강 course_id 집합.
 *
 * 빈 Set = course 를 못 찾음 (데이터 갭 또는 조회 실패). 호출측이 cohort-level
 * fallback 하도록 의도된 신호.
 */
export async function fetchStudentCourseIds(
  studentId: string,
): Promise<Set<string>> {
  const map = await fetchStudentCourseIdsMap([studentId]);
  return map.get(studentId) ?? new Set<string>();
}

/**
 * 여러 학생의 course_id 집합 (roster / cohort 개요용 배치).
 *
 * 2 query:
 *   1. enrollments where student_id ∈ ids and status ∈ {pending,paid}
 *   2. enrollment_courses where enrollment_id ∈ (위 결과)
 * → student_id 별로 course_id 집합 조립.
 *
 * 조회 실패 / supabase 없음 → 빈 Map (각 학생 fallback = cohort-level).
 */
export async function fetchStudentCourseIdsMap(
  studentIds: readonly string[],
): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (studentIds.length === 0) return result;

  const supabase = getSupabaseServer();
  if (!supabase) return result;

  // 1) student → enrollment (집계 대상 status 만).
  const { data: enrollments, error: enrErr } = await supabase
    .from("enrollments")
    .select("id, student_id")
    .in("student_id", studentIds as string[])
    .in("status", COUNTED_ENROLLMENT_STATUSES as unknown as string[]);
  if (enrErr || !enrollments || enrollments.length === 0) return result;

  const enrollmentToStudent = new Map<string, string>();
  const enrollmentIds: string[] = [];
  for (const row of enrollments as Array<{
    id: string;
    student_id: string | null;
  }>) {
    if (!row.student_id) continue;
    enrollmentToStudent.set(row.id, row.student_id);
    enrollmentIds.push(row.id);
  }
  if (enrollmentIds.length === 0) return result;

  // 2) enrollment → course.
  const { data: ecRows, error: ecErr } = await supabase
    .from("enrollment_courses")
    .select("enrollment_id, course_id")
    .in("enrollment_id", enrollmentIds);
  if (ecErr || !ecRows) return result;

  for (const row of ecRows as Array<{
    enrollment_id: string;
    course_id: string;
  }>) {
    const studentId = enrollmentToStudent.get(row.enrollment_id);
    if (!studentId) continue;
    let set = result.get(studentId);
    if (!set) {
      set = new Set<string>();
      result.set(studentId, set);
    }
    set.add(row.course_id);
  }

  return result;
}
