import { describe, it, expect } from "vitest";
import {
  evaluateCompletionEligibility,
  COMPLETION_ATTENDANCE_THRESHOLD,
} from "./certificate-eligibility";

// characterization (Task #9): 수료증 발급 자격 판정 잠금. 발급은 라이브 크리티컬.
const base = {
  attendanceRate: 1,
  cohortStatus: "completed",
  studentStatus: "active",
} as const;

describe("evaluateCompletionEligibility", () => {
  it("임계값 = 0.75", () => {
    expect(COMPLETION_ATTENDANCE_THRESHOLD).toBe(0.75);
  });
  it("종강 + active + 100% = ok", () => {
    const r = evaluateCompletionEligibility(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.attendance_rate).toBe(1);
  });
  it("cohort cancelled = 폐강 차단 (attendance 무관)", () => {
    const r = evaluateCompletionEligibility({ ...base, cohortStatus: "cancelled" });
    expect(r).toMatchObject({ ok: false, reason: "cohort_cancelled" });
  });
  it("cohort 미종강 = cohort_in_progress", () => {
    const r = evaluateCompletionEligibility({ ...base, cohortStatus: "in_progress" });
    expect(r).toMatchObject({ ok: false, reason: "cohort_in_progress" });
  });
  it("student withdrawn = student_inactive", () => {
    const r = evaluateCompletionEligibility({ ...base, studentStatus: "withdrawn" });
    expect(r).toMatchObject({ ok: false, reason: "student_inactive" });
  });
  it("student completed 도 통과", () => {
    expect(evaluateCompletionEligibility({ ...base, studentStatus: "completed" }).ok).toBe(true);
  });
  it("출석률 0.75 미만 = attendance_below_threshold", () => {
    const r = evaluateCompletionEligibility({ ...base, attendanceRate: 0.74 });
    expect(r).toMatchObject({ ok: false, reason: "attendance_below_threshold" });
  });
  it("출석률 정확히 0.75 = 통과 (경계)", () => {
    expect(evaluateCompletionEligibility({ ...base, attendanceRate: 0.75 }).ok).toBe(true);
  });
  it("attendanceRate null = 0 취급 → 차단", () => {
    const r = evaluateCompletionEligibility({ ...base, attendanceRate: null });
    expect(r).toMatchObject({ ok: false, reason: "attendance_below_threshold" });
  });
});
