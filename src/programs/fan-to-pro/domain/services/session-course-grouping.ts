/**
 * Session course grouping (태스크 #24, Course 정규화 SoT 배선 Phase 4 — UI course-aware).
 *
 * domain layer 룰: 외부 의존성 0 (zod 만 허용). Next/React/Supabase import 금지.
 *
 * 목적: 한 cohort 의 sessions 를 course_id 기준으로 그룹핑해서 UI 가 course 별로
 *   회차를 라벨/구획할 수 있게 한다. 집계값은 이미 Phase 3 에서 course-scoped —
 *   이 헬퍼는 "표시 순서 + 라벨" 만 담당 (계산 X).
 *
 * 1기 무회귀 [CRITICAL]:
 *   - 1기 = 단일 course (fan-to-pro-1) → distinct course 1개 → `isMultiCourse=false`.
 *     UI 는 이 플래그로 "그룹 헤더 생략 = 기존과 동일 렌더" 를 판정한다.
 *   - course_id 가 전부 null (미배선) → distinct 그룹 1개 (course=null) → 단일 취급.
 *
 * 정렬:
 *   - 그룹 순서 = 각 그룹의 첫 등장 session 순서 (sessions 배열이 이미 idx asc
 *     정렬돼 들어온다고 가정). course order_idx 를 별도 로드하지 않는 이유는
 *     query 가 이미 idx 로 정렬 + 실무상 course 회차가 인접 배치되기 때문.
 *   - 그룹 안 session 순서 = 입력 순서 유지 (안정 정렬).
 */

/** UI 표시에 필요한 최소 session shape (title/시각 등은 UI 가 별도 보유). */
export type CourseGroupableSession = {
  id: string;
  course_id: string | null;
};

export type SessionCourseGroup<S extends CourseGroupableSession> = {
  /** 그룹 키 — course_id 또는 미배선 회차는 "__uncoursed__". */
  key: string;
  /** course_id (null = 미배선 회차 그룹). */
  courseId: string | null;
  /** courses.title_ko. course_id 가 null 이거나 map 에 없으면 null. */
  title: string | null;
  sessions: S[];
};

export type SessionCourseGrouping<S extends CourseGroupableSession> = {
  groups: SessionCourseGroup<S>[];
  /**
   * 표시상 여러 course 가 섞였는가.
   * false = 단일 course (또는 전부 미배선) → UI 는 그룹 헤더/라벨 생략 (1기 불변).
   * true  = 2+ course → UI 가 course 구획/라벨 표시.
   */
  isMultiCourse: boolean;
};

const UNCOURSED_KEY = "__uncoursed__";

/**
 * sessions 를 course_id 로 그룹핑.
 *
 * @param sessions idx asc 로 정렬된 회차 배열 (query 가 정렬해서 넘김)
 * @param courseTitleById course_id → title_ko 맵 (없는 course 는 title=null)
 */
export function groupSessionsByCourse<S extends CourseGroupableSession>(
  sessions: readonly S[],
  courseTitleById: ReadonlyMap<string, string>,
): SessionCourseGrouping<S> {
  const order: string[] = [];
  const byKey = new Map<string, SessionCourseGroup<S>>();

  for (const session of sessions) {
    const key = session.course_id ?? UNCOURSED_KEY;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        courseId: session.course_id,
        title: session.course_id
          ? (courseTitleById.get(session.course_id) ?? null)
          : null,
        sessions: [],
      };
      byKey.set(key, group);
      order.push(key);
    }
    group.sessions.push(session);
  }

  const groups = order.map((k) => byKey.get(k)!);

  // 단일 그룹이면 항상 단일 취급. 2+ 그룹이라도 "실제 course 가 붙은 그룹" 이
  // 1개 이하면 (예: 미배선 회차만 여러 개) 구획할 의미 없음 → 단일 취급.
  const coursedGroupCount = groups.filter((g) => g.courseId != null).length;
  const isMultiCourse = groups.length > 1 && coursedGroupCount > 1;

  return { groups, isMultiCourse };
}
