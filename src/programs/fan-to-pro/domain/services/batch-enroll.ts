/**
 * Batch enroll resolver — per-course 정원 모델 (ADR 0019 확장, 노아 확정 2026-08).
 *
 * 배경:
 *   2기 단과반 2개 (a-r, sound). 각각 독립 진행. 과정별 최소 정원 (MIN_PER_COURSE)
 *   충족 시에만 그 과정이 열린다. 한 과정만 정원 넘어도 그 과정은 열림.
 *
 * 신청자 모델:
 *   - selection_mode: 'single' (단과) | 'all_in_one' (올인원)
 *   - selected_course_slugs: 신청한 과정 slug 배열 (['a-r'] / ['sound'] / ['a-r','sound'])
 *
 * 올인원 부분개강 처리 (model A):
 *   - 올인원 신청자가 고른 과정 중 일부만 열리면 → 열린 과정만 enrolled + 안 열린
 *     과정분은 부분환불 대상 (운영자 수동 처리). selected_course_slugs 는 kept 로 갱신.
 *
 * 이 모듈은 순수 함수만 담는다. DB read/update 는 admin-actions.ts 가 얇게 담당한다.
 * → 테스트에서 DB 없이 판정 로직 전체를 검증 가능.
 */

/** 2기 단과 과정 slug (selected_course_slugs 값). */
export const COURSE_SLUGS = ["a-r", "sound"] as const;
export type CourseSlug = (typeof COURSE_SLUGS)[number];

/**
 * 과정별 최소 정원. course 테이블에 min 컬럼이 없어 admin 로컬 상수로 둔다.
 * ENROLLMENT_CAP (1기 30/20 archive 표시값) 과 무관.
 */
export const MIN_PER_COURSE = 10;

/** resolveBatchOutcome 입력 — paid 신청자 1건. */
export type PaidApplicant = {
  id: string;
  /** 신청한 과정 slug 배열. null/빈 배열이면 legacy(과정 미지정) → 판정 제외. */
  selectedCourseSlugs: string[] | null;
  /** 'single' | 'all_in_one' | null. 판정에는 직접 안 쓰이나 결과 분류 감사용. */
  selectionMode: string | null;
};

/** 신청자별 판정 결과. */
export type ApplicantOutcome =
  | { id: string; result: "enrolled_full" }
  | { id: string; result: "enrolled_partial"; kept: CourseSlug[]; dropped: CourseSlug[] }
  | { id: string; result: "cancelled" };

/** 부분환불 대상 (운영자 수동 처리 목록). */
export type PartialRefundDue = {
  id: string;
  /** 안 열려서 환불해야 하는 과정 slug. */
  droppedCourses: CourseSlug[];
};

export type BatchOutcome = {
  /** 과정별 paid 카운트 (해당 slug 를 고른 신청자 수). */
  counts: { "a-r": number; sound: number };
  /** 과정별 진행 여부 (count >= min). */
  runs: { "a-r": boolean; sound: boolean };
  /** 신청자별 판정. */
  perApplicant: ApplicantOutcome[];
  /** 전부 열린 과정만 신청 → 통째 enrolled 대상 id. */
  enrolledFullIds: string[];
  /** 일부만 열림 (올인원 부분) → enrolled + slug 갱신 대상. */
  enrolledPartial: { id: string; kept: CourseSlug[] }[];
  /** 열린 과정 하나도 없음 → cancelled (전액 환불) 대상 id. */
  cancelledIds: string[];
  /** 운영자 수동 부분환불 목록. */
  partialRefundDue: PartialRefundDue[];
};

function isCourseSlug(s: string): s is CourseSlug {
  return (COURSE_SLUGS as readonly string[]).includes(s);
}

/**
 * 순수 판정 함수. paid 신청자 목록 + 과정별 최소 정원 → 과정별 진행 여부 +
 * 신청자별 결과. legacy(과정 미지정) 신청자는 판정에서 제외(어느 목록에도 안 들어감)
 * 하되 counts 에도 반영 안 함.
 */
export function resolveBatchOutcome(
  applicants: PaidApplicant[],
  min: number = MIN_PER_COURSE,
): BatchOutcome {
  // 1. 신청자별 유효 과정 집합 (알 수 없는 slug 제거, 중복 제거).
  const normalized = applicants.map((a) => {
    const set = new Set<CourseSlug>();
    for (const raw of a.selectedCourseSlugs ?? []) {
      if (isCourseSlug(raw)) set.add(raw);
    }
    return { id: a.id, courses: set };
  });

  // 2. 과정별 paid 카운트.
  const counts = { "a-r": 0, sound: 0 };
  for (const n of normalized) {
    if (n.courses.has("a-r")) counts["a-r"] += 1;
    if (n.courses.has("sound")) counts.sound += 1;
  }

  // 3. 과정별 진행 판정.
  const runs = {
    "a-r": counts["a-r"] >= min,
    sound: counts.sound >= min,
  };
  const running = new Set<CourseSlug>();
  if (runs["a-r"]) running.add("a-r");
  if (runs.sound) running.add("sound");

  // 4. 신청자별 결과.
  const perApplicant: ApplicantOutcome[] = [];
  const enrolledFullIds: string[] = [];
  const enrolledPartial: { id: string; kept: CourseSlug[] }[] = [];
  const cancelledIds: string[] = [];
  const partialRefundDue: PartialRefundDue[] = [];

  for (const n of normalized) {
    const selected = [...n.courses];
    // legacy / 과정 미지정 → 판정 대상 아님.
    if (selected.length === 0) continue;

    const kept = selected.filter((c) => running.has(c));
    const dropped = selected.filter((c) => !running.has(c));

    if (kept.length === 0) {
      // 고른 과정이 하나도 안 열림 → 전액 환불.
      perApplicant.push({ id: n.id, result: "cancelled" });
      cancelledIds.push(n.id);
    } else if (dropped.length === 0) {
      // 전부 열림 → 통째 enrolled.
      perApplicant.push({ id: n.id, result: "enrolled_full" });
      enrolledFullIds.push(n.id);
    } else {
      // 일부만 열림 (올인원 부분) → enrolled + slug 갱신 + 부분환불.
      perApplicant.push({ id: n.id, result: "enrolled_partial", kept, dropped });
      enrolledPartial.push({ id: n.id, kept });
      partialRefundDue.push({ id: n.id, droppedCourses: dropped });
    }
  }

  return {
    counts,
    runs,
    perApplicant,
    enrolledFullIds,
    enrolledPartial,
    cancelledIds,
    partialRefundDue,
  };
}
