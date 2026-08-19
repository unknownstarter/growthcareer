import { describe, it, expect } from "vitest";
import { isKoreanPhone, needsConfirmation } from "./applicant-row";

describe("isKoreanPhone", () => {
  it("한국번호(+82 / 82 / 010)는 true", () => {
    expect(isKoreanPhone("010-1234-5678")).toBe(true);
    expect(isKoreanPhone("01012345678")).toBe(true);
    expect(isKoreanPhone("+82 10 1234 5678")).toBe(true);
    expect(isKoreanPhone("821012345678")).toBe(true);
  });

  it("외국번호 / null 은 false", () => {
    expect(isKoreanPhone("+91 98765 43210")).toBe(false);
    expect(isKoreanPhone("+1 415 555 0100")).toBe(false);
    expect(isKoreanPhone("+44 20 7946 0958")).toBe(false);
    expect(isKoreanPhone(null)).toBe(false);
  });
});

describe("needsConfirmation (사전 확인 안내 대상)", () => {
  it("비자 없음/기타 → true (한국번호여도)", () => {
    expect(
      needsConfirmation({ visa: "기타/없음", phone: "010-1234-5678" }),
    ).toBe(true);
  });

  it("외국번호 → true (비자 보유여도)", () => {
    expect(needsConfirmation({ visa: "F-4", phone: "+919876543210" })).toBe(
      true,
    );
  });

  it("비자 미확인(null) → true", () => {
    expect(needsConfirmation({ visa: null, phone: "01012345678" })).toBe(true);
  });

  it("비자 보유 + 한국번호 → false (일반 흐름)", () => {
    expect(needsConfirmation({ visa: "F-4", phone: "01012345678" })).toBe(false);
    expect(needsConfirmation({ visa: "D-2", phone: "+82 10 1234 5678" })).toBe(
      false,
    );
  });
});
