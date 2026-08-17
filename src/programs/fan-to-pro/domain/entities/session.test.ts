import { describe, it, expect } from "vitest";
import {
  hasSessionElapsed,
  getElapsedSessionIds,
  getElapsedSessionIdsForCourses,
  canTransitionSession,
  isTerminalSessionStatus,
} from "./session";

// characterization (Task #9): 현재 동작 녹화. 인증/출석률 리팩터가 이 판정을
// 깨면 red. 2026-07-23 출석률 사고의 hasSessionElapsed 로직 잠금.
const NOW = new Date("2026-07-29T00:00:00Z");
const PAST = "2026-06-01T00:00:00Z";
const FUTURE = "2026-12-01T00:00:00Z";

describe("hasSessionElapsed", () => {
  it("cancelled 은 시각 무관 false", () => {
    expect(hasSessionElapsed({ status: "cancelled", ends_at: PAST }, NOW)).toBe(false);
  });
  it("ended 는 무조건 true (미래 ends_at 이어도)", () => {
    expect(hasSessionElapsed({ status: "ended", ends_at: FUTURE }, NOW)).toBe(true);
  });
  it("scheduled + ends_at 과거 = elapsed true", () => {
    expect(hasSessionElapsed({ status: "scheduled", ends_at: PAST }, NOW)).toBe(true);
  });
  it("scheduled + ends_at 미래 = false", () => {
    expect(hasSessionElapsed({ status: "scheduled", ends_at: FUTURE }, NOW)).toBe(false);
  });
  it("in_progress + ends_at 과거 = true", () => {
    expect(hasSessionElapsed({ status: "in_progress", ends_at: PAST }, NOW)).toBe(true);
  });
  it("깨진 ends_at = false (NaN 방어)", () => {
    expect(hasSessionElapsed({ status: "scheduled", ends_at: "garbage" }, NOW)).toBe(false);
  });
});

describe("getElapsedSessionIds", () => {
  it("elapsed(ended/과거) 비취소 회차 id 만 반환", () => {
    const sessions = [
      { id: "a", status: "ended" as const, ends_at: FUTURE },
      { id: "b", status: "scheduled" as const, ends_at: PAST },
      { id: "c", status: "scheduled" as const, ends_at: FUTURE },
      { id: "d", status: "cancelled" as const, ends_at: PAST },
    ];
    expect([...getElapsedSessionIds(sessions, NOW)].sort()).toEqual(["a", "b"]);
  });
  it("빈 배열 = 빈 Set", () => {
    expect(getElapsedSessionIds([], NOW).size).toBe(0);
  });
});

