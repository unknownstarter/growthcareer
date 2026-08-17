/**
 * Batch enroll resolver — per-course 정원 모델 (ADR 0019 확장, 노아 확정 2026-08).
 * Phase 2a: courses 목록을 파라미터로 받는 제네릭으로 전환 (하드코딩 slug 제거).
 *
 * 배경:
 *   2기 단과반 N개 (예: a-r, sound). 각각 독립 진행. 과정별 최소 정원(minHeadcount)
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
 * 제네릭화 (Phase 2a):
 *   - 과정 목록(slug + minHeadcount)을 파라미터로 주입 받는다. 도메인은 DB 를 모른다 —
 *     caller(admin-actions)가 courses 테이블에서 로드해 넘긴다.
 *   - counts / runs 는 slug 키 제네릭 맵(Record<slug, ...>). 3번째 과정 추가 = courses
 *     insert 만 하면 앱코드 0 수정으로 자동 반영.
 *
 * 이 모듈은 순수 함수만 담는다. DB read/update 는 admin-actions.ts 가 얇게 담당한다.
 * → 테스트에서 DB 없이 판정 로직 전체를 검증 가능.
 */

/**
 * 과정별 최소 정원 기본값. courses.min_headcount 미제공(legacy 호출) 시 fallback.
 * ENROLLMENT_CAP (1기 30/20 archive 표시값) 과 무관.
 */
export const MIN_PER_COURSE = 10;

/** 판정 대상 과정 1건. caller 가 courses 테이블에서 로드해 주입. */
export type CourseDef = {
  slug: string;
  /** 이 과정 개설 최소 정원. */
  minHeadcount: number;
};

/** resolveBatchOutcome 입력 — paid 신청자 1건. */
export type PaidApplicant = {
  id: string;
  /** 신청한 과정 slug 배열. null/빈 배열이면 legacy(과정 미지정) → 판정 제외. */
  selectedCourseSlugs: string[] | null;
  /** 'single' | 'all_in_one' | null. 판정에는 직접 안 쓰이나 결과 분류 감사용. */
  selectionMode: string | null;
};

/** 신청자별 판정 결과. kept/dropped 는 제네릭 slug 배열. */
export type ApplicantOutcome =
  | { id: string; result: "enrolled_full" }
  | { id: string; result: "enrolled_partial"; kept: string[]; dropped: string[] }
  | { id: string; result: "cancelled" };

/** 부분환불 대상 (운영자 수동 처리 목록). */
export type PartialRefundDue = {
  id: string;
  /** 안 열려서 환불해야 하는 과정 slug. */
  droppedCourses: string[];
};

export type BatchOutcome = {
  /** 과정별 paid 카운트 (해당 slug 를 고른 신청자 수). courses 로 주어진 slug 만 키. */
  counts: Record<string, number>;
  /** 과정별 진행 여부 (count >= minHeadcount). courses 로 주어진 slug 만 키. */
  runs: Record<string, boolean>;
  /** 신청자별 판정. */
  perApplicant: ApplicantOutcome[];
  /**
   * 전부 열린 과정만 신청 → 통째 enrolled 대상.
   * kept = 정규화된 유효 slug 집합 (알 수 없는 slug 제거 + 중복 제거 후). enrollment_courses
   *   생성 시 caller 가 이 값을 SoT 로 사용 — 원본 selected_course_slugs 를 재필터링하지 않음
   *   (Phase 2 fix5, divergence 예방).
   */
  enrolledFull: { id: string; kept: string[] }[];
  /**
   * @deprecated enrolledFull 사용. id 만 필요한 하위호환 경로용 (applicants status UPDATE).
   *   enrolledFull.map(e => e.id) 과 동일.
   */
  enrolledFullIds: string[];
  /** 일부만 열림 (올인원 부분) → enrolled + slug 갱신 대상. kept = 정규화된 유효 slug. */
  enrolledPartial: { id: string; kept: string[] }[];
  /** 열린 과정 하나도 없음 → cancelled (전액 환불) 대상 id. */
  cancelledIds: string[];
  /** 운영자 수동 부분환불 목록. */
  partialRefundDue: PartialRefundDue[];
};

/**
 * 순수 판정 함수. paid 신청자 목록 + 과정 정의(slug + minHeadcount) → 과정별 진행
 * 여부 + 신청자별 결과.
 *
 * legacy(과정 미지정) 신청자는 판정에서 제외(어느 목록에도 안 들어감)하되 counts 에도
 * 반영 안 함. courses 에 없는 slug 는 무시 (유효 과정만으로 판정).
 *
 * @param applicants paid 신청자 목록.
 * @param courses    판정 대상 과정. caller 가 DB 에서 로드해 주입.
 */
export function resolveBatchOutcome(
  applicants: PaidApplicant[],
  courses: readonly CourseDef[],
): BatchOutcome {
  // 유효 slug 집합 + slug → minHeadcount 룩업.
  const minBySlug = new Map<string, number>();
  const orderedSlugs: string[] = [];
  for (const c of courses) {
    if (!minBySlug.has(c.slug)) orderedSlugs.push(c.slug);
    minBySlug.set(c.slug, c.minHeadcount);
  }
  const isValidSlug = (s: string): boolean => minBySlug.has(s);

  // 1. 신청자별 유효 과정 집합 (알 수 없는 slug 제거, 중복 제거).
  const normalized = applicants.map((a) => {
    const set = new Set<string>();
    for (const raw of a.selectedCourseSlugs ?? []) {
      if (isValidSlug(raw)) set.add(raw);
    }
    return { id: a.id, courses: set };
  });

  // 2. 과정별 paid 카운트 (courses 로 주어진 slug 만 키로 초기화).
  const counts: Record<string, number> = {};
  for (const slug of orderedSlugs) counts[slug] = 0;
  for (const n of normalized) {
    for (const slug of n.courses) counts[slug] += 1;
  }

  // 3. 과정별 진행 판정.
  const runs: Record<string, boolean> = {};
  const running = new Set<string>();
  for (const slug of orderedSlugs) {
    const open = counts[slug] >= (minBySlug.get(slug) ?? MIN_PER_COURSE);
    runs[slug] = open;
    if (open) running.add(slug);
  }

  // 4. 신청자별 결과.
  const perApplicant: ApplicantOutcome[] = [];
  const enrolledFull: { id: string; kept: string[] }[] = [];
  const enrolledPartial: { id: string; kept: string[] }[] = [];
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
      // 전부 열림 → 통째 enrolled. kept = 정규화된 유효 slug (= selected 전체, 여기선 dropped 0).
      perApplicant.push({ id: n.id, result: "enrolled_full" });
      enrolledFull.push({ id: n.id, kept });
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
    enrolledFull,
    enrolledFullIds: enrolledFull.map((e) => e.id),
    enrolledPartial,
    cancelledIds,
    partialRefundDue,
  };
}
