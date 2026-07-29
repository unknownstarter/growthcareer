import { describe, it, expect } from "vitest";
import {
  hasSessionElapsed,
  getElapsedSessionIds,
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
