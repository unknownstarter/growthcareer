import { describe, it, expect } from "vitest";
import { resolveTuitionForApplicant } from "./pricing";

describe("resolveTuitionForApplicant (ADR 0019 메시지 수강료)", () => {
  it("올인원 → 990,000원, 라벨 올인원", () => {
    const r = resolveTuitionForApplicant("all_in_one", ["a-r", "sound"], "ko");
    expect(r.krw).toBe(990_000);
    expect(r.tuition).toBe("990,000원");
    expect(r.courseLabel).toBe("올인원 (전 과정)");
  });

  it("단과 A&R → 550,000원, 라벨 A&R 단과반", () => {
    const r = resolveTuitionForApplicant("single", ["a-r"], "ko");
    expect(r.krw).toBe(550_000);
    expect(r.tuition).toBe("550,000원");
    expect(r.courseLabel).toBe("A&R 단과반");
  });

  it("단과 음향 → 550,000원, 라벨 음향 감독 단과반", () => {
    const r = resolveTuitionForApplicant("single", ["sound"], "ko");
    expect(r.krw).toBe(550_000);
    expect(r.tuition).toBe("550,000원");
    expect(r.courseLabel).toBe("음향 감독 단과반");
  });

  it("방어: single + 2슬러그 → 올인원 990,000 취급", () => {
    const r = resolveTuitionForApplicant("single", ["a-r", "sound"], "ko");
    expect(r.krw).toBe(990_000);
    expect(r.courseLabel).toBe("올인원 (전 과정)");
  });

  it("1기 (selectionMode null) → 880,000원, 라벨 없음", () => {
    const r = resolveTuitionForApplicant(null, null, "ko");
    expect(r.krw).toBe(880_000);
    expect(r.tuition).toBe("880,000원");
    expect(r.courseLabel).toBeNull();
  });

  it("en locale → KRW prefix 포맷 (템플릿 TUITION_EN 스타일)", () => {
    expect(resolveTuitionForApplicant("all_in_one", ["a-r", "sound"], "en").tuition).toBe(
      "KRW 990,000",
    );
    expect(resolveTuitionForApplicant("single", ["sound"], "en").tuition).toBe(
      "KRW 550,000",
    );
    expect(resolveTuitionForApplicant(null, null, "en").tuition).toBe("KRW 880,000");
  });

  it("DB price_krw 오버라이드 우선 (올인원)", () => {
    const r = resolveTuitionForApplicant("all_in_one", ["a-r", "sound"], "ko", {
      bundlePriceKrw: 1_000_000,
    });
    expect(r.krw).toBe(1_000_000);
  });

  it("DB price_krw 오버라이드 우선 (단과)", () => {
    const r = resolveTuitionForApplicant("single", ["a-r"], "ko", {
      coursePriceKrw: 600_000,
    });
    expect(r.krw).toBe(600_000);
  });
});
