import { describe, it, expect } from "vitest";
import { groupSessionsByCourse } from "./session-course-grouping";

const TITLES = new Map<string, string>([
  ["c-ar", "A&R 단과반"],
  ["c-sound", "음향 감독 단과반"],
  ["c-1", "K-pop 공연 실무 4주"],
]);

const s = (id: string, course_id: string | null) => ({ id, course_id });

describe("groupSessionsByCourse", () => {
  it("1기 무회귀 — 단일 course 는 그룹 1개 + isMultiCourse=false", () => {
    const sessions = [
      s("s1", "c-1"),
      s("s2", "c-1"),
      s("s3", "c-1"),
    ];
    const r = groupSessionsByCourse(sessions, TITLES);
    expect(r.isMultiCourse).toBe(false);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].title).toBe("K-pop 공연 실무 4주");
    expect(r.groups[0].sessions.map((x) => x.id)).toEqual(["s1", "s2", "s3"]);
  });

  it("멀티 course — course 별 그룹 + isMultiCourse=true, 첫 등장 순서 유지", () => {
    const sessions = [
      s("a1", "c-ar"),
      s("s1", "c-sound"),
      s("a2", "c-ar"),
      s("s2", "c-sound"),
    ];
    const r = groupSessionsByCourse(sessions, TITLES);
    expect(r.isMultiCourse).toBe(true);
    expect(r.groups.map((g) => g.courseId)).toEqual(["c-ar", "c-sound"]);
    expect(r.groups[0].sessions.map((x) => x.id)).toEqual(["a1", "a2"]);
    expect(r.groups[1].sessions.map((x) => x.id)).toEqual(["s1", "s2"]);
    expect(r.groups[0].title).toBe("A&R 단과반");
  });

  it("전부 미배선 (course_id=null) 은 단일 취급", () => {
    const sessions = [s("s1", null), s("s2", null)];
    const r = groupSessionsByCourse(sessions, TITLES);
    expect(r.isMultiCourse).toBe(false);
    expect(r.groups).toHaveLength(1);
    expect(r.groups[0].title).toBe(null);
  });

  it("course 1개 + 미배선 섞임 — coursed 그룹 1개면 단일 취급", () => {
    const sessions = [s("a1", "c-ar"), s("x1", null)];
    const r = groupSessionsByCourse(sessions, TITLES);
    expect(r.isMultiCourse).toBe(false);
    expect(r.groups).toHaveLength(2);
  });

  it("map 에 없는 course_id 는 title=null (안전 fallback)", () => {
    const sessions = [s("a1", "c-ar"), s("z1", "c-unknown")];
    const r = groupSessionsByCourse(sessions, TITLES);
    expect(r.isMultiCourse).toBe(true);
    expect(r.groups[1].title).toBe(null);
  });

  it("빈 입력 — 그룹 0개, isMultiCourse=false", () => {
    const r = groupSessionsByCourse([], TITLES);
    expect(r.groups).toHaveLength(0);
    expect(r.isMultiCourse).toBe(false);
  });
});