describe("getElapsedSessionIdsForCourses (태스크 #23 course 스코핑)", () => {
  const AR = "course-ar";
  const SOUND = "course-sound";
  const FTP1 = "fan-to-pro-1";

  // 2기 시나리오: 한 cohort 에 a-r + sound 회차 병존.
  const mixed = [
    { id: "ar1", status: "ended" as const, ends_at: FUTURE, course_id: AR },
    { id: "ar2", status: "scheduled" as const, ends_at: PAST, course_id: AR },
    { id: "sd1", status: "ended" as const, ends_at: FUTURE, course_id: SOUND },
    { id: "sd2", status: "scheduled" as const, ends_at: PAST, course_id: SOUND },
    { id: "future", status: "scheduled" as const, ends_at: FUTURE, course_id: AR },
    { id: "cxl", status: "cancelled" as const, ends_at: PAST, course_id: SOUND },
  ];

  it("A&R 단과생 → A&R 진행 회차만 분모", () => {
    const ids = getElapsedSessionIdsForCourses(mixed, new Set([AR]), NOW);
    expect([...ids].sort()).toEqual(["ar1", "ar2"]);
  });

  it("sound 단과생 → sound 진행 회차만 (취소 제외)", () => {
    const ids = getElapsedSessionIdsForCourses(mixed, new Set([SOUND]), NOW);
    expect([...ids].sort()).toEqual(["sd1", "sd2"]);
  });

  it("올인원 (a-r + sound) → 두 course 진행 회차 전부", () => {
    const ids = getElapsedSessionIdsForCourses(mixed, new Set([AR, SOUND]), NOW);
    expect([...ids].sort()).toEqual(["ar1", "ar2", "sd1", "sd2"]);
  });

  // ── 1기 무회귀 [CRITICAL] ─────────────────────────────────────────
  // 1기 sessions 전부 course_id=fan-to-pro-1, 학생 course=[fan-to-pro-1].
  // → 분모 = getElapsedSessionIds (course 필터 없는 버전) 와 완전 동일해야 함.
  const cohort1 = [
    { id: "s1", status: "ended" as const, ends_at: FUTURE, course_id: FTP1 },
    { id: "s2", status: "scheduled" as const, ends_at: PAST, course_id: FTP1 },
    { id: "s3", status: "scheduled" as const, ends_at: FUTURE, course_id: FTP1 },
    { id: "s4", status: "cancelled" as const, ends_at: PAST, course_id: FTP1 },
  ];

  it("1기 무회귀: 단일 course 학생 분모 == cohort-level getElapsedSessionIds", () => {
    const scoped = getElapsedSessionIdsForCourses(cohort1, new Set([FTP1]), NOW);
    const unscoped = getElapsedSessionIds(cohort1, NOW);
    expect([...scoped].sort()).toEqual([...unscoped].sort());
    expect([...scoped].sort()).toEqual(["s1", "s2"]);
  });

  // ── fallback 안전성 (0% 오표시 방지) ───────────────────────────────
  it("courseIds=null → 필터 생략 (cohort-level 과 동일)", () => {
    const scoped = getElapsedSessionIdsForCourses(mixed, null, NOW);
    const unscoped = getElapsedSessionIds(mixed, NOW);
    expect([...scoped].sort()).toEqual([...unscoped].sort());
  });

  it("courseIds=빈 Set → 필터 생략 (course 로드 실패 fallback)", () => {
    const scoped = getElapsedSessionIdsForCourses(mixed, new Set(), NOW);
    const unscoped = getElapsedSessionIds(mixed, NOW);
    expect([...scoped].sort()).toEqual([...unscoped].sort());
  });

  it("session.course_id=null (미배선 회차) → 분모 포함 (회귀 방지)", () => {
    const withNull = [
      { id: "legacy", status: "ended" as const, ends_at: FUTURE, course_id: null },
      { id: "ar1", status: "ended" as const, ends_at: FUTURE, course_id: AR },
    ];
    const ids = getElapsedSessionIdsForCourses(withNull, new Set([AR]), NOW);
    expect([...ids].sort()).toEqual(["ar1", "legacy"]);
  });

  // 교집합 0: 학생 course 가 이 cohort 회차 course 와 하나도 안 겹침.
  // (예: A&R 단과생인데 이 cohort sessions 는 전부 sound + course_id 배선됨)
  // → 분모 빈 Set. 호출측(computeAttendanceRate/뷰)이 size===0 을 null/0% 로 처리해
  //   "아직 내 회차 없음" 으로 표기 (남의 course 회차를 분모에 넣지 않는 설계의 극단).
  //   빈 Set fallback 과 구별됨: courseIds 는 비어있지 않으나 교집합만 0.
  it("교집합 0 (학생 course ∩ session course = ∅) → 분모 빈 Set", () => {
    const soundOnly = [
      { id: "sd1", status: "ended" as const, ends_at: FUTURE, course_id: SOUND },
      { id: "sd2", status: "scheduled" as const, ends_at: PAST, course_id: SOUND },
    ];
    const ids = getElapsedSessionIdsForCourses(soundOnly, new Set([AR]), NOW);
    expect(ids.size).toBe(0);
  });

  // 진행된 회차 0 (전부 미래) → course 필터 무관 분모 0.
  it("elapsed 0 (전부 미래 회차) → 분모 빈 Set", () => {
    const allFuture = [
      { id: "f1", status: "scheduled" as const, ends_at: FUTURE, course_id: AR },
      { id: "f2", status: "scheduled" as const, ends_at: FUTURE, course_id: SOUND },
    ];
    expect(getElapsedSessionIdsForCourses(allFuture, new Set([AR]), NOW).size).toBe(0);
  });

  // 빈 sessions → 빈 Set (첫 회차 세팅 전 cohort).
  it("빈 sessions → 빈 Set", () => {
    expect(getElapsedSessionIdsForCourses([], new Set([AR]), NOW).size).toBe(0);
  });
});

describe("session 상태 머신", () => {
  it("canTransitionSession: scheduled→in_progress OK, scheduled→ended 불가", () => {
    expect(canTransitionSession("scheduled", "in_progress")).toBe(true);
    expect(canTransitionSession("scheduled", "ended")).toBe(false);
    expect(canTransitionSession("in_progress", "ended")).toBe(true);
    expect(canTransitionSession("ended", "scheduled")).toBe(false);
  });
  it("isTerminalSessionStatus: ended/cancelled = terminal", () => {
    expect(isTerminalSessionStatus("ended")).toBe(true);
    expect(isTerminalSessionStatus("cancelled")).toBe(true);
    expect(isTerminalSessionStatus("scheduled")).toBe(false);
  });
});
